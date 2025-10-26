/**
 * Serialization module for Memory Image Processor
 *
 * Unified serialization using CycleTracker strategy pattern to eliminate
 * ~100 lines of duplicated type-handling logic.
 *
 * Two serialization modes:
 * 1. Snapshot mode - for full memory image serialization
 * 2. Event mode - for event logging with smart reference detection
 */

import type { Path, SerializedValue, ProxyInfrastructure } from "./types.js";
import { classifyValue, ValueCategory } from "./type-classifier.js";
import { TYPE_MARKERS } from "./constants.js";

// ============================================================================
// Cycle Tracking Strategy
// ============================================================================

/**
 * Strategy interface for cycle detection and reference creation
 *
 * Different serialization modes require different cycle tracking:
 * - Snapshots track all objects seen in THIS serialization
 * - Events only create refs for objects already in the graph (outside current value)
 */
interface CycleTracker {
  /**
   * Check if an object has been seen during serialization
   */
  hasSeen(target: object): boolean;

  /**
   * Mark an object as seen at the given path
   */
  markSeen(target: object, path: Path): void;

  /**
   * Get a reference for an object if it should be serialized as a ref
   * Returns null if object should be serialized inline
   */
  getReference(target: object): SerializedValue | null;
}

/**
 * Cycle tracker for full snapshot serialization
 *
 * Uses Map to track all objects seen during THIS serialization.
 * Any object encountered twice becomes a reference.
 */
class SnapshotCycleTracker implements CycleTracker {
  private seen = new Map<object, Path>();

  hasSeen(target: object): boolean {
    return this.seen.has(target);
  }

  markSeen(target: object, path: Path): void {
    this.seen.set(target, path);
  }

  getReference(target: object): SerializedValue | null {
    if (this.seen.has(target)) {
      const refPath = this.seen.get(target);
      return {
        __type__: "ref",
        path: refPath || [],
      };
    }
    return null;
  }
}

/**
 * Cycle tracker for event value serialization
 *
 * Smart reference detection:
 * 1. Checks if object already exists in the graph (via targetToPath)
 * 2. Only creates ref if existing path is OUTSIDE the current value tree
 * 3. Uses Map to track internal paths for objects seen within this value
 */
class EventCycleTracker implements CycleTracker {
  private seen = new Map<object, Path>();

  constructor(
    private targetToPath: WeakMap<object, Path>,
    private currentPath: Path,
  ) {}

  hasSeen(target: object): boolean {
    return this.seen.has(target);
  }

  markSeen(target: object, path: Path): void {
    this.seen.set(target, path);
  }

  getReference(target: object): SerializedValue | null {
    const existingPath = this.targetToPath.get(target);

    // Only create ref if object exists in graph AND is outside current value tree
    if (existingPath && existingPath.length > 0) {
      // Check if existing path is within the value path tree
      const isWithinValue =
        existingPath.length >= this.currentPath.length &&
        this.currentPath.every((seg, i) => seg === existingPath[i]);

      if (!isWithinValue) {
        // Object lives elsewhere in the graph - create reference
        return {
          __type__: "ref",
          path: existingPath,
        };
      }
    }

    // Check for internal references (same object appearing multiple times within this value)
    if (this.hasSeen(target)) {
      const internalPath = this.seen.get(target)!;

      // CRITICAL: Internal references need to be RELATIVE to the event's value root
      // The internalPath is absolute (e.g., ['depts', 'accounting', 'emps', '0', 'dept'])
      // But currentPath is the event path (e.g., ['depts'])
      // We need to strip the currentPath prefix to make it relative: ['accounting', 'emps', '0', 'dept']
      const relativePath = internalPath.slice(this.currentPath.length);

      return {
        __type__: "ref",
        path: relativePath,
      };
    }

    return null;
  }
}

// ============================================================================
// Unified Serialization Engine
// ============================================================================

/**
 * Core serialization function - works for both snapshot and event modes
 *
 * Uses classifyValue() for type detection, eliminating duplicated type checks.
 * Uses CycleTracker strategy for mode-specific cycle handling.
 *
 * @param value - Value to serialize
 * @param path - Current path in object graph
 * @param cycleTracker - Strategy for cycle detection
 * @param proxyToTarget - Map from proxies to their underlying targets
 * @returns Serialized representation
 */
