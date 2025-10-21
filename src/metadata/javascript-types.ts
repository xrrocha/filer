/**
 * JavaScript Type System - Core (TypeScript)
 *
 * An EXHAUSTIVE reflective model of JavaScript's built-in type system:
 * - Primitives: null, undefined, string, number, boolean, bigint, symbol (7 types)
 * - Objects: EVERYTHING else - all inherit from BaseObjectType (19+ types)
 * - Factory synthesis: metadata → constructor functions for user-defined types
 *
 * KEY INSIGHT: In JavaScript, almost everything is an object.
 * This hierarchy CORRECTLY reflects that reality:
 *
 * Type (abstract base)
 * ├── PrimitiveType (immutable, NOT objects)
 * │   ├── NumberType
 * │   ├── StringType
 * │   ├── BooleanType
 * │   ├── BigIntType
 * │   ├── SymbolType
 * │   ├── UndefinedType
 * │   └── NullType
 * │
 * └── BaseObjectType (abstract - ALL objects inherit from this)
 *     ├── ObjectType (factory for user-defined types: Dept, Emp, etc.)
 *     │
 *     ├── Built-in Object Types:
 *     ├── FunctionType (objects with [[Call]])
 *     ├── ArrayType (indexed collections)
 *     ├── MapType (key-value collections)
 *     ├── SetType (unique value collections)
 *     ├── WeakMapType (weak key-value, not serializable)
 *     ├── WeakSetType (weak unique values, not serializable)
 *     ├── DateType (temporal objects)
 *     ├── RegExpType (pattern matching)
 *     ├── ErrorType (runtime errors + subtypes)
 *     ├── PromiseType (async computations)
 *     ├── ArrayBufferType (raw binary buffers)
 *     ├── SharedArrayBufferType (shared binary buffers)
 *     ├── DataViewType (buffer views)
 *     └── TypedArrayType (Int8Array, Uint8Array, Float32Array, etc. - 10 variants)
 *
 * DESIGN PRINCIPLES:
 * - Model Reality: Reflects JavaScript's actual type system, not idealized versions
 * - Enable Introspection: Types are first-class objects you can examine
 * - Factory-as-Type: The factory function IS the type (no separation)
 * - Layered Extension: Foundation for adding validation (Layer 3), UI (Layer 4)
 */

// =============================================================================
// TYPE - Abstract Base
// =============================================================================

/**
 * Type - Root of the type hierarchy.
 * All types have a name and can check if a value conforms to them.
 */
abstract class Type {
  constructor(public readonly typeName: string) {}

  /**
   * Structural type checking (typeof/instanceof, NOT validation)
   */
  abstract check(value: unknown): boolean;
}

// =============================================================================
// PRIMITIVE TYPE
// =============================================================================

/**
 * PrimitiveType - Immutable values that are NOT objects.
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

// Singleton primitive types
export const NumberType = new PrimitiveType('number');
export const StringType = new PrimitiveType('string');
export const BooleanType = new PrimitiveType('boolean');
export const BigIntType = new PrimitiveType('bigint');
export const SymbolType = new PrimitiveType('symbol');
export const UndefinedType = new PrimitiveType('undefined');
export const NullType = new PrimitiveType('null');

// =============================================================================
// OBJECT TYPE - Abstract base for ALL non-primitive types
// =============================================================================

/**
 * BaseObjectType - Base class for ALL object types.
 *
 * CRITICAL FIX: This properly models JavaScript's reality:
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

/**
 * Property descriptor for user-defined ObjectType properties
 */
export interface PropertyDescriptor {
  type: Type;
  // Layer 2 additions will go here: label?, formatter?, widget?, etc.
}

/**
 * Specification for creating a user-defined ObjectType factory
 */
export interface ObjectTypeSpec {
  name: string;
  properties?: Record<string, PropertyDescriptor>;
  prototype?: object | null;
}

/**
 * Factory function that creates instances of a specific object type.
 * The factory itself IS the type (factory-as-type pattern).
 */
export interface ObjectTypeFactory extends BaseObjectType {
  // Call signature - factory creates instances
  (props?: Record<string, unknown>): object;

  // Type metadata
  typeName: string;
  properties: Record<string, PropertyDescriptor>;
  prototype: object;

  // Type checking
  check(value: unknown): boolean;
}

/**
 * ObjectType - Creates factory functions for user-defined structured object types.
 *
 * This is for USER-DEFINED types (like Dept, Emp in the Scott schema).
 * Built-in JavaScript object types (Array, Map, Function, etc.) have their own classes below.
 *
 * @param spec - Type specification with name, properties, prototype
 * @returns Factory function that creates instances
 */
