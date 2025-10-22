/**
 * Proxy Handlers - GET and DELETE trap implementations for ObjectType instances
 */

import type { PropertyDescriptor } from '../metadata/property-descriptor.js';
import type { ObjectTypeFactory } from './object-type-spec.js';

/**
 * GET trap handler for ObjectType instances.
 *
 * Lookup order:
 * 1. Own properties (already set on target)
 * 2. Schema properties (defined but not set) → return undefined
 * 3. Prototype methods (bind to receiver if function)
 * 4. Throw error if not found
 */
export function createGetTrapHandler(
  name: string,
  allProperties: Record<string, PropertyDescriptor>,
  factory: ObjectTypeFactory
) {
  return function get(target: Record<string, unknown>, prop: string | symbol, receiver: object): unknown {
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
  };
}

/**
 * DELETE trap handler for ObjectType instances.
 *
 * Prevents property deletion - schema is immutable.
 */
export function createDeleteTrapHandler(name: string) {
  return function deleteProperty(target: Record<string, unknown>, prop: string | symbol): boolean {
    throw new Error(`Cannot delete property '${String(prop)}' from ${name}: schema is immutable`);
  };
}
