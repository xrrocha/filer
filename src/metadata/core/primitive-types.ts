import { Type } from './type.js';

/**
 * PrimitiveType - Immutable values that are NOT objects.
 *
 * Represents JavaScript's 7 primitive types:
 * - number, string, boolean, bigint, symbol, undefined, null
 */
class PrimitiveType extends Type {
  check(value: unknown): boolean {
    switch (this.typeName) {
      case 'number': return typeof value === 'number';
      case 'string': return typeof value === 'string';
      case 'boolean': return typeof value === 'boolean';
      case 'bigint': return typeof value === 'bigint';
      case 'symbol': return typeof value === 'symbol';
      case 'undefined': return value === undefined;
      case 'null': return value === null;
      default: return false;
    }
  }
}

// Singleton primitive type instances
export const NumberType = new PrimitiveType('number');
export const StringType = new PrimitiveType('string');
export const BooleanType = new PrimitiveType('boolean');
export const BigIntType = new PrimitiveType('bigint');
export const SymbolType = new PrimitiveType('symbol');
export const UndefinedType = new PrimitiveType('undefined');
export const NullType = new PrimitiveType('null');
