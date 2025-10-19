/**
 * Deserialization module for Memory Image Processor
 *
 * Provides pure functions for reconstructing JavaScript object graphs from
 * serialized representations, handling cycles via two-pass resolution.
 *
 * CRITICAL: This implementation MUST mutate objects in place during reference
 * resolution to maintain object identity for cycles.
 */

import type { Path, SerializedValue, UnresolvedReference } from "./types.js";

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value has a __type__ marker
 */
const hasTypeMarker = (
  value: unknown,
): value is { __type__: string; [key: string]: unknown } => {
  return (
    typeof value === "object" &&
    value !== null &&
    "__type__" in value &&
    typeof (value as { __type__: unknown }).__type__ === "string"
  );
};

// ============================================================================
// Deserialization Handlers for Special Types
// ============================================================================

/**
 * Reconstruct a function from its source code
 */
const deserializeFunction = (obj: {
  sourceCode: string;
}): ((...args: unknown[]) => unknown) & {
  __type__: string;
  sourceCode: string;
} => {
  const fn = new Function(`return (${obj.sourceCode})`)() as (
    ...args: unknown[]
  ) => unknown;
  const wrappedFn = fn as typeof fn & { __type__: string; sourceCode: string };
  wrappedFn.__type__ = "function";
  wrappedFn.sourceCode = obj.sourceCode;
  return wrappedFn;
};

/**
 * Reconstruct a Date with all its properties
 */
const deserializeDate = (
  obj: Record<string, unknown>,
  reconstructValue: (val: unknown, refs: Record<string, unknown>) => unknown,
  refs: Record<string, unknown>
): Date => {
  // Expect new format: { __type__: 'date', __dateValue__: '...', ...properties }
  if (!('__dateValue__' in obj)) {
    // Handle old format for backward compatibility (if needed)
    // For now, throw clear error since no legacy data exists
    throw new Error('Invalid Date serialization format: missing __dateValue__ field');
  }

  // Create Date from timestamp (handle null for invalid dates)
  const dateValue = obj.__dateValue__;
  const date = dateValue === null ? new Date('invalid') : new Date(dateValue as string);

  // Restore all user-defined properties (skip metadata fields)
  for (const [key, value] of Object.entries(obj)) {
    // Skip internal metadata fields
    if (key === '__type__' || key === '__dateValue__') {
      continue;
    }

    // Recursively reconstruct property values
    // This handles nested objects, arrays, collections, etc.
    (date as any)[key] = reconstructValue(value, refs);
  }

  return date;
};

/**
 * Reconstruct a BigInt from string
 */
const deserializeBigInt = (obj: { value: string }): bigint => {
  return BigInt(obj.value);
};

/**
 * Reconstruct a Symbol from description
 * Note: Symbols are unique by nature - deserialized symbols are new instances
 */
const deserializeSymbol = (obj: {
  description: string | undefined;
}): symbol => {
  return Symbol(obj.description);
};

/**
 * Marker for unresolved references during first pass
 */
interface UnresolvedRefMarker {
  __unresolved_ref__: Path;
}

/**
 * Check if value is an unresolved ref marker
 */
const isUnresolvedRefMarker = (
  value: unknown,
): value is UnresolvedRefMarker => {
  return (
    typeof value === "object" && value !== null && "__unresolved_ref__" in value
  );
};

/**
 * Reconstruct a Map from its entries
 */
const deserializeMap = (obj: { entries: [unknown, unknown][] }, parsed: any): Map<unknown, unknown> => {
  const map = new Map();
  for (const [key, value] of obj.entries) {
    // Recursively deserialize keys and values
    const deserializedKey = typeof key === 'object' && key !== null && (key as any).__type__
      ? deserializers[(key as any).__type__]?.(key, parsed) || key
      : key;
    const deserializedValue = typeof value === 'object' && value !== null && (value as any).__type__
      ? deserializers[(value as any).__type__]?.(value, parsed) || value
      : value;
    map.set(deserializedKey, deserializedValue);
  }
  return map;
};

/**
 * Reconstruct a Set from its values
 */
const deserializeSet = (obj: { values: unknown[] }, parsed: any): Set<unknown> => {
  const set = new Set();
  for (const value of obj.values) {
    // Recursively deserialize values
    const deserializedValue = typeof value === 'object' && value !== null && (value as any).__type__
      ? deserializers[(value as any).__type__]?.(value, parsed) || value
      : value;
    set.add(deserializedValue);
  }
  return set;
};

/**
 * Deserialization handlers registry
 */
const deserializers: Record<string, (obj: any, parsed: any) => any> = {
  function: (obj) => deserializeFunction(obj),
  date: (obj, parsed) => {
    // Create simple reconstruction function for use in deserializeMemoryImage context
    const simpleReconstruct = (val: unknown, _refs: Record<string, unknown>) => {
      if (val && typeof val === 'object' && '__type__' in val) {
        const handler = deserializers[(val as any).__type__];
        return handler ? handler(val, parsed) : val;
      }
      return val;
    };
    return deserializeDate(obj, simpleReconstruct, parsed);
  },
  bigint: (obj) => deserializeBigInt(obj),
  symbol: (obj) => deserializeSymbol(obj),
  ref: (obj) => ({ __unresolved_ref__: obj.path }) as UnresolvedRefMarker,
  map: (obj, parsed) => deserializeMap(obj, parsed),
  set: (obj, parsed) => deserializeSet(obj, parsed),
};

// ============================================================================
// Main Deserialization Logic
// ============================================================================

/**
 * Deserializes a JSON string into a plain JavaScript object graph.
 *
 * Uses two-pass algorithm:
 * 1. First pass: traverse and replace special types, mark refs as unresolved
 * 2. Second pass: resolve all references to actual objects
 *
 * CRITICAL: Must mutate objects in place to maintain object identity!
 */
