/**
 * ObjectType Specification and Factory Interfaces
 *
 * Defines the contracts for creating user-defined object types.
 */

import type { BaseObjectType } from '../core/base-object-type.js';
import type { PropertyDescriptor } from '../metadata/property-descriptor.js';
import type { ObjectValidationRule } from '../validation/interfaces.js';
import type { ValidationContext } from '../validation/validation-context.js';

/**
 * Compiled metadata built during ObjectType processing.
 *
 * Pre-computed indexes for O(1) lookup during runtime operations.
 *
 * NOTE: Thunks in property types are resolved LAZILY in proxy traps,
 * not during compilation. This allows self-references like Emp.mgr: () => Emp.
 */
export interface CompiledMetadata {
  /**
   * Index: property name → object-level validations involving that property.
   *
   * Built at compile time by scanning all ObjectValidationRules and indexing
   * by their `properties` array.
   *
   * Used in SET trap for O(1) lookup: "which object validations does this
   * property participate in?"
   *
   * @example
   * // Given: { name: 'dept-boss', properties: ['dept', 'boss'], ... }
   * // Index contains:
   * // 'dept' -> Set([dept-boss-validation])
   * // 'boss' -> Set([dept-boss-validation])
   */
  validationsByProperty: Map<string, Set<ObjectValidationRule>>;
}

/**
 * Specification for creating a user-defined ObjectType factory
 */
export interface ObjectTypeSpec {
  name: string;
  properties?: Record<string, PropertyDescriptor>;
  prototype?: object | null;
  supertype?: ObjectTypeFactory | null;  // Parent type for inheritance

  /**
   * Object-level validations for this type.
   * Cross-property constraints deferred until commit.
   */
  validations?: ObjectValidationRule[];

  /**
   * Validation context for this type.
   * If not provided, uses the default global context.
   *
   * @see ValidationContext
   */
  context?: ValidationContext;
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

  /**
   * Object-level validations for this type.
   * Inherited from supertype chain and merged with own validations.
   */
  validations?: ObjectValidationRule[];

  /**
   * Compiled metadata (built during ObjectType processing).
   * Contains pre-computed indexes for efficient runtime lookup.
   *
   * @internal
   */
  _compiled?: CompiledMetadata;

  // Type checking
  check(value: unknown): boolean;
}
