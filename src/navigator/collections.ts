/**
 * Collection Adapters - Unified interface for Array/Map/Set navigation
 *
 * Eliminates duplication in tree rendering by providing a common interface
 * for extracting children and creating paths for all collection types.
 *
 * Previous implementation had separate functions for each collection type:
 * - renderArrayChildren (15 lines)
 * - renderMapChildren (15 lines)
 * - renderSetChildren (15 lines)
 *
 * This adapter pattern reduces these to a single unified renderer.
 *
 * NOTE: isCollection() is now imported from foundation layer to eliminate
 * duplication across memimg, navigator/value-types, and collections.
 */

import type { PathArray } from "./navigation.js";

// ============================================================================
// Collection Adapter Interface
// ============================================================================

/**
 * Child entry in a collection
 *
 * A tuple of [label, value] where:
 * - label: Display string (e.g., "[0]", "keyName", "[Set item]")
 * - value: The actual value at this position
 */
export type ChildEntry = [string, unknown];

/**
 * Collection adapter interface
 *
 * Provides uniform access to different collection types.
 */
export interface CollectionAdapter {
  /**
   * Get all child entries from the collection
   *
   * @param collection - The collection to extract from
   * @returns Array of [label, value] tuples
   */
  getChildren(collection: unknown): ChildEntry[];

  /**
   * Create path for a child at the given index
   *
   * Different collections use different path conventions:
   * - Arrays: numeric index as string
   * - Maps: "map:N" format
   * - Sets: "set:N" format
   *
   * @param parentPath - Path to the collection
   * @param index - Index of the child in iteration order
   * @returns Path to the child
   */
  createChildPath(parentPath: PathArray, index: number): PathArray;
}

// ============================================================================
// Array Adapter
// ============================================================================

/**
 * Adapter for JavaScript Arrays
 */
class ArrayAdapter implements CollectionAdapter {
  getChildren(collection: unknown): ChildEntry[] {
    const arr = collection as unknown[];
    return arr.map((value, index) => [`[${index}]`, value]);
  }

  createChildPath(parentPath: PathArray, index: number): PathArray {
    return [...parentPath, index.toString()];
  }
}

// ============================================================================
// Map Adapter
// ============================================================================

/**
 * Adapter for JavaScript Maps
 */
class MapAdapter implements CollectionAdapter {
  getChildren(collection: unknown): ChildEntry[] {
    const map = collection as Map<unknown, unknown>;
    return Array.from(map.entries()).map(([key, value]) => [String(key), value]);
  }

  createChildPath(parentPath: PathArray, index: number): PathArray {
    return [...parentPath, `map:${index}`];
  }
}

// ============================================================================
// Set Adapter
// ============================================================================

/**
 * Adapter for JavaScript Sets
 */
class SetAdapter implements CollectionAdapter {
  getChildren(collection: unknown): ChildEntry[] {
    const set = collection as Set<unknown>;
    return Array.from(set.values()).map((value, index) => [`[${index}]`, value]);
  }

  createChildPath(parentPath: PathArray, index: number): PathArray {
    return [...parentPath, `set:${index}`];
  }
}

// ============================================================================
// Adapter Registry
// ============================================================================

/**
 * Get the appropriate adapter for a collection
 *
 * @param collection - The collection to get an adapter for
 * @returns CollectionAdapter or null if not a collection
 */
export function getCollectionAdapter(collection: unknown): CollectionAdapter | null {
  if (Array.isArray(collection)) {
    return new ArrayAdapter();
  }
  if (collection instanceof Map) {
    return new MapAdapter();
  }
  if (collection instanceof Set) {
    return new SetAdapter();
  }
  return null;
}

/**
 * Check if a value is a collection (Array/Map/Set)
 *
 * Re-exported from foundation/js-types.ts for backward compatibility.
 */
export { isCollection } from '../foundation/js-types.js';
