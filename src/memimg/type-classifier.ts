/**
 * Type Classifier - Single source of truth for JavaScript value classification
 *
 * This module centralizes all type detection logic, eliminating the 26+ scattered
 * typeof checks throughout the codebase. Used by serialization, deserialization,
 * and replay modules.
 */

// ============================================================================
// Type Classification Enums
// ============================================================================

/**
 * Categorical classification of JavaScript values
 */
export enum ValueCategory {
  NULL,
  UNDEFINED,
  PRIMITIVE,   // string, number, boolean
  BIGINT,
  SYMBOL,
  DATE,
  FUNCTION,
  ARRAY,
  MAP,
  SET,
  OBJECT,
}

// ============================================================================
// Type Information Interface
// ============================================================================

/**
 * Complete type information for a value
 *
 * Provides everything needed for serialization, formatting, and navigation
 * in a single classification call.
 */
export interface TypeInfo {
  /** Primary category */
  category: ValueCategory;

  /** Is this a primitive value? */
  isPrimitive: boolean;

  /** Is this an object (not null)? */
  isObject: boolean;

  /** Is this a collection (Array/Map/Set)? */
  isCollection: boolean;

  /** Does this need special serialization handling? */
  needsSpecialSerialization: boolean;
}

// ============================================================================
// Type Classifier Function
// ============================================================================

/**
 * Classify a JavaScript value into its type category
 *
 * Single source of truth for type detection. Use this instead of scattered
 * typeof checks and instanceof tests.
 *
 * @param value - The value to classify
 * @returns Complete type information
 *
 * @example
 * ```typescript
 * const info = classifyValue(new Date());
 * // { category: ValueCategory.DATE, isPrimitive: false, isObject: true,
 * //   isCollection: false, needsSpecialSerialization: true }
 *
 * const info2 = classifyValue([1, 2, 3]);
 * // { category: ValueCategory.ARRAY, isPrimitive: false, isObject: true,
 * //   isCollection: true, needsSpecialSerialization: false }
 * ```
 */
export function classifyValue(value: unknown): TypeInfo {
  // Null
  if (value === null) {
    return {
      category: ValueCategory.NULL,
      isPrimitive: true,
      isObject: false,
      isCollection: false,
      needsSpecialSerialization: false,
    };
  }

  // Undefined
  if (value === undefined) {
    return {
      category: ValueCategory.UNDEFINED,
      isPrimitive: true,
      isObject: false,
      isCollection: false,
      needsSpecialSerialization: false,
    };
  }

  const type = typeof value;

  // Primitives
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return {
      category: ValueCategory.PRIMITIVE,
      isPrimitive: true,
      isObject: false,
      isCollection: false,
      needsSpecialSerialization: false,
    };
  }

  // BigInt
  if (type === 'bigint') {
    return {
      category: ValueCategory.BIGINT,
      isPrimitive: true,
      isObject: false,
      isCollection: false,
      needsSpecialSerialization: true,
    };
  }

  // Symbol
  if (type === 'symbol') {
    return {
      category: ValueCategory.SYMBOL,
      isPrimitive: true,
      isObject: false,
      isCollection: false,
      needsSpecialSerialization: true,
    };
  }

  // Date (check before generic object)
  if (value instanceof Date) {
    return {
      category: ValueCategory.DATE,
      isPrimitive: false,
      isObject: true,
      isCollection: false,
      needsSpecialSerialization: true,
    };
  }

  // Function
  if (type === 'function') {
    return {
      category: ValueCategory.FUNCTION,
      isPrimitive: false,
      isObject: true,
      isCollection: false,
      needsSpecialSerialization: true,
    };
  }

  // Array
  if (Array.isArray(value)) {
    return {
      category: ValueCategory.ARRAY,
      isPrimitive: false,
      isObject: true,
      isCollection: true,
      needsSpecialSerialization: false,
    };
  }

  // Map
  if (value instanceof Map) {
    return {
      category: ValueCategory.MAP,
      isPrimitive: false,
      isObject: true,
      isCollection: true,
      needsSpecialSerialization: true,
    };
  }

  // Set
  if (value instanceof Set) {
    return {
      category: ValueCategory.SET,
      isPrimitive: false,
      isObject: true,
      isCollection: true,
      needsSpecialSerialization: true,
    };
  }

  // Plain object (fallback)
  return {
    category: ValueCategory.OBJECT,
    isPrimitive: false,
    isObject: true,
    isCollection: false,
    needsSpecialSerialization: false,
  };
}

// ============================================================================
// Type Guard Helpers
// ============================================================================

/**
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if value is a primitive (including bigint and symbol)
 */
export function isPrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean' ||
         type === 'bigint' || type === 'symbol';
}

/**
 * Check if value is a plain object (not null, not array, not special objects)
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' &&
         !(value instanceof Date) && !Array.isArray(value) &&
         !(value instanceof Map) && !(value instanceof Set);
}

/**
 * Check if value is a collection (Array, Map, or Set)
 */
export function isCollection(value: unknown): value is unknown[] | Map<unknown, unknown> | Set<unknown> {
  return Array.isArray(value) || value instanceof Map || value instanceof Set;
}

/**
 * Check if value is an object (not null)
 *
 * This is the memimg-standard object check used throughout the codebase.
 * Note: Functions are considered objects for consistency with classifyValue.
 */
export function isObject(value: unknown): value is object {
  const type = typeof value;
  return (type === 'object' && value !== null) || type === 'function';
}
