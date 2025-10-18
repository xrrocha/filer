/**
 * Navigation - History management and path navigation
 *
 * Properly encapsulated with private fields and clean API.
 */

import type { MutablePath } from '../memimg/types.js';

/**
 * PathArray is an alias for MutablePath for backwards compatibility.
 * Prefer using MutablePath directly in new code.
 */
export type PathArray = MutablePath;

export class NavigationManager {
  // Private state - use accessors for read-only access
  private _history: PathArray[];
  private _currentIndex: number;
  private _selectedPath: PathArray;
  private _expandedPaths: Set<string>;
  private _expandedNestedObjects: Set<string>; // Phase 13: Inline nested expansion state

  // Public callback
  onNavigate: (() => void) | null;

  constructor() {
    this._history = [['root']];
    this._currentIndex = 0;
    this._selectedPath = ['root'];
    this._expandedPaths = new Set(['root']);
    this._expandedNestedObjects = new Set(); // Phase 13: Empty initially
    this.onNavigate = null; // Callback when navigation occurs
  }

  // ============================================================================
  // Read-Only Accessors
  // ============================================================================

  /**
   * Get current selected path (returns copy to prevent mutation)
   */
  get selectedPath(): PathArray {
    return [...this._selectedPath];
  }

  /**
   * Get current history index
   */
  get currentIndex(): number {
    return this._currentIndex;
  }

  /**
   * Get navigation history (returns copy to prevent mutation)
   */
  get history(): PathArray[] {
    return this._history.map(path => [...path]);
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Expand all ancestor paths for a given path
   *
   * When navigating to a path like ['root', 'emps', 'king'], this ensures
   * that 'root' and 'root.emps' are also expanded in the tree.
   */
  private expandAncestors(path: PathArray): void {
    for (let i = 1; i <= path.length; i++) {
      const pathToExpand = path.slice(0, i).join('.');
      this._expandedPaths.add(pathToExpand);
    }
  }

  /**
   * Reset navigation to initial state
   *
   * Called when clearing data, importing, or closing memory image.
   * Eliminates 4 duplicate reset blocks scattered through main.ts.
   */
  reset(): void {
    this._selectedPath = ['root'];
    this._expandedPaths = new Set(['root']);
    this._expandedNestedObjects = new Set(); // Phase 13: Clear nested expansion
    this._history = [['root']];
    this._currentIndex = 0;
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigate to a specific path
   * @param path - Path array like ['root', 'emps', 'king']
   * @param addToHistory - Whether to add to navigation history
   */
  navigateTo(path: PathArray, addToHistory: boolean = true): void {
    if (addToHistory) {
      // Truncate forward history and add new location
      this._history = this._history.slice(0, this._currentIndex + 1);
      this._history.push([...path]);
      this._currentIndex = this._history.length - 1;
    }

    // Expand all parent paths in tree
    this.expandAncestors(path);

    this._selectedPath = [...path];

    // Notify listeners
    if (this.onNavigate) {
      this.onNavigate();
    }
  }

  /**
   * Go back in history
   */
  goBack(): void {
    if (!this.canGoBack()) return;

    this._currentIndex--;
    this._selectedPath = [...this._history[this._currentIndex]!];

    // Expand parent paths
    this.expandAncestors(this._selectedPath);

    if (this.onNavigate) {
      this.onNavigate();
    }
  }

  /**
   * Go forward in history
   */
  goForward(): void {
    if (!this.canGoForward()) return;

    this._currentIndex++;
    this._selectedPath = [...this._history[this._currentIndex]!];

    // Expand parent paths
    this.expandAncestors(this._selectedPath);

    if (this.onNavigate) {
      this.onNavigate();
    }
  }

  canGoBack(): boolean {
    return this._currentIndex > 0;
  }

  canGoForward(): boolean {
    return this._currentIndex < this._history.length - 1;
  }

  // ============================================================================
  // Tree Expansion
  // ============================================================================

  /**
   * Toggle expansion state of a path in the tree
   */
  toggleExpanded(pathKey: string): void {
    if (this._expandedPaths.has(pathKey)) {
      this._expandedPaths.delete(pathKey);
    } else {
      this._expandedPaths.add(pathKey);
    }
  }

  /**
   * Check if a path is expanded in the tree
   */
  isExpanded(pathKey: string): boolean {
    return this._expandedPaths.has(pathKey);
  }

  // ============================================================================
  // Inline Nested Object Expansion (Phase 13)
  // ============================================================================

  /**
   * Toggle inline expansion state of a nested object
   *
   * This is separate from tree expansion state - allows "peeking" at
   * nested objects inline in tree headers without expanding tree nodes.
   */
  toggleNestedExpanded(pathKey: string): void {
    if (this._expandedNestedObjects.has(pathKey)) {
      this._expandedNestedObjects.delete(pathKey);
    } else {
      this._expandedNestedObjects.add(pathKey);
    }
  }

  /**
   * Check if a nested object is expanded inline
   */
  isNestedExpanded(pathKey: string): boolean {
    return this._expandedNestedObjects.has(pathKey);
  }
}
