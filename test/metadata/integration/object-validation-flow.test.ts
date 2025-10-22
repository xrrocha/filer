import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
  getDefaultContext,
  type ObjectTypeFactory,
} from '../../../dist/metadata/javascript-types.js';

describe('Object-Level Validation Flow (Integration)', () => {
  beforeEach(() => {
    getDefaultContext().clear();
  });

  describe('Basic flow', () => {
    it('triggers validation on property mutation', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const person = Person({ age: 30, retirementAge: 25 }); // Invalid!

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending.length, 1);
      assert.strictEqual(pending[0].obj, person);
      assert.deepStrictEqual(pending[0].validations, ['retirement-after-current']);
    });

    it('does not add to pending when validation passes', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const person = Person({ age: 30, retirementAge: 65 }); // Valid!

      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('removes from pending when subsequent mutation fixes validation', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const person = Person({ age: 30, retirementAge: 25 }); // Invalid
      assert.strictEqual(getDefaultContext().hasPending(), true);

      person.retirementAge = 65; // Fix it!
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('re-adds to pending when validation fails again', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const person = Person({ age: 30, retirementAge: 65 }); // Valid initially
      assert.strictEqual(getDefaultContext().hasPending(), false);

      person.age = 70; // Now invalid!
      assert.strictEqual(getDefaultContext().hasPending(), true);

      person.retirementAge = 75; // Fix it
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });
  });

  describe('Multiple properties in same validation', () => {
    it('triggers on mutation of either participating property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const person = Person({ age: 30, retirementAge: 25 }); // Invalid
      assert.strictEqual(getDefaultContext().hasPending(), true);

      // Fix by changing age
      person.age = 20;
      assert.strictEqual(getDefaultContext().hasPending(), false);

      // Break by changing retirementAge
      person.retirementAge = 15;
      assert.strictEqual(getDefaultContext().hasPending(), true);

      // Fix by changing retirementAge
      person.retirementAge = 65;
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });

    it('handles validation with 3 properties', () => {
      const Triangle = ObjectType({
        name: 'Triangle',
        properties: {
          a: { name: 'a', type: NumberType, validation: { required: true } },
          b: { name: 'b', type: NumberType, validation: { required: true } },
          c: { name: 'c', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'triangle-inequality',
            properties: ['a', 'b', 'c'],
            validate(t: any) {
              return t.a + t.b > t.c && t.b + t.c > t.a && t.a + t.c > t.b;
            },
            errorMessage() {
              return 'Must satisfy triangle inequality';
            },
          },
        ],
      });

      const triangle = Triangle({ a: 1, b: 1, c: 10 }); // Invalid!
      assert.strictEqual(getDefaultContext().hasPending(), true);

      triangle.c = 1; // Now valid (equilateral)
      assert.strictEqual(getDefaultContext().hasPending(), false);

      triangle.a = 100; // Invalid again
      assert.strictEqual(getDefaultContext().hasPending(), true);
    });
  });

  describe('Multiple validations on same object', () => {
    it('tracks multiple failing validations independently', () => {
      const Project = ObjectType({
        name: 'Project',
        properties: {
          startDate: { name: 'startDate', type: NumberType, validation: { required: true } },
          endDate: { name: 'endDate', type: NumberType, validation: { required: true } },
          budget: { name: 'budget', type: NumberType, validation: { required: true } },
          spent: { name: 'spent', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'date-range-valid',
            properties: ['startDate', 'endDate'],
            validate(p: any) {
              return p.endDate >= p.startDate;
            },
            errorMessage() {
              return 'End date must be >= start date';
            },
          },
          {
            name: 'budget-not-exceeded',
            properties: ['budget', 'spent'],
            validate(p: any) {
              return p.spent <= p.budget;
            },
            errorMessage() {
              return 'Spent cannot exceed budget';
            },
          },
        ],
      });

      const proj = Project({ startDate: 20250201, endDate: 20250101, budget: 1000, spent: 1500 });

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending[0].validations.length, 2);
      assert.ok(pending[0].validations.includes('date-range-valid'));
      assert.ok(pending[0].validations.includes('budget-not-exceeded'));
    });

    it('removes one validation while keeping others pending', () => {
      const Project = ObjectType({
        name: 'Project',
        properties: {
          startDate: { name: 'startDate', type: NumberType, validation: { required: true } },
          endDate: { name: 'endDate', type: NumberType, validation: { required: true } },
          budget: { name: 'budget', type: NumberType, validation: { required: true } },
          spent: { name: 'spent', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'date-range-valid',
            properties: ['startDate', 'endDate'],
            validate(p: any) {
              return p.endDate >= p.startDate;
            },
            errorMessage() {
              return 'End date must be >= start date';
            },
          },
          {
            name: 'budget-not-exceeded',
            properties: ['budget', 'spent'],
            validate(p: any) {
              return p.spent <= p.budget;
            },
            errorMessage() {
              return 'Spent cannot exceed budget';
            },
          },
        ],
      });

      const proj = Project({ startDate: 20250201, endDate: 20250101, budget: 1000, spent: 1500 });
      assert.strictEqual(getDefaultContext().getPending()[0].validations.length, 2);

      proj.endDate = 20250301; // Fix date range
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending[0].validations.length, 1);
      assert.deepStrictEqual(pending[0].validations, ['budget-not-exceeded']);
    });

    it('clears all when all validations fixed', () => {
      const Project = ObjectType({
        name: 'Project',
        properties: {
          startDate: { name: 'startDate', type: NumberType, validation: { required: true } },
          endDate: { name: 'endDate', type: NumberType, validation: { required: true } },
          budget: { name: 'budget', type: NumberType, validation: { required: true } },
          spent: { name: 'spent', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'date-range-valid',
            properties: ['startDate', 'endDate'],
            validate(p: any) {
              return p.endDate >= p.startDate;
            },
            errorMessage() {
              return 'End date must be >= start date';
            },
          },
          {
            name: 'budget-not-exceeded',
            properties: ['budget', 'spent'],
            validate(p: any) {
              return p.spent <= p.budget;
            },
            errorMessage() {
              return 'Spent cannot exceed budget';
            },
          },
        ],
      });

      const proj = Project({ startDate: 20250201, endDate: 20250101, budget: 1000, spent: 1500 });
      assert.strictEqual(getDefaultContext().hasPending(), true);

      proj.endDate = 20250301; // Fix dates
      assert.strictEqual(getDefaultContext().hasPending(), true); // Budget still invalid

      proj.spent = 900; // Fix budget
      assert.strictEqual(getDefaultContext().hasPending(), false); // All clear!
    });
  });

  describe('Validation exceptions', () => {
    it('treats exception as validation failure', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          grade: { name: 'grade', type: StringType, validation: { required: true } },
          salary: { name: 'salary', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'salary-in-grade-range',
            properties: ['grade', 'salary'],
            validate(p: any) {
              const ranges: Record<string, [number, number]> = {
                junior: [30000, 50000],
                senior: [50000, 100000],
              };
              const [min, max] = ranges[p.grade]; // Throws if grade not in map!
              return p.salary >= min && p.salary <= max;
            },
            errorMessage() {
              return 'Salary must be in grade range';
            },
          },
        ],
      });

      const person = Person({ grade: 'invalid', salary: 75000 }); // Will throw!

      // Exception treated as failure
      assert.strictEqual(getDefaultContext().hasPending(), true);
    });

    it('recovers from exception when validation fixed', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          grade: { name: 'grade', type: StringType, validation: { required: true } },
          salary: { name: 'salary', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'salary-in-grade-range',
            properties: ['grade', 'salary'],
            validate(p: any) {
              const ranges: Record<string, [number, number]> = {
                junior: [30000, 50000],
                senior: [50000, 100000],
              };
              const [min, max] = ranges[p.grade];
              return p.salary >= min && p.salary <= max;
            },
            errorMessage() {
              return 'Salary must be in grade range';
            },
          },
        ],
      });

      const person = Person({ grade: 'invalid', salary: 75000 });
      assert.strictEqual(getDefaultContext().hasPending(), true);

      person.grade = 'senior'; // Now valid!
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });
  });

  describe('Validation inheritance', () => {
    it('triggers base type validation from subtype mutation', () => {
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

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person as ObjectTypeFactory,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
        validations: [],
      });

      const emp = Employee({ age: -5, empno: 100 }); // Inherited validation fails!

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.deepStrictEqual(pending[0].validations, ['age-positive']);
    });

    it('accumulates base and subtype validations', () => {
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

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person as ObjectTypeFactory,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
          salary: { name: 'salary', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'salary-positive',
            properties: ['salary'],
            validate(e: any) {
              return e.salary > 0;
            },
            errorMessage() {
              return 'Salary must be positive';
            },
          },
        ],
      });

      const emp = Employee({ age: -5, empno: 100, salary: -1000 }); // Both fail!

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending[0].validations.length, 2);
      assert.ok(pending[0].validations.includes('age-positive'));
      assert.ok(pending[0].validations.includes('salary-positive'));
    });

    it('fixes inherited validation from subtype instance', () => {
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

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person as ObjectTypeFactory,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
        validations: [],
      });

      const emp = Employee({ age: -5, empno: 100 });
      assert.strictEqual(getDefaultContext().hasPending(), true);

      emp.age = 30; // Fix inherited validation
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });
  });

  describe('Multiple objects', () => {
    it('tracks validations for multiple objects independently', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          retirementAge: { name: 'retirementAge', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'retirement-after-current',
            properties: ['age', 'retirementAge'],
            validate(p: any) {
              return p.retirementAge > p.age;
            },
            errorMessage() {
              return 'Retirement must be after current age';
            },
          },
        ],
      });

      const alice = Person({ age: 30, retirementAge: 25 }); // Invalid
      const bob = Person({ age: 40, retirementAge: 35 }); // Invalid

      assert.strictEqual(getDefaultContext().hasPending(), true);
      const pending = getDefaultContext().getPending();
      assert.strictEqual(pending.length, 2);

      alice.retirementAge = 65; // Fix Alice
      assert.strictEqual(getDefaultContext().getPending().length, 1);
      assert.strictEqual(getDefaultContext().getPending()[0].obj, bob);

      bob.age = 30; // Fix Bob
      assert.strictEqual(getDefaultContext().hasPending(), false);
    });
  });
});
