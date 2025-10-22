import type { Type } from '../javascript-types.js';
import type { ValidationContext } from './validation-context.js';

/**
 * PropertyDescriptor - Metadata for a single property in an ObjectType.
 * Imported locally to avoid circular dependencies.
 */
export interface PropertyDescriptor {
  name: string;
  type: Type | (() => Type);  // Thunk for self-references
  validation?: {
    required?: boolean;
    enterable?: boolean;
    updatable?: boolean;
    initialValue?: () => unknown;
    validations?: Array<{
      validate(value: unknown): boolean;
      errorMessage(value: unknown, lang?: string): string;
    }>;
  };
}

/**
 * ObjectValidationRule - Rule that validates across multiple properties.
 */
export interface ObjectValidationRule {
  name: string;
  properties: string[];
  validate(obj: unknown): boolean;
  errorMessage(obj: unknown, lang?: string): string;

  /**
   * Whether to propagate exceptions from validate() immediately.
   *
   * - false (default): Treat exceptions as validation failure (deferred)
   * - true: Propagate exceptions immediately (fail fast)
   */
  propagateExceptions?: boolean;
}

/**
 * SetTrapValidator - Encapsulates all SET trap validation logic.
 *
 * Extracted from the 70-line inline SET trap in ObjectType().
 * Each validation step is now a separate testable method.
 */
export class SetTrapValidator {
  constructor(
    private readonly typeName: string,
    private readonly properties: Record<string, PropertyDescriptor>,
    private readonly validationIndex: Map<string, Set<ObjectValidationRule>>,
    private readonly context: ValidationContext
  ) {}

  /**
   * Main SET trap handler.
   * Orchestrates all validation steps in order.
   */
  validate(
    target: Record<string, unknown>,
    prop: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    // Fast path: symbols (no validation)
    if (typeof prop === 'symbol') {
      return Reflect.set(target, prop, value, receiver);
    }

    const propName = String(prop);
    const descriptor = this.properties[propName];

    // Step 1: Schema enforcement (throws if descriptor is undefined)
    this.checkSchema(propName, descriptor);

    // After checkSchema, descriptor is guaranteed to be defined
    // Step-by-step validation (each throws on failure)
    const propType = this.resolveType(descriptor!);
    this.checkEnterable(propName, descriptor!);
    this.checkUpdatable(propName, descriptor!, target);
    this.checkRequired(propName, descriptor!, value);
    this.checkType(propName, propType, value);
    this.checkPropertyValidations(descriptor!, value);

    // Execute assignment
    const result = Reflect.set(target, prop, value, receiver);

    // Object-level validations (deferred - tracked in context)
    this.checkObjectValidations(propName, receiver);

    return result;
  }

  /**
   * Step 1: Schema enforcement.
   * Ensures property is declared in the type's schema.
   */
  private checkSchema(propName: string, descriptor: PropertyDescriptor | undefined): void {
    if (!descriptor) {
      throw new Error(`Property '${propName}' not declared in schema for type ${this.typeName}`);
    }
  }

  /**
   * Step 2: Type resolution.
   * Resolves thunks for self-references (e.g., Person.manager: () => Person).
   */
  private resolveType(descriptor: PropertyDescriptor): Type {
    if (typeof descriptor.type === 'function' && !('typeName' in descriptor.type)) {
      return (descriptor.type as () => Type)();
    }
    return descriptor.type as Type;
  }

  /**
   * Step 3: Enterable check.
   * Prevents setting properties marked as enterable=false.
   */
  private checkEnterable(propName: string, descriptor: PropertyDescriptor): void {
    if (descriptor.validation?.enterable === false) {
      throw new Error(`Property '${propName}' is not enterable`);
    }
  }

  /**
   * Step 4: Updatable check.
   * Prevents updating properties marked as updatable=false after initial set.
   */
  private checkUpdatable(
    propName: string,
    descriptor: PropertyDescriptor,
    target: Record<string, unknown>
  ): void {
    if (descriptor.validation?.updatable === false && target[propName] !== undefined) {
      throw new Error(`Property '${propName}' is not updatable (already set)`);
    }
  }

  /**
   * Step 5: Required check.
   * Prevents setting null/undefined on required properties.
   */
  private checkRequired(propName: string, descriptor: PropertyDescriptor, value: unknown): void {
    if (value == null && descriptor.validation?.required) {
      throw new Error(`Property '${propName}' is required (cannot be null/undefined)`);
    }
  }

  /**
   * Step 6: Type validation.
   * Ensures value matches the property's declared type.
   * Skips check if value is null/undefined and property is optional.
   */
  private checkType(propName: string, propType: Type, value: unknown): void {
    if (value != null && !propType.check(value)) {
      throw new TypeError(
        `Property '${propName}' expects type ${propType.typeName}, got ${typeof value}`
      );
    }
  }

  /**
   * Step 7: Property-level validations.
   * Delegates to validation strategy (e.g., ImmediateValidator).
   */
  private checkPropertyValidations(descriptor: PropertyDescriptor, value: unknown): void {
    this.context.strategy.validateProperty(value, descriptor);
  }

  /**
   * Step 8: Object-level validations.
   * Checks validations that depend on multiple properties.
   * Failures are tracked in context (deferred - not thrown).
   */
  private checkObjectValidations(propName: string, receiver: object): void {
    const relevantValidations = this.validationIndex.get(propName);
    if (!relevantValidations || relevantValidations.size === 0) {
      return;
    }

    relevantValidations.forEach((validation) => {
      try {
        if (validation.validate(receiver)) {
          // Validation passed - remove from pending if it was there
          this.context.removePending(receiver, validation.name);
        } else {
          // Validation failed - add to pending
          this.context.addPending(receiver, validation.name);
        }
      } catch (error) {
        // Check if we should propagate exceptions immediately (fail-fast)
        if (validation.propagateExceptions) {
          throw error;  // Re-throw for immediate failure
        }
        // Default behavior: treat exception as validation failure (deferred)
        this.context.addPending(receiver, validation.name);
      }
    });
  }
}
