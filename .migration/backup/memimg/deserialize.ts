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
      // Handle references
      if (val && typeof val === 'object' && '__type__' in val) {
        const handler = deserializers[(val as any).__type__];
        const result = handler ? handler(val, parsed) : val;
        // If the result is an unresolved ref marker, return it as-is
        // (it will be tracked by the traverse function)
        return result;
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
 * Core two-pass deserialization algorithm with pluggable reference resolution.
 *
 * WHY: Different serialization modes (snapshot vs event) require different
 * reference resolution strategies. This function extracts the shared two-pass
 * algorithm and makes resolution strategy pluggable via the resolveRef parameter.
 *
 * WHAT: Performs two-pass deserialization:
 * - Pass 1: Traverse object graph, reconstruct special types, collect unresolved refs
 * - Pass 2: Resolve all references using the provided resolver function
 *
 * HOW: The algorithm maintains object identity by mutating objects in place.
 * The resolver function determines HOW references are resolved (single-context
 * vs hierarchical scoped resolution).
 *
 * This is the shared implementation used by both deserializeSnapshot and
 * deserializeEventValue. The only difference is the reference resolution strategy.
 *
 * @param parsed - Pre-parsed JSON or object to deserialize
 * @param resolveRef - Function to resolve a reference path to an object
 *                     Signature: (path: Path, root: unknown) => unknown
 *                     The 'root' passed is the deserialized result from pass 1
 * @returns Deserialized object graph with all refs resolved
 *
 * CRITICAL: Must mutate objects in place to maintain object identity for cycles!
 */
function deserializeTwoPass(
  parsed: unknown,
  resolveRef: (path: Path, root: unknown) => unknown
): unknown {
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

      // For Date objects, check if any properties are unresolved refs
      // (This handles circular references in Date properties)
      if (result instanceof Date) {
        for (const key in result) {
          if (Object.prototype.hasOwnProperty.call(result, key)) {
            const value = (result as any)[key];
            if (value && isUnresolvedRefMarker(value)) {
              unresolvedRefs.push({
                parent: result,
                key,
                path: value.__unresolved_ref__,
              });
            }
          }
        }
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

              // For Date objects, check if any properties are unresolved refs
              // (This handles circular references in Date properties)
              if (result instanceof Date) {
                for (const dateKey in result) {
                  if (Object.prototype.hasOwnProperty.call(result, dateKey)) {
                    const dateValue = (result as any)[dateKey];
                    if (dateValue && isUnresolvedRefMarker(dateValue)) {
                      unresolvedRefs.push({
                        parent: result,
                        key: dateKey,
                        path: dateValue.__unresolved_ref__,
                      });
                    }
                  }
                }
              }
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
  let result = traverse(parsed);

  // Second pass: resolve all refs using the pluggable resolver
  for (const ref of unresolvedRefs) {
    const { parent, key, path } = ref;

    // Use the pluggable resolver to get the target object
    // The resolver determines the resolution strategy (single-context vs hierarchical)
    const target = resolveRef(path, result);

    // Replace the placeholder with the actual reference
    if (parent && key !== null) {
      // Normal case: ref is a property of some object
      parent[key] = target;
    } else if (parent === null && key === null) {
      // Special case: the entire value IS a reference
      // This happens when deserializing event values like:
      //   SET root.node.self = {__type__: "ref", path: ["node"]}
      // In this case, we need to RETURN the resolved target
      result = target;
    }
  }

  return result;
}

/**
 * Deserializes a snapshot JSON into a plain JavaScript object graph.
 *
 * WHY: Snapshots are created by serializeMemoryImage which uses SnapshotCycleTracker.
 * All references in a snapshot use absolute paths from the snapshot root (single-context).
 *
 * WHAT: Performs two-pass deserialization with single-context reference resolution:
 * - Pass 1: Reconstruct objects and special types
 * - Pass 2: Resolve all references from the snapshot root
 *
 * HOW: Uses deserializeTwoPass with a simple single-context resolver that
 * navigates from the root following path segments. No hierarchical scoping needed.
 *
 * Single-context resolution matches the serialization behavior of SnapshotCycleTracker
 * which creates refs for all objects seen during serialization, with paths from root.
 *
 * @param json - JSON string or parsed object from serializeMemoryImage
 * @returns Deserialized object graph with cycles restored
 *
 * @example
 * ```typescript
 * const json = serializeMemoryImage(root, proxyToTarget);
 * const restored = deserializeSnapshot(json);
 * // All circular references and object identity preserved
 * ```
 */
export function deserializeSnapshot(json: string | unknown): unknown {
  const parsed = typeof json === "string" ? JSON.parse(json) : json;

  /**
   * Single-context resolver for snapshot deserialization.
   *
   * WHY: Snapshots have all references relative to the snapshot root.
   * All paths are absolute from the single context (the snapshot itself).
   *
   * WHAT: Navigate from root following the path segments.
   *
   * HOW: Simple path traversal - no hierarchical scoping needed.
   */
  const resolveRef = (path: Path, root: unknown) => {
    let target = root;
    for (const segment of path) {
      target = (target as Record<string, unknown>)[segment];
      if (target === undefined) {
        throw new Error(
          `Cannot resolve snapshot ref path: ${path.join(".")}`
        );
      }
    }
    return target;
  };

  return deserializeTwoPass(parsed, resolveRef);
}

/**
 * Deserializes an event value with hierarchical scoped reference resolution.
 *
 * WHY: Event values exhibit closure semantics over the memory graph.
 *
 * Like closures in programming languages, event values have:
 * - **Internal structure** (local scope): Objects appearing multiple times within the value
 * - **Captured external context** (free variables): References to objects in the memory graph
 *
 * This requires hierarchical scoped resolution - exactly like variable lookup in nested scopes.
 *
 * WHAT: Performs two-pass deserialization with hierarchical scoped reference resolution:
 * 1. Try resolving from value scope first (internal refs - relative paths)
 * 2. Fall back to memory scope if not found (external refs - absolute paths)
 *
 * HOW: The resolver implements lexical scoping for reference resolution:
 * - **Local scope (value)**: Try resolving path from the value being deserialized
 * - **Outer scope (memory)**: Fall back to memory graph if not found locally
 * - Only throw error if BOTH scopes fail to resolve the path
 *
 * This matches the serialization behavior of EventCycleTracker which creates:
 * - **Internal refs**: Relative paths for objects within the value (stripped of currentPath prefix)
 * - **External refs**: Absolute paths for objects in the memory graph (outside value tree)
 *
 * The hierarchical resolution is NOT a special case - it's the CORRECT semantics
 * for closure-like structures, identical to variable lookup in nested scopes.
 *
 * @param value - Serialized event value (JSON string or object from serializeValueForEvent)
 * @param memoryRoot - Root of the memory graph for external ref resolution
 * @returns Deserialized value with all refs resolved (internal + external)
 *
 * @example
 * ```typescript
 * // Event: SET root.dept = {...}
 * // The value may contain refs to both:
 * // - Internal objects (within the value being set) - relative paths
 * // - External objects (already in memory graph) - absolute paths
 *
 * const deserialized = deserializeEventValue(
 *   setEvent.value,
 *   memoryRoot
 * );
 * // Internal refs resolve from value scope
 * // External refs resolve from memory scope
 * ```
 */
export function deserializeEventValue(
  value: unknown,
  memoryRoot: unknown
): unknown {
  // Event values are already parsed (not JSON strings)
  // They come directly from event.value which is already JavaScript
  const parsed = value;

  /**
   * Hierarchical scoped resolver - implements closure semantics.
   *
   * WHY: Event values are closures over the memory graph. References need
   * hierarchical scoped resolution: try local first, then outer scope.
   *
   * WHAT: Attempts to resolve the reference path from two scopes:
   * 1. Value scope (local) - for internal references with relative paths
   * 2. Memory scope (outer) - for external references with absolute paths
   *
   * HOW: This is exactly like variable resolution in nested scopes:
   *
   *   function outer() {
   *     const x = 1;        // outer scope (memory graph)
   *     function inner() {
   *       const y = 2;      // local scope (value being deserialized)
   *       return x + y;     // x from outer, y from local
   *     }
   *   }
   *
   * The resolver tries local scope (value) first. If not found, tries
   * outer scope (memory). Only throws if BOTH fail.
   */
  const resolveRef = (path: Path, valueRoot: unknown): unknown => {
    // Step 1: Try value scope first (internal refs - relative paths)
    //
    // WHY: Internal refs are objects appearing multiple times within the value.
    // EventCycleTracker creates these with relative paths (stripped of currentPath).
    //
    // WHAT: Walk the path from valueRoot. If successful, return the target.
    //
    // HOW: Navigate path segments. If any segment is undefined, path doesn't
    // exist in value scope - try memory scope instead.
    //
    // EXAMPLE: path=['internal', 'obj'] in value {internal: {obj: {...}}}
    let target: any = valueRoot;
    let foundInValueScope = true;

    for (const segment of path) {
      const next = target?.[segment];
      if (next === undefined) {
        // Path doesn't exist in value scope
        foundInValueScope = false;
        break;
      }
      target = next;
    }

    // If found in value scope, return it immediately
    // This is the "local variable" case in closure semantics
    if (foundInValueScope) {
      return target;
    }

    // Step 2: Fall back to memory scope (external refs - absolute paths)
    //
    // WHY: External refs point to objects that already existed in the memory
    // graph before this event value was created.
    //
    // WHAT: Walk the path from memoryRoot. Throw if not found.
    //
    // HOW: Navigate path segments from memory root. If not found, this is
    // a true error - path doesn't exist in either scope.
    //
    // EXAMPLE: path=['emps', '0'] for root.emps[0] from memory
    target = memoryRoot;
    for (const segment of path) {
      const next = (target as Record<string, unknown>)?.[segment];
      if (next === undefined) {
        // Path doesn't exist in either scope - this is an error
        throw new Error(
          `Cannot resolve event value ref path: ${path.join(".")} ` +
          `(not found in value scope or memory scope)`
        );
      }
      target = next;
    }

    // Successfully resolved from outer scope
    // This is the "free variable" case in closure semantics
    return target;
  };

  return deserializeTwoPass(parsed, resolveRef);
}

/**
 * Deserializes a JSON string into a plain JavaScript object graph.
 *
 * WHY: Backward compatibility - this was the original API for snapshot deserialization.
 *
 * WHAT: Alias for deserializeSnapshot. All behavior is identical.
 *
 * HOW: Direct function reference (not a wrapper).
 *
 * Uses two-pass algorithm:
 * 1. First pass: traverse and replace special types, mark refs as unresolved
 * 2. Second pass: resolve all references to actual objects
 *
 * CRITICAL: Must mutate objects in place to maintain object identity!
 *
 * @param json - JSON string or parsed object
 * @returns Deserialized object graph
 */
export const deserializeMemoryImage = deserializeSnapshot;

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
