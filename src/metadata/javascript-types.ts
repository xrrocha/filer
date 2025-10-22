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

// =============================================================================
// VALIDATION RULES (Layer 3)
// =============================================================================

/**
 * Validation rule for property or object-level constraints.
 *
 * Rules are declarative - they describe constraints without enforcing them.
 * Enforcement happens via Proxy traps (property-level) or explicit validate() calls (object-level).
 *
 * CRITICAL: Uses method signatures (not function properties) to enable
 * the ES6 shorthand pattern for avoiding closure capture:
 *
 * @example
 * const minSal = 85000;
 * const rule = {
 *   minSal,  // ES6 shorthand copies value (no closure!)
 *   validate(value) {
 *     return value >= this.minSal;  // Access via `this`
 *   },
 *   errorMessage(value, lang = 'en') {
 *     const templates = {
 *       'en': `Bad salary, must be above ${this.minSal}`,
 *       'es': `Salario incorrecto, debe ser mayor a ${this.minSal}`
 *     };
 *     return templates[lang];
 *   }
 * };
 */
export interface ValidationRule {
  /**
   * Validation predicate - returns true if valid, false otherwise.
   * Method (not property) to enable `this` references to captured values.
   */
  validate(value: unknown): boolean;

  /**
   * Error message generator with i18n support.
   * Method (not property) to enable `this` references to captured values.
   *
   * @param value - The value that failed validation
   * @param lang - Language code (e.g., 'en', 'es', 'pt')
   */
  errorMessage(value: unknown, lang: string): string;

  // Additional properties can be added via ES6 shorthand to avoid closures
  // e.g., minSal: 85000, maxSal: 250000
  [key: string]: unknown;
}

/**
 * Validation error thrown when constraints are violated
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// =============================================================================
// VALIDATION STRATEGY - Pluggable validation behavior
// =============================================================================

/**
 * ValidationStrategy - Pluggable validation behavior
 *
 * The proxy delegates property validation to this strategy, which can be
 * swapped at runtime.
 */
export interface ValidationStrategy {
  /**
   * Validate a single property assignment.
   * Throws ValidationError if validation fails.
   *
   * Note: Property name is available in descriptor.name
   */
  validateProperty(
    value: unknown,
    descriptor: PropertyDescriptor
  ): void;
}

/**
 * ImmediateValidator - Default validation strategy.
 * Validates immediately on every property assignment.
 */
export class ImmediateValidator implements ValidationStrategy {
  constructor(private lang: string = 'en') {}

  validateProperty(value: unknown, descriptor: PropertyDescriptor): void {
    const validations = descriptor.validation?.validations;
    if (!validations || validations.length === 0) return;

    const errors: string[] = [];

    for (const validation of validations) {
      if (!validation.validate(value)) {
        const msg = validation.errorMessage(value, this.lang);
        errors.push(msg);
      }
    }

    if (errors.length > 0) {
      throw new ValidationError(`Property '${descriptor.name}': ${errors.join('; ')}`);
    }
  }
}

/**
 * ValidationStrategy namespace - Companion object pattern (like Scala)
 *
 * Provides static state and operations for validation strategy management.
 *
 * ⚠️ WARNING: Strategy is GLOBAL mutable state
 * - Affects ALL ObjectType instances across the entire application
 * - Not thread-safe (JavaScript is single-threaded, but async contexts can interleave)
 * - Switching strategies mid-operation can cause inconsistent behavior
 *
 * Use cases:
 * - Application-wide validation mode (immediate vs deferred)
 * - Testing (mock validator, collect errors without throwing)
 * - Transactional contexts (save old strategy, restore after operation)
 *
 * For transactional usage:
 * ```typescript
 * const oldStrategy = ValidationStrategy.current();
 * try {
 *   ValidationStrategy.setCurrent(new DeferredValidator());
 *   // ... perform operations with deferred validation
 * } finally {
 *   ValidationStrategy.setCurrent(oldStrategy);  // Always restore!
 * }
 * ```
 */
export namespace ValidationStrategy {
  // Private state - not exported, truly encapsulated
  let _current: ValidationStrategy = new ImmediateValidator();

  /**
   * Get the current validation strategy.
   */
  export function current(): ValidationStrategy {
    return _current;
  }

  /**
   * Set a new validation strategy.
   *
   * ⚠️ WARNING: This affects ALL validation globally!
   * Consider saving the old strategy and restoring it when done.
   */
  export function setCurrent(strategy: ValidationStrategy): void {
    _current = strategy;
  }
}

// =============================================================================
// METADATA INTERFACES (Layers 2 + 3) - Separated by Concern
// =============================================================================

/**
 * UI Metadata - Layer 2
 *
 * Everything related to display and presentation.
 * Used by Navigator, form generators, table views, etc.
 */
export interface UIMetadata {
  /**
   * Human-readable label for UI display.
   *
   * @example
   * label: "Department Number"
   * label: "Employee Name"
   */
  label?: string;

