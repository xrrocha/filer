import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ObjectType,
  StringType,
  NumberType,
  ValidationError,
  ImmediateValidator,
} from '../../../dist/metadata/javascript-types.js';
import { isInteger, minInclusive, pattern } from '../../../dist/metadata/validators.js';

describe('Property-Level Validation', () => {
  describe('Required validation', () => {
    it('accepts value when required and provided', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual(person.name, 'Alice');
    });

    it('rejects undefined when required', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      assert.throws(
        () => Person({ name: undefined }),
        /required/i
      );
    });

    it('accepts undefined when optional', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          nickname: { name: 'nickname', type: StringType, validation: { required: false } },
        },
      });

      const person = Person({ nickname: undefined });
      assert.strictEqual(person.nickname, undefined);
    });

    it('accepts null when optional', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          nickname: { name: 'nickname', type: StringType, validation: { required: false } },
        },
      });

      const person = Person({ nickname: null });
      assert.strictEqual(person.nickname, null);
    });
  });

  describe('Type checking', () => {
    it('accepts values matching type', () => {
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

    it('rejects values not matching type', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      assert.throws(
        () => Person({ age: 'thirty' }),
        /expects type number/
      );
    });

    it('checks type on property mutation', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ age: 30 });
      assert.throws(
        () => { person.age = 'thirty' as any; },
        /expects type number/
      );
    });
  });

  describe('Enterable validation', () => {
    it('allows setting property when enterable=true', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: {
            name: 'name',
            type: StringType,
            validation: { required: true, enterable: true },
          },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual(person.name, 'Alice');
    });

    it('rejects setting property when enterable=false', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          id: {
            name: 'id',
            type: NumberType,
            validation: { required: true, enterable: false },
          },
        },
      });

      assert.throws(
        () => Person({ id: 123 }),
        /not enterable/i
      );
    });

    it('rejects setting even undefined when enterable=false', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          id: {
            name: 'id',
            type: NumberType,
            validation: { required: false, enterable: false },
          },
        },
      });

      // Even though optional, cannot set property when enterable=false
      assert.throws(
        () => Person({ id: undefined }),
        /not enterable/i
      );
    });
  });

  describe('Updatable validation', () => {
    it('allows updating property when updatable=true', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: {
            name: 'name',
            type: StringType,
            validation: { required: true, updatable: true },
          },
        },
      });

      const person = Person({ name: 'Alice' });
      person.name = 'Bob';
      assert.strictEqual(person.name, 'Bob');
    });

    it('rejects updating property when updatable=false', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          id: {
            name: 'id',
            type: NumberType,
            validation: { required: true, enterable: true, updatable: false },
          },
        },
      });

      const person = Person({ id: 123 });
      assert.throws(
        () => { person.id = 456; },
        /not updatable/i
      );
    });

    it('distinguishes between initial set and update', () => {
      const Counter = ObjectType({
        name: 'Counter',
        properties: {
          value: {
            name: 'value',
            type: NumberType,
            validation: { required: true, enterable: true, updatable: true },
          },
        },
      });

      const counter = Counter({ value: 0 }); // Initial set - OK
      counter.value = 1; // Update - OK
      counter.value = 2; // Another update - OK
      assert.strictEqual(counter.value, 2);
    });
  });

  describe('ValidationRule integration', () => {
    it('validates with single ValidationRule', () => {
      const Product = ObjectType({
        name: 'Product',
        properties: {
          quantity: {
            name: 'quantity',
            type: NumberType,
            validation: {
              required: true,
              validations: [isInteger()],
            },
          },
        },
      });

      const product = Product({ quantity: 10 });
      assert.strictEqual(product.quantity, 10);

      assert.throws(
        () => Product({ quantity: 10.5 }),
        ValidationError
      );
    });

    it('validates with multiple ValidationRules', () => {
      const Product = ObjectType({
        name: 'Product',
        properties: {
          price: {
            name: 'price',
            type: NumberType,
            validation: {
              required: true,
              validations: [
                isInteger(),
                minInclusive(1),
              ],
            },
          },
        },
      });

      const product = Product({ price: 100 });
      assert.strictEqual(product.price, 100);

      assert.throws(() => Product({ price: 0 }), ValidationError); // Fails minInclusive
      assert.throws(() => Product({ price: 99.99 }), ValidationError); // Fails isInteger
    });

    it('runs all validations and reports first failure', () => {
      const User = ObjectType({
        name: 'User',
        properties: {
          username: {
            name: 'username',
            type: StringType,
            validation: {
              required: true,
              validations: [pattern(/^[a-z]+$/)],
            },
          },
        },
      });

      assert.throws(
        () => User({ username: 'ALICE' }),
        ValidationError
      );
    });

    it('validates on property mutation', () => {
      const Product = ObjectType({
        name: 'Product',
        properties: {
          quantity: {
            name: 'quantity',
            type: NumberType,
            validation: {
              required: true,
              validations: [isInteger(), minInclusive(0)],
            },
          },
        },
      });

      const product = Product({ quantity: 10 });

      assert.throws(
        () => { product.quantity = -5; },
        ValidationError
      );

      assert.throws(
        () => { product.quantity = 10.5; },
        ValidationError
      );
    });
  });

  describe('ImmediateValidator class', () => {
    it('validates required property on construction', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      assert.throws(
        () => Person({ name: undefined }),
        /required/i
      );
    });

    it('validates type on construction', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      assert.throws(
        () => Person({ age: 'invalid' }),
        /expects type number/
      );
    });

    it('validates ValidationRules on construction', () => {
      const Product = ObjectType({
        name: 'Product',
        properties: {
          quantity: {
            name: 'quantity',
            type: NumberType,
            validation: {
              required: true,
              validations: [isInteger()],
            },
          },
        },
      });

      assert.throws(
        () => Product({ quantity: 10.5 }),
        ValidationError
      );
    });

    it('validates on property mutation', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: {
            name: 'age',
            type: NumberType,
            validation: {
              required: true,
              validations: [minInclusive(0)],
            },
          },
        },
      });

      const person = Person({ age: 30 });

      assert.throws(
        () => { person.age = -5; },
        ValidationError
      );
    });
  });

  describe('ValidationError class', () => {
    it('throws ValidationError for failed validations', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: {
            name: 'age',
            type: NumberType,
            validation: {
              required: true,
              validations: [isInteger()],
            },
          },
        },
      });

      try {
        Person({ age: 30.5 });
        assert.fail('Should have thrown ValidationError');
      } catch (error) {
        assert.ok(error instanceof ValidationError);
        assert.ok((error as Error).message.includes('age'));
      }
    });

    it('includes property name in error message', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          username: {
            name: 'username',
            type: StringType,
            validation: {
              required: true,
              validations: [pattern(/^[a-z]+$/)],
            },
          },
        },
      });

      try {
        Person({ username: '123' });
        assert.fail('Should have thrown');
      } catch (error) {
        assert.ok((error as Error).message.includes('username'));
      }
    });

    it('includes validation error message', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: {
            name: 'age',
            type: NumberType,
            validation: {
              required: true,
              validations: [minInclusive(0)],
            },
          },
        },
      });

      try {
        Person({ age: -5 });
        assert.fail('Should have thrown');
      } catch (error) {
        const msg = (error as Error).message;
        // Should include either the min value or indication of constraint
        assert.ok(msg.includes('0') || msg.includes('>=') || msg.includes('must'));
      }
    });
  });

  describe('Edge cases', () => {
    it('handles empty validations array', () => {
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          value: {
            name: 'value',
            type: NumberType,
            validation: {
              required: true,
              validations: [],
            },
          },
        },
      });

      const obj = Simple({ value: 42 });
      assert.strictEqual(obj.value, 42);
    });

    it('handles missing validations field', () => {
      const Simple = ObjectType({
        name: 'Simple',
        properties: {
          value: {
            name: 'value',
            type: NumberType,
            validation: { required: true },
          },
        },
      });

      const obj = Simple({ value: 42 });
      assert.strictEqual(obj.value, 42);
    });

    it('validates null vs undefined correctly', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          nickname: {
            name: 'nickname',
            type: StringType,
            validation: { required: false },
          },
        },
      });

      const p1 = Person({ nickname: null });
      const p2 = Person({ nickname: undefined });
      const p3 = Person({});

      assert.strictEqual(p1.nickname, null);
      assert.strictEqual(p2.nickname, undefined);
      assert.strictEqual(p3.nickname, undefined);
    });
  });
});
