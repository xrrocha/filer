/**
 * JavaScript Type System - Core
 *
 * A minimal reflective model of JavaScript's type system, supporting:
 * - Primitive types (number, string, boolean, bigint, symbol, null, undefined)
 * - Object types (with property descriptors and prototype chains)
 * - Collection types (Array, Set, Map - as object specializations)
 * - Function types (objects with [[Call]])
 * - Factory synthesis (dynamically create constructors from metadata)
 *
 * This is ONLY the structural core. Validation, UI metadata, and entity
 * semantics are separate layers built on top of this foundation.
 */

// =============================================================================
// TYPE - Abstract Base
// =============================================================================

/**
 * Type - Base of the type hierarchy.
 * All types have a name for identification and introspection.
 */
function Type(name) {
  // Use typeName to avoid conflict with Function.name property
  this.typeName = name;
}

/**
 * Check if a value structurally conforms to this type.
 * This is JavaScript's typeof/instanceof checking, not validation.
 */
Type.prototype.check = function(value) {
  throw new Error(`${this.typeName}.check() not implemented`);
};

// =============================================================================
// PRIMITIVE TYPE
// =============================================================================

/**
 * PrimitiveType - JavaScript's primitive types.
 * These are immutable values, not objects.
 */
function PrimitiveType(name) {
  Type.call(this, name);
}

PrimitiveType.prototype = Object.create(Type.prototype);
PrimitiveType.prototype.constructor = PrimitiveType;

PrimitiveType.prototype.check = function(value) {
  switch(this.typeName) {
    case 'number': return typeof value === 'number';
    case 'string': return typeof value === 'string';
    case 'boolean': return typeof value === 'boolean';
    case 'bigint': return typeof value === 'bigint';
    case 'symbol': return typeof value === 'symbol';
    case 'undefined': return value === undefined;
    case 'null': return value === null;
    default: return false;
  }
};

// Singleton instances for convenience
const NumberType = new PrimitiveType('number');
const StringType = new PrimitiveType('string');
const BooleanType = new PrimitiveType('boolean');
const BigIntType = new PrimitiveType('bigint');
const SymbolType = new PrimitiveType('symbol');
const UndefinedType = new PrimitiveType('undefined');
const NullType = new PrimitiveType('null');

// =============================================================================
// OBJECT TYPE - Foundation for all non-primitive types
// =============================================================================

/**
 * ObjectType - Creates factory functions for structured object types.
 *
 * In JavaScript, (almost) everything that's not a primitive is an object:
 * - Plain objects: {}
 * - Arrays: []
 * - Functions: function() {}
 * - Dates: new Date()
 * - RegExps: /pattern/
 * - Sets, Maps, etc.
 *
 * ObjectType models this by providing a factory synthesis mechanism:
 * you describe properties, it generates a constructor function.
 *
 * @param {Object} spec
 * @param {string} spec.name - Type name
 * @param {Object} spec.properties - Property descriptors {propName: {type, ...}}
 * @param {Object} spec.prototype - Optional prototype object for methods
 * @returns {Function} Factory function that creates instances
 */
function ObjectType({name, properties = {}, prototype = null}) {
  // The factory function - this IS the type (factory-as-type pattern)
  const factory = function(props = {}) {
    // Create the instance object
    const instance = Object.create(factory.prototype);

    // Set properties from props
    Object.keys(properties).forEach(propName => {
      if (propName in props) {
        instance[propName] = props[propName];
      }
    });

    // Mark instance with its type (for introspection)
    Object.defineProperty(instance, '__type__', {
      value: factory,
      writable: false,
      enumerable: false,
      configurable: false
    });

    return instance;
  };

  // Setup prototype chain
  if (prototype) {
    factory.prototype = Object.create(prototype);
  } else {
    factory.prototype = {};
  }

  // Store metadata on the factory for introspection
  factory.typeName = name;
  factory.properties = properties;

  // Make factory a Type
  Object.setPrototypeOf(factory, ObjectType.prototype);
  Type.call(factory, name);

  return factory;
}

