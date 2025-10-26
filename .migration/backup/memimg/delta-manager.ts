/**
 * Delta Manager - Transaction change tracking
 *
 * Manages the delta Map that tracks uncommitted changes in a transaction.
 * Provides checkpoint/restore functionality for rollback support.
 *
 * Extracted from transaction.ts to separate concerns and improve testability.
 */

/**
 * Delta Manager for tracking transaction changes
 *
 * Changes are stored as path → value mappings, where path is a dot-separated
 * string like "user.profile.name". Deletions are marked with a special DELETED symbol.
 */
export class DeltaManager {
  private delta = new Map<string, unknown>();
  private readonly DELETED = Symbol('deleted');

  /**
   * Get deletion marker symbol
   */
  getDeletedSymbol(): symbol {
    return this.DELETED;
  }

  /**
   * Check if there are any uncommitted changes
   */
  isDirty(): boolean {
    return this.delta.size > 0;
  }

  /**
   * Get count of uncommitted changes
   */
  size(): number {
    return this.delta.size;
  }

  /**
   * Check if a path exists in delta
   */
  has(pathKey: string): boolean {
    return this.delta.has(pathKey);
  }

  /**
   * Get value at path from delta
   */
  get(pathKey: string): unknown {
    return this.delta.get(pathKey);
  }

  /**
   * Set value at path in delta
   */
  set(pathKey: string, value: unknown): void {
    this.delta.set(pathKey, value);
  }

  /**
   * Mark a path as deleted in delta
   */
  delete(pathKey: string): void {
    this.delta.set(pathKey, this.DELETED);
  }

  /**
   * Check if a path is marked as deleted
   */
  isDeleted(pathKey: string): boolean {
    return this.delta.get(pathKey) === this.DELETED;
  }

  /**
   * Clear all uncommitted changes
   */
  clear(): void {
    this.delta.clear();
  }

  /**
   * Get all delta entries
   *
   * Returns array of [pathKey, value] tuples, sorted by path depth
   * (shallowest first). This ensures parent objects are created before children.
   */
  entries(): Array<[string, unknown]> {
    return Array.from(this.delta.entries()).sort((a, b) => {
      const depthA = a[0].split('.').length;
      const depthB = b[0].split('.').length;
      return depthA - depthB;
    });
  }

  /**
   * Create a checkpoint of current delta state
   *
   * Returns a shallow copy of the delta Map that can be used to restore state later.
   * Used for transaction rollback (e.g., when script execution fails).
   */
  createCheckpoint(): Map<string, unknown> {
    return new Map(this.delta);
  }

  /**
   * Restore delta to a previously saved checkpoint
   *
   * Discards all changes made after the checkpoint was created.
   */
  restoreCheckpoint(checkpoint: Map<string, unknown>): void {
    this.delta.clear();
    for (const [path, value] of checkpoint) {
      this.delta.set(path, value);
    }
  }
}
