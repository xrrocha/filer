/**
 * Memimg Accessor - Navigator's interface to Memory Image internals
 *
 * This module provides Navigator with controlled access to memimg's
 * internal path tracking infrastructure. It contains navigation-specific
 * functions that query the memory image structure for UI purposes.
 *
 * This is a Navigator concern, not a Memimg concern - memimg provides
 * the infrastructure, Navigator provides the navigation logic.
 */

import type { Path } from '../memimg/types.js';
import { getMemoryImageInfrastructure } from '../memimg/memimg.js';

/**
 * BFS traversal to find an object's path when infrastructure isn't available
 *
 * Used as fallback for transaction roots which don't have memimg infrastructure.
 * Performs breadth-first search to find shortest path to target object.
 *
 * @param root - The root object to search from
 * @param target - The object to find
 * @returns Path array or null if not found
 */
function findObjectPathBFS(root: unknown, target: unknown): Path | null {
  if (root === target) return ['root'];
  if (!root || typeof root !== 'object') return null;

  // Queue: [object, path]
  const queue: Array<[any, Path]> = [[root, ['root']]];
  const visited = new Set<any>();
  visited.add(root);

  while (queue.length > 0) {
    const [current, path] = queue.shift()!;

    // Check all properties
    const entries = current instanceof Map
      ? Array.from(current.entries())
      : current instanceof Set
      ? Array.from(current.values()).map((v, i) => [`[${i}]`, v])
      : Object.entries(current);

    for (const [key, value] of entries) {
      // Skip internal properties
      if (typeof key === 'string' && key.startsWith('__')) continue;

      // Found it!
      if (value === target) {
        return [...path, String(key)] as Path;
      }

      // Recurse into objects we haven't visited
      if (value && typeof value === 'object' && !visited.has(value)) {
        visited.add(value);
        queue.push([value, [...path, String(key)]]);
      }
    }
  }

  return null;
}

/**
 * Get the canonical path of an object in the memory image
 *
 * This is a Navigator-specific operation used for UI navigation.
 * When the user clicks on a reference in the inspector or tree,
 * we need to find where that object actually lives in the graph.
 *
 * CRITICAL: Supports both memimg proxies (with infrastructure) and
 * transaction roots (without infrastructure). Falls back to BFS when
 * infrastructure is unavailable.
 *
 * @param root - The memory image root proxy or transaction root
 * @param obj - The object to find (can be proxy or target)
 * @returns Path array (e.g., ['root', 'depts', 'accounting']) or null
 *
 * @example
 * ```typescript
 * // User clicks on employee's manager reference
 * const manager = employee.mgr;
 * const path = getObjectPath(root, manager);
 * // Returns ['root', 'emps', 'jones'] - where manager actually lives
 * navigationManager.navigateTo(path);
 * ```
 */
export function getObjectPath(root: unknown, obj: unknown): Path | null {
  // Try fast path: use memimg infrastructure if available
  const infrastructure = getMemoryImageInfrastructure(root);
  if (infrastructure) {
    const { targetToPath, proxyToTarget } = infrastructure;

    // Check if obj is a proxy, if so get the target
    const target = proxyToTarget.get(obj as object) || obj;

    // Look up the path in the infrastructure
    const path = targetToPath.get(target as object);

    // Return with 'root' prefix for Navigator's path convention
    if (path) return ['root', ...path] as Path;
  }

  // Fallback: BFS traversal (for transaction roots)
  return findObjectPathBFS(root, obj);
}

/**
 * Check if an object is tracked in the memory image
 *
 * Useful for determining if a value can be navigated to.
 *
 * @param root - The memory image root proxy
 * @param obj - The object to check
 * @returns true if object exists in the memory image graph
 */
export function isTrackedObject(root: unknown, obj: unknown): boolean {
  return getObjectPath(root, obj) !== null;
}
