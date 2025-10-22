/**
 * Validation Strategy - Pluggable validation behavior
 *
 * Defines the strategy interface and default implementation for
 * property-level validation.
 */

import type { PropertyDescriptor } from '../metadata/property-descriptor.js';
import { ValidationError } from './validation-error.js';

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
