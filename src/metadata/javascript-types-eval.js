/**
 * JavaScript Type System - Eval-Compatible Version
 *
 * This is the same as javascript-types.js but without ES6 module exports.
 * Designed to be:
 * 1. Loaded globally into window for eval() contexts
 * 2. Inlined into code before eval (like Scott example)
 * 3. Used via a require() shim
 *
 * Usage in Navigator:
 *   // Load this file, then types are available globally:
 *   const Dept = ObjectType({...});
 */

(function(global) {
  'use strict';

  // =============================================================================
  // TYPE - Abstract Base
  // =============================================================================

  function Type(name) {
    this.typeName = name;
  }

  Type.prototype.check = function(value) {
    throw new Error(`${this.typeName}.check() not implemented`);
  };

  // =============================================================================
  // PRIMITIVE TYPE
  // =============================================================================

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

  const NumberType = new PrimitiveType('number');
  const StringType = new PrimitiveType('string');
  const BooleanType = new PrimitiveType('boolean');
  const BigIntType = new PrimitiveType('bigint');
  const SymbolType = new PrimitiveType('symbol');
  const UndefinedType = new PrimitiveType('undefined');
  const NullType = new PrimitiveType('null');

  // =============================================================================
  // OBJECT TYPE
  // =============================================================================

  function ObjectType({name, properties = {}, prototype = null}) {
    const factory = function(props = {}) {
      const instance = Object.create(factory.prototype);

      Object.keys(properties).forEach(propName => {
        if (propName in props) {
          instance[propName] = props[propName];
        }
      });

      Object.defineProperty(instance, '__type__', {
        value: factory,
        writable: false,
        enumerable: false,
        configurable: false
      });

      return instance;
    };

    if (prototype) {
      factory.prototype = Object.create(prototype);
    } else {
      factory.prototype = {};
    }

    factory.typeName = name;
    factory.properties = properties;

    Object.setPrototypeOf(factory, ObjectType.prototype);
    Type.call(factory, name);

    return factory;
  }

  Type.call(ObjectType, 'ObjectType');
  ObjectType.prototype = Object.create(Type.prototype);
  ObjectType.prototype.constructor = ObjectType;

  ObjectType.prototype.check = function(value) {
    return typeof value === 'object' && value !== null && value.__type__ === this;
  };

  // =============================================================================
  // FUNCTION TYPE
  // =============================================================================

  function FunctionType({name, signature = null}) {
    Type.call(this, name);
    this.signature = signature;
  }

  FunctionType.prototype = Object.create(Type.prototype);
  FunctionType.prototype.constructor = FunctionType;

  FunctionType.prototype.check = function(value) {
    return typeof value === 'function';
  };

  // =============================================================================
  // ARRAY TYPE
  // =============================================================================

  function ArrayType(elementType = null) {
    Type.call(this, elementType ? `Array<${elementType.typeName}>` : 'Array');
    this.elementType = elementType;
  }

  ArrayType.prototype = Object.create(Type.prototype);
  ArrayType.prototype.constructor = ArrayType;

  ArrayType.prototype.check = function(value) {
    return Array.isArray(value);
  };

  const ArrayTypeInstance = new ArrayType();

  // =============================================================================
  // SET TYPE
  // =============================================================================

  function SetType(elementType = null) {
    Type.call(this, elementType ? `Set<${elementType.typeName}>` : 'Set');
    this.elementType = elementType;
  }

  SetType.prototype = Object.create(Type.prototype);
  SetType.prototype.constructor = SetType;

  SetType.prototype.check = function(value) {
    return value instanceof Set;
  };

  const SetTypeInstance = new SetType();

  // =============================================================================
  // MAP TYPE
  // =============================================================================

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

  const MapTypeInstance = new MapType();

  // =============================================================================
  // DATE TYPE
  // =============================================================================

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
  // EXPOSE TO GLOBAL (for eval contexts)
  // =============================================================================

  // Bundle everything into JSTypes namespace
  const JSTypes = {
    Type,
    PrimitiveType,
    NumberType,
    StringType,
    BooleanType,
    BigIntType,
    SymbolType,
    UndefinedType,
    NullType,
    ObjectType,
    FunctionType,
    ArrayType,
    ArrayTypeInstance,
    SetType,
    SetTypeInstance,
    MapType,
    MapTypeInstance,
    DateType,
    DateTypeInstance
  };

  // Expose as global
  global.JSTypes = JSTypes;

  // Also unpack to global for convenience (optional - comment out if too polluting)
  global.Type = Type;
  global.PrimitiveType = PrimitiveType;
  global.NumberType = NumberType;
  global.StringType = StringType;
  global.BooleanType = BooleanType;
  global.BigIntType = BigIntType;
  global.SymbolType = SymbolType;
  global.UndefinedType = UndefinedType;
  global.NullType = NullType;
  global.ObjectType = ObjectType;
  global.FunctionType = FunctionType;
  global.ArrayType = ArrayType;
  global.SetType = SetType;
  global.MapType = MapType;
  global.DateType = DateType;
  global.DateTypeInstance = DateTypeInstance;

})(typeof window !== 'undefined' ? window : global);
