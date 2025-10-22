import { Type } from './type.js';

/**
 * BaseObjectType - Base class for ALL object types.
 *
 * CRITICAL: This properly models JavaScript's reality:
 * - Primitives: null, undefined, string, number, boolean, bigint, symbol
 * - Objects: EVERYTHING ELSE (arrays, functions, dates, maps, sets, plain objects)
 *
 * In JavaScript:
 * - typeof [] === 'object' ✓
 * - typeof new Map() === 'object' ✓
 * - typeof new Date() === 'object' ✓
 * - typeof function(){} === 'function', BUT function(){} instanceof Object === true ✓
 *
 * Note: Not abstract because ObjectType factories need to be instances of this.
 */
export class BaseObjectType extends Type {
  // All object types share common behavior
  // Layer 2/3/4 additions will add: validation, UI metadata, etc.

  check(value: unknown): boolean {
    // Default implementation - overridden by subclasses
    return typeof value === 'object' && value !== null;
  }
}
