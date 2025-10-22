/**
 * Validation Interfaces - Core validation contracts
 *
 * Defines the fundamental validation rule interfaces that enable
 * composable, reusable validation logic.
 *
 * Design pattern: ES6 shorthand pattern to avoid closure capture
 * (see ISSUE-001 in .local/unresolved-issues.md)
 */

/**
 * Base interface for all validation rules.
 *
 * Captures the common structure shared by property-level and object-level validations.
 * Uses method signatures (not arrow functions) to enable ES6 shorthand pattern
 * for avoiding closure capture.
 *
 * @example ES6 shorthand pattern to avoid closures
 * const minSal = 85000;
 * const rule = {
 *   minSal,  // ES6 shorthand copies value (no closure!)
 *   validate(arg) {
 *     return arg >= this.minSal;  // Access via `this`
 *   },
 *   errorMessage(arg, lang = 'en') {
 *     return `Must be >= ${this.minSal}, got ${arg}`;
 *   }
 * };
 */
export interface ValidationRuleBase {
  /**
   * Validation predicate - returns true if valid, false otherwise.
   * Method (not property) to enable `this` references to captured values.
   *
   * @param arg - For property-level: the property value being validated
   *              For object-level: the entire object being validated
   */
  validate(arg: unknown): boolean;

  /**
   * Error message generator with i18n support.
   * Method (not property) to enable `this` references to captured values.
   *
   * @param arg - For property-level: the property value that failed
   *              For object-level: the object that failed
   * @param lang - Language code (e.g., 'en', 'es', 'pt')
   */
  errorMessage(arg: unknown, lang: string): string;

  // Additional properties can be added via ES6 shorthand to avoid closures
  // e.g., minSal: 85000, maxSal: 250000
  [key: string]: unknown;
}

/**
 * Property-level validation rule.
 * Validates individual property values immediately on SET.
 *
 * @example Salary range validation
 * const minSal = 85000;
 * const rule: PropertyValidationRule = {
 *   minSal,
 *   validate(value) {
 *     return value >= this.minSal;
 *   },
 *   errorMessage(value, lang = 'en') {
 *     return `Salary must be >= ${this.minSal}, got ${value}`;
 *   }
 * };
 */
export interface PropertyValidationRule extends ValidationRuleBase {
  // Inherits: validate(value), errorMessage(value, lang)
  // Note: 'arg' parameter is the property value
}

/**
 * Object-level validation rule.
 * Validates cross-property constraints, deferred until all participating
 * properties are consistent or until commit time.
 *
 * Used for constraints that may temporarily fail during multi-step mutations
 * within a transaction.
 *
 * @example Employee relocation (dept + boss must be consistent)
 * {
 *   name: 'dept-boss-consistency',
 *   properties: ['dept', 'boss'],
 *   validate(emp) {
 *     // Boss must be in same department as employee
 *     return emp.boss.dept === emp.dept;
 *   },
 *   errorMessage(emp, lang) {
 *     return `Employee boss must be in same department`;
 *   }
 * }
 *
 * @example Manager subordinate limit (collection constraint)
 * {
 *   name: 'max-subordinates',
 *   properties: ['subordinates'],
 *   validate(manager) {
 *     return manager.subordinates.length <= 10;
 *   },
 *   errorMessage(manager, lang) {
 *     return `Manager cannot have more than 10 subordinates`;
 *   }
 * }
 */
export interface ObjectValidationRule extends ValidationRuleBase {
  /**
   * Unique identifier for this validation.
   * Used for tracking pending validations in ValidationState.
   */
  name: string;

  /**
   * Properties that participate in this validation.
   * Mutation of any of these properties adds this validation to pending state.
   *
   * String-typed property names (pragmatic trade-off vs thunks for better UX).
   */
  properties: string[];

  /**
   * Whether to propagate exceptions from validate() immediately.
   *
   * - false (default): Treat exceptions as validation failure (deferred)
   * - true: Propagate exceptions immediately (fail fast)
   *
   * Use true to catch programmer errors early (e.g., accessing undefined properties).
   * Use false (default) for graceful degradation in production.
   */
  propagateExceptions?: boolean;

  // Inherits: validate(object), errorMessage(object, lang)
  // Note: 'arg' parameter is the entire object
}

/**
 * Backward compatibility: ValidationRule is now PropertyValidationRule.
 * Keep this alias for existing code that uses ValidationRule.
 *
 * @deprecated Use PropertyValidationRule or ObjectValidationRule explicitly
 */
export type ValidationRule = PropertyValidationRule;
