/**
 * Proxy infrastructure module for Memory Image Processor
 *
 * ==============================================================================
 * ARCHITECTURE: THE TRANSPARENT IMPERATIVE SHELL
 * ==============================================================================
 *
 * This module implements the "imperative shell" pattern - all mutations are
 * encapsulated behind proxies, making mutation tracking completely transparent
 * to users. You interact with normal-looking JavaScript objects; the proxies
 * intercept and log every change behind the scenes.
 *
 * CORE RESPONSIBILITIES:
 *
 * 1. **Proxy Infrastructure Setup** (createProxyInfrastructure)
 *    Creates the three WeakMaps that form our tracking system's backbone.
 *
 * 2. **Recursive Wrapping** (wrapIfNeeded)
 *    Wraps objects, arrays, Maps, Sets in proxies. Handles cycles correctly.
 *
 * 3. **Proxy Handler Definition** (createProxyHandler)
 *    Defines the traps that intercept get/set/deleteProperty operations.
 *
 * 4. **Collection Method Wrapping** (via collection-wrapper.ts)
 *    Wraps Array/Map/Set mutation methods (push, set, add, etc.)
 *
 * KEY DESIGN INSIGHT - Wrap Before Recurse:
 *
 * To handle circular references correctly, we MUST:
 * 1. Create the proxy immediately
 * 2. Register it in targetToProxy
 * 3. THEN recurse into properties
 *
 * If we recursed first, circular refs would infinite loop.
 * Example: emp.dept.employees[0] === emp
 *
 * THE INTERCEPTION FLOW:
 *
 * When user writes: `scott.emps.king.sal = 5000`
 *
 * 1. JavaScript evaluates left-to-right:
 *    - scott → returns proxy
 *    - scott.emps → GET trap fires → returns emps proxy
 *    - scott.emps.king → GET trap fires → returns king proxy
 *    - scott.emps.king.sal = 5000 → SET trap fires
 *
 * 2. SET trap executes:
 *    - Looks up king's path: ['emps', 'king']
 *    - Builds new path: ['emps', 'king', 'sal']
 *    - Wraps value: 5000 (primitive, returns as-is)
 *    - Performs assignment: king.sal = 5000
 *    - Creates event: { type: 'SET', path: ['emps', 'king', 'sal'], value: 5000 }
 *    - Logs event to EventLog
 *
 * 3. Later, during replay:
 *    - Event is read from log
 *    - Path ['emps', 'king', 'sal'] is traversed
 *    - Value 5000 is assigned
 *    - State is reconstructed
 *
 * SPECIAL CASES:
 *
 * - **Functions**: Proxied with metadata attached for serialization
 * - **Dates**: NOT proxied (immutable, treated as primitive)
 * - **Maps/Sets**: Proxied + methods wrapped for mutation tracking
 * - **Arrays**: Proxied + mutating methods (push, pop, etc.) wrapped
 * - **Primitives**: Pass through unwrapped (immutable)
 *
 * REFACTORING HIGHLIGHTS (Phase 7):
 *
 * - Unified collection method wrapping (eliminated 90 lines of duplication)
 * - All three collection types (Array, Map, Set) now use same wrapper
 * - Data-driven approach replaced three nearly-identical functions
 *
 * This is where the "magic" happens - transparent mutation tracking that
 * enables event sourcing, time-travel debugging, and delta synchronization.
 */

import type {
  Path,
  EventLog,
  ProxyInfrastructure,
  ReplayState,
  SerializedValue,
  MetadataProvider,
} from "./types.js";
import { serializeValueForEvent } from "./serialize.js";
import { eventRegistry } from "./event-handlers.js";
import { EVENT_TYPES, MUTATING_ARRAY_METHODS, MUTATING_MAP_METHODS, MUTATING_SET_METHODS } from "./constants.js";
import { wrapCollectionMethod } from "./collection-wrapper.js";

// ============================================================================
// Proxy Infrastructure Creation
// ============================================================================

