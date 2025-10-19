/**
 * Transaction API for MemImg
 *
 * ==============================================================================
 * ARCHITECTURE: TRANSACTION ISOLATION VIA DELTA TRACKING
 * ==============================================================================
 *
 * Transactions provide explicit control over when changes are persisted,
 * essential for UI applications where users expect "save" and "cancel" buttons.
 *
 * DESIGN DECISION: Delta Tracking vs. Copy-on-Write
 *
 * We considered two approaches:
 *
 * 1. **Copy-on-Write** (not chosen)
 *    - Clone entire memory image for each transaction
 *    - Pros: Simple, isolated, no special proxies needed
 *    - Cons: O(n) memory for every transaction, slow for large graphs
 *    - Verdict: Too expensive for Navigator use case (frequent edits)
 *
 * 2. **Delta Tracking** (chosen)
 *    - Track only changed paths in a Map<string, value>
 *    - Pros: O(changes) memory, fast, supports checkpoint/restore
 *    - Cons: More complex, requires transaction-specific proxies
 *    - Verdict: Optimal for UI with many small edits
 *
 * HOW IT WORKS:
 *
 * 1. **Base Memory Image** (baseRaw)
 *    - Plain JavaScript object (NOT proxied)
 *    - Contains all persisted state
 *    - Read from persistent EventLog on startup
 *    - Only modified during save()
 *
 * 2. **Delta Layer** (DeltaManager)
 *    - Map<path, value> tracking uncommitted changes
 *    - Example: { "user.name": "Alice", "user.age": 30 }
 *    - Deletions marked with special DELETED symbol
 *    - Checkpoint/restore for rollback support
 *
 * 3. **Transaction Proxy** (createTransactionProxy)
 *    - Wraps baseRaw in a special proxy
 *    - GET: checks delta first, falls back to base
 *    - SET: writes to delta, NOT to base
 *    - DELETE: marks as deleted in delta
 *    - Returns nested transaction proxies (not MemImg proxies)
 *
 * 4. **Save Flow**:
 *    - Sort delta entries by depth (parents before children)
 *    - Unwrap all proxies recursively (preserve identity via shared WeakMap)
 *    - Apply each change to baseRaw
 *    - Log event to persistent EventLog
 *    - Clear delta
 *
 * 5. **Discard Flow**:
 *    - Simply clear delta
 *    - Base remains unchanged
 *    - User sees original values again
 *
 * WHY TRANSACTION PROXIES ≠ MEMIMG PROXIES:
 *
 * - **MemImg proxies**: Track mutations, log events, wrap recursively
 * - **Transaction proxies**: Redirect to delta, don't log until save()
 *
 * Can't use MemImg proxies for transactions because:
 * - Would log events immediately (can't discard)
 * - Would modify base (breaks isolation)
 * - Would create nested proxies (double-wrapping nightmare)
 *
 * CRITICAL FIX (Phase 9):
 *
 * Original transaction.ts reimplemented event replay (~40 lines).
 * WRONG! Violated DRY principle and risked bugs.
 * Fixed: Use replayFromEventLog() from replay.ts.
 * Result: Eliminated duplicate logic, consistent behavior.
 *
 * CHECKPOINT/RESTORE (Error Recovery):
 *
 * Navigator uses checkpoints for script execution:
 * 1. Create checkpoint before running user script
 * 2. Execute script (may mutate transaction)
 * 3. If script throws runtime error:
 *    - Restore checkpoint (discard partial mutations)
 *    - Show error to user
 *    - Transaction returns to pre-script state
 * 4. If script succeeds:
 *    - Discard checkpoint
 *    - User can save or discard at will
 *
 * Note: Syntax errors don't need checkpoints (code never executes).
 *
 * REFACTORING (Phase 9):
 *
 * Original: 505-line monolithic transaction.ts
 * Refactored into:
 * - transaction.ts (194 lines): Public API
 * - delta-manager.ts (118 lines): Delta tracking
 * - proxy-unwrapper.ts (85 lines): Deep unwrapping
 * - transaction-proxy.ts (237 lines): Proxy creation
 *
 * Benefits: Clear separation of concerns, independently testable modules.
 *
 * This two-layer architecture (base + delta) enables Navigator's UX:
 * users can experiment freely, then commit or discard changes explicitly.
 */

import type { EventLog } from "./types.js";
import { DeltaManager } from "./delta-manager.js";
import { deepUnwrap } from "./proxy-unwrapper.js";
import { createTransactionProxy } from "./transaction-proxy.js";
import { replayFromEventLog } from "./replay.js";

/**
 * Transaction manages a memory image with uncommitted changes
 */
export interface Transaction {
  /**
   * The memory image root (transaction proxy for isolation)
   */
  root: unknown;

  /**
   * Check if there are uncommitted changes
   */
  isDirty(): boolean;

  /**
   * Commit uncommitted changes to persistent storage
   * Applies delta to base memory image (triggers event logging)
   */
  save(): Promise<void>;

  /**
   * Discard uncommitted changes
   * Clears transaction delta (baseRaw is unmodified)
   */
  discard(): void;

