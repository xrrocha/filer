import { Type } from './type.js';
import { BaseObjectType } from './base-object-type.js';
import { NumberType, BigIntType } from './primitive-types.js';

/**
 * Built-in JavaScript Object Types - Metadata-Driven Approach
 *
 * Instead of 19 duplicate class definitions, we use a single metadata array
 * and factory function to generate all built-in types.
 *
 * Benefits:
 * - Single source of truth
 * - Easy to add new types (just add metadata entry)
 * - Less code duplication
 * - Registry for dynamic type lookup
 */

// =============================================================================
// METADATA SPECIFICATION
// =============================================================================

/**
 * Metadata specification for a built-in type.
 */
interface BuiltInTypeSpec {
  /** Type name (e.g., 'Array', 'Map', 'Date') */
  name: string;

  /** Type checking function */
  check: (value: unknown) => boolean;

  /** Whether type supports generic parameters (e.g., Array<T>, Map<K,V>) */
  parameterized?: boolean;

  /** Human-readable description */
  description?: string;
}

/**
 * Complete registry of all built-in JavaScript object types.
 *
 * Organized by category for clarity.
 */
const BUILT_IN_TYPES: BuiltInTypeSpec[] = [
  // Functions
  {
    name: 'Function',
    check: (v) => typeof v === 'function',
    parameterized: true,  // Can have signature
    description: 'Objects with [[Call]] internal slot'
  },

  // Collections
  {
    name: 'Array',
    check: (v) => Array.isArray(v),
    parameterized: true,  // Array<T>
    description: 'Objects with numeric indices and length property'
  },
  {
    name: 'Set',
    check: (v) => v instanceof Set,
    parameterized: true,  // Set<T>
    description: 'Objects with unique values collection'
  },
  {
    name: 'Map',
    check: (v) => v instanceof Map,
    parameterized: true,  // Map<K, V>
    description: 'Objects with key-value pairs'
  },
  {
    name: 'WeakSet',
    check: (v) => v instanceof WeakSet,
    parameterized: true,  // WeakSet<T>
    description: 'Objects with weak unique values (not iterable/serializable)'
  },
  {
    name: 'WeakMap',
    check: (v) => v instanceof WeakMap,
    parameterized: true,  // WeakMap<K, V>
    description: 'Objects with weak key-value pairs (not iterable/serializable)'
  },

  // Temporal
  {
    name: 'Date',
    check: (v) => v instanceof Date,
    description: 'Objects wrapping timestamps'
  },

  // Text Processing
  {
    name: 'RegExp',
    check: (v) => v instanceof RegExp,
    description: 'Objects representing regular expression patterns'
  },

  // Error Handling
  {
    name: 'Error',
    check: (v) => v instanceof Error,
    description: 'Objects representing runtime errors'
  },
  {
    name: 'TypeError',
    check: (v) => v instanceof TypeError,
    description: 'Type-related errors'
  },
  {
    name: 'ReferenceError',
    check: (v) => v instanceof ReferenceError,
    description: 'Reference-related errors'
  },
  {
    name: 'SyntaxError',
    check: (v) => v instanceof SyntaxError,
    description: 'Syntax-related errors'
  },
  {
    name: 'RangeError',
    check: (v) => v instanceof RangeError,
    description: 'Range-related errors'
  },

  // Async
  {
    name: 'Promise',
    check: (v) => v instanceof Promise,
    parameterized: true,  // Promise<T>
    description: 'Objects representing asynchronous computations'
  },

  // Binary Data
  {
    name: 'ArrayBuffer',
    check: (v) => v instanceof ArrayBuffer,
    description: 'Objects representing raw binary data buffers'
  },
  {
    name: 'SharedArrayBuffer',
    check: (v) => typeof SharedArrayBuffer !== 'undefined' && v instanceof SharedArrayBuffer,
    description: 'Objects representing shared binary data buffers'
  },
  {
    name: 'DataView',
    check: (v) => v instanceof DataView,
    description: 'Objects providing low-level interface for reading/writing ArrayBuffers'
  },

  // Typed Arrays (10 variants)
  {
    name: 'Int8Array',
    check: (v) => v instanceof Int8Array,
    parameterized: true,
    description: 'Typed array of 8-bit signed integers'
  },
  {
    name: 'Uint8Array',
    check: (v) => v instanceof Uint8Array,
    parameterized: true,
    description: 'Typed array of 8-bit unsigned integers'
  },
  {
    name: 'Int16Array',
    check: (v) => v instanceof Int16Array,
    parameterized: true,
    description: 'Typed array of 16-bit signed integers'
  },
  {
    name: 'Uint16Array',
    check: (v) => v instanceof Uint16Array,
    parameterized: true,
    description: 'Typed array of 16-bit unsigned integers'
  },
  {
    name: 'Int32Array',
    check: (v) => v instanceof Int32Array,
    parameterized: true,
    description: 'Typed array of 32-bit signed integers'
  },
  {
    name: 'Uint32Array',
    check: (v) => v instanceof Uint32Array,
    parameterized: true,
    description: 'Typed array of 32-bit unsigned integers'
  },
  {
    name: 'Float32Array',
    check: (v) => v instanceof Float32Array,
    parameterized: true,
    description: 'Typed array of 32-bit floating point numbers'
  },
  {
    name: 'Float64Array',
    check: (v) => v instanceof Float64Array,
    parameterized: true,
    description: 'Typed array of 64-bit floating point numbers'
  },
  {
    name: 'BigInt64Array',
    check: (v) => v instanceof BigInt64Array,
    parameterized: true,
    description: 'Typed array of 64-bit signed big integers'
  },
  {
    name: 'BigUint64Array',
    check: (v) => v instanceof BigUint64Array,
    parameterized: true,
    description: 'Typed array of 64-bit unsigned big integers'
  },
];

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Creates a built-in type class from metadata specification.
 *
 * This replaces 19 nearly-identical class definitions with a single factory.
 */