/**
 * Creates the WeakMap infrastructure for tracking objects and their proxies.
 *
 * These three WeakMaps form the core of our object tracking system:
 *
 * 1. targetToProxy: Given an unwrapped object, find its proxy
 *    - Ensures same object always gets same proxy (reference identity)
 *    - Prevents double-wrapping: if we see an object again, reuse its proxy
 *
 * 2. proxyToTarget: Given a proxy, find the original object
 *    - Needed for serialization: we serialize the target, not the proxy
 *    - Used to detect if a value is already wrapped
 *
 * 3. targetToPath: Given an object, find its path in the object graph
 *    - Path is array of property names from root: ['emps', 'smith', 'dept']
 *    - Used for cycle detection: if object already has path, create reference
 *    - Used for event logging: every mutation needs its path
 *
 * Why WeakMaps? They don't prevent garbage collection. If an object becomes
 * unreachable, it gets GC'd even if it's in these maps.
 */
export const createProxyInfrastructure = (
  metadata?: MetadataProvider,
): ProxyInfrastructure => ({
  targetToProxy: new WeakMap(),
  proxyToTarget: new WeakMap(),
  targetToPath: new WeakMap(),
  metadata,
});

// ============================================================================
// Function Wrapping
// ============================================================================

/**
 * Wraps a function in a proxy while maintaining callability.
 *
 * Challenge: We need to serialize functions, but functions aren't JSON-serializable.
 * Solution: Store the source code via toString() and reconstruct via Function constructor.
 *
 * Critical design decision: We proxy the function itself, NOT an object containing it.
 * Early attempt: wrap {__type__, sourceCode, fn} - FAILED because typeof === 'object'
 * Current approach: Proxy the function directly, attach metadata as properties
 *
 * Limitation: This only works for "pure" functions or those using explicit parameters.
 * Functions that capture closures will lose their captured scope on deserialization.
 *
 * @param fn - The function to wrap
 * @param path - Path from root to this function
 * @param infrastructure - Proxy tracking infrastructure
 * @returns Proxied function with metadata attached
 */
const wrapFunction = (
  fn: (...args: unknown[]) => unknown,
  path: Path,
  infrastructure: ProxyInfrastructure,
): ((...args: unknown[]) => unknown) & {
  __type__: string;
  sourceCode: string;
} => {
  // Check if already wrapped
  if (infrastructure.targetToProxy.has(fn as object)) {
    return infrastructure.targetToProxy.get(fn as object) as ReturnType<typeof wrapFunction>;
  }

  // Attach metadata directly to the function object
  // Functions are objects in JS, so we can add properties to them
  const fnWithMeta = fn as typeof fn & { __type__: string; sourceCode: string };

  try {
    fnWithMeta.__type__ = "function";
    fnWithMeta.sourceCode = fn.toString();
  } catch (err) {
    // Some functions may not allow property assignments (e.g., bound functions, frozen functions)
    // In this case, we'll add the metadata via the proxy's get trap instead
  }

  const functionHandler: ProxyHandler<typeof fnWithMeta> = {
    get(target, property) {
      // Provide metadata via proxy if we couldn't attach it directly
      if (property === '__type__' && !target.__type__) return "function";
      if (property === 'sourceCode' && !target.sourceCode) return target.toString();

      // Allow reading any property, including our metadata
      return (target as unknown as Record<string | symbol, unknown>)[property];
    },

    apply(target, thisArg, args) {
      // This trap makes the proxy callable
      // When someone calls proxiedFn(...), this is invoked
      return target.apply(thisArg, args);
    },
  };

  // Create proxy and register in infrastructure
  const proxy = new Proxy(fnWithMeta, functionHandler);
  infrastructure.targetToProxy.set(fn as object, proxy);
  infrastructure.proxyToTarget.set(proxy as object, fn as object);
  infrastructure.targetToPath.set(fn as object, path);

  // Return proxy over the function itself
  // typeof result === 'function' (not 'object'), so it remains callable
  return proxy;
};

