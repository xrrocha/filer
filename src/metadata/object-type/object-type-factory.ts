/**
 * ObjectType Factory - Creates factory functions for user-defined structured object types
 *
 * This is for USER-DEFINED types (like Dept, Emp in the Scott schema).
 * Built-in JavaScript object types (Array, Map, Function, etc.) have their own classes.
 */

import { BaseObjectType } from '../core/base-object-type.js';
import { getDefaultContext } from '../validation/validation-context.js';
import { ImmediateValidator } from '../validation/validation-strategy.js';
import { SetTrapValidator } from '../validation/set-trap-validator.js';
import { collectProperties, collectValidations, buildValidationIndex } from './inheritance.js';
import { createGetTrapHandler, createDeleteTrapHandler } from './proxy-handlers.js';
import type { ObjectTypeSpec, ObjectTypeFactory } from './object-type-spec.js';

/**
 * ObjectType - Creates factory functions for user-defined structured object types.
 *
 * @param spec - Type specification with name, properties, prototype, supertype, validations
 * @returns Factory function that creates instances
 */
export function ObjectType(spec: ObjectTypeSpec): ObjectTypeFactory {
  const { name, properties = {}, prototype = null, supertype = null, validations = [], context } = spec;

  // Get validation context (use provided or default global context)
  const validationContext = context ?? getDefaultContext();

  // Inject strategy into context if not set
  if (!validationContext.strategy) {
    validationContext.strategy = new ImmediateValidator();
  }

  // Collect all properties from inheritance chain
  const allProperties = collectProperties(supertype, properties);

  // NOTE: Thunk resolution happens AFTER factory creation (see below)
  // to allow self-references like: Emp.mgr: () => Emp

  // Collect all object-level validations from inheritance chain
  const allValidations = collectValidations(supertype, validations);

  // Build validation index for O(1) lookup
  const validationIndex = buildValidationIndex(allValidations);

  // Create SET trap validator (encapsulates all validation logic)
  const setTrapValidator = new SetTrapValidator(
    name,
    allProperties,
    validationIndex,
    validationContext
  );

  // The factory function - creates proxied instances
  const factory = function (props: Record<string, unknown> = {}): object {
    const target: Record<string, unknown> = {};

    // Create proxy handler functions
    const getTrap = createGetTrapHandler(name, allProperties, factory);
    const deleteTrap = createDeleteTrapHandler(name);

    // Proxy handler with validation delegation
    const handler: ProxyHandler<typeof target> = {
      set(target, prop, value, receiver) {
        // Delegate all SET validation to SetTrapValidator
        return setTrapValidator.validate(target, prop, value, receiver);
      },

      get: getTrap,
      deleteProperty: deleteTrap
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

  // Attach compiled metadata
  factory._compiled = {
    validationsByProperty: validationIndex
  };

  // Type checking
  factory.check = function (value: unknown): boolean {
    return typeof value === 'object' && value !== null && (value as any).__type__ === factory;
  };

  return factory;
}
