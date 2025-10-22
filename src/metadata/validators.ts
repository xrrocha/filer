/**
 * Composable Validator Library
 *
 * Provides reusable, type-safe validators that return ValidationRule objects.
 * These eliminate ad-hoc metadata fields (min, max, pattern, enum) and enable
 * clean composition of validation logic.
 *
 * Design principles:
 * - Each validator is a factory function that returns ValidationRule
 * - Validators are composable (can combine multiple rules)
 * - Type-specific (use pattern() for strings, range() for numbers)
 * - No special knowledge required by ObjectType
 *
 * @example
 * ```typescript
 * deptno: {
 *   type: NumberType,
 *   validation: {
 *     validations: [
 *       isInteger(),
 *       range(10, 10000)
 *     ]
 *   }
 * }
 * ```
 */

import type { ValidationRule } from './javascript-types.js';

// =============================================================================
// NUMERIC VALIDATORS
// =============================================================================

/**
 * Validates that a number is an integer (no decimal places).
 *
 * @example
 * validations: [isInteger()]  // Rejects 3.14, accepts 42
 */
export const isInteger = (): ValidationRule => ({
  validate(v) { return Number.isInteger(v as number); },
  errorMessage(v) { return `Must be an integer, got ${v}`; }
});

/**
 * Validates that a number is >= min (inclusive).
 *
 * @example
 * validations: [minInclusive(0)]  // Non-negative numbers
 */
export const minInclusive = (min: number): ValidationRule => ({
  min,  // Metadata for introspection
  validate(v) { return (v as number) >= min; },
  errorMessage(v) { return `Must be >= ${min}, got ${v}`; }
});

/**
 * Validates that a number is < max (exclusive).
 *
 * @example
 * validations: [maxExclusive(100)]  // Less than 100
 */
export const maxExclusive = (max: number): ValidationRule => ({
  max,  // Metadata for introspection
  validate(v) { return (v as number) < max; },
  errorMessage(v) { return `Must be < ${max}, got ${v}`; }
});

/**
 * Validates that a number is > min (exclusive).
 *
 * @example
 * validations: [minExclusive(0)]  // Positive numbers
 */
export const minExclusive = (min: number): ValidationRule => ({
  min,  // Metadata for introspection
  validate(v) { return (v as number) > min; },
  errorMessage(v) { return `Must be > ${min}, got ${v}`; }
});

/**
 * Validates that a number is <= max (inclusive).
 *
 * @example
 * validations: [maxInclusive(9999)]  // At most 9999
 */
export const maxInclusive = (max: number): ValidationRule => ({
  max,  // Metadata for introspection
  validate(v) { return (v as number) <= max; },
  errorMessage(v) { return `Must be <= ${max}, got ${v}`; }
});

/**
 * Convenience: Validates number is in range [min, max).
 * Returns array of validators (spread into validations array).
 *
 * @example
 * validations: [...range(10, 10000)]  // 10 <= n < 10000
 */
export const range = (min: number, max: number): ValidationRule[] => [
  minInclusive(min),
  maxExclusive(max)
];

/**
 * Convenience: Validates number is in range (min, max).
 * Both bounds exclusive.
 *
 * @example
 * validations: [...rangeExclusive(0, 100)]  // 0 < n < 100
 */
export const rangeExclusive = (min: number, max: number): ValidationRule[] => [
  minExclusive(min),
  maxExclusive(max)
];

/**
 * Convenience: Validates number is in range [min, max].
 * Both bounds inclusive.
 *
 * @example
 * validations: [...rangeInclusive(1, 10)]  // 1 <= n <= 10
 */
export const rangeInclusive = (min: number, max: number): ValidationRule[] => [
  minInclusive(min),
  maxInclusive(max)
];

// =============================================================================
// STRING VALIDATORS
// =============================================================================

/**
 * Validates that a string matches a regular expression.
 *
 * @example
 * validations: [pattern(/^[A-Z]+$/)]  // Uppercase only
 * validations: [pattern(/^\d{3}-\d{2}-\d{4}$/)]  // SSN format
 */
export const pattern = (regex: RegExp): ValidationRule => ({
  regex,  // Metadata for introspection
  validate(v) { return regex.test(v as string); },
  errorMessage(v) { return `Must match ${regex}, got "${v}"`; }
});

/**
 * Validates that a string's length is >= min.
 *
 * @example
 * validations: [minLength(1)]  // Non-empty string
 */
export const minLength = (min: number): ValidationRule => ({
  min,  // Metadata for introspection
  validate(v) { return (v as string).length >= min; },
  errorMessage(v) { return `Minimum length ${min}, got ${(v as string).length}`; }
});

/**
 * Validates that a string's length is <= max.
 *
 * @example
 * validations: [maxLength(14)]  // At most 14 characters
 */
export const maxLength = (max: number): ValidationRule => ({
  max,  // Metadata for introspection
  validate(v) { return (v as string).length <= max; },
  errorMessage(v) { return `Maximum length ${max}, got ${(v as string).length}`; }
});

/**
 * Convenience: Validates string length is in range [min, max].
 *
 * @example
 * validations: [lengthRange(1, 14)]  // 1-14 characters
 */
export const lengthRange = (min: number, max: number): ValidationRule => ({
  min,  // Metadata for introspection
  max,  // Metadata for introspection
  validate(v) {
    const len = (v as string).length;
    return len >= min && len <= max;
  },
  errorMessage(v) { return `Length must be ${min}-${max}, got ${(v as string).length}`; }
});

/**
 * Validates that a string is all uppercase.
 *
 * @example
 * validations: [uppercase()]  // "HELLO" passes, "Hello" fails
 */