  /**
   * Format a value for display.
   * Converts internal representation to user-friendly string.
   *
   * @example
   * formatter: (v) => `$${v.toFixed(2)}`  // Money
   * formatter: (v) => new Date(v).toLocaleDateString()  // Date
   */
  formatter?: (value: unknown) => string;

  /**
   * UI widget/control type for forms.
   * Hints to UI generators which input control to use.
   *
   * @example
   * widget: 'number'    // <input type="number">
   * widget: 'select'    // <select> dropdown
   */
  widget?: 'text' | 'number' | 'date' | 'datetime' | 'time' | 'email' | 'url' |
           'select' | 'radio' | 'checkbox' | 'textarea' | 'password';

  /**
   * Placeholder text for empty inputs.
   *
   * @example
   * placeholder: "Enter department name..."
   */
  placeholder?: string;

  /**
   * Help text / description shown near the input.
   *
   * @example
   * helpText: "Department number must be between 10 and 9999"
   */
  helpText?: string;

  /**
   * CSS class(es) to apply to the input/display element.
   *
   * @example
   * cssClass: "currency-input highlighted"
   */
  cssClass?: string;

  /**
   * Whether this field should be hidden in default views.
   */
  hidden?: boolean;

  /**
   * Display order/priority (lower numbers appear first).
   *
   * @example
   * order: 1  // Show first
   */
  order?: number;
}

/**
 * Validation Metadata - Layer 3a
 *
 * Everything related to integrity constraints and validation.
 * Uses ONLY the validations array - no ad-hoc shortcuts!
 */
export interface ValidationMetadata {
  /**
   * Whether this property is required (cannot be null/undefined).
   *
   * @default false
   */
  required?: boolean;

  /**
   * Whether this property can be set during object construction.
   *
   * @default true
   */
  enterable?: boolean;

  /**
   * Whether this property can be updated after initial assignment.
   * Use for immutable fields like primary keys.
   *
   * @default true
   * @example
   * updatable: false  // empno, deptno (set once, never change)
   */
  updatable?: boolean;

  /**
   * Factory function for default/initial value.
   * Must be a function (not direct value) to avoid sharing references.
   *
   * @example
   * initialValue: () => []           // New array each time
   * initialValue: () => Date.now()   // Current timestamp
   */
  initialValue?: () => unknown;

  /**
   * Array of validation rules for this property.
   * This is the ONLY validation mechanism - use composable validators!
   *
   * @example
   * validations: [
   *   isInteger(),
   *   range(10, 9999),
   *   pattern(/^[A-Z]+$/)
   * ]
   */
  validations?: ValidationRule[];
}

/**
 * Lifecycle Metadata - Layer 3b
 *
 * Hooks for lifecycle events (future use).
 */
export interface LifecycleMetadata {
  /**
   * Called after property is created/initialized.
   */
  onCreate?: (value: unknown) => void;

  /**
   * Called before property value changes.
   */
  onUpdate?: (oldValue: unknown, newValue: unknown) => void;

  /**
   * Called when property/object is deleted.
   */
  onDelete?: (value: unknown) => void;
}

/**
 * Property Descriptor - Complete metadata for a property.
 *
 * Clean separation of concerns via nested namespaces:
 * - name: Property identity (always present)
 * - type: Structural (always present)
 * - ui: Display/presentation (optional)
 * - validation: Integrity constraints (optional)
 * - lifecycle: Event hooks (optional, future)
 */
export interface PropertyDescriptor {
  /**
   * The name of this property.
   * Redundant with map key but makes descriptor self-contained.
   *
   * @example
   * name: "salary"
   * name: "deptno"
   */
  name: string;

  /**
   * The type of this property (required).
   * Can be primitive (NumberType, StringType) or object type (Dept, Emp).
   */
  type: Type;

  /**
   * UI metadata - everything related to display and presentation.
   */
  ui?: UIMetadata;

  /**
   * Validation metadata - integrity constraints and validation rules.
   */
  validation?: ValidationMetadata;

  /**
   * Lifecycle metadata - event hooks (future use).
   */
  lifecycle?: LifecycleMetadata;
}

/**
 * Specification for creating a user-defined ObjectType factory
 */
export interface ObjectTypeSpec {
  name: string;
  properties?: Record<string, PropertyDescriptor>;
  prototype?: object | null;
  supertype?: ObjectTypeFactory | null;  // Parent type for inheritance
  validations?: ValidationRule[];  // Object-level validations
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
  supertype?: ObjectTypeFactory | null;  // Parent type reference
  validations?: ValidationRule[];  // Object-level validations

  // Type checking
  check(value: unknown): boolean;
}

// =============================================================================
// INHERITANCE HELPERS - Property and validation collection
// =============================================================================

/**
 * Recursively collect properties from supertype chain.
 * Child properties override parent properties (error if conflict).
 * Validates that descriptor.name matches map key.
 */
