/**
 * ValidationContext - Contextualized validation state management
 *
 * Replaces global ValidationState and ValidationStrategy singletons with
 * an explicit context object that can be passed through the system.
 *
 * Benefits over global singletons:
 * - Isolated testing (no beforeEach cleanup needed)
 * - Multiple contexts can coexist
 * - Explicit dependencies (clear where state lives)
 * - No async interleaving issues
 *
 * Design:
 * - Encapsulates pending validation tracking (Map<object, Set<string>>)
 * - Encapsulates validation strategy
 * - Validates inputs (rejects empty validation names)
 */

/**
 * ValidationContext - Encapsulates validation state and strategy.
 *
 * Manages pending object-level validations and delegates property-level
 * validation to a pluggable strategy.
 */
export class ValidationContext {
  private pending = new Map<object, Set<string>>();
  public strategy: any; // Will be properly typed after integration

  constructor(strategy?: any) {
    this.strategy = strategy ?? null; // Will inject real strategy from javascript-types.ts
  }

  // =========================================================================
  // Pending Validation Tracking
  // =========================================================================

  /**
   * Check if any validations are pending.
   * Memimg should call this before commit.
   */
  hasPending(): boolean {
    return this.pending.size > 0;
  }

  /**
   * Clear all pending validations.
   * Called after successful commit or rollback.
   */
  clear(): void {
    this.pending.clear();
  }

  /**
   * Add a pending validation for an object.
   * Called when validation fails during property mutation.
   *
   * @param obj - The object with failing validation
   * @param validationName - Name of the failing validation
   * @throws Error if validationName is empty or whitespace-only
   */
  addPending(obj: object, validationName: string): void {
    // Reject empty validation names (Phase 6 improvement)
    if (!validationName || validationName.trim() === '') {
      throw new Error('Validation name cannot be empty');
    }

    if (!this.pending.has(obj)) {
      this.pending.set(obj, new Set());
    }
    this.pending.get(obj)!.add(validationName);
  }

  /**
   * Remove a pending validation.
   * Called when validation passes on retry.
   *
   * @param obj - The object with passing validation
   * @param validationName - Name of the passing validation
   */
  removePending(obj: object, validationName: string): void {
    const validations = this.pending.get(obj);
    if (validations) {
      validations.delete(validationName);
      if (validations.size === 0) {
        this.pending.delete(obj);
      }
    }
  }

  /**
   * Get all pending validations for error reporting.
   * Returns array of objects with object reference and failing validation names.
   *
   * Note: Returns defensive copy (array copy) to prevent external mutation.
   */
  getPending(): Array<{ obj: object; validations: string[] }> {
    const result: Array<{ obj: object; validations: string[] }> = [];
    this.pending.forEach((validations, obj) => {
      result.push({
        obj,
        validations: Array.from(validations)  // Defensive copy
      });
    });
    return result;
  }
}

/**
 * Default global context for backward compatibility.
 *
 * Use this when you need a quick global context, but prefer creating
 * explicit contexts for better testability and isolation.
 */
const _defaultContext = new ValidationContext();

/**
 * Get the default global validation context.
 *
 * This is provided for backward compatibility and convenience.
 * For better testability, create explicit contexts via `new ValidationContext()`.
 */
export function getDefaultContext(): ValidationContext {
  return _defaultContext;
}