export function ObjectType(spec: ObjectTypeSpec): ObjectTypeFactory {
  const { name, properties = {}, prototype = null } = spec;

  // The factory function - this IS the type (factory-as-type pattern)
  const factory = function (props: Record<string, unknown> = {}): object {
    // Create instance with proper prototype chain
    const instance = Object.create(factory.prototype);

    // Set properties from props
    Object.keys(properties).forEach(propName => {
      if (propName in props) {
        instance[propName] = props[propName];
      }
    });

    // Mark instance with its type (for introspection and type checking)
    Object.defineProperty(instance, '__type__', {
      value: factory,
      writable: false,
      enumerable: false,
      configurable: false
    });

    return instance;
  } as ObjectTypeFactory;

  // Setup prototype chain - factory extends BaseObjectType
  Object.setPrototypeOf(factory, BaseObjectType.prototype);
  BaseObjectType.call(factory, name);

  // Setup instance prototype chain
  factory.prototype = prototype ? Object.create(prototype) : {};

  // Attach metadata
  factory.typeName = name;
  factory.properties = properties;

  // Attach type checking method
  factory.check = function (value: unknown): boolean {
    return typeof value === 'object' && value !== null && (value as any).__type__ === factory;
  };

  return factory;
}

// =============================================================================
// SPECIALIZED OBJECT TYPES - Built-in JavaScript object types
// =============================================================================

/**
 * FunctionType - Objects with [[Call]] internal slot.
 *
 * FIXED: Now extends BaseObjectType (not Type directly).
 * Functions ARE objects: typeof fn === 'function', but fn instanceof Object === true
 */
export class FunctionType extends BaseObjectType {
  constructor(
    name: string,
    public readonly signature?: { params?: Type[]; returns?: Type } | null
  ) {
    super(name);
  }

  check(value: unknown): boolean {
    return typeof value === 'function';
  }
}

/**
 * ArrayType - Objects with numeric indices and length property.
 *
 * FIXED: Now extends BaseObjectType (not Type directly).
 * Arrays ARE objects: typeof [] === 'object'
 */
export class ArrayType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `Array<${elementType.typeName}>` : 'Array');
  }

  check(value: unknown): boolean {
    return Array.isArray(value);
  }
}

/**
 * SetType - Objects with unique values collection.
 *
 * FIXED: Now extends BaseObjectType (not Type directly).
 * Sets ARE objects: typeof new Set() === 'object'
 */
export class SetType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `Set<${elementType.typeName}>` : 'Set');
  }

  check(value: unknown): boolean {
    return value instanceof Set;
  }
}

/**
 * MapType - Objects with key-value pairs.
 *
 * FIXED: Now extends BaseObjectType (not Type directly).
 * Maps ARE objects: typeof new Map() === 'object'
 */
export class MapType extends BaseObjectType {
  constructor(
    public readonly keyType?: Type | null,
    public readonly valueType?: Type | null
  ) {
    const keyPart = keyType ? keyType.typeName : '*';
    const valuePart = valueType ? valueType.typeName : '*';
    super(`Map<${keyPart}, ${valuePart}>`);
  }

  check(value: unknown): boolean {
    return value instanceof Map;
  }
}

/**
 * DateType - Objects wrapping timestamps.
 *
 * FIXED: Now extends BaseObjectType (not Type directly).
 * Dates ARE objects: typeof new Date() === 'object'
 */
export class DateType extends BaseObjectType {
  constructor() {
    super('Date');
  }

  check(value: unknown): boolean {
    return value instanceof Date;
  }
}

/**
 * RegExpType - Objects representing regular expression patterns.
 *
 * RegExp ARE objects: typeof /pattern/ === 'object'
 */
export class RegExpType extends BaseObjectType {
  constructor() {
    super('RegExp');
  }

  check(value: unknown): boolean {
    return value instanceof RegExp;
  }
}

/**
 * ErrorType - Objects representing runtime errors.
 *
 * Errors ARE objects: typeof new Error() === 'object'
 * Includes all error subtypes: TypeError, ReferenceError, etc.
 */
export class ErrorType extends BaseObjectType {
  constructor(name: string = 'Error') {
    super(name);
  }

  check(value: unknown): boolean {
    return value instanceof Error;
  }
}

/**
 * PromiseType - Objects representing asynchronous computations.
 *
 * Promises ARE objects: typeof Promise.resolve() === 'object'
 */
export class PromiseType extends BaseObjectType {
  constructor(public readonly resolveType?: Type | null) {
    super(resolveType ? `Promise<${resolveType.typeName}>` : 'Promise');
  }

  check(value: unknown): boolean {
    return value instanceof Promise;
  }
}

/**
 * WeakMapType - Objects with weak key-value pairs (not iterable/serializable).
 *
 * WeakMaps ARE objects but can't be serialized (keys can be GC'd).
 */
