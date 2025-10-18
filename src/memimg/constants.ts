/**
 * Constants - Centralized magic strings and configuration values
 *
 * This module eliminates magic strings scattered throughout the codebase,
 * providing a single source of truth for event types, type markers, and
 * configuration values.
 */

// ============================================================================
// Event Types
// ============================================================================

/**
 * All event type constants
 *
 * Use these instead of string literals to prevent typos and enable
 * IDE autocomplete.
 */
export const EVENT_TYPES = {
  SET: 'SET',
  DELETE: 'DELETE',
  ARRAY_PUSH: 'ARRAY_PUSH',
  ARRAY_POP: 'ARRAY_POP',
  ARRAY_SHIFT: 'ARRAY_SHIFT',
  ARRAY_UNSHIFT: 'ARRAY_UNSHIFT',
  ARRAY_SPLICE: 'ARRAY_SPLICE',
  ARRAY_SORT: 'ARRAY_SORT',
  ARRAY_REVERSE: 'ARRAY_REVERSE',
  ARRAY_FILL: 'ARRAY_FILL',
  ARRAY_COPYWITHIN: 'ARRAY_COPYWITHIN',
  MAP_SET: 'MAP_SET',
  MAP_DELETE: 'MAP_DELETE',
  MAP_CLEAR: 'MAP_CLEAR',
  SET_ADD: 'SET_ADD',
  SET_DELETE: 'SET_DELETE',
  SET_CLEAR: 'SET_CLEAR',
  SCRIPT: 'SCRIPT',
} as const;

// ============================================================================
// Type Markers
// ============================================================================

/**
 * Special property markers used in serialization
 *
 * These markers identify special types during serialization/deserialization.
 */
export const TYPE_MARKERS = {
  /** Marker for typed values (e.g., functions, dates, bigints) */
  TYPE: '__type__',

  /** Marker for unresolved references during deserialization */
  UNRESOLVED: '__isUnresolved',

  /** Marker for reference objects */
  UNRESOLVED_REF: '__unresolved_ref__',
} as const;

// ============================================================================
// Path Operations
// ============================================================================

/**
 * Path separator for string representations
 */
export const PATH_SEPARATOR = '.';

/**
 * Pattern for detecting numeric array indices
 *
 * Used to distinguish between array indices and object keys when
 * creating intermediate objects during path traversal.
 */
export const NUMERIC_KEY_PATTERN = /^\d+$/;

// ============================================================================
// Collection Methods
// ============================================================================

/**
 * Array methods that mutate the array
 *
 * These methods trigger event logging when called on proxied arrays.
 */
export const MUTATING_ARRAY_METHODS = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
  'copyWithin',
] as const;

/**
 * Map methods that mutate the map
 */
export const MUTATING_MAP_METHODS = [
  'set',
  'delete',
  'clear',
] as const;

/**
 * Set methods that mutate the set
 */
export const MUTATING_SET_METHODS = [
  'add',
  'delete',
  'clear',
] as const;

// ============================================================================
// Storage Configuration
// ============================================================================

/**
 * Default IndexedDB database name
 */
export const DEFAULT_DB_NAME = 'memimg';

/**
 * Default IndexedDB object store name
 */
export const DEFAULT_STORE_NAME = 'events';

/**
 * Default localStorage key for in-memory event logs
 */
export const DEFAULT_LOCALSTORAGE_KEY = 'memimg-events';