export const uppercase = (): ValidationRule => ({
  validate(v) { return (v as string) === (v as string).toUpperCase(); },
  errorMessage(v, lang = 'en') { return `Must be uppercase, got "${v}"`; }
});

/**
 * Validates that a string is all lowercase.
 *
 * @example
 * validations: [lowercase()]  // "hello" passes, "Hello" fails
 */
export const lowercase = (): ValidationRule => ({
  validate(v) { return (v as string) === (v as string).toLowerCase(); },
  errorMessage(v, lang = 'en') { return `Must be lowercase, got "${v}"`; }
});

/**
 * Validates that a string is not empty (after trimming).
 *
 * @example
 * validations: [notBlank()]  // "  " fails, " hello " passes
 */
export const notBlank = (): ValidationRule => ({
  validate(v) { return (v as string).trim().length > 0; },
  errorMessage(v, lang = 'en') { return 'Must not be blank'; }
});

// =============================================================================
// ENUM / CHOICE VALIDATORS
// =============================================================================

/**
 * Validates that a value is one of the allowed values.
 * Replacement for the `enum` ad-hoc field.
 *
 * @example
 * validations: [oneOf(['CLERK', 'MANAGER', 'ANALYST'])]
 * validations: [oneOf([10, 20, 30, 40])]
 */
export const oneOf = <T>(values: T[]): ValidationRule => ({
  values,  // Metadata for introspection
  validate(v) { return values.includes(v as T); },
  errorMessage(v) { return `Must be one of [${values.join(', ')}], got ${v}`; }
});

// =============================================================================
// DATE VALIDATORS
// =============================================================================

/**
 * Validates that a value is a valid Date object.
 *
 * @example
 * validations: [isValidDate()]  // Rejects new Date('invalid')
 */
export const isValidDate = (): ValidationRule => ({
  validate(v) { return v instanceof Date && !isNaN((v as Date).getTime()); },
  errorMessage(v, lang = 'en') { return `Must be a valid date, got ${v}`; }
});

/**
 * Validates that a date is not in the future.
 *
 * @example
 * validations: [notFuture()]  // Hire date cannot be in future
 */
export const notFuture = (): ValidationRule => ({
  validate(v) { return (v as Date) <= new Date(); },
  errorMessage(v, lang = 'en') { return `Date cannot be in the future: ${v}`; }
});

/**
 * Validates that a date is not in the past.
 *
 * @example
 * validations: [notPast()]  // Event date cannot be in past
 */
export const notPast = (): ValidationRule => ({
  validate(v) { return (v as Date) >= new Date(); },
  errorMessage(v, lang = 'en') { return `Date cannot be in the past: ${v}`; }
});

/**
 * Validates that a date is after a given date.
 *
 * @example
 * validations: [afterDate(new Date('2020-01-01'))]
 */
export const afterDate = (minDate: Date): ValidationRule => ({
  minDate,  // Metadata for introspection
  validate(v) { return (v as Date) > minDate; },
  errorMessage(v) { return `Date must be after ${minDate.toLocaleDateString()}, got ${(v as Date).toLocaleDateString()}`; }
});

/**
 * Validates that a date is before a given date.
 *
 * @example
 * validations: [beforeDate(new Date('2030-01-01'))]
 */
export const beforeDate = (maxDate: Date): ValidationRule => ({
  maxDate,  // Metadata for introspection
  validate(v) { return (v as Date) < maxDate; },
  errorMessage(v) { return `Date must be before ${maxDate.toLocaleDateString()}, got ${(v as Date).toLocaleDateString()}`; }
});

// =============================================================================
// OBJECT/REFERENCE VALIDATORS
// =============================================================================

/**
 * Validates that a value is an instance of a specific ObjectType.
 *
 * @example
 * validations: [instanceOf(Dept)]  // Value must be a Dept instance
 */
export const instanceOf = (typeFactory: { typeName: string }): ValidationRule => ({
  typeFactory,  // Metadata for introspection
  validate(v) {
    return typeof v === 'object' && v !== null && (v as any).__type__ === typeFactory;
  },
  errorMessage(v) { return `Must be an instance of ${typeFactory.typeName}, got ${typeof v}`; }
});

// =============================================================================
// LOGICAL COMBINATORS
// =============================================================================

/**
 * Combines multiple validators with AND logic.
 * All validators must pass.
 *
 * @example
 * validations: [and(minInclusive(0), maxInclusive(100), isInteger())]
 */
export const and = (...validators: ValidationRule[]): ValidationRule => ({
  validators,  // Metadata for introspection
  validate(v) { return validators.every((val: ValidationRule) => val.validate(v)); },
  errorMessage(v, lang = 'en') {
    const failed = validators.find((val: ValidationRule) => !val.validate(v));
    if (!failed) return 'Validation failed';
    return failed.errorMessage(v, lang);
  }
});

/**
 * Combines multiple validators with OR logic.
 * At least one validator must pass.
 *
 * @example
 * validations: [or(pattern(/^[A-Z]+$/), pattern(/^[a-z]+$/))]  // All upper or all lower
 */
export const or = (...validators: ValidationRule[]): ValidationRule => ({
  validators,  // Metadata for introspection
  validate(v) { return validators.some((val: ValidationRule) => val.validate(v)); },
  errorMessage(v) { return 'Must satisfy at least one condition'; }
});

/**
 * Negates a validator.
 *
 * @example
 * validations: [not(oneOf(['admin', 'root']))]  // Cannot be admin or root
 */
export const not = (validator: ValidationRule): ValidationRule => ({
  validator,  // Metadata for introspection
  validate(v) { return !validator.validate(v); },
  errorMessage(v, lang = 'en') {
    return `Must NOT satisfy: ${validator.errorMessage(v, lang)}`;
  }
});
