/**
 * Path Utilities - Centralized path traversal and manipulation
 *
 * This module eliminates the 4+ duplicated path traversal loops throughout
 * the codebase, providing consistent path operations for replay, transaction,
 * and serialization modules.
 */

import type { Path } from './types.js';
import { NUMERIC_KEY_PATTERN, PATH_SEPARATOR } from './constants.js';

// ============================================================================
// Path Traversal
// ============================================================================

/**
 * Navigate to a path in an object graph
 *
 * This is the core path traversal logic used by replay, transaction,
 * and deserialization modules.
 *
 * @param root - The root object
 * @param path - Path to navigate
 * @param options - Navigation options
 * @returns Object at the path, or { target, key } if navigating to parent
 *
 * @example
 * ```typescript
 * const obj = navigateToPath(root, ['emps', 'king', 'ename']);
 * // Returns the object at root.emps.king.ename
 *
 * const { target, key } = navigateToPath(root, ['emps', 'king', 'sal'], { parent: true });
 * // Returns { target: root.emps.king, key: 'sal' }
 * // Now can do: target[key] = 5000
 * ```
 */
export function navigateToPath(
  root: any,
  path: Path,
  options: {
    /** Create intermediate objects if they don't exist */
    create?: boolean;
    /** Navigate to parent (all but last segment) */
    parent?: boolean;
  } = {},
): any | { target: any; key: string | null } {
  const { create = false, parent = false } = options;

  let target: any = root;
  const segments = parent ? path.slice(0, -1) : path;

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (!segment) continue;

    // Check if property exists
    if (!(segment in target)) {
      if (!create) {
        throw new Error(`Path not found: ${path.slice(0, i + 1).join(PATH_SEPARATOR)}`);
      }

      // Create intermediate object or array based on next segment
      const nextSegment = segments[i + 1];
      target[segment] = nextSegment && isNumericKey(nextSegment) ? [] : {};
    }

    target = target[segment];
  }

  // Return target + key if navigating to parent
  if (parent) {
    const finalKey = path.length > 0 ? path[path.length - 1] : null;
    return { target, key: finalKey };
  }

  return target;
}

/**
 * Get value at path
 *
 * Safe path traversal that returns undefined if path doesn't exist.
 *
 * @param root - The root object
 * @param path - Path to the value
 * @returns Value at path, or undefined if not found
 */
export function getAtPath(root: any, path: Path): any {
  try {
    return navigateToPath(root, path);
  } catch {
    return undefined;
  }
}

/**
 * Set value at path, creating intermediate objects as needed
 *
 * This is the core setter used by replay and transaction modules.
 *
 * @param root - The root object
 * @param path - Path where to set the value
 * @param value - Value to set
 *
 * @example
 * ```typescript
 * setAtPath(root, ['emps', 'king', 'sal'], 5000);
 * // Creates root.emps and root.emps.king if they don't exist
 * // Then sets root.emps.king.sal = 5000
 * ```
 */
export function setAtPath(root: any, path: Path, value: unknown): void {
  if (path.length === 0) {
    throw new Error('Cannot set value at empty path');
  }

  const { target, key } = navigateToPath(root, path, { create: true, parent: true });
  if (key !== null) {
    target[key] = value;
  }
}

/**
 * Delete value at path
 *
 * Used by replay and transaction modules for DELETE events.
 *
 * @param root - The root object
 * @param path - Path to delete
 */
export function deleteAtPath(root: any, path: Path): void {
  if (path.length === 0) {
    throw new Error('Cannot delete at empty path');
  }

  try {
    const { target, key } = navigateToPath(root, path, { parent: true });
    if (key !== null && key in target) {
      delete target[key];
    }
  } catch {
    // Path doesn't exist, nothing to delete
  }
}

// ============================================================================
// Path Manipulation
// ============================================================================

/**
 * Check if a path segment represents a numeric array index
 *
 * Used during path traversal to determine whether to create an array
 * or object as an intermediate value.
 *
 * @param key - The key to check
 * @returns true if key is a numeric string like "0", "42", etc.
 */
export function isNumericKey(key: string): boolean {
  return NUMERIC_KEY_PATTERN.test(key);
}

/**
 * Convert path array to dot-separated string
 *
 * @param path - Path array
 * @returns Dot-separated string like "emps.king.sal"
 */
export function pathToString(path: Path): string {
  return path.join(PATH_SEPARATOR);
}

/**
 * Convert dot-separated string to path array
 *
 * @param pathString - Dot-separated path string
 * @returns Path array
 */
export function stringToPath(pathString: string): Path {
  return pathString.split(PATH_SEPARATOR);
}

/**
 * Check if a path is valid (all segments accessible from root)
 *
 * @param root - The root object
 * @param path - Path to validate
 * @returns true if path exists and is accessible
 */
export function isValidPath(root: any, path: Path): boolean {
  try {
    navigateToPath(root, path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get parent path (all but last segment)
 *
 * @param path - The path
 * @returns Parent path, or null if path has no parent
 */
export function getParentPath(path: Path): Path | null {
  if (path.length <= 1) return null;
  return path.slice(0, -1);
}

/**
 * Get the last segment of a path (the leaf)
 *
 * @param path - The path
 * @returns Last segment, or 'root' if path is empty
 */
export function getPathLeaf(path: Path): string {
  return path[path.length - 1] || 'root';
}
