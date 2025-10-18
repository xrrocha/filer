/**
 * Proxy Unwrapper - Deep proxy unwrapping utility
 *
 * Recursively unwraps transaction proxies to get raw objects/values.
 * Preserves object identity via seen map to handle circular references.
 *
 * Extracted from transaction.ts for reusability and testing.
 */

/**
 * Helper to check if value is an object (including arrays)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Recursively unwrap all proxies to get raw objects/values
 *
 * When saving transaction changes, we need to unwrap any transaction proxies
 * back to their underlying raw values. This function handles:
 * - Arrays: recursively unwrap each element
 * - Objects: recursively unwrap each property
 * - Circular references: tracked via seen map to preserve identity
 * - Primitives: returned as-is
 *
 * @param value - Value to unwrap (may be a proxy or raw value)
 * @param targetCache - WeakMap<proxy, target> for identifying proxies
 * @param seen - WeakMap for tracking visited objects (prevents infinite loops)
 * @returns Unwrapped raw value
 *
 * @example
 * ```typescript
 * const targetCache = new WeakMap();
 * const proxy = createTransactionProxy(obj, ...);
 * targetCache.set(proxy, obj);
 *
 * const unwrapped = deepUnwrap(proxy, targetCache);
 * // unwrapped === obj (the raw object)
 * ```
 */
export function deepUnwrap(
  value: unknown,
  targetCache: WeakMap<object, any>,
  seen = new WeakMap<object, any>()
): unknown {
  // Primitives pass through unchanged
  if (!isObject(value)) {
    return value;
  }

  // Check if already unwrapped (circular reference)
  if (seen.has(value)) {
    return seen.get(value);
  }

  // If it's a proxy, get the underlying target
  const target = targetCache.has(value) ? targetCache.get(value) : value;

  // Check if we've seen the target (handles proxy → target mapping)
  if (target !== value && seen.has(target)) {
    const result = seen.get(target);
    seen.set(value, result);
    return result;
  }

  // Recursively unwrap Maps
  if (target instanceof Map) {
    // Add to seen BEFORE recursing to handle circular references
    const unwrapped = new Map();
    seen.set(value, unwrapped);
    if (target !== value as any) seen.set(target, unwrapped);

    // Check if any keys or values are proxies that need unwrapping
    let hasProxies = false;

    for (const [key, val] of target.entries()) {
      const unwrappedKey = deepUnwrap(key, targetCache, seen);
      const unwrappedVal = deepUnwrap(val, targetCache, seen);
      unwrapped.set(unwrappedKey, unwrappedVal);
      if (unwrappedKey !== key || unwrappedVal !== val) {
        hasProxies = true;
      }
    }

    // If no proxies were found, return the target as-is
    // But update seen map to point to target instead
    const result = hasProxies ? unwrapped : target;
    seen.set(value, result);
    if (target !== value as any) seen.set(target, result);
    return result;
  }

  // Recursively unwrap Sets
  if (target instanceof Set) {
    // Add to seen BEFORE recursing to handle circular references
    const unwrapped = new Set();
    seen.set(value, unwrapped);
    if (target !== value as any) seen.set(target, unwrapped);

    // Check if any values are proxies that need unwrapping
    let hasProxies = false;

    for (const item of target.values()) {
      const unwrappedItem = deepUnwrap(item, targetCache, seen);
      unwrapped.add(unwrappedItem);
      if (unwrappedItem !== item) {
        hasProxies = true;
      }
    }

    // If no proxies were found, return the target as-is
    // But update seen map to point to target instead
    const result = hasProxies ? unwrapped : target;
    seen.set(value, result);
    if (target !== value as any) seen.set(target, result);
    return result;
  }

  // Recursively unwrap arrays
  if (Array.isArray(target)) {
    // Add to seen BEFORE recursing to handle circular references
    const unwrapped: unknown[] = [];
    seen.set(value, unwrapped);
    if (target !== value as any) seen.set(target, unwrapped);

    // Check if any elements are proxies that need unwrapping
    let hasProxies = false;

    for (const item of target) {
      const unwrappedItem = deepUnwrap(item, targetCache, seen);
      unwrapped.push(unwrappedItem);
      if (unwrappedItem !== item) {
        hasProxies = true;
      }
    }

    // If no proxies were found, return the target as-is
    // But update seen map to point to target instead
    const result = hasProxies ? unwrapped : target;
    seen.set(value, result);
    if (target !== value as any) seen.set(target, result);
    return result;
  }

  // Recursively unwrap objects
  // Add to seen BEFORE recursing to handle circular references
  const unwrapped: Record<string, unknown> = {};
  seen.set(value, unwrapped);
  if (target !== value as any) seen.set(target, unwrapped);

  // Check if any properties are proxies
  let hasProxies = false;

  for (const [key, val] of Object.entries(target)) {
    const unwrappedVal = deepUnwrap(val, targetCache, seen);
    unwrapped[key] = unwrappedVal;
    if (unwrappedVal !== val) {
      hasProxies = true;
    }
  }

  // If no proxies were found, return the target as-is
  // But update seen map to point to target instead
  const result = hasProxies ? unwrapped : target;
  seen.set(value, result);
  if (target !== value as any) seen.set(target, result);

  return result;
}