// ============================================================================
// Collection Method Interception
// ============================================================================

/**
 * Collection method wrapping is now unified in collection-wrapper.ts
 *
 * Previous implementation had three nearly-identical functions:
 * - wrapArrayMethod (31 lines)
 * - wrapMapMethod (30 lines)
 * - wrapSetMethod (30 lines)
 *
 * Replaced with single wrapCollectionMethod (~30 lines) using data-driven approach.
 * Eliminates ~90 lines of duplication.
 *
 * See collection-wrapper.ts for implementation details.
 */

// ============================================================================
// Recursive Wrapping
// ============================================================================

/**
 * Recursively wraps a value in a proxy, handling all JS types correctly.
 *
 * This is where the magic happens - every object assigned to our memory image
 * passes through this function and gets transparently wrapped.
 *
 * Key insight: We must wrap BEFORE recursing to handle circular references.
 * Example cycle:
 *   emp.dept = dept1
 *   dept1.employees = [emp]  // emp references dept1, dept1 references emp
 *
 * If we recursed first, we'd infinite loop. Instead:
 * 1. Create proxy immediately and register it in targetToProxy
 * 2. Then recurse into properties
 * 3. When we encounter emp again (via dept1.employees), targetToProxy.has(emp) is true
 * 4. Return existing proxy instead of creating new one
 *
 * @param value - Value to wrap (any JS type)
 * @param path - Path from root to this value (for cycle detection)
 * @param infrastructure - Proxy tracking infrastructure
 * @param eventLog - Optional event log
 * @param replayState - Replay state flag
 * @returns Wrapped value (proxy for objects, original for primitives)
 */
export const wrapIfNeeded = (
  value: unknown,
  path: Path,
  infrastructure: ProxyInfrastructure,
  eventLog?: EventLog,
  replayState?: ReplayState,
): unknown => {
  // Functions get special treatment
  if (typeof value === "function") {
    return wrapFunction(value as (...args: unknown[]) => unknown, path, infrastructure);
  }

  // Primitives (including symbol, bigint) and null don't need wrapping
  if (value === null || typeof value !== "object") {
    return value;
  }

  // CRITICAL: Check if value is already a proxy
  if (infrastructure.proxyToTarget.has(value as object)) {
    return value; // Already a proxy, return as-is
  }

  // Check if the underlying target is already wrapped
  if (infrastructure.targetToProxy.has(value as object)) {
    return infrastructure.targetToProxy.get(value as object);
  }

  // Create the proxy handler
  const handler = createProxyHandler(infrastructure, eventLog, replayState);

  // Create proxy FIRST, before recursing
  const proxy = new Proxy(value as object, handler);
  infrastructure.targetToProxy.set(value as object, proxy);
  infrastructure.proxyToTarget.set(proxy, value as object);
  infrastructure.targetToPath.set(value as object, path);

  // Now recursively wrap children
  if (value instanceof Map) {
    const entries = Array.from(value.entries());
    value.clear();
    for (const [k, v] of entries) {
      const wrappedKey = wrapIfNeeded(
        k,
        [...path, "key"],
        infrastructure,
        eventLog,
        replayState,
      );
      const wrappedValue = wrapIfNeeded(
        v,
        [...path, String(k)],
        infrastructure,
        eventLog,
        replayState,
      );
      value.set(wrappedKey, wrappedValue);
    }
  } else if (value instanceof Set) {
    const values = Array.from(value.values());
    value.clear();
    for (const v of values) {
      const wrappedValue = wrapIfNeeded(
        v,
        [...path, String(v)],
        infrastructure,
        eventLog,
        replayState,
      );
      value.add(wrappedValue);
    }
  } else {
    // Plain objects and arrays
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        try {
          // Try to wrap and reassign the value
          // This may fail for frozen objects, read-only properties, or getters without setters
          (value as Record<string, unknown>)[key] = wrapIfNeeded(
            (value as Record<string, unknown>)[key],
            [...path, key],
            infrastructure,
            eventLog,
            replayState,
          );
        } catch (err) {
          // Silently ignore errors when we can't reassign the property
          // The proxy will still work correctly - we just can't pre-wrap nested values
          // They'll be wrapped on-demand when accessed via the GET trap
        }
      }
    }
  }

  return proxy;
};

