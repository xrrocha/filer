import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ValidationState } from '../../../dist/metadata/javascript-types.js';

describe('ValidationState', () => {
  // Clear state before each test to ensure isolation
  beforeEach(() => {
    ValidationState.clear();
  });

  describe('hasPending()', () => {
    it('returns false when no pending validations', () => {
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('returns true when validations are pending', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'test-validation');
      assert.strictEqual(ValidationState.hasPending(), true);
    });

    it('returns false after all validations are removed', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'test-validation');
      ValidationState.removePending(obj, 'test-validation');
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('returns false after clear()', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'test-validation');
      ValidationState.clear();
      assert.strictEqual(ValidationState.hasPending(), false);
    });
  });

  describe('addPending()', () => {
    it('adds a pending validation for an object', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('adds multiple pending validations for the same object', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');
      ValidationState.addPending(obj, 'validation-2');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.strictEqual(pending[0].validations.length, 2);
      assert.ok(pending[0].validations.includes('validation-1'));
      assert.ok(pending[0].validations.includes('validation-2'));
    });

    it('does not add duplicate validation names for same object', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');
      ValidationState.addPending(obj, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('tracks pending validations for multiple objects independently', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      ValidationState.addPending(obj1, 'validation-1');
      ValidationState.addPending(obj2, 'validation-2');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 2);

      // Find each object's entry
      const obj1Entry = pending.find(p => p.obj === obj1);
      const obj2Entry = pending.find(p => p.obj === obj2);

      assert.ok(obj1Entry);
      assert.ok(obj2Entry);
      assert.deepStrictEqual(obj1Entry.validations, ['validation-1']);
      assert.deepStrictEqual(obj2Entry.validations, ['validation-2']);
    });

    it('uses object identity as key (not structural equality)', () => {
      const obj1 = { name: 'test', value: 42 };
      const obj2 = { name: 'test', value: 42 }; // Same structure, different object

      ValidationState.addPending(obj1, 'validation-1');
      ValidationState.addPending(obj2, 'validation-2');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 2, 'Should track two separate objects');
    });
  });

  describe('removePending()', () => {
    it('removes a specific pending validation', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');
      ValidationState.addPending(obj, 'validation-2');

      ValidationState.removePending(obj, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-2']);
    });

    it('removes object from map when last validation is removed', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');

      ValidationState.removePending(obj, 'validation-1');

      assert.strictEqual(ValidationState.hasPending(), false);
      assert.strictEqual(ValidationState.getPending().length, 0);
    });

    it('is a no-op when removing non-existent validation', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');

      ValidationState.removePending(obj, 'validation-2'); // Doesn't exist

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('is a no-op when removing from non-existent object', () => {
      const obj = { name: 'test' };

      ValidationState.removePending(obj, 'validation-1'); // Object not tracked

      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('only affects the specified object', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      ValidationState.addPending(obj1, 'validation-1');
      ValidationState.addPending(obj2, 'validation-1');

      ValidationState.removePending(obj1, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj2);
    });
  });

  describe('getPending()', () => {
    it('returns empty array when no pending validations', () => {
      const pending = ValidationState.getPending();
      assert.deepStrictEqual(pending, []);
    });

    it('returns array with object and validation names', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('returns all pending validations for multiple objects', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      ValidationState.addPending(obj1, 'validation-1');
      ValidationState.addPending(obj1, 'validation-2');
      ValidationState.addPending(obj2, 'validation-3');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 2);

      const obj1Entry = pending.find(p => p.obj === obj1);
      const obj2Entry = pending.find(p => p.obj === obj2);

      assert.ok(obj1Entry);
      assert.ok(obj2Entry);
      assert.strictEqual(obj1Entry.validations.length, 2);
      assert.strictEqual(obj2Entry.validations.length, 1);
    });

    it('returns a copy (modifications do not affect internal state)', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');

      const pending1 = ValidationState.getPending();
      pending1[0].validations.push('extra-validation'); // Modify returned array

      const pending2 = ValidationState.getPending();
      assert.deepStrictEqual(pending2[0].validations, ['validation-1']);
    });
  });

  describe('clear()', () => {
    it('removes all pending validations', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      ValidationState.addPending(obj1, 'validation-1');
      ValidationState.addPending(obj2, 'validation-2');

      ValidationState.clear();

      assert.strictEqual(ValidationState.hasPending(), false);
      assert.strictEqual(ValidationState.getPending().length, 0);
    });

    it('is idempotent', () => {
      ValidationState.clear();
      ValidationState.clear(); // Should not throw
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('allows adding new validations after clear', () => {
      const obj = { name: 'test' };
      ValidationState.addPending(obj, 'validation-1');
      ValidationState.clear();

      ValidationState.addPending(obj, 'validation-2');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-2']);
    });
  });

  describe('Integration scenarios', () => {
    it('handles typical add-remove-retry cycle', () => {
      const obj = { dept: 'sales', boss: null };

      // Initially validation fails
      ValidationState.addPending(obj, 'boss-dept-consistency');
      assert.strictEqual(ValidationState.hasPending(), true);

      // Property updated, validation now passes
      ValidationState.removePending(obj, 'boss-dept-consistency');
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('handles multiple validations failing and passing independently', () => {
      const obj = { prop1: 1, prop2: 2, prop3: 3 };

      // Three validations fail
      ValidationState.addPending(obj, 'validation-1');
      ValidationState.addPending(obj, 'validation-2');
      ValidationState.addPending(obj, 'validation-3');

      const pending1 = ValidationState.getPending();
      assert.strictEqual(pending1[0].validations.length, 3);

      // One passes
      ValidationState.removePending(obj, 'validation-1');
      const pending2 = ValidationState.getPending();
      assert.strictEqual(pending2[0].validations.length, 2);
      assert.strictEqual(ValidationState.hasPending(), true);

      // Another passes
      ValidationState.removePending(obj, 'validation-2');
      const pending3 = ValidationState.getPending();
      assert.strictEqual(pending3[0].validations.length, 1);
      assert.strictEqual(ValidationState.hasPending(), true);

      // Last one passes - object removed from map
      ValidationState.removePending(obj, 'validation-3');
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('handles commit-like scenario with multiple objects', () => {
      const emp1 = { name: 'Alice', dept: 'sales' };
      const emp2 = { name: 'Bob', dept: 'engineering' };
      const emp3 = { name: 'Charlie', dept: 'sales' };

      // Multiple objects with pending validations
      ValidationState.addPending(emp1, 'boss-dept-consistency');
      ValidationState.addPending(emp2, 'boss-dept-consistency');
      ValidationState.addPending(emp3, 'salary-range');

      assert.strictEqual(ValidationState.hasPending(), true);
      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 3);

      // Simulate commit rejection
      // ... would throw error with getPending() info

      // After rollback or abort, clear state
      ValidationState.clear();
      assert.strictEqual(ValidationState.hasPending(), false);
    });

    it('allows same validation name on different objects', () => {
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      ValidationState.addPending(obj1, 'common-validation');
      ValidationState.addPending(obj2, 'common-validation');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 2);
      assert.strictEqual(pending[0].validations[0], 'common-validation');
      assert.strictEqual(pending[1].validations[0], 'common-validation');
    });
  });

  describe('Edge cases', () => {
    it('handles objects with complex structures', () => {
      const obj = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        fn: () => {},
      };

      ValidationState.addPending(obj, 'validation-1');

      const pending = ValidationState.getPending();
      assert.strictEqual(pending[0].obj, obj);
    });

    it('handles validation names with special characters', () => {
      const obj = { name: 'test' };
      const validationName = 'validation:with-special.chars_123';

      ValidationState.addPending(obj, validationName);

      const pending = ValidationState.getPending();
      assert.deepStrictEqual(pending[0].validations, [validationName]);
    });

    it('handles empty validation names', () => {
      const obj = { name: 'test' };

      ValidationState.addPending(obj, '');

      const pending = ValidationState.getPending();
      assert.deepStrictEqual(pending[0].validations, ['']);
    });

    it('handles many validations on single object', () => {
      const obj = { name: 'test' };

      for (let i = 0; i < 100; i++) {
        ValidationState.addPending(obj, `validation-${i}`);
      }

      const pending = ValidationState.getPending();
      assert.strictEqual(pending[0].validations.length, 100);
    });

    it('handles many objects with validations', () => {
      const objects = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      objects.forEach((obj, i) => {
        ValidationState.addPending(obj, `validation-${i}`);
      });

      const pending = ValidationState.getPending();
      assert.strictEqual(pending.length, 100);
    });
  });
});
