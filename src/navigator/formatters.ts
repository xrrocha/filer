/**
 * Value Formatters - Extract formatting logic from rendering
 *
 * This module centralizes all value formatting logic, eliminating 70+ lines
 * of scattered type detection and inline styling in inspector.ts.
 *
 * Formatters use classifyValue() for type detection and return plain strings.
 * Styling is handled via CSS classes defined in navigator.css.
 */

import { classifyValue, ValueCategory, isDateLike, unwrapIfPossible } from './value-types.js';
import type { ValueInfo } from './value-types.js';
import { UI_CONFIG, INTERNAL_PREFIX, LABEL_PATTERN } from './constants.js';

// ============================================================================
// Formatter Interface
// ============================================================================

/**
 * Interface for value formatters
 *
 * Each formatter knows how to format a specific type of value for display.
 */
export interface ValueFormatter {
  /**
   * Check if this formatter can handle the given value
   */
  canFormat(info: ValueInfo): boolean;

  /**
   * Format value for preview (short form, typically in inspector table)
   *
   * @param value - The value to format
   * @param maxLength - Maximum length for preview (default: 80)
   * @returns Formatted string
   */
  formatPreview(value: unknown, maxLength?: number): string;

  /**
   * Format value for full display (longer form, for expanded views)
   *
   * @param value - The value to format
   * @returns Formatted string
   */
  formatFull(value: unknown): string;
}

// ============================================================================
// Primitive Formatters
// ============================================================================

/**
 * Formatter for null values
 *
 * Phase 12: Null displayed as blank (modern dev tools convention).
 * Type information preserved via CSS class (.value-null) and tooltip.
 */
class NullFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.NULL;
  }

  formatPreview(_value: unknown): string {
    return "";
  }

  formatFull(_value: unknown): string {
    return "";
  }
}

/**
 * Formatter for undefined values
 */
class UndefinedFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.UNDEFINED;
  }

  formatPreview(_value: unknown): string {
    return "undefined";
  }

  formatFull(_value: unknown): string {
    return "undefined";
  }
}

/**
 * Formatter for string values
 *
 * Phase 12: Strings displayed without quotes (modern dev tools convention).
 * Type information preserved via CSS class (.value-string) and tooltip.
 */
class StringFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.STRING;
  }

  formatPreview(value: unknown, maxLength = UI_CONFIG.MAX_PREVIEW_LENGTH): string {
    const str = String(value);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }

  formatFull(value: unknown): string {
    return String(value);
  }
}

/**
 * Formatter for number values
 */
class NumberFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.NUMBER;
  }

  formatPreview(value: unknown): string {
    return String(value);
  }

  formatFull(value: unknown): string {
    return String(value);
  }
}

/**
 * Formatter for boolean values
 */
class BooleanFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.BOOLEAN;
  }

  formatPreview(value: unknown): string {
    return String(value);
  }

  formatFull(value: unknown): string {
    return String(value);
  }
}

/**
 * Formatter for BigInt values
 */
class BigIntFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.BIGINT;
  }

  formatPreview(value: unknown): string {
    return (value as bigint).toString() + "n";
  }

  formatFull(value: unknown): string {
    return (value as bigint).toString() + "n";
  }
}

/**
 * Formatter for Symbol values
 */
class SymbolFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.SYMBOL;
  }

  formatPreview(value: unknown): string {
    return (value as symbol).toString();
  }

  formatFull(value: unknown): string {
    return (value as symbol).toString();
  }
}

// ============================================================================
// Special Type Formatters
// ============================================================================

/**
 * Formatter for Date values
 */
class DateFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.DATE;
  }

  formatPreview(value: unknown): string {
    // CRITICAL FIX: Unwrap transaction proxy to access Date methods
    // Transaction proxies hide Date.prototype methods, so we must unwrap first
    const unwrapped = unwrapIfPossible(value) as Date;
    const isoString = isNaN(unwrapped.getTime()) ? 'Invalid Date' : unwrapped.toISOString();

    // Count user-defined properties (excluding internal metadata)
    // Check the original value for properties (may include custom Date properties)
    const propCount = Object.keys(value as object).filter(k => !k.startsWith('__')).length;

    // If Date has properties, show count
    if (propCount > 0) {
      return `${isoString} {${propCount}}`;
    }

    return isoString;
  }

  formatFull(value: unknown): string {
    // CRITICAL FIX: Unwrap transaction proxy to access Date methods
    const unwrapped = unwrapIfPossible(value) as Date;
    const isoString = isNaN(unwrapped.getTime()) ? 'Invalid Date' : unwrapped.toISOString();

    // Count user-defined properties on the original value
    const propCount = Object.keys(value as object).filter(k => !k.startsWith('__')).length;

    // If Date has properties, show count
    if (propCount > 0) {
      return `Date(${isoString}) {${propCount}}`;
    }

    return isoString;
  }
}

/**
 * Formatter for Function values
 */
class FunctionFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.FUNCTION;
  }

  formatPreview(value: unknown): string {
    const fn = value as Function;
    return "ƒ " + (fn.name || "(anonymous)");
  }

  formatFull(value: unknown): string {
    const fn = value as Function;
    return "ƒ " + (fn.name || "(anonymous)");
  }
}

// ============================================================================
// Collection Formatters
// ============================================================================

/**
 * Formatter for Array values
 */
class ArrayFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.ARRAY;
  }

  formatPreview(value: unknown, maxLength = UI_CONFIG.MAX_PREVIEW_LENGTH): string {
    const arr = value as unknown[];
    try {
      const jsonStr = JSON.stringify(arr, null, 0);
      return jsonStr.length > maxLength
        ? jsonStr.substring(0, maxLength) + "..."
        : jsonStr;
    } catch (err) {
      // JSON.stringify can fail on cyclic structures
      return `[Array(${arr.length})]`;
    }
  }

  formatFull(value: unknown): string {
    const arr = value as unknown[];
    return `Array(${arr.length})`;
  }
}

/**
 * Formatter for Map values
 */
class MapFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.MAP;
  }

  formatPreview(value: unknown): string {
    const map = value as Map<unknown, unknown>;
    return `Map{${map.size}}`;
  }

  formatFull(value: unknown): string {
    const map = value as Map<unknown, unknown>;
    return `Map{${map.size}}`;
  }
}

/**
 * Formatter for Set values
 */
class SetFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.SET;
  }

  formatPreview(value: unknown): string {
    const set = value as Set<unknown>;
    return `Set{${set.size}}`;
  }

  formatFull(value: unknown): string {
    const set = value as Set<unknown>;
    return `Set{${set.size}}`;
  }
}

// ============================================================================
// Label Inference Heuristic
// ============================================================================

/**
 * Infer a human-readable label from an object using regex-based heuristic
 *
 * Strategy:
 * 1. Find properties matching /name|desc(ription)?$/i (case-insensitive)
 * 2. If value is string: use it directly
 * 3. If value is object: recurse to extract nested strings
 * 4. Concatenate matches with spaces (insertion order)
 * 5. Fallback to Object{n} notation if no matches
 *
 * NOTE: This heuristic will be made configurable via user preferences.
 * Currently only theme (dark/light) is configurable in navigator, but
 * this pattern will be exposed in preferences for user customization.
 *
 * @param obj - Object to infer label from
 * @returns Human-readable label or Object{n} fallback
 *
 * @example
 * ```typescript
 * // Simple case: direct string match
 * inferLabel({ empno: 7566, ename: "JONES" })
 * // => "JONES"
 *
 * // Nested object case: recursive extraction
 * inferLabel({ empno: 7566, ename: { firstName: "Indiana", lastName: "JONES" } })
 * // => "Indiana JONES"
 *
 * // Multiple matches: concatenated with spaces
 * inferLabel({ name: "Alice", description: "Software Engineer" })
 * // => "Alice Software Engineer"
 *
 * // No matches: fallback
 * inferLabel({ empno: 7566, sal: 2975 })
 * // => "Object{2}"
 * ```
 */
export function inferLabel(obj: unknown): string {
  // Handle non-objects
  if (obj === null || obj === undefined) return "";

  // Handle primitives
  const type = typeof obj;
  if (type !== 'object' && type !== 'function') {
    return String(obj);
  }

  // Handle Date (primitive-like) - works with both direct and proxied Dates
  if (isDateLike(obj)) {
    // CRITICAL FIX: Unwrap transaction proxy before calling toISOString()
    const unwrapped = unwrapIfPossible(obj) as Date;
    return unwrapped.toISOString();
  }

  // Handle collections
  if (Array.isArray(obj)) {
    return `[${obj.length} items]`;
  }
  if (obj instanceof Map) {
    return `Map{${obj.size}}`;
  }
  if (obj instanceof Set) {
    return `Set{${obj.size}}`;
  }

  // REGEX HEURISTIC: Match properties using configured pattern
  const matches: string[] = [];

  // Get object entries (handle both plain objects and proxies)
  const entries = Object.entries(obj as object).filter(([key]) => !key.startsWith(INTERNAL_PREFIX));

  for (const [key, value] of entries) {
    if (LABEL_PATTERN.test(key)) {
      if (typeof value === 'string') {
        // Direct string match
        matches.push(value);
      } else if (value !== null && typeof value === 'object' &&
                 !isDateLike(value) && !Array.isArray(value) &&
                 !(value instanceof Map) && !(value instanceof Set)) {
        // Nested object: recurse to extract label
        const nestedLabel = inferLabel(value);
        // Only include if meaningful (not the fallback Object{n} format)
        if (nestedLabel && !nestedLabel.startsWith('Object{')) {
          matches.push(nestedLabel);
        }
      }
    }
  }

  // If matches found, concatenate with spaces
  if (matches.length > 0) {
    return matches.join(" ");
  }

  // Fallback: Object{n} notation
  const propCount = entries.length;
  return `Object{${propCount}}`;
}

// ============================================================================
// Object Formatter
// ============================================================================

