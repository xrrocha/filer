import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
  type ObjectTypeFactory,
} from '../../../dist/metadata/javascript-types.js';

describe('Validation Compilation (buildValidationIndex & collectValidations)', () => {
  describe('buildValidationIndex via _compiled metadata', () => {
    it('creates empty index for type with no validations', () => {
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      assert.ok(Simple._compiled);
      assert.ok(Simple._compiled.validationsByProperty);
      assert.strictEqual(Simple._compiled.validationsByProperty.size, 0);
    });

    it('creates index for single validation, single property', () => {
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

      const index = Person._compiled!.validationsByProperty;
      assert.strictEqual(index.size, 1);
      assert.ok(index.has('age'));

      const validations = index.get('age')!;
      assert.strictEqual(validations.size, 1);
      assert.strictEqual([...validations][0].name, 'age-positive');
    });

    it('creates index for single validation, multiple properties', () => {
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

      const index = Person._compiled!.validationsByProperty;
      assert.strictEqual(index.size, 2);
      assert.ok(index.has('age'));
      assert.ok(index.has('retirementAge'));

      const ageValidations = index.get('age')!;
      const retirementValidations = index.get('retirementAge')!;
      assert.strictEqual(ageValidations.size, 1);
      assert.strictEqual(retirementValidations.size, 1);

      // Both properties reference the same validation
      assert.strictEqual([...ageValidations][0], [...retirementValidations][0]);
      assert.strictEqual([...ageValidations][0].name, 'retirement-after-current');
    });

    it('aggregates multiple validations for same property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
          salary: { name: 'salary', type: NumberType, validation: { required: true } },
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
            name: 'salary-positive',
            properties: ['salary'],
            validate(p: any) {
              return p.salary > 0;
            },
            errorMessage() {
              return 'Salary must be positive';
            },
          },
        ],
      });

      const index = Person._compiled!.validationsByProperty;
      assert.strictEqual(index.size, 2);

      const ageValidations = index.get('age')!;
      const salaryValidations = index.get('salary')!;

      assert.strictEqual(ageValidations.size, 2);
      assert.strictEqual(salaryValidations.size, 1);

      const ageNames = [...ageValidations].map(v => v.name).sort();
      assert.deepStrictEqual(ageNames, ['age-positive', 'age-reasonable']);

      const salaryNames = [...salaryValidations].map(v => v.name);
      assert.deepStrictEqual(salaryNames, ['salary-positive']);
    });

    it('handles validation with 3+ properties', () => {
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

      const index = Triangle._compiled!.validationsByProperty;
      assert.strictEqual(index.size, 3);

      assert.ok(index.has('a'));
      assert.ok(index.has('b'));
      assert.ok(index.has('c'));

      // All three properties reference the same validation
      const validation = [...index.get('a')!][0];
      assert.strictEqual(validation.name, 'triangle-inequality');
      assert.strictEqual([...index.get('b')!][0], validation);
      assert.strictEqual([...index.get('c')!][0], validation);
    });

    it('includes only properties mentioned in validation.properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
          salary: { name: 'salary', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-salary-correlation',
            properties: ['age', 'salary'], // Only these two
            validate(p: any) {
              return p.salary > p.age * 1000; // Example rule
            },
            errorMessage() {
              return 'Salary should correlate with age';
            },
          },
        ],
      });

      const index = Person._compiled!.validationsByProperty;
      assert.strictEqual(index.size, 2);
      assert.ok(index.has('age'));
      assert.ok(index.has('salary'));
      assert.ok(!index.has('name')); // Not in validation.properties
    });
  });

  describe('collectValidations via factory.validations', () => {
    it('returns own validations when no supertype', () => {
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

      assert.ok(Person.validations);
      assert.strictEqual(Person.validations!.length, 1);
      assert.strictEqual(Person.validations![0].name, 'age-positive');
    });

    it('merges supertype and own validations', () => {
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

      assert.ok(Employee.validations);
      assert.strictEqual(Employee.validations!.length, 2);

      const names = Employee.validations!.map(v => v.name).sort();
      assert.deepStrictEqual(names, ['age-positive', 'salary-positive']);
    });

    it('collects validations through 3-level inheritance', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
        validations: [
          {
            name: 'person-validation',
            properties: ['name'],
            validate(p: any) {
              return p.name.length > 0;
            },
            errorMessage() {
              return 'Name required';
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
        validations: [
          {
            name: 'employee-validation',
            properties: ['empno'],
            validate(e: any) {
              return e.empno > 0;
            },
            errorMessage() {
              return 'Empno must be positive';
            },
          },
        ],
      });

      const Manager = ObjectType({
        name: 'Manager',
        supertype: Employee as ObjectTypeFactory,
        properties: {
          budget: { name: 'budget', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'manager-validation',
            properties: ['budget'],
            validate(m: any) {
              return m.budget > 0;
            },
            errorMessage() {
              return 'Budget must be positive';
            },
          },
        ],
      });

      assert.ok(Manager.validations);
      assert.strictEqual(Manager.validations!.length, 3);

      const names = Manager.validations!.map(v => v.name).sort();
      assert.deepStrictEqual(names, ['employee-validation', 'manager-validation', 'person-validation']);
    });

    it('returns only own validations when supertype has no validations', () => {
      const Base = ObjectType({
        name: 'Base',
        properties: {
          id: { name: 'id', type: NumberType, validation: { required: true } },
        },
        // No validations
      });

      const Derived = ObjectType({
        name: 'Derived',
        supertype: Base as ObjectTypeFactory,
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
        validations: [
          {
            name: 'derived-validation',
            properties: ['name'],
            validate(d: any) {
              return d.name.length > 0;
            },
            errorMessage() {
              return 'Name required';
            },
          },
        ],
      });

      assert.ok(Derived.validations);
      assert.strictEqual(Derived.validations!.length, 1);
      assert.strictEqual(Derived.validations![0].name, 'derived-validation');
    });

    it('returns empty array when no validations at all', () => {
      const Base = ObjectType({
        name: 'Base',
        properties: {
          id: { name: 'id', type: NumberType, validation: { required: true } },
        },
      });

      const Derived = ObjectType({
        name: 'Derived',
        supertype: Base as ObjectTypeFactory,
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      // Both should have empty validations array
      assert.ok(Derived.validations);
      assert.strictEqual(Derived.validations!.length, 0);
    });
  });

  describe('Validation index integration with inheritance', () => {
    it('includes inherited validations in index', () => {
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
        validations: [
          {
            name: 'empno-positive',
            properties: ['empno'],
            validate(e: any) {
              return e.empno > 0;
            },
            errorMessage() {
              return 'Empno must be positive';
            },
          },
        ],
      });

      const index = Employee._compiled!.validationsByProperty;

      // Should have entries for both inherited and own properties
      assert.ok(index.has('age')); // Inherited
      assert.ok(index.has('empno')); // Own

      const ageValidations = [...index.get('age')!];
      const empnoValidations = [...index.get('empno')!];

      assert.strictEqual(ageValidations.length, 1);
      assert.strictEqual(ageValidations[0].name, 'age-positive');

      assert.strictEqual(empnoValidations.length, 1);
      assert.strictEqual(empnoValidations[0].name, 'empno-positive');
    });
  });
});
