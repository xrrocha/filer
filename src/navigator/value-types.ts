/**
 * Value Types - Navigator-specific value classification for display
 *
 * This module provides UI-focused type classification, separate from
 * memimg's type-classifier which is for serialization. Navigator needs
 * additional display metadata (icons, CSS classes, navigability).
 */

import { CSS_CLASSES, DISPLAY_ICONS } from './constants.js';

// ============================================================================
// Value Categories
// ============================================================================

/**
 * Value categories for navigator display
 *
 * Similar to memimg's ValueCategory but includes UI-specific concerns
 */
export enum ValueCategory {
  NULL = 1,  // Start from 1 to avoid falsy value issues with assert.ok()
  UNDEFINED,
  STRING,
  NUMBER,
  BOOLEAN,
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
// Value Information
// ============================================================================

/**
 * Complete value information for display purposes
 *
 * Includes everything needed to render a value in the UI:
 * type, navigability, icon, CSS class, etc.
 */
export interface ValueInfo {
  /** Primary category */
  category: ValueCategory;

  /** Human-readable type name */
  typeName: string;

  /** Can this value be clicked to navigate to it? */
  isNavigable: boolean;

  /** Is this a collection (Array/Map/Set)? */
  isCollection: boolean;

  /** Display icon/symbol for tree view */
  displayIcon: string;

  /** CSS class for styling */
  cssClass: string;
}

// ============================================================================
// Value Classifier
// ============================================================================

/**
 * Classify a value for navigator display
 *
 * This is separate from memimg's classifyValue() because navigator
 * needs display-specific metadata (icons, CSS, navigability).
 *
 * @param value - The value to classify
 * @returns Complete value information for display
 *
 * @example
 * ```typescript
 * const info = classifyValue(new Date());
 * // { category: ValueCategory.DATE, typeName: "Date",
 * //   isNavigable: false, isCollection: false,
 * //   displayIcon: "📅", cssClass: "value-date" }
 *
 * const info2 = classifyValue([1, 2, 3]);
 * // { category: ValueCategory.ARRAY, typeName: "Array",
 * //   isNavigable: true, isCollection: true,
 * //   displayIcon: "[]", cssClass: "value-array" }
 * ```
 */
export function classifyValue(value: unknown): ValueInfo {
  // Null
  if (value === null) {
    return {
      category: ValueCategory.NULL,
      typeName: 'null',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.NULL,
      cssClass: CSS_CLASSES.VALUE_NULL,
    };
  }

  // Undefined
  if (value === undefined) {
    return {
      category: ValueCategory.UNDEFINED,
      typeName: 'undefined',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.UNDEFINED,
      cssClass: CSS_CLASSES.VALUE_UNDEFINED,
    };
  }

  const type = typeof value;

  // String
  if (type === 'string') {
    return {
      category: ValueCategory.STRING,
      typeName: 'string',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.STRING,
      cssClass: CSS_CLASSES.VALUE_STRING,
    };
  }

  // Number
  if (type === 'number') {
    return {
      category: ValueCategory.NUMBER,
      typeName: 'number',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.NUMBER,
      cssClass: CSS_CLASSES.VALUE_NUMBER,
    };
  }

  // Boolean
  if (type === 'boolean') {
    return {
      category: ValueCategory.BOOLEAN,
      typeName: 'boolean',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.BOOLEAN,
      cssClass: CSS_CLASSES.VALUE_BOOLEAN,
    };
  }

  // BigInt
  if (type === 'bigint') {
    return {
      category: ValueCategory.BIGINT,
      typeName: 'bigint',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.BIGINT,
      cssClass: CSS_CLASSES.VALUE_BIGINT,
    };
  }

  // Symbol
  if (type === 'symbol') {
    return {
      category: ValueCategory.SYMBOL,
      typeName: 'symbol',
      isNavigable: false,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.SYMBOL,
      cssClass: CSS_CLASSES.VALUE_SYMBOL,
    };
  }

  // Date (check before generic object)
  // Dates can now have properties, so they need to be navigable
  // Use isDateLike to work with both direct and proxied Dates
  if (isDateLike(value)) {
    return {
      category: ValueCategory.DATE,
      typeName: 'Date',
      isNavigable: true,  // Changed: Dates can have properties now
      isCollection: false,
      displayIcon: DISPLAY_ICONS.DATE,
      cssClass: CSS_CLASSES.VALUE_DATE,
    };
  }

  // Function
  if (type === 'function') {
    return {
      category: ValueCategory.FUNCTION,
      typeName: 'Function',
      isNavigable: true,
      isCollection: false,
      displayIcon: DISPLAY_ICONS.FUNCTION,
      cssClass: CSS_CLASSES.VALUE_FUNCTION,
    };
  }

  // Array
  if (Array.isArray(value)) {
    return {
      category: ValueCategory.ARRAY,
      typeName: 'Array',
      isNavigable: true,
      isCollection: true,
      displayIcon: DISPLAY_ICONS.ARRAY,
      cssClass: CSS_CLASSES.VALUE_ARRAY,
    };
  }

  // Map
  if (value instanceof Map) {
    return {
      category: ValueCategory.MAP,
      typeName: 'Map',
      isNavigable: true,
      isCollection: true,
      displayIcon: DISPLAY_ICONS.MAP,
      cssClass: CSS_CLASSES.VALUE_MAP,
    };
  }

  // Set
  if (value instanceof Set) {
    return {
      category: ValueCategory.SET,
      typeName: 'Set',
      isNavigable: true,
      isCollection: true,
      displayIcon: DISPLAY_ICONS.SET,
      cssClass: CSS_CLASSES.VALUE_SET,
    };
  }

  // Plain object (fallback)
  return {
    category: ValueCategory.OBJECT,
    typeName: 'Object',
    isNavigable: true,
    isCollection: false,
    displayIcon: DISPLAY_ICONS.OBJECT,
    cssClass: CSS_CLASSES.VALUE_OBJECT,
  };
}

// ============================================================================
// Type Guard Helpers
// ============================================================================

/**
 * Check if value is a navigable object (can click to explore)
 */
export function isNavigable(value: unknown): boolean {
  const info = classifyValue(value);
  return info.isNavigable;
}

/**
 * Check if value is a collection (Array/Map/Set)
 */
export function isCollection(value: unknown): boolean {
  return Array.isArray(value) || value instanceof Map || value instanceof Set;
}

/**
 * Check if value is a primitive (not navigable)
 */
export function isPrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean' ||
         type === 'bigint' || type === 'symbol';
}

