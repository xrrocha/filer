/**
 * Property Access - Robust property enumeration for all object types
 *
 * This module provides reliable property enumeration that works with
 * both regular objects AND proxies (including ObjectType proxies).
 *
 * CRITICAL FIX: Object.entries() returns [] for ObjectType proxies.
 * We use Reflect.ownKeys() as a fallback to enumerate proxy properties.
 */

import { INTERNAL_PREFIX } from './constants.js';
import { classifyValue } from './value-types.js';

// ============================================================================
// Property Enumeration
// ============================================================================

/**
 * Get own properties from an object, handling proxies correctly
 *
 * FIXES: ObjectType proxy bug where Object.entries() returns []
 *
 * Strategy:
 * 1. Try Object.entries() first (fast path, works for 99% of objects)
 * 2. If empty, fall back to Reflect.ownKeys() (works with proxies)
 *
 * @param obj - Object to enumerate properties from
 * @returns Array of [key, value] tuples
 *
 * @example
 * ```typescript
 * // Regular object
 * const regular = { a: 1, b: 2 };
 * getOwnProperties(regular);
 * // => [['a', 1], ['b', 2]]
 *
 * // ObjectType proxy (Object.entries returns [])
 * const proxied = new Proxy({ x: 10 }, handler);
 * getOwnProperties(proxied);
 * // => [['x', 10]]  <- Uses Reflect.ownKeys() fallback
 * ```
 */
export function getOwnProperties(obj: any): Array<[string, any]> {
  if (obj === null || obj === undefined) {
    return [];
  }

  // Use Reflect.ownKeys() to get ALL properties (enumerable and non-enumerable)
  // This is needed for Arrays (to include 'length') and proxies
  try {
    const keys = Reflect.ownKeys(obj);

    // Filter to string keys only (exclude symbols)
    const stringKeys = keys.filter((k): k is string => typeof k === 'string');

    // Map keys to [key, value] tuples
    return stringKeys.map(k => [k, obj[k]]);
  } catch (err) {
    // If Reflect.ownKeys() fails, fall back to Object.entries()
    console.error('Failed to enumerate object properties with Reflect.ownKeys:', err);
    return Object.entries(obj);
  }
}

/**
 * Get visible properties (excludes internal properties starting with __)
 *
 * @param obj - Object to enumerate
 * @returns Array of [key, value] tuples for user-visible properties
 *
 * @example
 * ```typescript
 * const obj = { name: 'Alice', __internal: 'hidden', age: 30 };
 * getVisibleProperties(obj);
 * // => [['name', 'Alice'], ['age', 30]]
 * ```
 */
export function getVisibleProperties(obj: any): Array<[string, any]> {
  return getOwnProperties(obj).filter(([key]) => !key.startsWith(INTERNAL_PREFIX));
}

/**
 * Partition properties into scalars and collections
 *
 * Used for tabbed inspector UI - separates regular properties
 * from collections (arrays/maps/sets).
 *
 * @param obj - Object to partition properties from
 * @returns Object with `scalars` and `collections` arrays
 *
 * @example
 * ```typescript
 * const obj = {
 *   name: 'Alice',
 *   age: 30,
 *   items: [1, 2, 3],
 *   tags: new Set(['a', 'b'])
 * };
 *
 * const { scalars, collections } = partitionProperties(obj);
 * // scalars: [['name', 'Alice'], ['age', 30]]
 * // collections: [['items', [1,2,3]], ['tags', Set]]
 * ```
 */
export function partitionProperties(obj: any): {
  scalars: Array<[string, any]>;
  collections: Array<[string, any]>;
} {
  const props = getVisibleProperties(obj);
  const scalars: Array<[string, any]> = [];
  const collections: Array<[string, any]> = [];

  for (const [key, value] of props) {
    const info = classifyValue(value);
    if (info.isCollection) {
      collections.push([key, value]);
    } else {
      scalars.push([key, value]);
    }
  }

  return { scalars, collections };
}

// ============================================================================
// Property Counting
// ============================================================================

/**
 * Count visible properties (for display purposes)
 *
 * @param obj - Object to count properties in
 * @returns Number of visible properties
 */
export function countVisibleProperties(obj: any): number {
  return getVisibleProperties(obj).length;
}

/**
 * Check if object has any visible properties
 *
 * @param obj - Object to check
 * @returns true if object has at least one visible property
 */
export function hasVisibleProperties(obj: any): boolean {
  if (obj === null || obj === undefined) return false;

  // Try fast path
  const entries = Object.entries(obj);
  if (entries.length > 0) {
    return entries.some(([key]) => !key.startsWith(INTERNAL_PREFIX));
  }

  // Fallback for proxies
  try {
    const keys = Reflect.ownKeys(obj);
    const stringKeys = keys.filter((k): k is string => typeof k === 'string');
    return stringKeys.some(k => !k.startsWith(INTERNAL_PREFIX));
  } catch {
    return false;
  }
}
