/**
 * Path Utilities - Navigator-specific path operations
 *
 * These utilities are for UI navigation, separate from memimg's
 * path-utils which are for event sourcing and serialization.
 *
 * Navigator paths always start with 'root' (e.g., ['root', 'emps', 'king'])
 */

import type { MutablePath } from 'ireneo';
import { ROOT_PATH } from './constants.js';

// PathArray is Navigator's mutable path type
export type PathArray = MutablePath;

// ============================================================================
// Path Traversal
// ============================================================================

/**
 * Traverse a path in an object graph (starting from root)
 *
 * Navigator paths start with 'root', so we skip the first element
 * when traversing.
 *
 * @param root - The root object
 * @param path - Path to traverse (e.g., ['root', 'emps', 'king'])
 * @returns Object at the path, or undefined if path doesn't exist
 *
 * @example
 * ```typescript
 * const root = { emps: { king: { sal: 5000 } } };
 * const obj = traversePath(root, ['root', 'emps', 'king']);
 * // => { sal: 5000 }
 * ```
 */
export function traversePath(root: any, path: PathArray): any {
  let obj = root;

  // Start at index 1 to skip 'root'
  for (let i = 1; i < path.length; i++) {
    const segment = path[i];

    // Handle undefined segments (sparse arrays or malformed paths)
    if (segment === undefined) {
      return undefined;
    }

    // Special handling for empty string segments:
    // - If the object has an empty-string property, use it
    // - If not, skip the segment gracefully (treat as if it wasn't there)
    if (segment === '' && !(segment in obj)) {
      continue; // Skip this empty segment
    }

    obj = obj?.[segment];
    if (obj === undefined) {
      return undefined;
    }
  }

  return obj;
}

/**
 * Get parent path (all but last segment)
 *
 * @param path - The path
 * @returns Parent path, or null if path is root or has no parent
 *
 * @example
 * ```typescript
 * getParentPath(['root', 'emps', 'king']);
 * // => ['root', 'emps']
 *
 * getParentPath(['root']);
 * // => null
 * ```
 */
export function getParentPath(path: PathArray): PathArray | null {
  if (path.length <= 1) return null;
  return path.slice(0, -1);
}

/**
 * Get the last segment of a path (the leaf)
 *
 * @param path - The path
 * @returns Last segment, or 'root' if path is empty/root
 *
 * @example
 * ```typescript
 * getPathLeaf(['root', 'emps', 'king']);
 * // => 'king'
 *
 * getPathLeaf(['root']);
 * // => 'root'
 * ```
 */
export function getPathLeaf(path: PathArray): string {
  return path.length > 0 ? path[path.length - 1]! : ROOT_PATH;
}

// ============================================================================
// Path Manipulation
// ============================================================================

/**
 * Convert path to string key (for storage/lookup)
 *
 * @param path - Path array
 * @returns Dot-separated string like "root.emps.king"
 *
 * @example
 * ```typescript
 * pathToKey(['root', 'emps', 'king']);
 * // => 'root.emps.king'
 * ```
 */
export function pathToKey(path: PathArray): string {
  return path.join('.');
}

/**
 * Convert string key to path array
 *
 * @param key - Dot-separated path string
 * @returns Path array
 *
 * @example
 * ```typescript
 * keyToPath('root.emps.king');
 * // => ['root', 'emps', 'king']
 * ```
 */
export function keyToPath(key: string): PathArray {
  return key.split('.');
}

/**
 * Get all ancestor paths (for tree expansion)
 *
 * Returns paths from root down to the given path.
 * Used to expand tree nodes when navigating deep.
 *
 * @param path - The path to get ancestors for
 * @returns Array of ancestor path strings
 *
 * @example
 * ```typescript
 * getAncestorPaths(['root', 'emps', 'king', 'sal']);
 * // => ['root', 'root.emps', 'root.emps.king', 'root.emps.king.sal']
 * ```
 */
export function getAncestorPaths(path: PathArray): string[] {
  const result: string[] = [];

  for (let i = 1; i <= path.length; i++) {
    result.push(pathToKey(path.slice(0, i)));
  }

  return result;
}

/**
 * Append a segment to a path (creates new array)
 *
 * @param path - Base path
 * @param segment - Segment to append
 * @returns New path with segment appended
 *
 * @example
 * ```typescript
 * const base = ['root', 'emps'];
 * const extended = appendToPath(base, 'king');
 * // => ['root', 'emps', 'king']
 * ```
 */
export function appendToPath(path: PathArray, segment: string): PathArray {
  return [...path, segment];
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Check if a path is valid (exists in object graph)
 *
 * A path is considered valid if it exists and leads to a non-null, non-undefined value.
 * Paths to null values are invalid because you cannot navigate further from null.
 *
 * @param root - The root object
 * @param path - Path to validate
 * @returns true if path exists and leads to a non-null value
 *
 * @example
 * ```typescript
 * const root = { emps: { king: { sal: 5000 } } };
 * isValidPath(root, ['root', 'emps', 'king']);
 * // => true
 *
 * isValidPath(root, ['root', 'emps', 'smith']);
 * // => false
 *
 * isValidPath({ value: null }, ['root', 'value']);
 * // => false (null is not a valid navigation target)
 * ```
 */
export function isValidPath(root: any, path: PathArray): boolean {
  const result = traversePath(root, path);
  return result !== undefined && result !== null;
}

/**
 * Check if path is root path
 *
 * @param path - Path to check
 * @returns true if path is root
 *
 * @example
 * ```typescript
 * isRootPath(['root']);
 * // => true
 *
 * isRootPath(['root', 'emps']);
 * // => false
 * ```
 */
export function isRootPath(path: PathArray): boolean {
  return path.length === 1 && path[0] === ROOT_PATH;
}

/**
 * Normalize path (ensure starts with 'root')
 *
 * @param path - Path to normalize
 * @returns Normalized path
 *
 * @example
 * ```typescript
 * normalizePath(['emps', 'king']);
 * // => ['root', 'emps', 'king']
 *
 * normalizePath(['root', 'emps', 'king']);
 * // => ['root', 'emps', 'king']
 * ```
 */
export function normalizePath(path: PathArray): PathArray {
  if (path.length === 0 || path[0] !== ROOT_PATH) {
    return [ROOT_PATH, ...path];
  }
  return path;
}
