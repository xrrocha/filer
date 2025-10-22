/**
 * Validation Metadata - Layer 3a
 *
 * Everything related to integrity constraints and validation.
 * Uses ONLY the validations array - no ad-hoc shortcuts!
 */

import type { ValidationRule } from '../validation/interfaces.js';

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