  /**
   * Get count of uncommitted changes
   */
  getUncommittedCount(): number;

  /**
   * Create a checkpoint of current delta state
   * Returns a checkpoint that can be used to restore delta state later
   */
  createCheckpoint(): Map<string, unknown>;

  /**
   * Restore delta to a previously saved checkpoint
   * Discards all changes made after the checkpoint was created
   */
  restoreCheckpoint(checkpoint: Map<string, unknown>): void;

  /**
   * Unwrap a transaction proxy to get the underlying value
   *
   * Useful for type detection when proxies hide the true type.
   * For example, checking if a proxied value is actually a Date.
   *
   * @param value - Value to unwrap (may be a proxy or raw value)
   * @returns The underlying value without proxy wrapping
   *
   * @example
   * ```typescript
   * const dateProxy = txn.root.user.hiredate;
   * const unwrapped = txn.unwrap(dateProxy);
   * console.log(unwrapped instanceof Date); // true
   * ```
   */
  unwrap(value: unknown): unknown;
}

/**
 * Creates a transaction
 *
 * @param persistentLog - Event log for permanent storage (IndexedDB/file)
 * @returns Transaction object with root and save/discard methods
 *
 * @example
 * ```typescript
 * const persistentLog = createIndexedDBEventLog('myapp', 'events');
 * const txn = await createTransaction(persistentLog);
 *
 * // Make changes (tracked in delta, not persistent yet)
 * txn.root.user = { name: 'Alice' };
 *
 * // Check if dirty
 * console.log(txn.isDirty()); // true
 *
 * // Commit to persistent storage
 * await txn.save();
 *
 * // Make more changes
 * txn.root.user.name = 'Bob';
 *
 * // Rollback changes
 * txn.discard(); // Reverts to 'Alice'
 * ```
 */
export async function createTransaction(
  persistentLog: EventLog
): Promise<Transaction> {
  // Create delta manager for tracking changes
  const deltaManager = new DeltaManager();
  const DELETED = deltaManager.getDeletedSymbol();

  // Proxy cache: ensures same proxy instance for same object (preserves identity)
  const proxyCache = new WeakMap<object, any>();

  // Reverse cache: proxy → target (to unwrap proxies during save)
  const targetCache = new WeakMap<object, any>();

  // Create raw base object (plain object, not a proxy)
  const baseRaw: any = {};

  // Replay existing events from persistent log to rebuild state
  // CRITICAL FIX: Use existing replayFromEventLog() instead of reimplementing!
  // This eliminates 80+ lines of duplicate event replay logic.
  await replayFromEventLog(baseRaw, persistentLog, { isReplaying: true });

  // Create transaction proxy wrapper around RAW object
  const transactionRoot = createTransactionProxy(baseRaw, deltaManager, [], proxyCache, targetCache);

  return {
    root: transactionRoot,

    isDirty(): boolean {
      return deltaManager.isDirty();
    },

    getUncommittedCount(): number {
      return deltaManager.size();
    },

    async save(): Promise<void> {
      // Get sorted delta entries (shallowest first)
      const sortedDelta = deltaManager.entries();

      // Shared seen map for unwrapping - preserves identity across all delta entries
      const seen = new WeakMap<object, any>();

      // Apply delta to baseRaw and log events
      for (const [pathStr, value] of sortedDelta) {
        const pathParts = pathStr.split('.');

        // Navigate to parent in baseRaw
        let target: any = baseRaw;
        for (let i = 0; i < pathParts.length - 1; i++) {
          target = target[pathParts[i]!];
        }

        const finalProp = pathParts[pathParts.length - 1]!;

        // Apply change to baseRaw
        if (value === DELETED) {
          delete target[finalProp];

          // Log DELETE event
          await persistentLog.append({
            type: 'DELETE',
            path: pathParts,
            timestamp: Date.now(),
          });
        } else {
          // Unwrap any proxies recursively before saving to baseRaw
          // Use shared seen map to preserve identity across circular refs
          const unwrappedValue = deepUnwrap(value, targetCache, seen);
          target[finalProp] = unwrappedValue;

          // Log SET event with unwrapped value
          await persistentLog.append({
            type: 'SET',
            path: pathParts,
            value: unwrappedValue,
            timestamp: Date.now(),
          });
        }
      }

      // Clear delta (changes now persisted)
      deltaManager.clear();
    },

    discard(): void {
      // Clear delta (discard uncommitted changes)
      // BaseRaw is unmodified since all changes went to delta
      deltaManager.clear();
    },

    createCheckpoint(): Map<string, unknown> {
      return deltaManager.createCheckpoint();
    },

    restoreCheckpoint(checkpoint: Map<string, unknown>): void {
      deltaManager.restoreCheckpoint(checkpoint);
    },

    unwrap(value: unknown): unknown {
      // Use deepUnwrap to recursively unwrap transaction proxies
      // Pass empty seen map for each call (stateless unwrapping)
      return deepUnwrap(value, targetCache);
    },
  };
}