/**
 * Formatter for plain object values
 *
 * Creates a preview showing first N properties with simplified values.
 * Avoids JSON.stringify to prevent issues with cycles.
 */
class ObjectFormatter implements ValueFormatter {
  canFormat(info: ValueInfo): boolean {
    return info.category === ValueCategory.OBJECT;
  }

  formatPreview(value: unknown, maxLength = UI_CONFIG.MAX_PREVIEW_LENGTH): string {
    const obj = value as Record<string, unknown>;

    // CRITICAL FIX: Check if this is actually a Date wrapped by ObjectType proxy
    // If unwrapping reveals a Date, format it as such
    const unwrapped = unwrapIfPossible(value);
    if (unwrapped instanceof Date) {
      const isoString = isNaN(unwrapped.getTime()) ? 'Invalid Date' : unwrapped.toISOString();
      // Count visible properties on the original (proxied) value
      const propCount = Object.keys(obj).filter(k => !k.startsWith('__')).length;
      if (propCount > 0) {
        return `${isoString} {${propCount}}`;
      }
      return isoString;
    }

    // Try label inference first
    const label = inferLabel(obj);

    // If label is meaningful (not the fallback Object{n} format), use it
    if (label && !label.startsWith('Object{')) {
      return label.length > maxLength ? label.substring(0, maxLength) + "..." : label;
    }

    // Otherwise fall back to property preview
    // Get non-internal properties
    const entries = Object.entries(obj)
      .filter(([key]) => !key.startsWith(INTERNAL_PREFIX))
      .slice(0, UI_CONFIG.MAX_OBJECT_PROPERTIES_PREVIEW);

    // For empty objects, use the Object{0} format from inferLabel
    if (entries.length === 0) {
      return label;
    }

    // Build property preview strings
    const parts = entries.map(([k, v]) => {
      if (v === null) return `"${k}":null`;
      if (v === undefined) return `"${k}":undefined`;
      if (typeof v === "string") return `"${k}":"${v}"`;
      if (typeof v === "number" || typeof v === "boolean") return `"${k}":${v}`;
      if (Array.isArray(v)) return `"${k}":[Array]`;
      if (typeof v === "object") return `"${k}":[Object]`;
      if (typeof v === "function") return `"${k}":[Function]`;
      return `"${k}":${typeof v}`;
    });

    const hasMore = Object.keys(obj).filter(k => !k.startsWith(INTERNAL_PREFIX)).length > UI_CONFIG.MAX_OBJECT_PROPERTIES_PREVIEW;
    const str = "{" + parts.join(",") + (hasMore ? ",..." : "") + "}";

    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
  }

  formatFull(value: unknown): string {
    // Use label inference for formatFull as well
    return inferLabel(value);
  }
}

// ============================================================================
// Formatter Registry
// ============================================================================

/**
 * Registry of formatters, in priority order
 *
 * Formatters are tried in order until one returns true for canFormat().
 */
const FORMATTERS: ValueFormatter[] = [
  new NullFormatter(),
  new UndefinedFormatter(),
  new StringFormatter(),
  new NumberFormatter(),
  new BooleanFormatter(),
  new BigIntFormatter(),
  new SymbolFormatter(),
  new DateFormatter(),
  new FunctionFormatter(),
  new ArrayFormatter(),
  new MapFormatter(),
  new SetFormatter(),
  new ObjectFormatter(),
];

// ============================================================================
// Public API
// ============================================================================

/**
 * Format a value for display
 *
 * Uses classifyValue() to determine type, then delegates to appropriate formatter.
 *
 * @param value - Value to format
 * @param mode - Display mode: 'preview' (short) or 'full' (verbose)
 * @param maxLength - Maximum length for preview mode
 * @returns Formatted string
 *
 * @example
 * ```typescript
 * formatValue(new Date(), 'preview')
 * // => "2025-10-16T13:00:00.000Z"
 *
 * formatValue([1, 2, 3], 'preview')
 * // => "[1,2,3]"
 *
 * formatValue({ a: 1, b: 2 }, 'preview')
 * // => '{"a":1,"b":2}'
 * ```
 */
export function formatValue(
  value: unknown,
  mode: 'preview' | 'full' = 'preview',
  maxLength?: number,
): string {
  const info = classifyValue(value);

  const formatter = FORMATTERS.find(f => f.canFormat(info));
  if (!formatter) {
    // Fallback - should never happen if formatters are exhaustive
    return String(value);
  }

  return mode === 'preview'
    ? formatter.formatPreview(value, maxLength)
    : formatter.formatFull(value);
}

/**
 * Format a value with type information
 *
 * Returns both the formatted value and its ValueInfo for rendering.
 *
 * @param value - Value to format
 * @param mode - Display mode
 * @param maxLength - Maximum length for preview
 * @returns Tuple of [formatted string, value info]
 */
export function formatValueWithInfo(
  value: unknown,
  mode: 'preview' | 'full' = 'preview',
  maxLength?: number,
): [string, ValueInfo] {
  const info = classifyValue(value);
  const formatted = formatValue(value, mode, maxLength);
  return [formatted, info];
}
