/**
 * Property Descriptor - Complete metadata for a property
 *
 * Clean separation of concerns via nested namespaces:
 * - name: Property identity (always present)
 * - type: Structural (always present)
 * - ui: Display/presentation (optional)
 * - validation: Integrity constraints (optional)
 * - lifecycle: Event hooks (optional, future)
 */

import type { Type } from '../core/type.js';
import type { UIMetadata } from './ui-metadata.js';
import type { ValidationMetadata } from './validation-metadata.js';
import type { LifecycleMetadata } from './lifecycle-metadata.js';

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
