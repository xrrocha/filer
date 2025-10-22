/**
 * Lifecycle Metadata - Layer 3b
 *
 * Hooks for lifecycle events (future use).
 */
export interface LifecycleMetadata {
  /**
   * Called after property is created/initialized.
   */
  onCreate?: (value: unknown) => void;

  /**
   * Called before property value changes.
   */
  onUpdate?: (oldValue: unknown, newValue: unknown) => void;

  /**
   * Called when property/object is deleted.
   */
  onDelete?: (value: unknown) => void;
}
