/**
 * JavaScript Type System - Metamodel
 *
 * This file defines a model of the type system defined in 'javascript-types.js'.
 * The model itself is constructed using the types from that same system, creating
 * a self-describing structure.
 *
 * This metamodel can be used for introspection, documentation generation,
 * UI building, or any other purpose that requires a data-driven understanding
 * of the core type system.
 */

import {
  // Core constructors
  ObjectType,
  FunctionType,
  ArrayType,
  SetType,
  MapType,
  DateType,

  // Primitive singletons
  StringType,
  NullType,

  // Collection singletons
  ArrayTypeInstance,
  MapTypeInstance,
  SetTypeInstance,

  // Other singletons
  DateTypeInstance
} from './javascript-types.js';

// =============================================================================
// META-TYPE DEFINITIONS
// These are the "types of types" used to build the model.
// =============================================================================

// A model for a Type. All other models will inherit from this.
const MetaType = new ObjectType({
  name: 'MetaType',
  properties: {
    typeName: { type: StringType, description: "The name of the type." },
  }
});

// A model for a Property Descriptor used within ObjectTypes.
const MetaPropertyDescriptor = new ObjectType({
    name: 'MetaPropertyDescriptor',
    properties: {
        type: { type: MetaType, description: "The type of the property." },
        description: { type: StringType, description: "A description of the property." }
    }
});

// A model for ObjectType.
const MetaObjectType = new ObjectType({
  name: 'MetaObjectType',
  properties: {
    properties: {
      type: MapTypeInstance, // Map<String, MetaPropertyDescriptor>
      description: "A map of property names to their type descriptors."
    },
    prototype: {
      type: MetaType,
      description: "The prototype this object's model inherits from."
    }
  },
  prototype: MetaType
});

// A model for FunctionType.
const MetaFunctionType = new ObjectType({
  name: 'MetaFunctionType',
  properties: {
    signature: { type: NullType, description: "Represents the function signature (future use)." }
  },
  prototype: MetaType
});

// A model for collection types (Array, Set, Map).
const MetaCollectionType = new ObjectType({
    name: 'MetaCollectionType',
    properties: {
        elementType: { type: MetaType, description: "The type of elements in the collection." }
    },
    prototype: MetaType
});

// A model for MapType, which has key and value types.
const MetaMapType = new ObjectType({
    name: 'MetaMapType',
    properties: {
        keyType: { type: MetaType, description: "The type of keys in the map." },
        valueType: { type: MetaType, description: "The type of values in the map." }
    },
    prototype: MetaType
});


// =============================================================================
// METAMODEL INSTANCES
// These are the instances that represent the actual types from javascript-types.js
// =============================================================================

const TypeModel = MetaType({
    typeName: 'Type'
});

const PrimitiveTypeModel = new ObjectType({ name: 'PrimitiveTypeModel', prototype: TypeModel })({
    typeName: 'PrimitiveType'
});

const NumberTypeModel = new ObjectType({ name: 'NumberTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'number'
});
const StringTypeModel = new ObjectType({ name: 'StringTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'string'
});
const BooleanTypeModel = new ObjectType({ name: 'BooleanTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'boolean'
});
const BigIntTypeModel = new ObjectType({ name: 'BigIntTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'bigint'
});
const SymbolTypeModel = new ObjectType({ name: 'SymbolTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'symbol'
});
const UndefinedTypeModel = new ObjectType({ name: 'UndefinedTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'undefined'
});
const NullTypeModel = new ObjectType({ name: 'NullTypeModel', prototype: PrimitiveTypeModel })({
    typeName: 'null'
});

const ObjectTypeModel = MetaObjectType({
    typeName: 'ObjectType',
    prototype: TypeModel,
    properties: new Map([
        ['name', MetaPropertyDescriptor({ type: StringTypeModel, description: "The type name for the created factory." })],
        ['properties', MetaPropertyDescriptor({ type: MapTypeInstance, description: "Property descriptors for the factory." })],
        ['prototype', MetaPropertyDescriptor({ type: TypeModel, description: "Prototype for the instances created by the factory." })]
    ]),
});

const FunctionTypeModel = MetaFunctionType({
    typeName: 'FunctionType',
    prototype: TypeModel,
    signature: null
});

const ArrayTypeModel = new ObjectType({ name: 'ArrayTypeModel', prototype: MetaCollectionType })({
    typeName: 'ArrayType',
    prototype: TypeModel,
    elementType: TypeModel
});

const SetTypeModel = new ObjectType({ name: 'SetTypeModel', prototype: MetaCollectionType })({
    typeName: 'SetType',
    prototype: TypeModel,
    elementType: TypeModel
});

const MapTypeModel = MetaMapType({
    typeName: 'MapType',
    prototype: TypeModel,
    keyType: TypeModel,
    valueType: TypeModel
});

const DateTypeModel = new ObjectType({ name: 'DateTypeModel', prototype: TypeModel })({
    typeName: 'Date'
});

// =============================================================================
// EXPORT THE COMPLETE METAMODEL
// =============================================================================

export const metamodel = {
  // Meta-types (the types of types)
  metaTypes: {
    MetaType,
    MetaPropertyDescriptor,
    MetaObjectType,
    MetaFunctionType,
    MetaCollectionType,
    MetaMapType
  },
  // Type models (the model of the system)
  models: {
    Type: TypeModel,
    PrimitiveType: PrimitiveTypeModel,
    primitives: {
      number: NumberTypeModel,
      string: StringTypeModel,
      boolean: BooleanTypeModel,
      bigint: BigIntTypeModel,
      symbol: SymbolTypeModel,
      undefined: UndefinedTypeModel,
      null: NullTypeModel,
    },
    ObjectType: ObjectTypeModel,
    FunctionType: FunctionTypeModel,
    ArrayType: ArrayTypeModel,
    SetType: SetTypeModel,
    MapType: MapTypeModel,
    DateType: DateTypeModel
  }
};