function serializeValue(
  value: unknown,
  path: Path,
  cycleTracker: CycleTracker,
  proxyToTarget: WeakMap<object, object>,
): SerializedValue {
  // CRITICAL FIX: Unwrap proxies BEFORE classification
  // This ensures instanceof checks work correctly for Date, Map, Set, etc.
  const unwrapped = (typeof value === 'object' && value !== null)
    ? (proxyToTarget.get(value as object) || value)
    : value;

  // Classify the unwrapped value
  const typeInfo = classifyValue(unwrapped);

  // Handle based on category
  switch (typeInfo.category) {
    case ValueCategory.NULL:
    case ValueCategory.UNDEFINED:
      return value as SerializedValue;

    case ValueCategory.PRIMITIVE:
      return value as SerializedValue;

    case ValueCategory.BIGINT:
      return {
        [TYPE_MARKERS.TYPE]: "bigint",
        value: (value as bigint).toString(),
      };

    case ValueCategory.SYMBOL:
      return {
        [TYPE_MARKERS.TYPE]: "symbol",
        description: (value as symbol).description,
      };

    case ValueCategory.DATE: {
      // Unwrap proxy to get underlying target
      const target = proxyToTarget.get(value as object) || value;

      // Check for circular reference
      const ref = cycleTracker.getReference(target as object);
      if (ref) return ref;

      // Mark as seen for cycle detection
      cycleTracker.markSeen(target as object, path);

      const dateObj = target as Date;

      // Get timestamp value (handles invalid dates)
      const timestamp = dateObj.getTime();
      const dateValue = isNaN(timestamp) ? null : dateObj.toISOString();

      // Start with Date-specific fields
      const serialized: Record<string, unknown> = {
        [TYPE_MARKERS.TYPE]: "date",
        [TYPE_MARKERS.DATE_VALUE]: dateValue,  // Internal timestamp (null if invalid)
      };

      // Serialize all user-defined enumerable properties
      // (This preserves properties like date.location, date.attendees, etc.)
      const entries = Object.entries(dateObj);
      for (const [key, val] of entries) {
        // Recursively serialize property values (handles nested objects, arrays, etc.)
        serialized[key] = serializeValue(
          val,
          [...path, key],
          cycleTracker,
          proxyToTarget
        );
      }

      return serialized;
    }

    case ValueCategory.FUNCTION: {
      const fn = value as { __type__?: string; sourceCode?: string };
      if (fn.__type__ === "function") {
        return {
          [TYPE_MARKERS.TYPE]: "function",
          sourceCode: fn.sourceCode || (value as Function).toString(),
        };
      }
      // Non-serializable function - return undefined
      return undefined as unknown as SerializedValue;
    }

    case ValueCategory.MAP:
    case ValueCategory.SET:
    case ValueCategory.ARRAY:
    case ValueCategory.OBJECT: {
      // Get the underlying target (unwrap proxy if needed)
      const target = proxyToTarget.get(value as object) || value;

      // Check if this should be a reference
      const ref = cycleTracker.getReference(target as object);
      if (ref) return ref;

      // Mark as seen
      cycleTracker.markSeen(target as object, path);

      // Serialize based on specific collection type
      if (typeInfo.category === ValueCategory.MAP) {
        return {
          [TYPE_MARKERS.TYPE]: "map",
          entries: Array.from((target as Map<unknown, unknown>).entries()).map(
            ([k, v], i) => [
              serializeValue(
                k,
                [...path, "key", String(i)],
                cycleTracker,
                proxyToTarget,
              ),
              serializeValue(
                v,
                [...path, "value", String(i)],
                cycleTracker,
                proxyToTarget,
              ),
            ],
          ),
        };
      }

      if (typeInfo.category === ValueCategory.SET) {
        return {
          [TYPE_MARKERS.TYPE]: "set",
          values: Array.from((target as Set<unknown>).values()).map((v, i) =>
            serializeValue(v, [...path, String(i)], cycleTracker, proxyToTarget),
          ),
        };
      }

      if (typeInfo.category === ValueCategory.ARRAY) {
        return (value as unknown[]).map((item, index) =>
          serializeValue(
            item,
            [...path, String(index)],
            cycleTracker,
            proxyToTarget,
          ),
        );
      }

      // Plain object
      const result: Record<string, SerializedValue> = {};
      const obj = value as Record<string, unknown>;
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = serializeValue(
            obj[key],
            [...path, key],
            cycleTracker,
            proxyToTarget,
          );
        }
      }
      return result;
    }

    default:
      // Should never reach here if ValueCategory is exhaustive
      return undefined as unknown as SerializedValue;
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Serializes a memory image root to JSON string
 *
 * Creates a complete snapshot of the entire memory image state.
 * Uses SnapshotCycleTracker for simple cycle detection.
 *
 * @param root - The root object to serialize
 * @param proxyToTarget - Map from proxies to their targets
 * @returns JSON string representation
 */
export const serializeMemoryImage = (
  root: unknown,
  proxyToTarget: WeakMap<object, object>,
): string => {
  const cycleTracker = new SnapshotCycleTracker();
  const serialized = serializeValue(root, [], cycleTracker, proxyToTarget);
  return JSON.stringify(serialized, null, 2);
};

/**
 * Serializes a value for event logging
 *
 * Smart reference detection - only creates refs for objects that exist
 * outside the current value tree. Detects internal cycles separately.
 *
 * Critical for event sourcing: When logging `scott.emps = {...}`, objects
 * referenced from within the new value that already exist elsewhere in the
 * graph become references, preserving object identity.
 *
 * @param value - Value to serialize
 * @param proxyToTarget - Map from proxies to targets
 * @param targetToPath - Map from targets to paths (for reference detection)
 * @param currentPath - Path where this value is being assigned
 * @returns Serialized value with smart references
 */
export const serializeValueForEvent = (
  value: unknown,
  proxyToTarget: WeakMap<object, object>,
  targetToPath: WeakMap<object, Path>,
  currentPath: Path,
): SerializedValue => {
  const cycleTracker = new EventCycleTracker(targetToPath, currentPath);
  return serializeValue(value, currentPath, cycleTracker, proxyToTarget);
};
