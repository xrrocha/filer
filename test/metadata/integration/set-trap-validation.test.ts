import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
  getDefaultContext,
} from '../../../dist/metadata/javascript-types.js';

describe('SET Trap Object-Level Validation Code Paths', () => {
  beforeEach(() => {
    getDefaultContext().clear();
  });

  describe('Validation index lookup', () => {
    it('skips validation when property has no object-level validations', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'], // Only age
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ name: 'Alice', age: 30 });

      // Mutating 'name' should not trigger validation (not in validation.properties)
      person.name = 'Bob';

      // Should still be empty (validation only cares about age)
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('checks validation when property participates', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ age: -5 }); // Triggers validation

      assert.strictEqual(getDefaultContext().hasPending(), true);
      assert.deepStrictEqual(getDefaultContext().getPending()[0].validations, ['age-positive']);
    });

    it('checks all validations when property participates in multiple', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
          {
            name: 'age-reasonable',
            properties: ['age'],
            validate(p: any) {
              return p.age < 150;
            },
            errorMessage() {
              return 'Age must be under 150';
            },
          },
          {
            name: 'age-adult',
            properties: ['age'],
            validate(p: any) {
              return p.age >= 18;
            },
            errorMessage() {
              return 'Must be adult';
            },
          },
        ],
      });

      const person = Person({ age: 10 }); // Fails age-adult

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending()[0];
      assert.strictEqual(pending.validations.length, 1);
      assert.deepStrictEqual(pending.validations, ['age-adult']);
    });
  });

  describe('Validation outcomes', () => {
    it('calls removePending when validation passes', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ age: -5 }); // Fails
      assert.strictEqual(getDefaultContext().hasPending(), true);

      person.age = 30; // Passes - should call removePending
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('calls addPending when validation fails', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ age: -5 }); // Should call addPending

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, person);
      assert.deepStrictEqual(pending[0].validations, ['age-positive']);
    });

    it('calls addPending when validation throws (catch block)', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          grade: { name: 'grade', type: StringType, validation: { required: true } },
        },
        validations: [
          {
            name: 'grade-valid',
            properties: ['grade'],
            validate(p: any) {
              const validGrades = ['A', 'B', 'C'];
              if (!validGrades.includes(p.grade)) {
                throw new Error('Invalid grade!');
              }
              return true;
            },
            errorMessage() {
              return 'Grade must be A, B, or C';
            },
          },
        ],
      });

      const person = Person({ grade: 'Z' }); // Throws error in validate

      // Exception should be caught and treated as failure
      assert.strictEqual(getDefaultContext().hasPending(), true);
      assert.deepStrictEqual(getDefaultContext().getPending()[0].validations, ['grade-valid']);
    });
  });

  describe('Receiver object', () => {
    it('passes correct receiver to validation.validate()', () => {
      let capturedReceiver: any = null;

      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              capturedReceiver = p;
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ age: 30 });

      // Receiver should be the proxy object
      assert.strictEqual(capturedReceiver, person);
      assert.strictEqual(capturedReceiver.age, 30);
    });

    it('passes correct receiver to getDefaultContext() methods', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ name: 'Alice', age: -5 });

      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending[0].obj, person);
      assert.strictEqual(pending[0].obj.name, 'Alice');
      assert.strictEqual(pending[0].obj.age, -5);
    });

    it('tracks multiple objects independently', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const alice = Person({ age: -5 });
      const bob = Person({ age: -10 });

      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending.length, 2);

      const aliceEntry = pending.find(p => p.obj === alice);
      const bobEntry = pending.find(p => p.obj === bob);

      assert.ok(aliceEntry);
      assert.ok(bobEntry);
      assert.strictEqual(aliceEntry.obj.age, -5);
      assert.strictEqual(bobEntry.obj.age, -10);
    });
  });

  describe('Edge cases', () => {
    it('handles validation returning falsy values', () => {
      const Test = ObjectType({
        name: 'Test',
        properties: {
          value: { name: 'value', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'test-validation',
            properties: ['value'],
            validate(t: any) {
              return t.value; // Returns 0 for value=0, which is falsy
            },
            errorMessage() {
              return 'Value must be truthy';
            },
          },
        ],
      });

      const obj = Test({ value: 0 }); // 0 is falsy

      // 0 should be treated as validation failure
      assert.strictEqual(getDefaultContext().hasPending(), true);
    });

    it('handles validation returning truthy non-boolean values', () => {
      const Test = ObjectType({
        name: 'Test',
        properties: {
          value: { name: 'value', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'test-validation',
            properties: ['value'],
            validate(t: any) {
              return t.value; // Returns number (truthy)
            },
            errorMessage() {
              return 'Value must be truthy';
            },
          },
        ],
      });

      const obj = Test({ value: 42 }); // 42 is truthy

      // 42 should be treated as validation success
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('handles empty validationIndex gracefully', () => {
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
        // No validations
      });

      const obj = Simple({ name: 'test' });
      obj.name = 'updated';

      // Should not throw, should not add anything to getDefaultContext()
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('handles property with empty validation set', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'], // Only age, not name
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
        ],
      });

      const person = Person({ name: 'Alice', age: 30 });

      // Mutating name doesn't trigger validation
      person.name = 'Bob';
      assert.strictEqual(getDefaultContext().hasPending(), false);

      // Mutating age does trigger validation
      person.age = -5;
      assert.strictEqual(getDefaultContext().hasPending(), true);
    });
  });

  describe('Complex scenarios', () => {
    it('handles validation that depends on all properties being set', () => {
      const Rectangle = ObjectType({
        name: 'Rectangle',
        properties: {
          width: { name: 'width', type: NumberType, validation: { required: true } },
          height: { name: 'height', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'non-degenerate',
            properties: ['width', 'height'],
            validate(r: any) {
              return r.width > 0 && r.height > 0;
            },
            errorMessage() {
              return 'Rectangle must have positive dimensions';
            },
          },
        ],
      });

      const rect = Rectangle({ width: 0, height: 10 }); // width invalid

      assert.strictEqual(getDefaultContext().hasPending(), true);

      rect.width = 5; // Now valid
      assert.strictEqual(getDefaultContext().hasPending(), false);

      rect.height = 0; // Now invalid again
      assert.strictEqual(getDefaultContext().hasPending(), true);
    });

    it('handles validation that re-checks on every property mutation', () => {
      let validationCallCount = 0;

      const Person = ObjectType({
        name: 'Person',
        properties: {
          firstName: { name: 'firstName', type: StringType, validation: { required: true } },
          lastName: { name: 'lastName', type: StringType, validation: { required: true } },
        },
        validations: [
          {
            name: 'names-different',
            properties: ['firstName', 'lastName'],
            validate(p: any) {
              validationCallCount++;
              return p.firstName !== p.lastName;
            },
            errorMessage() {
              return 'First and last name must be different';
            },
          },
        ],
      });

      const person = Person({ firstName: 'John', lastName: 'Smith' });
      const initialCount = validationCallCount;

      person.firstName = 'Jane'; // Triggers validation
      assert.ok(validationCallCount > initialCount);

      const countAfterFirst = validationCallCount;
      person.lastName = 'Doe'; // Triggers validation again
      assert.ok(validationCallCount > countAfterFirst);
    });

    it('processes all validations even if some fail', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) {
              return p.age > 0;
            },
            errorMessage() {
              return 'Age must be positive';
            },
          },
          {
            name: 'age-under-150',
            properties: ['age'],
            validate(p: any) {
              return p.age < 150;
            },
            errorMessage() {
              return 'Age must be under 150';
            },
          },
          {
            name: 'age-adult',
            properties: ['age'],
            validate(p: any) {
              return p.age >= 18;
            },
            errorMessage() {
              return 'Must be adult';
            },
          },
        ],
      });

      const person = Person({ age: 200 }); // Fails age-under-150 and age-adult (passes age-positive)

      const pending = getDefaultContext().getPending()[0];

      // Only failed validations should be pending
      assert.strictEqual(pending.validations.length, 1);
      assert.ok(pending.validations.includes('age-under-150'));
    });
  });
});