function collectProperties(
  supertype: ObjectTypeFactory | null,
  ownProperties: Record<string, PropertyDescriptor>
): Record<string, PropertyDescriptor> {
  // Validate name consistency for own properties
  for (const [propName, descriptor] of Object.entries(ownProperties)) {
    if (descriptor.name !== propName) {
      throw new Error(
        `Property name mismatch: map key '${propName}' != descriptor.name '${descriptor.name}'`
      );
    }
  }

  if (!supertype) return { ...ownProperties };

  const baseProperties = supertype.properties;

  // Check for overrides (prevent them)
  for (const propName of Object.keys(ownProperties)) {
    if (propName in baseProperties) {
      throw new Error(`Cannot override base property '${propName}'`);
    }
  }

  // Merge: base + own
  return { ...baseProperties, ...ownProperties };
}

/**
 * Recursively collect object-level validations from supertype chain.
 * Validations accumulate (parent + child).
 */
function collectValidations(
  supertype: ObjectTypeFactory | null,
  ownValidations: ValidationRule[]
): ValidationRule[] {
  if (!supertype) return [...ownValidations];

  const baseValidations = supertype.validations || [];
  return [...baseValidations, ...ownValidations];
}

// =============================================================================
// OBJECT TYPE - User-defined structured types
// =============================================================================

/**
 * ObjectType - Creates factory functions for user-defined structured object types.
 *
 * This is for USER-DEFINED types (like Dept, Emp in the Scott schema).
 * Built-in JavaScript object types (Array, Map, Function, etc.) have their own classes below.
 *
 * @param spec - Type specification with name, properties, prototype, supertype, validations
 * @returns Factory function that creates instances
 */
export function ObjectType(spec: ObjectTypeSpec): ObjectTypeFactory {
  const { name, properties = {}, prototype = null, supertype = null, validations = [] } = spec;

  // Collect all properties from inheritance chain
  const allProperties = collectProperties(supertype, properties);

  // Collect all object-level validations from inheritance chain
  const allValidations = collectValidations(supertype, validations);

  // The factory function - creates proxied instances
  const factory = function (props: Record<string, unknown> = {}): object {
    const target: Record<string, unknown> = {};

    // Proxy handler with validation delegation
    const handler: ProxyHandler<typeof target> = {
      set(target, prop, value, receiver) {
        if (typeof prop === 'symbol') {
          return Reflect.set(target, prop, value, receiver);
        }

        const propName = String(prop);
        const descriptor = allProperties[propName];

        // 1. Schema enforcement
        if (!descriptor) {
          throw new Error(`Property '${propName}' not declared in schema for type ${name}`);
        }

        // 2. Enterable check
        if (descriptor.validation?.enterable === false) {
          throw new Error(`Property '${propName}' is not enterable`);
        }

        // 3. Updatable check
        if (descriptor.validation?.updatable === false && target[propName] !== undefined) {
          throw new Error(`Property '${propName}' is not updatable (already set)`);
        }

        // 4. Required check
        if (value == null && descriptor.validation?.required) {
          throw new Error(`Property '${propName}' is required (cannot be null/undefined)`);
        }

        // 5. Type validation (always immediate - structural check)
        // Skip type check if value is null and property is optional
        if (value != null && !descriptor.type.check(value)) {
          throw new TypeError(
            `Property '${propName}' expects type ${descriptor.type.typeName}, got ${typeof value}`
          );
        }

        // 6. Delegate user validations to strategy
        ValidationStrategy.current().validateProperty(value, descriptor);

        // 7. Execute assignment
        return Reflect.set(target, prop, value, receiver);
      },

      get(target, prop, receiver) {
        if (typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }

        const propName = String(prop);

        // Check own properties first
        if (propName in target) {
          return Reflect.get(target, prop, receiver);
        }

        // Check schema properties (defined but not set)
        if (propName in allProperties) {
          return undefined;
        }

        // Check prototype methods
        if (propName in factory.prototype) {
          const value = (factory.prototype as any)[propName];
          if (typeof value === 'function') {
            return value.bind(receiver);
          }
          return value;
        }

        throw new Error(`Property '${propName}' not found on type ${name}`);
      },

      deleteProperty(target, prop) {
        throw new Error(`Cannot delete property '${String(prop)}' from ${name}: schema is immutable`);
      }
    };

    const proxy = new Proxy(target, handler);

    // Initialize properties from props
    for (const propName of Object.keys(props)) {
      (proxy as any)[propName] = props[propName];
    }

    // Mark with __type__
    Object.defineProperty(target, '__type__', {
      value: factory,
      writable: false,
      enumerable: false,
      configurable: false
    });

    return proxy;
  } as ObjectTypeFactory;

  // Setup inheritance
  Object.setPrototypeOf(factory, BaseObjectType.prototype);
  factory.prototype = supertype ? Object.create(supertype.prototype) : {};

  // Attach metadata
  factory.typeName = name;
  factory.properties = allProperties;
  factory.supertype = supertype;
  factory.validations = allValidations;

  // Type checking
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
