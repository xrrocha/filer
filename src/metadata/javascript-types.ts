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
// CORE TYPE SYSTEM
// =============================================================================

// Re-export core types
export { Type } from './core/type.js';
export { BaseObjectType } from './core/base-object-type.js';
export {
  NumberType,
  StringType,
  BooleanType,
  BigIntType,
  SymbolType,
  UndefinedType,
  NullType,
} from './core/primitive-types.js';
export {
  FunctionType,
  ArrayType,
  SetType,
  MapType,
  WeakSetType,
  WeakMapType,
  DateType,
  RegExpType,
  ErrorType,
  PromiseType,
  ArrayBufferType,
  SharedArrayBufferType,
  DataViewType,
  TypedArrayType,
  // Singleton instances
  ArrayTypeInstance,
  SetTypeInstance,
  MapTypeInstance,
  WeakMapTypeInstance,
  WeakSetTypeInstance,
  DateTypeInstance,
  RegExpTypeInstance,
  ErrorTypeInstance,
  TypeErrorTypeInstance,
  ReferenceErrorTypeInstance,
  SyntaxErrorTypeInstance,
  RangeErrorTypeInstance,
  PromiseTypeInstance,
  ArrayBufferTypeInstance,
  SharedArrayBufferTypeInstance,
  DataViewTypeInstance,
  Int8ArrayTypeInstance,
  Uint8ArrayTypeInstance,
  Int16ArrayTypeInstance,
  Uint16ArrayTypeInstance,
  Int32ArrayTypeInstance,
  Uint32ArrayTypeInstance,
  Float32ArrayTypeInstance,
  Float64ArrayTypeInstance,
  BigInt64ArrayTypeInstance,
  BigUint64ArrayTypeInstance,
} from './core/built-in-types.js';

// =============================================================================
// VALIDATION INTERFACES
// =============================================================================

export {
  type ValidationRuleBase,
  type PropertyValidationRule,
  type ObjectValidationRule,
  type ValidationRule,
} from './validation/interfaces.js';

export { ValidationError } from './validation/validation-error.js';
export { type ValidationStrategy, ImmediateValidator } from './validation/validation-strategy.js';
export { ValidationContext, getDefaultContext } from './validation/validation-context.js';

// =============================================================================
// METADATA INTERFACES
// =============================================================================

export { type UIMetadata } from './metadata/ui-metadata.js';
export { type ValidationMetadata } from './metadata/validation-metadata.js';
export { type LifecycleMetadata } from './metadata/lifecycle-metadata.js';
export { type PropertyDescriptor } from './metadata/property-descriptor.js';

// =============================================================================
// OBJECT TYPE FACTORY
// =============================================================================

export {
  type CompiledMetadata,
  type ObjectTypeSpec,
  type ObjectTypeFactory,
} from './object-type/object-type-spec.js';

export { ObjectType } from './object-type/object-type-factory.js';
