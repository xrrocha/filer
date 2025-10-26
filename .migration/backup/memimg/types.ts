/**
 * Core type definitions for Memory Image Processor
 *
 * These types define the event sourcing and serialization infrastructure.
 */

// ============================================================================
// Path & Navigation Types
// ============================================================================

/**
 * A path through the object graph, represented as an array of property keys.
 * Immutable by design (readonly).
 *
 * Example: ['depts', 'accounting', 'budget'] refers to root.depts.accounting.budget
 *
 * This is the canonical path type used throughout memimg for immutable references.
 */
export type Path = readonly string[];

/**
 * Mutable path array for navigation state management.
 *
 * Navigator uses this mutable variant for managing navigation history
 * and selected paths, where state changes frequently.
 *
 * Can be converted to/from immutable Path as needed.
 */
export type MutablePath = string[];

/**
 * Convert immutable Path to mutable array.
 *
 * Use this when you need to modify a path (e.g., navigation state updates).
 */
export function toMutablePath(path: Path): MutablePath {
  return [...path];
}

/**
 * Convert mutable array to immutable Path.
 *
 * Use this when passing navigation state to memimg functions.
 */
export function toPath(path: MutablePath): Path {
  return path;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * All possible event types in the system.
 */
export type EventType =
  | "SET"
  | "DELETE"
  | "ARRAY_PUSH"
  | "ARRAY_POP"
  | "ARRAY_SHIFT"
  | "ARRAY_UNSHIFT"
  | "ARRAY_SPLICE"
  | "ARRAY_SORT"
  | "ARRAY_REVERSE"
  | "ARRAY_FILL"
  | "ARRAY_COPYWITHIN"
  | "MAP_SET"
  | "MAP_DELETE"
  | "MAP_CLEAR"
  | "SET_ADD"
  | "SET_DELETE"
  | "SET_CLEAR"
  | "SCRIPT";

/**
 * Base event structure - all events extend this.
 */
export interface BaseEvent {
  readonly type: EventType;
  readonly path: Path;
  readonly timestamp: number;
}

/**
 * Property assignment event
 */
export interface SetEvent extends BaseEvent {
  readonly type: "SET";
  readonly value: unknown;
}

/**
 * Property deletion event
 */
export interface DeleteEvent extends BaseEvent {
  readonly type: "DELETE";
}

/**
 * Array mutation events
 */
export interface ArrayPushEvent extends BaseEvent {
  readonly type: "ARRAY_PUSH";
  readonly items: readonly unknown[];
}

export interface ArrayPopEvent extends BaseEvent {
  readonly type: "ARRAY_POP";
}

export interface ArrayShiftEvent extends BaseEvent {
  readonly type: "ARRAY_SHIFT";
}

export interface ArrayUnshiftEvent extends BaseEvent {
  readonly type: "ARRAY_UNSHIFT";
  readonly items: readonly unknown[];
}

export interface ArraySpliceEvent extends BaseEvent {
  readonly type: "ARRAY_SPLICE";
  readonly start: number;
  readonly deleteCount: number;
  readonly items: readonly unknown[];
}

export interface ArraySortEvent extends BaseEvent {
  readonly type: "ARRAY_SORT";
}

export interface ArrayReverseEvent extends BaseEvent {
  readonly type: "ARRAY_REVERSE";
}

export interface ArrayFillEvent extends BaseEvent {
  readonly type: "ARRAY_FILL";
  readonly value: unknown;
  readonly start: number | undefined;
  readonly end: number | undefined;
}

export interface ArrayCopyWithinEvent extends BaseEvent {
  readonly type: "ARRAY_COPYWITHIN";
  readonly target: number;
  readonly start: number;
  readonly end: number | undefined;
}

/**
 * Map mutation events
 */
export interface MapSetEvent extends BaseEvent {
  readonly type: "MAP_SET";
  readonly key: unknown;
  readonly value: unknown;
}

export interface MapDeleteEvent extends BaseEvent {
  readonly type: "MAP_DELETE";
  readonly key: unknown;
}

export interface MapClearEvent extends BaseEvent {
  readonly type: "MAP_CLEAR";
}

/**
 * Set mutation events
 */
export interface SetAddEvent extends BaseEvent {
  readonly type: "SET_ADD";
  readonly value: unknown;
}

export interface SetDeleteEvent extends BaseEvent {
  readonly type: "SET_DELETE";
  readonly value: unknown;
}

export interface SetClearEvent extends BaseEvent {
  readonly type: "SET_CLEAR";
}

/**
 * Transaction script source logging event
 */
export interface ScriptEvent extends BaseEvent {
  readonly type: "SCRIPT";
  readonly source: string;
}

/**
 * Union type of all possible events
 */
export type Event =
  | SetEvent
  | DeleteEvent
  | ArrayPushEvent
  | ArrayPopEvent
  | ArrayShiftEvent
  | ArrayUnshiftEvent
  | ArraySpliceEvent
  | ArraySortEvent
  | ArrayReverseEvent
  | ArrayFillEvent
  | ArrayCopyWithinEvent
  | MapSetEvent
  | MapDeleteEvent
  | MapClearEvent
  | SetAddEvent
  | SetDeleteEvent
  | SetClearEvent
  | ScriptEvent;

// ============================================================================
// Serialization Types
// ============================================================================

/**
 * Primitive types that serialize directly
 */
export type SerializedPrimitive = string | number | boolean | null | undefined;

/**
 * Reference to another object in the graph (for cycle handling)
 */
export interface SerializedReference {
  readonly __type__: "ref";
  readonly path: Path;
}

/**
 * Serialized function representation
 */
export interface SerializedFunction {
  readonly __type__: "function";
  readonly sourceCode: string;
}

/**
 * Serialized Date representation
 */
export interface SerializedDate {
  readonly __type__: "date";
  readonly value: string; // ISO 8601 format
}

/**
 * Serialized BigInt representation
 */
export interface SerializedBigInt {
  readonly __type__: "bigint";
  readonly value: string;
}

/**
 * Serialized Symbol representation
 */
export interface SerializedSymbol {
  readonly __type__: "symbol";
  readonly description: string | undefined;
}

/**
 * Serialized Map representation
 */
export interface SerializedMap {
  readonly __type__: "map";
  readonly entries: readonly [unknown, unknown][];
}

/**
 * Serialized Set representation
 */
export interface SerializedSet {
  readonly __type__: "set";
  readonly values: readonly unknown[];
}

/**
 * Array serialization (no special __type__ needed)
 */
export type SerializedArray = readonly unknown[];

/**
 * Plain object serialization
 */
export type SerializedObject = {
  readonly [key: string]: unknown;
};

/**
 * Any serialized value
 */
export type SerializedValue =
  | SerializedPrimitive
  | SerializedReference
  | SerializedFunction
  | SerializedDate
  | SerializedBigInt
  | SerializedSymbol
  | SerializedMap
  | SerializedSet
  | SerializedArray
  | SerializedObject;

// ============================================================================
// Event Log Interface
// ============================================================================

/**
 * Pluggable event log interface.
 *
 * Any object implementing this interface can be used as event storage.
 * Examples: in-memory, filesystem, IndexedDB, REST API, etc.
 */
export interface EventLog {
  /**
   * Append an event to the log
   */
  append(event: Event): Promise<void>;

  /**
   * Retrieve all events from the log
   */
  getAll(): Promise<readonly Event[]>;

  /**
   * Clear all events (optional)
   */
  clear?(): Promise<void>;

  /**
   * Close the event log and release resources (optional)
   * Implementations that maintain persistent connections (like IndexedDB)
   * should close them here to prevent blocking version upgrades.
   */
  close?(): Promise<void>;

  /**
   * Stream events one at a time (optional, for memory efficiency)
   */
  stream?(): AsyncIterable<Event>;
}

// ============================================================================
// Memory Image Configuration
// ============================================================================

/**
 * State flag for event replay - prevents logging events during replay
 */
export interface ReplayState {
  isReplaying: boolean;
}

/**
 * MetadataProvider - Optional interface for domain-specific presentation hints
 *
 * The Memory Image Processor (MIP) is intentionally decoupled from any domain
 * knowledge or metadata system. However, for rich UI experiences (like the
 * Navigator object explorer), we need presentation hints such as:
 * - Which property should be used to describe/label an object?
 * - Which property is the primary key?
 * - Which properties should show in summaries vs. detail views?
 *
 * This interface allows external systems (like Filer's data dictionary) to
 * inject presentation metadata WITHOUT creating a hard dependency.
 */
export interface MetadataProvider {
  /**
   * Get the property name to use as a descriptor/label for an object
   * @param obj - The object to describe
   * @returns Property name (e.g., 'name', 'title') or null if none
   */
  getDescriptor(obj: unknown): string | null;

  /**
   * Get the property name that serves as the primary key for an object
   * @param obj - The object
   * @returns Property name (e.g., 'id', 'empno') or null if none
   */
  getKeyProperty(obj: unknown): string | null;

  /**
   * Check if a property should be displayed in summary views
   * @param obj - The parent object
   * @param propName - The property name
   * @returns true if should be displayed in summaries
   */
  isDisplayProperty(obj: unknown, propName: string): boolean;

  /**
   * Get a human-readable label for a property name
   * @param obj - The parent object
   * @param propName - The property name
   * @returns Human-readable label or null to use property name
   */
  getPropertyLabel(obj: unknown, propName: string): string | null;
}

/**
 * Options for creating a memory image
 */
export interface MemoryImageOptions {
  /**
   * Event log backend (optional - if not provided, no events are logged)
   */
  readonly eventLog?: EventLog;

  /**
   * Replay state flag (optional - created automatically if not provided)
   */
  readonly replayState?: ReplayState;

  /**
   * Metadata provider for presentation hints (optional)
   */
  readonly metadata?: MetadataProvider;
}

// ============================================================================
// Proxy Infrastructure (Internal)
// ============================================================================

/**
 * Internal proxy tracking infrastructure.
 *
 * These WeakMaps maintain the relationship between original objects,
 * their proxies, and their paths in the object graph.
 */
export interface ProxyInfrastructure {
  /**
   * Maps original objects to their proxies
   */
  readonly targetToProxy: WeakMap<object, object>;

  /**
   * Maps proxies back to their original objects
   */
  readonly proxyToTarget: WeakMap<object, object>;

  /**
   * Maps original objects to their canonical path in the graph
   */
  readonly targetToPath: WeakMap<object, Path>;

  /**
   * Optional metadata provider for presentation hints
   */
  readonly metadata?: MetadataProvider;
}

// ============================================================================
// Deserialization Helpers (Internal)
// ============================================================================

/**
 * Marker for unresolved references during deserialization.
 * Internal type used during two-pass deserialization.
 */
export interface UnresolvedReference {
  readonly __isUnresolved: true;
  readonly path: Path;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a serialized reference
 */
export const isSerializedReference = (
  value: unknown,
): value is SerializedReference => {
  return (
    typeof value === "object" &&
    value !== null &&
    "__type__" in value &&
    value.__type__ === "ref" &&
    "path" in value
  );
};

/**
 * Check if a value is an unresolved reference (during deserialization)
 */
export const isUnresolvedReference = (
  value: unknown,
): value is UnresolvedReference => {
  return (
    typeof value === "object" &&
    value !== null &&
    "__isUnresolved" in value &&
    value.__isUnresolved === true
  );
};

/**
 * Check if a value is an object (not null)
 */
export const isObject = (value: unknown): value is object => {
  return typeof value === "object" && value !== null;
};
