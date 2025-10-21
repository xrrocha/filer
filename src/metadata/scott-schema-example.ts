/**
 * Scott Schema Example - Rich Metadata (Declarative Only)
 *
 * Demonstrates the complete PropertyDescriptor with:
 * - Layer 1: Structural types
 * - Layer 2: UI metadata (labels, formatters, widgets)
 * - Layer 3: Validation metadata (required, validations, constraints)
 *
 * NOTE: Validation is NOT enforced yet - this is pure declaration.
 * The metadata is available for:
 * - Documentation
 * - Introspection
 * - Code generation
 * - Future enforcement
 */

import {
  ObjectType,
  NumberType,
  StringType,
  DateTypeInstance,
} from './javascript-types.js';

// =============================================================================
// DEPARTMENT TYPE
// =============================================================================

const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: {
      // Layer 1: Type
      type: NumberType,

      // Layer 2: UI Metadata
      label: 'Department Number',
      formatter: (v) => `#${v}`,
      widget: 'number',
      placeholder: '10',
      helpText: 'Unique department identifier (10-9999)',
      order: 1,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: false,  // Primary key - set once, never change
      min: 10,
      max: 9999,
      validations: [{
        rule: (v) => Number.isInteger(v as number),
        errorMessage: 'Department number must be an integer'
      }]
    },

    dname: {
      // Layer 1: Type
      type: StringType,

      // Layer 2: UI Metadata
      label: 'Department Name',
      formatter: (v) => (v as string).toUpperCase(),
      widget: 'text',
      placeholder: 'ACCOUNTING',
      helpText: 'Department name (uppercase, max 14 chars)',
      order: 2,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      maxLength: 14,
      pattern: /^[A-Z]+$/,
      validations: [{
        rule: (v) => (v as string) === (v as string).toUpperCase(),
        errorMessage: (v) => `Department name must be uppercase, got "${v}"`
      }]
    },

    loc: {
      // Layer 1: Type
      type: StringType,

      // Layer 2: UI Metadata
      label: 'Location',
      formatter: (v) => (v as string).toUpperCase(),
      widget: 'select',  // Could be dropdown of cities
      placeholder: 'NEW YORK',
      helpText: 'Department location (uppercase, max 13 chars)',
      order: 3,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      maxLength: 13,
      pattern: /^[A-Z\s]+$/,
      enum: ['NEW YORK', 'DALLAS', 'CHICAGO', 'BOSTON'],  // Valid locations
      validations: [{
        rule: (v) => (v as string) === (v as string).toUpperCase(),
        errorMessage: (v) => `Location must be uppercase, got "${v}"`
      }]
    }
  }
});

// =============================================================================
// EMPLOYEE TYPE
// =============================================================================

