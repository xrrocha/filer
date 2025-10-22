/**
 * Inheritance Helpers - Property and validation collection from supertype chain
 */

import type { PropertyDescriptor } from '../metadata/property-descriptor.js';
import type { ObjectValidationRule } from '../validation/interfaces.js';
import type { ObjectTypeFactory } from './object-type-spec.js';

/**
 * Recursively collect properties from supertype chain.
 * Child properties override parent properties (error if conflict).
 * Validates that descriptor.name matches map key.
 */
export function collectProperties(
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
export function collectValidations(
  supertype: ObjectTypeFactory | null,
  ownValidations: ObjectValidationRule[]
): ObjectValidationRule[] {
  if (!supertype) return [...ownValidations];

  const baseValidations = supertype.validations || [];
  return [...baseValidations, ...ownValidations];
}

/**
 * Build validation index from object-level validations.
 * Creates Map<propertyName, Set<ObjectValidationRule>>.
 *
 * @param validations - Array of object-level validations
 * @returns Index for O(1) property → validations lookup
 */
export function buildValidationIndex(
  validations: ObjectValidationRule[]
): Map<string, Set<ObjectValidationRule>> {
  const index = new Map<string, Set<ObjectValidationRule>>();

  for (const validation of validations) {
    for (const propName of validation.properties) {
      if (!index.has(propName)) {
        index.set(propName, new Set());
      }
      index.get(propName)!.add(validation);
    }
  }

  return index;
}
