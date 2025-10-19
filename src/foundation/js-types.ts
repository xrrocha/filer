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
