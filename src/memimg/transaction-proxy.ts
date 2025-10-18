/**
 * Transaction Proxy - Proxy creation for transaction isolation
 *
 * Creates proxies that intercept all property access and modifications,
 * tracking changes in the delta manager for later commit or discard.
 *
 * Extracted from transaction.ts to separate proxy logic from transaction API.
 */

import type { DeltaManager } from './delta-manager.js';

/**
 * Helper to check if value is an object (including arrays)
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Creates a transaction wrapper around a memory image
 *
 * All reads check delta first, then fall back to base.
 * All writes go to delta only (not applied to base until commit).
 *
 * @param memimg - The base memory image
 * @param deltaManager - Delta manager for tracking changes
 * @param path - Current path in object graph
 * @param proxyCache - Cache to ensure same proxy instance for same object
 * @param targetCache - Reverse cache (proxy → target) for unwrapping
 * @returns Transaction proxy
 */
export function createTransactionProxy(
  memimg: any,
  deltaManager: DeltaManager,
  path: string[],
  proxyCache: WeakMap<object, any>,
  targetCache: WeakMap<object, any>
): any {
  // Return cached proxy if it exists
  if (proxyCache.has(memimg)) {
    return proxyCache.get(memimg);
  }

  const DELETED = deltaManager.getDeletedSymbol();

  const proxy = new Proxy(memimg, {
    get(obj, prop) {
      // Skip special properties
      if (typeof prop === 'symbol') {
        return obj[prop];
      }

      const newPath = [...path, String(prop)];
      const pathKey = newPath.join('.');

      // Check delta first
      if (deltaManager.has(pathKey)) {
        const deltaValue = deltaManager.get(pathKey);

        // If marked as deleted, return undefined
        if (deltaValue === DELETED) {
          return undefined;
        }

        // Regular value in delta - return it (wrapped if object)
        if (isObject(deltaValue)) {
          // If it's already one of our proxies, return it directly (don't wrap again)
          if (targetCache.has(deltaValue)) {
            return deltaValue;
          }
          // Otherwise, wrap it in a proxy
          return createTransactionProxy(deltaValue, deltaManager, newPath, proxyCache, targetCache);
        }
        return deltaValue;
      }

      // Fallback to original memimg value
      const value = obj[prop];

      // If it's a function and obj is an array, intercept mutating methods
      // Native array methods bypass proxy SET traps, so we need to manually track changes
      if (typeof value === 'function' && Array.isArray(obj)) {
        const methodName = String(prop);

        // List of array methods that mutate the array
        const mutatingMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];

        if (mutatingMethods.includes(methodName)) {
          return function(...args: any[]) {
            const arrayPathKey = path.join('.');

            // Get or create array copy in delta
            let arrayCopy: any[];
            if (deltaManager.has(arrayPathKey)) {
              arrayCopy = deltaManager.get(arrayPathKey) as any[];
            } else {
              // First mutation - make a copy
              arrayCopy = [...obj];
              deltaManager.set(arrayPathKey, arrayCopy);
            }

            // Call the method on the COPY (not the original)
            const result = value.apply(arrayCopy, args);

            return result;
          };
        }

        // Non-mutating methods: just bind normally
        return value.bind(obj);
      }

      // Wrap objects so we can intercept their access too
      if (isObject(value)) {
        // If it's already one of our proxies, return it directly (don't wrap again)
        if (targetCache.has(value)) {
          return value;
        }
        // Otherwise, wrap it in a proxy
        return createTransactionProxy(value, deltaManager, newPath, proxyCache, targetCache);
      }
      return value;
    },

    set(obj, prop, value) {
      const newPath = [...path, String(prop)];
      const pathKey = newPath.join('.');

      // Store value directly in delta (even if it's a proxy)
      // We'll unwrap during save()
      deltaManager.set(pathKey, value);

      return true;
    },

    has(obj, prop) {
      const newPath = [...path, String(prop)];
      const pathKey = newPath.join('.');

      // Check delta first
      if (deltaManager.has(pathKey)) {
        // If marked as deleted, return false
        return deltaManager.get(pathKey) !== DELETED;
      }

      // Fallback to original
      return prop in obj;
    },

    deleteProperty(obj, prop) {
      const newPath = [...path, String(prop)];
      const pathKey = newPath.join('.');

      // Mark as deleted in delta using DELETED symbol
      deltaManager.delete(pathKey);

      return true;
    },

    ownKeys(obj) {
      // Start with base keys
      const baseKeys = Reflect.ownKeys(obj);

      // Collect delta keys for this level
      const prefix = path.length > 0 ? path.join('.') + '.' : '';
      const deltaKeysAtLevel = new Set<string | symbol>();

      // Iterate through delta to find keys at this level
      for (const [pathKey, value] of deltaManager.entries()) {
        if (pathKey.startsWith(prefix)) {
          const remainder = pathKey.slice(prefix.length);
          const nextDot = remainder.indexOf('.');
          const key = nextDot === -1 ? remainder : remainder.slice(0, nextDot);

          if (value !== DELETED) {
            deltaKeysAtLevel.add(key);
          }
        }
      }

      // Combine base keys with delta additions, exclude deletions
      const keySet = new Set(baseKeys);

      for (const [pathKey, value] of deltaManager.entries()) {
        if (pathKey.startsWith(prefix)) {
          const remainder = pathKey.slice(prefix.length);
          const nextDot = remainder.indexOf('.');

          if (nextDot === -1) {
            // This is a direct child key
            const key = remainder;

            if (value === DELETED) {
              keySet.delete(key);
            } else {
              keySet.add(key);
            }
          }
        }
      }

      return Array.from(keySet);
    },

    getOwnPropertyDescriptor(obj, prop) {
      const newPath = [...path, String(prop)];
      const pathKey = newPath.join('.');

      // Check delta first
      if (deltaManager.has(pathKey)) {
        const value = deltaManager.get(pathKey);

        // If deleted, return undefined
        if (value === DELETED) {
          return undefined;
        }

        // Return descriptor for delta value
        return {
          value,
          writable: true,
          enumerable: true,
          configurable: true
        };
      }

      // Fallback to base
      return Reflect.getOwnPropertyDescriptor(obj, prop);
    }
  });

  // Cache the proxy before returning
  proxyCache.set(memimg, proxy);
  // Also cache the reverse mapping (proxy → target) for unwrapping
  targetCache.set(proxy, memimg);
  return proxy;
}