export const deserializeMemoryImage = (json: string | unknown): unknown => {
  const parsed = typeof json === "string" ? JSON.parse(json) : json;
  const unresolvedRefs: Array<{
    parent: any;
    key: string | null;
    path: Path;
  }> = [];

  // First pass: traverse and replace special types
  function traverse(obj: any, path: Path = []): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    // Check if this object has a __type__ marker
    if (obj.__type__ && deserializers[obj.__type__]) {
      const handler = deserializers[obj.__type__];
      if (!handler) return obj; // Should never happen, but satisfies TypeScript
      const result = handler(obj, parsed);

      // Track unresolved refs for second pass
      if (result && isUnresolvedRefMarker(result)) {
        unresolvedRefs.push({
          parent: null,
          key: null,
          path: result.__unresolved_ref__,
        });
        return result;
      }

      return result;
    }

    // Recursively process all properties
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];

        if (value && typeof value === "object") {
          // Check if it's a special type
          if (value.__type__ && deserializers[value.__type__]) {
            const handler = deserializers[value.__type__];
            if (!handler) continue; // Should never happen, but satisfies TypeScript
            const result = handler(value, parsed);

            // Track unresolved refs for second pass
            if (result && isUnresolvedRefMarker(result)) {
              unresolvedRefs.push({
                parent: obj,
                key,
                path: result.__unresolved_ref__,
              });
            } else {
              obj[key] = result;
            }
          } else {
            // Regular object, recurse
            traverse(value, [...path, key]);
          }
        }
      }
    }

    return obj;
  }

  // First pass - IMPORTANT: capture the result!
  // If the top-level object is a special type (e.g., Date), traverse returns the deserialized result
  const result = traverse(parsed);

  // Second pass: resolve all refs
  for (const ref of unresolvedRefs) {
    const { parent, key, path } = ref;

    // Navigate to the referenced object
    let target: any = result;
    for (const segment of path) {
      target = target[segment];
      if (target === undefined) {
        throw new Error(`Cannot resolve reference path: ${path.join(".")}`);
      }
    }

    // Replace the placeholder with the actual reference
    if (parent && key !== null) {
      parent[key] = target;
    }
  }

  return result;
};

/**
 * Reconstructs a value from event data, resolving references to existing
 * objects in the memory image.
 *
 * CRITICAL: Uses seen WeakMap to handle circular references and prevent
 * infinite recursion. Objects are added to seen BEFORE recursing into their
 * properties, allowing circular refs to be resolved correctly.
 */
export const reconstructValue = (
  value: SerializedValue,
  root: unknown,
  seen: WeakMap<object, unknown> = new WeakMap()
): unknown => {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  // Check if we've already started reconstructing this value (circular ref)
  if (seen.has(value)) {
    return seen.get(value);
  }

  // Handle special types
  if (hasTypeMarker(value)) {
    const typedValue = value as { __type__: string; [key: string]: unknown };

    switch (typedValue.__type__) {
      case "function":
        return deserializeFunction(
          typedValue as unknown as { sourceCode: string },
        );

      case "date": {
        // Create wrapper that matches expected signature
        const refs = root as Record<string, unknown>;
        const reconstruct = (val: unknown, _refs: Record<string, unknown>) =>
          reconstructValue(val as SerializedValue, root, seen);
        return deserializeDate(
          typedValue as unknown as Record<string, unknown>,
          reconstruct,
          refs
        );
      }

      case "bigint":
        return deserializeBigInt(typedValue as unknown as { value: string });

      case "symbol":
        return deserializeSymbol(
          typedValue as unknown as { description: string | undefined },
        );

      case "ref": {
        const refValue = typedValue as unknown as { path: Path };
        let target = root;
        for (const segment of refValue.path) {
          target = (target as Record<string, unknown>)[segment];
          if (target === undefined) {
            throw new Error(
              `Cannot resolve ref path: ${refValue.path.join(".")}`,
            );
          }
        }
        return target;
      }

      case "map": {
        const mapValue = typedValue as unknown as {
          entries: [unknown, unknown][];
        };
        const map = new Map<unknown, unknown>();
        // Add to seen before recursing (handles cycles)
        seen.set(value, map);
        for (const [k, v] of mapValue.entries) {
          const key = reconstructValue(k as SerializedValue, root, seen);
          const val = reconstructValue(v as SerializedValue, root, seen);
          map.set(key, val);
        }
        return map;
      }

      case "set": {
        const setValue = typedValue as unknown as { values: unknown[] };
        const set = new Set<unknown>();
        // Add to seen before recursing (handles cycles)
        seen.set(value, set);
        for (const v of setValue.values) {
          set.add(reconstructValue(v as SerializedValue, root, seen));
        }
        return set;
      }

      case "circular":
        // Internal circular reference - should have been caught by seen check above
        // This is a fallback in case serialization created explicit circular markers
        throw new Error(
          "Encountered explicit circular marker - this indicates a serialization issue"
        );
    }
  }

  // Arrays
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    // CRITICAL: Add to seen BEFORE recursing (allows circular refs to resolve)
    seen.set(value, result);
    for (const v of value) {
      result.push(reconstructValue(v as SerializedValue, root, seen));
    }
    return result;
  }

  // Plain objects
  const result: Record<string, unknown> = {};
  // CRITICAL: Add to seen BEFORE recursing (allows circular refs to resolve)
  seen.set(value, result);
  for (const key in value) {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      result[key] = reconstructValue(
        (value as Record<string, SerializedValue>)[key],
        root,
        seen
      );
    }
  }
  return result;
};
