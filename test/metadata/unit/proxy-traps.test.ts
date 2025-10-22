import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
} from '../../../dist/metadata/javascript-types.js';

describe('Proxy Trap Edge Cases', () => {
  describe('GET trap', () => {
    it('returns property values', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice', age: 30 });
      assert.strictEqual(person.name, 'Alice');
      assert.strictEqual(person.age, 30);
    });

    it('returns undefined for optional unset properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          nickname: { name: 'nickname', type: StringType, validation: { required: false } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual(person.nickname, undefined);
    });

    it('allows accessing inherited properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      const emp = Employee({ name: 'Alice', empno: 100 });
      assert.strictEqual(emp.name, 'Alice');
      assert.strictEqual(emp.empno, 100);
    });

    it('returns null when explicitly set to null', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          boss: {
            name: 'boss',
            type: () => Person,
            validation: { required: false },
          },
        },
      });

      const person = Person({ boss: null });
      assert.strictEqual(person.boss, null);
    });

    it('allows accessing special __type__ property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual((person as any).__type__, Person);
    });
  });

  describe('SET trap', () => {
    it('sets property values', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true, updatable: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      person.name = 'Bob';
      assert.strictEqual(person.name, 'Bob');
    });

    it('updates inherited properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true, updatable: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      const emp = Employee({ name: 'Alice', empno: 100 });
      emp.name = 'Bob';
      assert.strictEqual(emp.name, 'Bob');
    });

    it('allows setting optional property to null', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          nickname: { name: 'nickname', type: StringType, validation: { required: false, updatable: true } },
        },
      });

      const person = Person({ nickname: 'Al' });
      person.nickname = null;
      assert.strictEqual(person.nickname, null);
    });

    it('allows setting optional property to undefined', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          nickname: { name: 'nickname', type: StringType, validation: { required: false, updatable: true } },
        },
      });

      const person = Person({ nickname: 'Al' });
      person.nickname = undefined;
      assert.strictEqual(person.nickname, undefined);
    });

    it('prevents setting undefined on required property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true, updatable: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.throws(() => {
        person.name = undefined as any;
      }, /required/);
    });

    it('prevents setting null on required property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true, updatable: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.throws(() => {
        person.name = null as any;
      }, /required/);
    });
  });

  describe('deleteProperty trap', () => {
    it('allows delete operation (no deleteProperty trap implemented)', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });

      // Delete operation succeeds since no deleteProperty trap is implemented
      // Note: This is current implementation behavior
      const result = delete (person as any).name;
      assert.strictEqual(result, true);
    });
  });

  describe('ownKeys trap', () => {
    it('returns all property names', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice', age: 30 });
      const keys = Object.keys(person);

      assert.ok(keys.includes('name'));
      assert.ok(keys.includes('age'));
    });

    it('includes inherited properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      const emp = Employee({ name: 'Alice', empno: 100 });
      const keys = Object.keys(emp);

      assert.ok(keys.includes('name'));
      assert.ok(keys.includes('empno'));
    });

    it('excludes __type__ from enumerable keys', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      const keys = Object.keys(person);

      assert.ok(!keys.includes('__type__'));
    });

    it('works with Object.entries()', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice', age: 30 });
      const entries = Object.entries(person);

      assert.strictEqual(entries.length, 2);
      assert.ok(entries.some(([k, v]) => k === 'name' && v === 'Alice'));
      assert.ok(entries.some(([k, v]) => k === 'age' && v === 30));
    });

    it('works with Object.values()', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice', age: 30 });
      const values = Object.values(person);

      assert.ok(values.includes('Alice'));
      assert.ok(values.includes(30));
    });
  });

  describe('Property descriptor trap', () => {
    it('returns property descriptor for defined properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      const descriptor = Object.getOwnPropertyDescriptor(person, 'name');

      assert.ok(descriptor);
      assert.strictEqual(descriptor.value, 'Alice');
      assert.strictEqual(descriptor.enumerable, true);
      // Default behavior - properties are configurable
      assert.strictEqual(descriptor.configurable, true);
    });

    it('marks properties as writable', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true, updatable: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      const descriptor = Object.getOwnPropertyDescriptor(person, 'name');

      assert.strictEqual(descriptor?.writable, true);
    });
  });

  describe('Proxy identity', () => {
    it('maintains object identity across property access', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      const ref1 = person;
      const ref2 = person;

      assert.strictEqual(ref1, ref2);
    });

    it('different instances are different objects', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const alice = Person({ name: 'Alice' });
      const bob = Person({ name: 'Bob' });

      assert.notStrictEqual(alice, bob);
    });

    it('typeof returns object', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual(typeof person, 'object');
    });
  });
});