export class WeakMapType extends BaseObjectType {
  constructor(
    public readonly keyType?: Type | null,
    public readonly valueType?: Type | null
  ) {
    const keyPart = keyType ? keyType.typeName : '*';
    const valuePart = valueType ? valueType.typeName : '*';
    super(`WeakMap<${keyPart}, ${valuePart}>`);
  }

  check(value: unknown): boolean {
    return value instanceof WeakMap;
  }
}

/**
 * WeakSetType - Objects with weak unique values (not iterable/serializable).
 *
 * WeakSets ARE objects but can't be serialized (values can be GC'd).
 */
export class WeakSetType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `WeakSet<${elementType.typeName}>` : 'WeakSet');
  }

  check(value: unknown): boolean {
    return value instanceof WeakSet;
  }
}

/**
 * ArrayBufferType - Objects representing raw binary data buffers.
 *
 * ArrayBuffers ARE objects: typeof new ArrayBuffer() === 'object'
 */
export class ArrayBufferType extends BaseObjectType {
  constructor() {
    super('ArrayBuffer');
  }

  check(value: unknown): boolean {
    return value instanceof ArrayBuffer;
  }
}

/**
 * SharedArrayBufferType - Objects representing shared binary data buffers.
 *
 * Shared between workers/threads. typeof new SharedArrayBuffer() === 'object'
 */
export class SharedArrayBufferType extends BaseObjectType {
  constructor() {
    super('SharedArrayBuffer');
  }

  check(value: unknown): boolean {
    // SharedArrayBuffer might not be available in all environments (disabled in some browsers)
    return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer;
  }
}

/**
 * TypedArrayType - Objects representing typed views over ArrayBuffers.
 *
 * Typed arrays ARE objects: typeof new Uint8Array() === 'object'
 * Covers: Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array,
 *         Float32Array, Float64Array, BigInt64Array, BigUint64Array
 */
export class TypedArrayType extends BaseObjectType {
  constructor(name: string, public readonly elementType?: Type | null) {
    super(elementType ? `${name}<${elementType.typeName}>` : name);
  }

  check(value: unknown): boolean {
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
  }
}

/**
 * DataViewType - Objects providing a low-level interface for reading/writing ArrayBuffers.
 *
 * DataView ARE objects: typeof new DataView() === 'object'
 */
export class DataViewType extends BaseObjectType {
  constructor() {
    super('DataView');
  }

  check(value: unknown): boolean {
    return value instanceof DataView;
  }
}

// =============================================================================
// SINGLETON INSTANCES - Convenience exports for common types
// =============================================================================

// Collections
export const ArrayTypeInstance = new ArrayType();
export const SetTypeInstance = new SetType();
export const MapTypeInstance = new MapType();
export const WeakMapTypeInstance = new WeakMapType();
export const WeakSetTypeInstance = new WeakSetType();

// Temporal
export const DateTypeInstance = new DateType();

// Text Processing
export const RegExpTypeInstance = new RegExpType();

// Error Handling
export const ErrorTypeInstance = new ErrorType();
export const TypeErrorTypeInstance = new ErrorType('TypeError');
export const ReferenceErrorTypeInstance = new ErrorType('ReferenceError');
export const SyntaxErrorTypeInstance = new ErrorType('SyntaxError');
export const RangeErrorTypeInstance = new ErrorType('RangeError');

// Async
export const PromiseTypeInstance = new PromiseType();

// Binary Data
export const ArrayBufferTypeInstance = new ArrayBufferType();
export const SharedArrayBufferTypeInstance = new SharedArrayBufferType();
export const DataViewTypeInstance = new DataViewType();

// Typed Arrays
export const Int8ArrayTypeInstance = new TypedArrayType('Int8Array', NumberType);
export const Uint8ArrayTypeInstance = new TypedArrayType('Uint8Array', NumberType);
export const Int16ArrayTypeInstance = new TypedArrayType('Int16Array', NumberType);
export const Uint16ArrayTypeInstance = new TypedArrayType('Uint16Array', NumberType);
export const Int32ArrayTypeInstance = new TypedArrayType('Int32Array', NumberType);
export const Uint32ArrayTypeInstance = new TypedArrayType('Uint32Array', NumberType);
export const Float32ArrayTypeInstance = new TypedArrayType('Float32Array', NumberType);
export const Float64ArrayTypeInstance = new TypedArrayType('Float64Array', NumberType);
export const BigInt64ArrayTypeInstance = new TypedArrayType('BigInt64Array', BigIntType);
export const BigUint64ArrayTypeInstance = new TypedArrayType('BigUint64Array', BigIntType);

// =============================================================================
// EXPORTS
// =============================================================================

// Note: Type, PrimitiveType, BaseObjectType, and all other classes
// are already exported inline above. No need to re-export.
