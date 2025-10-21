/**
 * Scott Schema Example - Clean Separation of Concerns
 *
 * Demonstrates PropertyDescriptor with nested namespaces:
 * - Layer 1: Structural types (type)
 * - Layer 2: UI metadata (ui.*)
 * - Layer 3: Validation metadata (validation.*)
 *
 * Uses composable validators instead of ad-hoc shortcuts.
 *
 * NOTE: Validation is NOT enforced yet - this is pure declaration.
 */

import {
  ObjectType,
  NumberType,
  StringType,
  DateTypeInstance,
} from './javascript-types.js';

import {
  isInteger,
  range,
  uppercase,
  lengthRange,
  oneOf,
  isValidDate,
  notFuture,
  instanceOf,
} from './validators.js';

// =============================================================================
// DEPARTMENT TYPE
// =============================================================================

const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: {
      type: NumberType,

      ui: {
        label: 'Department Number',
        formatter: (v) => `#${v}`,
        widget: 'number',
        placeholder: '10',
        helpText: 'Unique department identifier (10-9999)',
        order: 1,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: false,  // Primary key - set once, never change
        validations: [
          isInteger(),
          ...range(10, 10000)  // 10 <= deptno < 10000
        ]
      }
    },

    dname: {
      type: StringType,

      ui: {
        label: 'Department Name',
        formatter: (v) => (v as string).toUpperCase(),
        widget: 'text',
        placeholder: 'ACCOUNTING',
        helpText: 'Department name (uppercase, max 14 chars)',
        order: 2,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [
          uppercase(),
          lengthRange(1, 14)
        ]
      }
    },

    loc: {
      type: StringType,

      ui: {
        label: 'Location',
        formatter: (v) => (v as string).toUpperCase(),
        widget: 'select',
        placeholder: 'NEW YORK',
        helpText: 'Department location (uppercase, max 13 chars)',
        order: 3,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [
          uppercase(),
          lengthRange(1, 13),
          oneOf(['NEW YORK', 'DALLAS', 'CHICAGO', 'BOSTON'])
        ]
      }
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
      type: NumberType,

      ui: {
        label: 'Employee Number',
        formatter: (v) => `EMP-${v}`,
        widget: 'number',
        placeholder: '7839',
        helpText: 'Unique employee identifier (1000-9999)',
        order: 1,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: false,  // Primary key
        validations: [
          isInteger(),
          ...range(1000, 10000)  // 1000 <= empno < 10000
        ]
      }
    },

    ename: {
      type: StringType,

      ui: {
        label: 'Employee Name',
        formatter: (v) => (v as string).toUpperCase(),
        widget: 'text',
        placeholder: 'SMITH',
        helpText: 'Employee name (uppercase, max 10 chars)',
        order: 2,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [
          uppercase(),
          lengthRange(1, 10)
        ]
      }
    },

    job: {
      type: StringType,

      ui: {
        label: 'Job Title',
        formatter: (v) => (v as string).toUpperCase(),
        widget: 'select',
        placeholder: 'CLERK',
        helpText: 'Job title (uppercase, max 9 chars)',
        order: 3,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [
          uppercase(),
          lengthRange(1, 9),
          oneOf(['CLERK', 'SALESMAN', 'ANALYST', 'MANAGER', 'PRESIDENT'])
        ]
      }
    },

    hiredate: {
      type: DateTypeInstance,

      ui: {
        label: 'Hire Date',
        formatter: (v) => (v as Date).toLocaleDateString(),
        widget: 'date',
        helpText: 'Date employee was hired',
        order: 5,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: false,  // Can't change hire date
        validations: [
          isValidDate(),
          notFuture()
        ]
      }
    },

    sal: {
      type: NumberType,

      ui: {
        label: 'Salary',
        formatter: (v) => `$${(v as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        widget: 'number',
        placeholder: '3000',
        helpText: 'Annual salary in USD',
        cssClass: 'currency-input',
        order: 6,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [{
          rule: (v) => (v as number) > 0,
          errorMessage: (v) => `Salary must be positive, got ${v}`
        }]
      }
    },

    comm: {
      type: NumberType,

      ui: {
        label: 'Commission',
        formatter: (v) => v == null ? 'N/A' : `$${(v as number).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
        widget: 'number',
        placeholder: '0',
        helpText: 'Sales commission (optional)',
        cssClass: 'currency-input',
        order: 7,
      },

      validation: {
        required: false,  // Commission is optional
        enterable: true,
        updatable: true,
        validations: [{
          rule: (v) => v == null || (v as number) >= 0,
          errorMessage: (v) => `Commission must be non-negative or null, got ${v}`
        }]
      }
    },

    dept: {
      type: Dept,

      ui: {
        label: 'Department',
        formatter: (v: any) => v?.dname || 'Unknown',
        widget: 'select',
        helpText: 'Employee\'s department',
        order: 4,
      },

      validation: {
        required: true,
        enterable: true,
        updatable: true,
        validations: [
          instanceOf(Dept)
        ]
      }
    }
  }
});

// =============================================================================
// USAGE DEMONSTRATION (No enforcement yet - just declaration)
// =============================================================================

console.log('=== Scott Schema - Clean Separation of Concerns ===\n');

console.log('Dept type:', Dept.typeName);
console.log('Dept properties:', Object.keys(Dept.properties));

console.log('\nDept.deptno metadata:');
console.log('  UI:');
console.log('    - Label:', Dept.properties.deptno!.ui?.label);
console.log('    - Widget:', Dept.properties.deptno!.ui?.widget);
console.log('    - Formatter:', Dept.properties.deptno!.ui?.formatter?.(10));
console.log('  Validation:');
console.log('    - Required:', Dept.properties.deptno!.validation?.required);
console.log('    - Updatable:', Dept.properties.deptno!.validation?.updatable);
console.log('    - Validators:', Dept.properties.deptno!.validation?.validations?.length, 'rules');

console.log('\nEmp.sal metadata:');
console.log('  UI:');
console.log('    - Label:', Emp.properties.sal!.ui?.label);
console.log('    - Formatter:', Emp.properties.sal!.ui?.formatter?.(3000));
console.log('    - Widget:', Emp.properties.sal!.ui?.widget);
console.log('    - CSS Class:', Emp.properties.sal!.ui?.cssClass);
console.log('  Validation:');
console.log('    - Required:', Emp.properties.sal!.validation?.required);
console.log('    - Validators:', Emp.properties.sal!.validation?.validations?.length, 'rule');

console.log('\nEmp.job metadata:');
console.log('  UI:');
console.log('    - Label:', Emp.properties.job!.ui?.label);
console.log('    - Widget:', Emp.properties.job!.ui?.widget);
console.log('  Validation:');
console.log('    - Validators:', Emp.properties.job!.validation?.validations?.length, 'rules');
console.log('    - Includes oneOf validator for job titles');

console.log('\n=== Clean namespaces! No pollution! Composable validators! ===');

// Export for use in other modules
export { Dept, Emp };
