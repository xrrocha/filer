/**
 * JavaScript Type Guards - Foundation Layer
 *
 * Pure type detection functions with zero dependencies.
 * Used by both memimg (serialization) and navigator (UI).
 *
 * CRITICAL: This module MUST NOT import from memimg, navigator, or metadata.
 *
 * Design Principles:
 * - Zero dependencies (pure functions only)
 * - Single source of truth for type detection
 * - Exhaustive testing (100% coverage)
 * - Type-safe guards where applicable
 */

// ============================================================================
// Primitive Type Detection
// ============================================================================

/**
 * Check if value is a primitive (including null, undefined, bigint, symbol)
 *
 * Primitives are immutable values that are not objects:
 * - null, undefined
 * - string, number, boolean
 * - bigint, symbol
 *
 * @param value - Value to check
 * @returns true if value is a primitive
 *
 * @example
 * ```typescript
 * isPrimitive(42)           // true
 * isPrimitive('hello')      // true
 * isPrimitive(null)         // true
 * isPrimitive(123n)         // true
 * isPrimitive(Symbol())     // true
 * isPrimitive({})           // false
 * isPrimitive([])           // false
 * ```
 */
export function isPrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const type = typeof value;
  return type === 'string' || type === 'number' || type === 'boolean' ||
         type === 'bigint' || type === 'symbol';
}

// ============================================================================
// Collection Type Detection
// ============================================================================

/**
 * Check if value is a collection (Array, Map, or Set)
 *
 * Collections are container objects that hold multiple values:
 * - Array (indexed collection)
 * - Map (key-value pairs)
 * - Set (unique values)
 *
 * Note: WeakMap and WeakSet are NOT considered collections here
 * as they're not iterable and can't be serialized.
 *
 * @param value - Value to check
 * @returns true if value is Array, Map, or Set
 *
 * @example
 * ```typescript
 * isCollection([1, 2, 3])          // true
 * isCollection(new Map())          // true
 * isCollection(new Set())          // true
 * isCollection({})                 // false
 * isCollection(new WeakMap())      // false
 * ```
 */
export function isCollection(value: unknown): value is unknown[] | Map<unknown, unknown> | Set<unknown> {
  return Array.isArray(value) || value instanceof Map || value instanceof Set;
}
