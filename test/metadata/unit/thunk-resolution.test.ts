import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
  ArrayType,
} from '../../../dist/metadata/javascript-types.js';

describe('Thunk Resolution in Property Types', () => {
  describe('Basic thunk resolution', () => {
    it('resolves thunk returning valid type', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          friend: { name: 'friend', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice' });
      const bob = Person({ name: 'Bob', friend: alice });

      assert.strictEqual(bob.name, 'Bob');
      assert.strictEqual(bob.friend, alice);
      assert.strictEqual(bob.friend.name, 'Alice');
    });

    it('passes through non-thunk type reference unchanged', () => {
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const obj = Simple({ name: 'Test', age: 42 });
      assert.strictEqual(obj.name, 'Test');
      assert.strictEqual(obj.age, 42);
    });

    it('does not treat type factory with typeName as thunk', () => {
      // StringType is a function but has 'typeName' property
      // Should NOT be called as a thunk
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          text: { name: 'text', type: StringType, validation: { required: true } },
        },
      });

      const obj = Simple({ text: 'hello' });
      assert.strictEqual(obj.text, 'hello');
    });
  });

  describe('Self-reference scenarios', () => {
    it('handles Employee.boss self-reference', () => {
      const Emp = ObjectType({
        name: 'Emp',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: { name: 'boss', type: () => Emp, validation: { required: false } },
        },
      });

      const alice = Emp({ name: 'Alice', boss: null });
      const bob = Emp({ name: 'Bob', boss: alice });

      assert.strictEqual(bob.boss, alice);
      assert.strictEqual(bob.boss.name, 'Alice');
      assert.strictEqual(bob.boss.boss, null);
    });

    it('handles Person.spouse symmetric self-reference', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          spouse: { name: 'spouse', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice' });
      const bob = Person({ name: 'Bob' });

      alice.spouse = bob;
      bob.spouse = alice;

      assert.strictEqual(alice.spouse, bob);
      assert.strictEqual(bob.spouse, alice);
      assert.strictEqual(alice.spouse.spouse, alice);
    });

    it('handles Department.parent hierarchical self-reference', () => {
      const Dept = ObjectType({
        name: 'Dept',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          parent: { name: 'parent', type: () => Dept, validation: { required: false } },
        },
      });

      const engineering = Dept({ name: 'Engineering', parent: null });
      const backend = Dept({ name: 'Backend', parent: engineering });
      const api = Dept({ name: 'API Team', parent: backend });

      assert.strictEqual(api.parent, backend);
      assert.strictEqual(api.parent.parent, engineering);
      assert.strictEqual(api.parent.parent.parent, null);
    });

    it('handles Node.children with array of self-references', () => {
      const Node = ObjectType({
        name: 'Node',
        properties: {
          value: { name: 'value', type: NumberType, validation: { required: true } },
          // Note: ArrayType expects element type, not thunk
          // But we can test thunk in future if needed
          left: { name: 'left', type: () => Node, validation: { required: false } },
          right: { name: 'right', type: () => Node, validation: { required: false } },
        },
      });

      const root = Node({ value: 10 });
      const leftChild = Node({ value: 5 });
      const rightChild = Node({ value: 15 });

      root.left = leftChild;
      root.right = rightChild;

      assert.strictEqual(root.left.value, 5);
      assert.strictEqual(root.right.value, 15);
    });
  });

  describe('Forward-reference scenarios', () => {
    it('allows forward reference with thunk', () => {
      // Manager defined before Employee exists
      const Manager = ObjectType({
        name: 'Manager',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          // Forward reference to Employee (defined below)
          reports: { name: 'reports', type: () => Employee, validation: { required: false } },
        },
      });

      // Employee references Manager (backward ref, already defined)
      const Employee = ObjectType({
        name: 'Employee',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          manager: { name: 'manager', type: Manager, validation: { required: false } },
        },
      });

      const alice = Manager({ name: 'Alice' });
      const bob = Employee({ name: 'Bob', manager: alice });

      alice.reports = bob;

      assert.strictEqual(bob.manager, alice);
      assert.strictEqual(alice.reports, bob);
    });
  });

  describe('Multiple thunks in same type', () => {
    it('resolves multiple self-referencing properties', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          friend: { name: 'friend', type: () => Person, validation: { required: false } },
          mentor: { name: 'mentor', type: () => Person, validation: { required: false } },
          partner: { name: 'partner', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice' });
      const bob = Person({ name: 'Bob' });
      const charlie = Person({ name: 'Charlie' });

      alice.friend = bob;
      alice.mentor = charlie;
      bob.partner = alice;

      assert.strictEqual(alice.friend, bob);
      assert.strictEqual(alice.mentor, charlie);
      assert.strictEqual(bob.partner, alice);
    });

    it('mixes thunks and direct references', () => {
      const Dept = ObjectType({
        name: 'Dept',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          dept: { name: 'dept', type: Dept, validation: { required: true } }, // Direct ref
          friend: { name: 'friend', type: () => Person, validation: { required: false } }, // Thunk
        },
      });

      const engineering = Dept({ name: 'Engineering' });
      const alice = Person({ name: 'Alice', dept: engineering });
      const bob = Person({ name: 'Bob', dept: engineering, friend: alice });

      assert.strictEqual(bob.dept, engineering);
      assert.strictEqual(bob.friend, alice);
    });
  });

  describe('Thunk edge cases', () => {
    it('handles thunk with null optional property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: { name: 'boss', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice', boss: null });
      assert.strictEqual(alice.boss, null);
    });

    it('handles thunk with undefined optional property', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: { name: 'boss', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice' });
      assert.strictEqual(alice.boss, undefined);
    });

    it('rejects invalid value even with thunk type', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: { name: 'boss', type: () => Person, validation: { required: false } },
        },
      });

      const alice = Person({ name: 'Alice' });

      assert.throws(
        () => {
          alice.boss = 'not a person'; // Invalid type
        },
        /expects type Person/
      );
    });

    it('rejects wrong object type with thunk', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: { name: 'boss', type: () => Person, validation: { required: false } },
        },
      });

      const Dept = ObjectType({
        name: 'Dept',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const alice = Person({ name: 'Alice' });
      const engineering = Dept({ name: 'Engineering' });

      assert.throws(
        () => {
          alice.boss = engineering; // Wrong type
        },
        /expects type Person/
      );
    });
  });

  describe('Circular references', () => {
    it('handles A → B → A circular reference', () => {
      const PersonA = ObjectType({
        name: 'PersonA',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          friendB: { name: 'friendB', type: () => PersonB, validation: { required: false } },
        },
      });

      const PersonB = ObjectType({
        name: 'PersonB',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          friendA: { name: 'friendA', type: () => PersonA, validation: { required: false } },
        },
      });

      const alice = PersonA({ name: 'Alice' });
      const bob = PersonB({ name: 'Bob' });

      alice.friendB = bob;
      bob.friendA = alice;

      assert.strictEqual(alice.friendB, bob);
      assert.strictEqual(bob.friendA, alice);
      assert.strictEqual(alice.friendB.friendA, alice);
    });

    it('handles A → A self-circular reference', () => {
      const Node = ObjectType({
        name: 'Node',
        properties: {
          value: { name: 'value', type: NumberType, validation: { required: true } },
          next: { name: 'next', type: () => Node, validation: { required: false } },
        },
      });

      const node1 = Node({ value: 1 });
      const node2 = Node({ value: 2 });
      const node3 = Node({ value: 3 });

      node1.next = node2;
      node2.next = node3;
      node3.next = node1; // Circular!

      assert.strictEqual(node1.next, node2);
      assert.strictEqual(node2.next, node3);
      assert.strictEqual(node3.next, node1);
      assert.strictEqual(node1.next.next.next, node1);
    });
  });

  describe('Thunk resolution timing', () => {
    it('resolves thunk only when property is accessed/set', () => {
      let thunkCallCount = 0;

      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          boss: {
            name: 'boss',
            type: () => {
              thunkCallCount++;
              return Person;
            },
            validation: { required: false },
          },
        },
      });

      // Creating type doesn't call thunk
      assert.strictEqual(thunkCallCount, 0);

      // Creating instance doesn't call thunk (no boss set)
      const alice = Person({ name: 'Alice' });
      assert.strictEqual(thunkCallCount, 0);

      // Setting boss property calls thunk
      const bob = Person({ name: 'Bob' });
      alice.boss = bob;
      assert.ok(thunkCallCount > 0, 'Thunk should be called when setting property');
    });
  });
});