const Emp = ObjectType({
  name: 'Emp',
  properties: {
    empno: {
      // Layer 1: Type
      type: NumberType,

      // Layer 2: UI Metadata
      label: 'Employee Number',
      formatter: (v) => `EMP-${v}`,
      widget: 'number',
      placeholder: '7839',
      helpText: 'Unique employee identifier (1000-9999)',
      order: 1,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: false,  // Primary key
      min: 1000,
      max: 9999,
      validations: [{
        rule: (v) => Number.isInteger(v as number),
        errorMessage: 'Employee number must be an integer'
      }]
    },

    ename: {
      // Layer 1: Type
      type: StringType,

      // Layer 2: UI Metadata
      label: 'Employee Name',
      formatter: (v) => (v as string).toUpperCase(),
      widget: 'text',
      placeholder: 'SMITH',
      helpText: 'Employee name (uppercase, max 10 chars)',
      order: 2,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      maxLength: 10,
      pattern: /^[A-Z]+$/,
      validations: [{
        rule: (v) => (v as string) === (v as string).toUpperCase(),
        errorMessage: (v) => `Employee name must be uppercase, got "${v}"`
      }]
    },

    job: {
      // Layer 1: Type
      type: StringType,

      // Layer 2: UI Metadata
      label: 'Job Title',
      formatter: (v) => (v as string).toUpperCase(),
      widget: 'select',  // Dropdown of job titles
      placeholder: 'CLERK',
      helpText: 'Job title (uppercase, max 9 chars)',
      order: 3,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      maxLength: 9,
      enum: ['CLERK', 'SALESMAN', 'ANALYST', 'MANAGER', 'PRESIDENT'],
      validations: [{
        rule: (v) => (v as string) === (v as string).toUpperCase(),
        errorMessage: (v) => `Job title must be uppercase, got "${v}"`
      }]
    },

    hiredate: {
      // Layer 1: Type
      type: DateTypeInstance,

      // Layer 2: UI Metadata
      label: 'Hire Date',
      formatter: (v) => (v as Date).toLocaleDateString(),
      widget: 'date',
      helpText: 'Date employee was hired',
      order: 5,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: false,  // Can't change hire date
      validations: [{
        rule: (v) => v instanceof Date && !isNaN((v as Date).getTime()),
        errorMessage: 'Hire date must be a valid date'
      }, {
        rule: (v) => (v as Date) <= new Date(),
        errorMessage: 'Hire date cannot be in the future'
      }]
    },

    sal: {
      // Layer 1: Type
      type: NumberType,

      // Layer 2: UI Metadata
      label: 'Salary',
      formatter: (v) => `$${(v as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      widget: 'number',
      placeholder: '3000',
      helpText: 'Annual salary in USD',
      cssClass: 'currency-input',
      order: 6,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      min: 0,
      validations: [{
        rule: (v) => (v as number) > 0,
        errorMessage: (v) => `Salary must be positive, got ${v}`
      }]
    },

    comm: {
      // Layer 1: Type
      type: NumberType,

      // Layer 2: UI Metadata
      label: 'Commission',
      formatter: (v) => v == null ? 'N/A' : `$${(v as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      widget: 'number',
      placeholder: '0',
      helpText: 'Sales commission (optional)',
      cssClass: 'currency-input',
      order: 7,

      // Layer 3: Validation Metadata
      required: false,  // Commission is optional
      enterable: true,
      updatable: true,
      min: 0,
      validations: [{
        rule: (v) => v == null || (v as number) >= 0,
        errorMessage: (v) => `Commission must be non-negative or null, got ${v}`
      }]
    },

    dept: {
      // Layer 1: Type (reference to another ObjectType)
      type: Dept,

      // Layer 2: UI Metadata
      label: 'Department',
      formatter: (v: any) => v?.dname || 'Unknown',  // Show department name
      widget: 'select',  // Dropdown of departments
      helpText: 'Employee\'s department',
      order: 4,

      // Layer 3: Validation Metadata
      required: true,
      enterable: true,
      updatable: true,
      validations: [{
        rule: (v) => typeof v === 'object' && v !== null && (v as any).__type__ === Dept,
        errorMessage: (v) => `Department must be a Dept instance, got ${typeof v}`
      }]
    }
  }
});

// =============================================================================
// USAGE DEMONSTRATION (No enforcement yet - just declaration)
// =============================================================================

console.log('=== Scott Schema - Rich Metadata (Declarative) ===\n');

console.log('Dept type:', Dept.typeName);
console.log('Dept properties:', Object.keys(Dept.properties));
console.log('\nDept.deptno metadata:');
console.log('  - Label:', Dept.properties.deptno!.label);
console.log('  - Widget:', Dept.properties.deptno!.widget);
console.log('  - Required:', Dept.properties.deptno!.required);
console.log('  - Updatable:', Dept.properties.deptno!.updatable);
console.log('  - Min:', Dept.properties.deptno!.min);
console.log('  - Max:', Dept.properties.deptno!.max);

console.log('\nEmp.sal metadata:');
console.log('  - Label:', Emp.properties.sal!.label);
console.log('  - Formatter:', Emp.properties.sal!.formatter?.(3000));
console.log('  - Widget:', Emp.properties.sal!.widget);
console.log('  - CSS Class:', Emp.properties.sal!.cssClass);
console.log('  - Validations:', Emp.properties.sal!.validations?.length, 'rules');

console.log('\nEmp.job metadata:');
console.log('  - Label:', Emp.properties.job!.label);
console.log('  - Widget:', Emp.properties.job!.widget);
console.log('  - Allowed values:', Emp.properties.job!.enum);

console.log('\n=== Metadata is ready for introspection and UI generation! ===');

// Export for use in other modules
export { Dept, Emp };
