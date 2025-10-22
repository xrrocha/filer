/**
 * Scott Schema Example - Validation Enforcement Demo
 *
 * Demonstrates:
 * - Property-level validation (immediate enforcement)
 * - Type checking (always immediate)
 * - Metadata-driven constraints (required, enterable, updatable)
 * - Schema enforcement (no dynamic properties)
 * - Collect-all error reporting
 *
 * NOTE: Must be .js (not .ts) for Navigator compatibility
 */

import {
  ObjectType,
  NumberType,
  StringType,
  DateTypeInstance,
  ValidationError,
} from '../../dist/metadata/javascript-types.js';

import {
  isInteger,
  range,
  uppercase,
  lengthRange,
  oneOf,
  isValidDate,
  notFuture,
  instanceOf,
} from '../../dist/metadata/validators.js';

// =============================================================================
// DEPARTMENT TYPE
// =============================================================================

const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: {
      name: 'deptno',
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
      name: 'dname',
      type: StringType,

      ui: {
        label: 'Department Name',
        formatter: (v) => v.toUpperCase(),
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
      name: 'loc',
      type: StringType,

      ui: {
        label: 'Location',
        formatter: (v) => v.toUpperCase(),
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
      name: 'empno',
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
      name: 'ename',
      type: StringType,

      ui: {
        label: 'Employee Name',
        formatter: (v) => v.toUpperCase(),
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
      name: 'job',
      type: StringType,

      ui: {
        label: 'Job Title',
        formatter: (v) => v.toUpperCase(),
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
      name: 'hiredate',
      type: DateTypeInstance,

      ui: {
        label: 'Hire Date',
        formatter: (v) => v.toLocaleDateString(),
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
      name: 'sal',
      type: NumberType,

      ui: {
        label: 'Salary',
        formatter: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
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
          validate(v) { return v > 0; },
          errorMessage(v, lang = 'en') { return `Salary must be positive, got ${v}`; }
        }]
      }
    },

    comm: {
      name: 'comm',
      type: NumberType,

      ui: {
        label: 'Commission',
        formatter: (v) => v == null ? 'N/A' : `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
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
          validate(v) { return v == null || v >= 0; },
          errorMessage(v, lang = 'en') { return `Commission must be non-negative or null, got ${v}`; }
        }]
      }
    },

    dept: {
      name: 'dept',
      type: Dept,

      ui: {
        label: 'Department',
        formatter: (v) => v?.dname || 'Unknown',
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
    },

    mgr: {
      name: 'mgr',
      type: () => Emp,  // Thunk for self-reference

      ui: {
        label: 'Manager',
        formatter: (v) => v?.ename || 'None',
        widget: 'select',
        helpText: 'Employee\'s manager (must be in same department)',
        order: 8,
      },

      validation: {
        required: false,  // President has no manager
        enterable: true,
        updatable: true,
        validations: []  // instanceOf will be checked via type
      }
    }
  },

  // Object-level validations (cross-property constraints)
  validations: [
    {
      name: 'mgr-dept-consistency',
      properties: ['dept', 'mgr'],
      validate(emp) {
        // Manager must be in same department (if manager exists)
        return !emp.mgr || emp.mgr.dept === emp.dept;
      },
      errorMessage(emp, lang = 'en') {
        if (lang === 'en') {
          return `Manager must be in same department (employee in ${emp.dept?.dname}, manager in ${emp.mgr?.dept?.dname})`;
        }
        return 'Manager must be in same department';
      }
    }
  ]
});

// =============================================================================
// VALIDATION ENFORCEMENT TESTS
// =============================================================================

console.log('=== Scott Schema - Validation Enforcement Demo ===\n');

// Test 1: Successful instance creation
console.log('Test 1: Create valid department');
try {
  const accounting = Dept({
    deptno: 10,
    dname: 'ACCOUNTING',
    loc: 'NEW YORK'
  });
  console.log('✓ Department created:', accounting.dname);
} catch (e) {
  console.log('✗ Unexpected error:', e.message);
}

// Test 2: Range validation (immediate)
console.log('\nTest 2: Range validation failure');
try {
  const invalidDept = Dept({
    deptno: 5,  // Too low (< 10)
    dname: 'TEST',
    loc: 'BOSTON'
  });
  console.log('✗ Should have failed validation');
} catch (e) {
  console.log('✓ Caught validation error:', e.message);
}

// Test 3: Type validation (always immediate)
console.log('\nTest 3: Type validation failure');
const validDept = Dept({ deptno: 20, dname: 'RESEARCH', loc: 'DALLAS' });
try {
  validDept.deptno = 'TWENTY';  // Wrong type
  console.log('✗ Should have failed type check');
} catch (e) {
  console.log('✓ Caught type error:', e.message);
}

// Test 4: Updatable constraint
console.log('\nTest 4: Updatable constraint');
try {
  validDept.deptno = 25;  // Can't update primary key
  console.log('✗ Should have failed updatable check');
} catch (e) {
  console.log('✓ Caught updatable error:', e.message);
}

// Test 5: Schema enforcement (no dynamic properties)
console.log('\nTest 5: Schema enforcement');
try {
  validDept.budget = 100000;  // Not in schema
  console.log('✗ Should have rejected undeclared property');
} catch (e) {
  console.log('✓ Caught schema error:', e.message);
}

// Test 6: Collect-all validation (multiple errors)
console.log('\nTest 6: Collect-all validation');
try {
  const badDept = Dept({
    deptno: 30,
    dname: 'sales',  // Should be uppercase
    loc: 'san francisco'  // Should be uppercase AND not in oneOf list
  });
  console.log('✗ Should have failed multiple validations');
} catch (e) {
  console.log('✓ Caught multiple errors:', e.message);
}

// Test 7: Successful employee creation
console.log('\nTest 7: Create valid employee');
try {
  const scott = Emp({
    empno: 7788,
    ename: 'SCOTT',
    job: 'ANALYST',
    hiredate: new Date('1987-04-19'),
    sal: 3000,
    comm: null,
    dept: validDept
  });
  console.log('✓ Employee created:', scott.ename, '-', scott.job);
  console.log('  Department:', scott.dept.dname);
  console.log('  Salary:', scott.sal);
} catch (e) {
  console.log('✗ Unexpected error:', e.message);
}

// Test 8: Required vs optional properties
console.log('\nTest 8: Required vs optional');
try {
  const sales = Dept({ deptno: 30, dname: 'SALES', loc: 'CHICAGO' });
  const allen = Emp({
    empno: 7499,
    ename: 'ALLEN',
    job: 'SALESMAN',
    hiredate: new Date('1981-02-20'),
    sal: 1600,
    comm: 300,  // Commission is provided
    dept: sales
  });
  console.log('✓ Employee with commission:', allen.ename, '- comm:', allen.comm);

  // Commission can be null (optional)
  allen.comm = null;
  console.log('✓ Commission set to null (allowed)');

  // But salary cannot be null (required)
  try {
    allen.sal = null;
    console.log('✗ Should have failed required check');
  } catch (e) {
    console.log('✓ Required property cannot be null:', e.message);
  }
} catch (e) {
  console.log('✗ Unexpected error:', e.message);
}

// Test 9: Object-level validation (deferred until commit)
console.log('\nTest 9: Object-level validation (manager-dept consistency)');
try {
  // First, import ValidationState for checking pending validations
  const { ValidationState } = await import('../../dist/metadata/javascript-types.js');

  const engineering = Dept({ deptno: 20, dname: 'ENGINEERING', loc: 'BOSTON' });
  const research = Dept({ deptno: 40, dname: 'RESEARCH', loc: 'DALLAS' });

  // Create manager in engineering
  const alice = Emp({
    empno: 7900,
    ename: 'ALICE',
    job: 'MANAGER',
    hiredate: new Date('2020-01-15'),
    sal: 5000,
    comm: null,
    dept: engineering,
    mgr: null  // No manager (she's a manager)
  });
  console.log('✓ Manager created:', alice.ename, 'in', alice.dept.dname);

  // Create employee in research with manager from engineering
  // This violates mgr-dept-consistency, but doesn't throw immediately!
  const bob = Emp({
    empno: 7901,
    ename: 'BOB',
    job: 'ANALYST',
    hiredate: new Date('2021-03-10'),
    sal: 3500,
    comm: null,
    dept: research,
    mgr: alice  // Manager in different dept - INVALID!
  });
  console.log('✓ Employee created with invalid mgr-dept (no immediate error)');
  console.log('  Employee:', bob.ename, 'in', bob.dept.dname);
  console.log('  Manager:', bob.mgr.ename, 'in', bob.mgr.dept.dname);

  // Check pending validations
  if (ValidationState.hasPending()) {
    const pending = ValidationState.getPending();
    console.log('✓ Object-level validation is PENDING (deferred):');
    pending.forEach(p => {
      console.log('  - Validations:', p.validations.join(', '));
    });

    // At commit time, memimg would reject this with ValidationError
    console.log('✓ Commit would be REJECTED due to pending validations');

    // Fix the violation by moving Bob to engineering
    bob.dept = engineering;
    console.log('✓ Fixed: Moved', bob.ename, 'to', bob.dept.dname);

    // Validation should be removed
    if (!ValidationState.hasPending()) {
      console.log('✓ Validation passed - no longer pending');
      console.log('✓ Commit would now SUCCEED');
    } else {
      console.log('✗ Validation still pending (unexpected)');
    }

    // Alternative fix: change manager instead of dept
    bob.dept = research;  // Back to research
    console.log('✓ Moved back to', bob.dept.dname, '- validation pending again');

    bob.mgr = null;  // Remove manager
    console.log('✓ Removed manager - validation should pass');

    if (!ValidationState.hasPending()) {
      console.log('✓ Validation passed by removing manager');
    } else {
      console.log('✗ Validation still pending (unexpected)');
    }

  } else {
    console.log('✗ Expected pending validation but found none');
  }

  // Clean up for next test
  ValidationState.clear();

} catch (e) {
  console.log('✗ Unexpected error:', e.message);
  console.error(e);
}

console.log('\n=== All Validation Tests Complete ===');
console.log('Property-level: Validates immediately on every assignment');
console.log('Object-level: Deferred until commit (allows multi-step mutations)');
