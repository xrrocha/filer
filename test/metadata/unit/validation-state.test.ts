import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ValidationContext } from '../../../dist/metadata/javascript-types.js';

describe('ValidationContext', () => {
  // Each test creates its own isolated context - no cleanup needed

  describe('hasPending()', () => {
    it('returns false when no pending validations', () => {
      const context = new ValidationContext();
      assert.strictEqual(context.hasPending(), false);
    });

    it('returns true when validations are pending', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'test-validation');
      assert.strictEqual(context.hasPending(), true);
    });

    it('returns false after all validations are removed', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'test-validation');
      context.removePending(obj, 'test-validation');
      assert.strictEqual(context.hasPending(), false);
    });

    it('returns false after clear()', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'test-validation');
      context.clear();
      assert.strictEqual(context.hasPending(), false);
    });
  });

  describe('addPending()', () => {
    it('adds a pending validation for an object', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('adds multiple pending validations for the same object', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');
      context.addPending(obj, 'validation-2');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.strictEqual(pending[0].validations.length, 2);
      assert.ok(pending[0].validations.includes('validation-1'));
      assert.ok(pending[0].validations.includes('validation-2'));
    });

    it('does not add duplicate validation names for same object', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');
      context.addPending(obj, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('tracks pending validations for multiple objects independently', () => {
      const context = new ValidationContext();
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      context.addPending(obj1, 'validation-1');
      context.addPending(obj2, 'validation-2');

      const pending = context.getPending();
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
      const context = new ValidationContext();
      const obj1 = { name: 'test', value: 42 };
      const obj2 = { name: 'test', value: 42 }; // Same structure, different object

      context.addPending(obj1, 'validation-1');
      context.addPending(obj2, 'validation-2');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 2, 'Should track two separate objects');
    });
  });

  describe('removePending()', () => {
    it('removes a specific pending validation', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');
      context.addPending(obj, 'validation-2');

      context.removePending(obj, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-2']);
    });

    it('removes object from map when last validation is removed', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');

      context.removePending(obj, 'validation-1');

      assert.strictEqual(context.hasPending(), false);
      assert.strictEqual(context.getPending().length, 0);
    });

    it('is a no-op when removing non-existent validation', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');

      context.removePending(obj, 'validation-2'); // Doesn't exist

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('is a no-op when removing from non-existent object', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };

      context.removePending(obj, 'validation-1'); // Object not tracked

      assert.strictEqual(context.hasPending(), false);
    });

    it('only affects the specified object', () => {
      const context = new ValidationContext();
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      context.addPending(obj1, 'validation-1');
      context.addPending(obj2, 'validation-1');

      context.removePending(obj1, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj2);
    });
  });

  describe('getPending()', () => {
    it('returns empty array when no pending validations', () => {
      const context = new ValidationContext();
      const pending = context.getPending();
      assert.deepStrictEqual(pending, []);
    });

    it('returns array with object and validation names', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, obj);
      assert.deepStrictEqual(pending[0].validations, ['validation-1']);
    });

    it('returns all pending validations for multiple objects', () => {
      const context = new ValidationContext();
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      context.addPending(obj1, 'validation-1');
      context.addPending(obj1, 'validation-2');
      context.addPending(obj2, 'validation-3');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 2);

      const obj1Entry = pending.find(p => p.obj === obj1);
      const obj2Entry = pending.find(p => p.obj === obj2);

      assert.ok(obj1Entry);
      assert.ok(obj2Entry);
      assert.strictEqual(obj1Entry.validations.length, 2);
      assert.strictEqual(obj2Entry.validations.length, 1);
    });

    it('returns a copy (modifications do not affect internal state)', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');

      const pending1 = context.getPending();
      pending1[0].validations.push('extra-validation'); // Modify returned array

      const pending2 = context.getPending();
      assert.deepStrictEqual(pending2[0].validations, ['validation-1']);
    });
  });

  describe('clear()', () => {
    it('removes all pending validations', () => {
      const context = new ValidationContext();
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      context.addPending(obj1, 'validation-1');
      context.addPending(obj2, 'validation-2');

      context.clear();

      assert.strictEqual(context.hasPending(), false);
      assert.strictEqual(context.getPending().length, 0);
    });

    it('is idempotent', () => {
      const context = new ValidationContext();
      context.clear();
      context.clear(); // Should not throw
      assert.strictEqual(context.hasPending(), false);
    });

    it('allows adding new validations after clear', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      context.addPending(obj, 'validation-1');
      context.clear();

      context.addPending(obj, 'validation-2');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['validation-2']);
    });
  });

  describe('Integration scenarios', () => {
    it('handles typical add-remove-retry cycle', () => {
      const context = new ValidationContext();
      const obj = { dept: 'sales', boss: null };

      // Initially validation fails
      context.addPending(obj, 'boss-dept-consistency');
      assert.strictEqual(context.hasPending(), true);

      // Property updated, validation now passes
      context.removePending(obj, 'boss-dept-consistency');
      assert.strictEqual(context.hasPending(), false);
    });

    it('handles multiple validations failing and passing independently', () => {
      const context = new ValidationContext();
      const obj = { prop1: 1, prop2: 2, prop3: 3 };

      // Three validations fail
      context.addPending(obj, 'validation-1');
      context.addPending(obj, 'validation-2');
      context.addPending(obj, 'validation-3');

      const pending1 = context.getPending();
      assert.strictEqual(pending1[0].validations.length, 3);

      // One passes
      context.removePending(obj, 'validation-1');
      const pending2 = context.getPending();
      assert.strictEqual(pending2[0].validations.length, 2);
      assert.strictEqual(context.hasPending(), true);

      // Another passes
      context.removePending(obj, 'validation-2');
      const pending3 = context.getPending();
      assert.strictEqual(pending3[0].validations.length, 1);
      assert.strictEqual(context.hasPending(), true);

      // Last one passes - object removed from map
      context.removePending(obj, 'validation-3');
      assert.strictEqual(context.hasPending(), false);
    });

    it('handles commit-like scenario with multiple objects', () => {
      const context = new ValidationContext();
      const emp1 = { name: 'Alice', dept: 'sales' };
      const emp2 = { name: 'Bob', dept: 'engineering' };
      const emp3 = { name: 'Charlie', dept: 'sales' };

      // Multiple objects with pending validations
      context.addPending(emp1, 'boss-dept-consistency');
      context.addPending(emp2, 'boss-dept-consistency');
      context.addPending(emp3, 'salary-range');

      assert.strictEqual(context.hasPending(), true);
      const pending = context.getPending();
      assert.strictEqual(pending.length, 3);

      // Simulate commit rejection
      // ... would throw error with getPending() info

      // After rollback or abort, clear state
      context.clear();
      assert.strictEqual(context.hasPending(), false);
    });

    it('allows same validation name on different objects', () => {
      const context = new ValidationContext();
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2' };

      context.addPending(obj1, 'common-validation');
      context.addPending(obj2, 'common-validation');

      const pending = context.getPending();
      assert.strictEqual(pending.length, 2);
      assert.strictEqual(pending[0].validations[0], 'common-validation');
      assert.strictEqual(pending[1].validations[0], 'common-validation');
    });
  });

  describe('Edge cases', () => {
    it('handles objects with complex structures', () => {
      const context = new ValidationContext();
      const obj = {
        nested: { deep: { value: 42 } },
        array: [1, 2, 3],
        fn: () => {},
      };

      context.addPending(obj, 'validation-1');

      const pending = context.getPending();
      assert.strictEqual(pending[0].obj, obj);
    });

    it('handles validation names with special characters', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };
      const validationName = 'validation:with-special.chars_123';

      context.addPending(obj, validationName);

      const pending = context.getPending();
      assert.deepStrictEqual(pending[0].validations, [validationName]);
    });

    it('handles empty validation names', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };

      assert.throws(
        () => context.addPending(obj, ''),
        /Validation name cannot be empty/
      );
    });

    it('handles many validations on single object', () => {
      const context = new ValidationContext();
      const obj = { name: 'test' };

      for (let i = 0; i < 100; i++) {
        context.addPending(obj, `validation-${i}`);
      }

      const pending = context.getPending();
      assert.strictEqual(pending[0].validations.length, 100);
    });

    it('handles many objects with validations', () => {
      const context = new ValidationContext();
      const objects = Array.from({ length: 100 }, (_, i) => ({ id: i }));

      objects.forEach((obj, i) => {
        context.addPending(obj, `validation-${i}`);
      });

      const pending = context.getPending();
      assert.strictEqual(pending.length, 100);
    });
  });
});