function createBuiltInType(spec: BuiltInTypeSpec): BaseObjectType {
  class GeneratedBuiltInType extends BaseObjectType {
    constructor() {
      super(spec.name);
    }

    check(value: unknown): boolean {
      return spec.check(value);
    }
  }

  return new GeneratedBuiltInType();
}

// =============================================================================
// TYPE REGISTRY - Dynamic Lookup
// =============================================================================

/**
 * Registry mapping type names to type instances.
 * Enables dynamic type lookup: BuiltInTypeRegistry.get('Array')
 */
export const BuiltInTypeRegistry = new Map<string, BaseObjectType>(
  BUILT_IN_TYPES.map(spec => [spec.name, createBuiltInType(spec)])
);

// =============================================================================
// EXPORTED CLASS DEFINITIONS (for backward compatibility)
// =============================================================================

/**
 * These class definitions are kept for backward compatibility with code
 * that expects specific class types (e.g., `new ArrayType(elementType)`).
 *
 * They could eventually be replaced with factory functions that create
 * instances with generic parameters.
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

export class ArrayType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `Array<${elementType.typeName}>` : 'Array');
  }

  check(value: unknown): boolean {
    return Array.isArray(value);
  }
}

export class SetType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `Set<${elementType.typeName}>` : 'Set');
  }

  check(value: unknown): boolean {
    return value instanceof Set;
  }
}

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

export class WeakSetType extends BaseObjectType {
  constructor(public readonly elementType?: Type | null) {
    super(elementType ? `WeakSet<${elementType.typeName}>` : 'WeakSet');
  }

  check(value: unknown): boolean {
    return value instanceof WeakSet;
  }
}

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

export class DateType extends BaseObjectType {
  constructor() {
    super('Date');
  }

  check(value: unknown): boolean {
    return value instanceof Date;
  }
}

export class RegExpType extends BaseObjectType {
  constructor() {
    super('RegExp');
  }

  check(value: unknown): boolean {
    return value instanceof RegExp;
  }
}

export class ErrorType extends BaseObjectType {
  constructor(name: string = 'Error') {
    super(name);
  }

  check(value: unknown): boolean {
    return value instanceof Error;
  }
}

export class PromiseType extends BaseObjectType {
  constructor(public readonly resolveType?: Type | null) {
    super(resolveType ? `Promise<${resolveType.typeName}>` : 'Promise');
  }

  check(value: unknown): boolean {
    return value instanceof Promise;
  }
}

export class ArrayBufferType extends BaseObjectType {
  constructor() {
    super('ArrayBuffer');
  }

  check(value: unknown): boolean {
    return value instanceof ArrayBuffer;
  }
}

export class SharedArrayBufferType extends BaseObjectType {
  constructor() {
    super('SharedArrayBuffer');
  }

  check(value: unknown): boolean {
    return typeof SharedArrayBuffer !== 'undefined' && value instanceof SharedArrayBuffer;
  }
}

export class DataViewType extends BaseObjectType {
  constructor() {
    super('DataView');
  }

  check(value: unknown): boolean {
    return value instanceof DataView;
  }
}

export class TypedArrayType extends BaseObjectType {
  constructor(name: string, public readonly elementType?: Type | null) {
    super(elementType ? `${name}<${elementType.typeName}>` : name);
  }

  check(value: unknown): boolean {
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
  }
}

// =============================================================================
// SINGLETON INSTANCES - Using Class Constructors (for backward compatibility)
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
export const BigUint64ArrayTypeInstance = new TypedArrayType('BigUint64Array', BigIntType);;