// ObjectType itself is a Type
Type.call(ObjectType, 'ObjectType');
ObjectType.prototype = Object.create(Type.prototype);
ObjectType.prototype.constructor = ObjectType;

ObjectType.prototype.check = function(value) {
  // Check if value is an instance of this object type
  return typeof value === 'object' && value !== null && value.__type__ === this;
};

// =============================================================================
// FUNCTION TYPE - Objects with [[Call]]
// =============================================================================

/**
 * FunctionType - Models JavaScript functions.
 * Functions are objects that can be invoked.
 *
 * Note: In pure JavaScript, functions are just objects with a [[Call]] internal slot.
 * We model this minimally - parameter/return types are validation concerns (Layer 3).
 */
function FunctionType({name, signature = null}) {
  Type.call(this, name);
  this.signature = signature;  // For future use: {params: [...], returns: Type}
}

FunctionType.prototype = Object.create(Type.prototype);
FunctionType.prototype.constructor = FunctionType;

FunctionType.prototype.check = function(value) {
  return typeof value === 'function';
};

// =============================================================================
// ARRAY TYPE - Objects with indexed elements
// =============================================================================

/**
 * ArrayType - Models JavaScript arrays.
 * Arrays are objects with:
 * - Numeric indices
 * - length property
 * - Array.prototype methods
 *
 * @param {Type} elementType - Type of elements (optional, for future type checking)
 */
function ArrayType(elementType = null) {
  Type.call(this, elementType ? `Array<${elementType.typeName}>` : 'Array');
  this.elementType = elementType;
}

ArrayType.prototype = Object.create(Type.prototype);
ArrayType.prototype.constructor = ArrayType;

ArrayType.prototype.check = function(value) {
  return Array.isArray(value);
};

// Convenience singleton for untyped arrays
const ArrayTypeInstance = new ArrayType();

// =============================================================================
// SET TYPE - Collection of unique values
// =============================================================================

/**
 * SetType - Models JavaScript Sets.
 * Sets are objects with:
 * - Unique elements
 * - Set.prototype methods (add, delete, has, etc.)
 */
function SetType(elementType = null) {
  Type.call(this, elementType ? `Set<${elementType.typeName}>` : 'Set');
  this.elementType = elementType;
}

SetType.prototype = Object.create(Type.prototype);
SetType.prototype.constructor = SetType;

SetType.prototype.check = function(value) {
  return value instanceof Set;
};

// Convenience singleton for untyped sets
const SetTypeInstance = new SetType();

// =============================================================================
// MAP TYPE - Key-value associations
// =============================================================================

/**
 * MapType - Models JavaScript Maps.
 * Maps are objects with:
 * - Key-value pairs
 * - Map.prototype methods (set, get, delete, has, etc.)
 */
function MapType(keyType = null, valueType = null) {
  const keyPart = keyType ? keyType.typeName : '*';
  const valuePart = valueType ? valueType.typeName : '*';
  Type.call(this, `Map<${keyPart}, ${valuePart}>`);
  this.keyType = keyType;
  this.valueType = valueType;
}

MapType.prototype = Object.create(Type.prototype);
MapType.prototype.constructor = MapType;

MapType.prototype.check = function(value) {
  return value instanceof Map;
};

// Convenience singleton for untyped maps
const MapTypeInstance = new MapType();

// =============================================================================
// DATE TYPE - Temporal values
// =============================================================================

/**
 * DateType - Models JavaScript Date objects.
 */
function DateType() {
  Type.call(this, 'Date');
}

DateType.prototype = Object.create(Type.prototype);
DateType.prototype.constructor = DateType;

DateType.prototype.check = function(value) {
  return value instanceof Date;
};

const DateTypeInstance = new DateType();

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Base
  Type,

  // Primitives
  PrimitiveType,
  NumberType,
  StringType,
  BooleanType,
  BigIntType,
  SymbolType,
  UndefinedType,
  NullType,

  // Objects
  ObjectType,
  FunctionType,

  // Collections
  ArrayType,
  ArrayTypeInstance,
  SetType,
  SetTypeInstance,
  MapType,
  MapTypeInstance,

  // Other Objects
  DateType,
  DateTypeInstance
};