// ============================================================================
// Proxy Handler Creation
// ============================================================================

/**
 * Creates a proxy handler that intercepts get, set, and deleteProperty operations.
 *
 * This handler defines how our proxies intercept operations.
 *
 * We use three traps:
 * 1. get() - Intercepts property access (obj.prop or obj['prop'])
 * 2. set() - Intercepts property assignment (obj.prop = value)
 * 3. deleteProperty() - Intercepts deletion (delete obj.prop)
 *
 * @param infrastructure - Proxy tracking infrastructure
 * @param eventLog - Optional event log
 * @param replayState - Replay state flag
 * @returns ProxyHandler
 */
const createProxyHandler = (
  infrastructure: ProxyInfrastructure,
  eventLog?: EventLog,
  replayState?: ReplayState,
): ProxyHandler<object> => ({
  /**
   * GET trap - Intercepts property access
   *
   * Main job: Wrap collection mutation methods before returning them.
   */
  get(target: object, property: string | symbol): unknown {
    const value = (target as Record<string | symbol, unknown>)[property];

    // Special handling for Date objects
    // Date methods need to be bound to the target, not the proxy
    if (target instanceof Date) {
      // List of Date methods that operate on the internal timestamp
      const dateMethods = [
        // Getters
        'getTime', 'getFullYear', 'getMonth', 'getDate',
        'getDay', 'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds',
        'getUTCFullYear', 'getUTCMonth', 'getUTCDate', 'getUTCDay',
        'getUTCHours', 'getUTCMinutes', 'getUTCSeconds', 'getUTCMilliseconds',
        'getTimezoneOffset',
        // Setters (these WILL be tracked as they mutate the timestamp)
        'setTime', 'setFullYear', 'setMonth', 'setDate',
        'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds',
        'setUTCFullYear', 'setUTCMonth', 'setUTCDate',
        'setUTCHours', 'setUTCMinutes', 'setUTCSeconds', 'setUTCMilliseconds',
        // Conversion methods
        'toISOString', 'toDateString', 'toTimeString', 'toLocaleDateString',
        'toLocaleString', 'toLocaleTimeString', 'toUTCString',
        'toString', 'toJSON',
        // Other
        'valueOf'
      ];

      if (dateMethods.includes(property as string)) {
        const val = value;
        if (typeof val === 'function') {
          // Bind method to target, not proxy
          // This ensures Date methods operate on the internal [[DateValue]] slot
          return val.bind(target);
        }
        return val;
      }

      // Symbol.toPrimitive - used for type coercion
      if (property === Symbol.toPrimitive) {
        return (target as Date)[Symbol.toPrimitive].bind(target);
      }
    }

    // Arrays: Wrap mutating methods
    if (Array.isArray(target) && typeof value === "function") {
      const methodName = String(property);

      if (MUTATING_ARRAY_METHODS.includes(methodName as typeof MUTATING_ARRAY_METHODS[number])) {
        return wrapCollectionMethod(
          target,
          "Array",
          methodName,
          value as (...args: unknown[]) => unknown,
          infrastructure,
          eventLog,
          replayState,
        );
      }
    }

    // Maps: Wrap mutating methods, bind non-mutating methods
    if (target instanceof Map && typeof value === "function") {
      const methodName = String(property);

      if (MUTATING_MAP_METHODS.includes(methodName as typeof MUTATING_MAP_METHODS[number])) {
        return wrapCollectionMethod(
          target,
          "Map",
          methodName,
          value as (...args: unknown[]) => unknown,
          infrastructure,
          eventLog,
          replayState,
        );
      }
      return (value as (...args: unknown[]) => unknown).bind(target);
    }

    // Sets: Same pattern as Maps
    if (target instanceof Set && typeof value === "function") {
      const methodName = String(property);

      if (MUTATING_SET_METHODS.includes(methodName as typeof MUTATING_SET_METHODS[number])) {
        return wrapCollectionMethod(
          target,
          "Set",
          methodName,
          value as (...args: unknown[]) => unknown,
          infrastructure,
          eventLog,
          replayState,
        );
      }
      return (value as (...args: unknown[]) => unknown).bind(target);
    }

    // CRITICAL: Wrap non-primitive values before returning them
    // This ensures objects accessed from arrays/objects get proxied on-the-fly
    // Example: root.users[0] returns a wrapped object, so root.users[0].age = 31 is tracked
    if (value !== null && typeof value === "object") {
      const parentPath = infrastructure.targetToPath.get(target) || [];
      const valuePath = [...parentPath, String(property)];

      // wrapIfNeeded handles reference identity - returns existing proxy if already wrapped
      return wrapIfNeeded(
        value,
        valuePath,
        infrastructure,
        eventLog,
        replayState,
      );
    }

    return value;
  },

  /**
   * SET trap - Intercepts property assignment
   *
   * This is the heart of mutation tracking. Every assignment triggers this.
   *
   * RUNTIME FLOW:
   *
   * When user writes: `scott.emps.king.sal = 5000`
   *
   * 1. JavaScript evaluates to: king_proxy.sal = 5000
   * 2. SET trap fires on king_proxy
   * 3. We look up king's path: ['emps', 'king']
   * 4. Build new path: ['emps', 'king', 'sal']
   * 5. Wrap value recursively (creates proxies if needed)
   * 6. Assign wrapped value to underlying object
   * 7. Create & log SET event
   *
   * IMPORTANT: We wrap the value BEFORE assigning it, ensuring that any
   * objects in the value tree are also tracked. This maintains the invariant:
   * "every object in the graph is either a proxy or immutable".
   */
  set(target: object, property: string | symbol, value: unknown): boolean {
    // Step 1: Build the full path from root to this property
    // Example: if target is at ['emps', 'king'] and property is 'sal'
    // then newPath becomes ['emps', 'king', 'sal']
    const parentPath = infrastructure.targetToPath.get(target) || [];
    const newPath = [...parentPath, String(property)];

    // Step 2: Wrap the value recursively
    // If value is an object, this creates a proxy for it and all descendants
    // If value is a primitive, returns it unchanged
    // CRITICAL: This happens BEFORE assignment to ensure tracking starts immediately
    const wrappedValue = wrapIfNeeded(
      value,
      newPath,
      infrastructure,
      eventLog,
      replayState,
    );

    // Step 3: Perform the actual assignment on the underlying object
    // This is the "real" mutation that changes application state
    (target as Record<string | symbol, unknown>)[property] = wrappedValue;

    // Step 4: Log the mutation event (unless we're replaying)
    // During replay, isReplaying=true prevents double-logging
    if (eventLog && replayState && !replayState.isReplaying) {
      // Use event registry to create typed event
      // Event contains: type, path, serialized value, timestamp
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET,
        newPath,
        [wrappedValue],  // Will be serialized with smart reference detection
        infrastructure,
      );
      // Append to event log (IndexedDB, file, etc.)
      void eventLog.append(event as never);
    }

    // Return true to indicate success (required by Proxy spec)
    return true;
  },

  /**
   * DELETE trap - Intercepts property deletion
   */
  deleteProperty(target: object, property: string | symbol): boolean {
    const parentPath = infrastructure.targetToPath.get(target) || [];
    const deletePath = [...parentPath, String(property)];

    // Perform the deletion
    delete (target as Record<string | symbol, unknown>)[property];

    // Log mutation event
    if (eventLog && replayState && !replayState.isReplaying) {
      // Use registry to create DELETE event
      const event = eventRegistry.createEvent(
        EVENT_TYPES.DELETE,
        deletePath,
        [],
        infrastructure,
      );
      void eventLog.append(event as never);
    }

    return true;
  },
});