/**
 * Check if value is a Date (works with both direct Dates and proxied Dates)
 *
 * This is needed because `instanceof Date` doesn't work with proxied Dates.
 * We check for the presence of Date-specific methods instead.
 *
 * @param value - The value to check
 * @returns true if value is a Date (direct or proxied)
 */
export function isDateLike(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;

  // Direct instanceof check (fast path for non-proxied Dates)
  if (value instanceof Date) return true;

  // Proxy-aware check: Look for Date-specific methods
  // Using getTime() as the signature method (all Dates have it)
  return typeof (value as any).getTime === 'function' &&
         typeof (value as any).toISOString === 'function';
}

/**
 * Check if value is a leaf-like object (contains only scalars/Dates)
 *
 * Phase 13: These objects are good candidates for inline expansion in the inspector.
 * They contain only primitive values (strings, numbers, booleans, dates) and no nested objects.
 *
 * @param value - The value to check
 * @returns true if object contains only scalars/Dates, false otherwise
 *
 * @example
 * ```typescript
 * isLeafLikeObject({ firstName: "John", lastName: "Doe" })  // true
 * isLeafLikeObject({ date: new Date(), count: 42 })         // true
 * isLeafLikeObject({ address: { city: "NYC" } })            // false (nested object)
 * isLeafLikeObject([1, 2, 3])                               // false (array)
 * ```
 */
export function isLeafLikeObject(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value !== 'object') return false;
  if (isCollection(value)) return false;

  // Check if all properties are scalars or Dates
  // Small objects (≤ 5 visible properties) are good candidates for inline expansion
  // This now includes Date objects with properties!
  const entries = Object.entries(value).filter(([k]) => !k.startsWith('__'));

  // Date objects can be leaf-like if they have scalar properties
  // (The Date timestamp is internal and doesn't count as a property)
  if (isDateLike(value)) {
    // Empty Date (no properties) is not leaf-like (just show the timestamp)
    if (entries.length === 0) return false;
    // Date with too many properties is not leaf-like
    if (entries.length > 5) return false;
  } else {
    // Regular objects
    if (entries.length > 5) return false;
  }

  return entries.every(([_, v]) => {
    if (v === null || v === undefined) return true;
    const type = typeof v;
    if (type === 'string' || type === 'number' || type === 'boolean' || type === 'bigint') return true;
    if (isDateLike(v)) return true;
    return false;
  });
}
