/**
 * Unit tests for type-classifier.ts
 *
 * Tests the ValueCategory classification system and type guard helpers.
 * Coverage: 100% of ValueCategory enum, all exported functions
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  classifyValue,
  ValueCategory,
  isNullish,
  isPrimitive,
  isPlainObject,
  isCollection,
  isObject,
} from '../../../src/memimg/type-classifier.js';
import { assertDeepEqual } from '../fixtures/helpers.js';

describe('type-classifier', () => {
  describe('classifyValue', () => {
    describe('NULL category', () => {
      it('classifies null correctly', () => {
        const result = classifyValue(null);
        assert.equal(result.category, ValueCategory.NULL);
        assert.equal(result.isPrimitive, true);
        assert.equal(result.isObject, false);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, false);
      });
    });

    describe('UNDEFINED category', () => {
      it('classifies undefined correctly', () => {
        const result = classifyValue(undefined);
        assert.equal(result.category, ValueCategory.UNDEFINED);
        assert.equal(result.isPrimitive, true);
        assert.equal(result.isObject, false);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, false);
      });
    });

    describe('PRIMITIVE category', () => {
      it('classifies string correctly', () => {
        const result = classifyValue('hello');
        assert.equal(result.category, ValueCategory.PRIMITIVE);
        assert.equal(result.isPrimitive, true);
        assert.equal(result.isObject, false);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, false);
      });

      it('classifies number correctly', () => {
        const result = classifyValue(42);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
        assert.equal(result.isPrimitive, true);
      });

      it('classifies boolean correctly', () => {
        const result = classifyValue(true);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
        assert.equal(result.isPrimitive, true);
      });

      it('classifies negative numbers', () => {
        const result = classifyValue(-999);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
      });

      it('classifies zero', () => {
        const result = classifyValue(0);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
      });

      it('classifies NaN', () => {
        const result = classifyValue(NaN);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
      });

      it('classifies Infinity', () => {
        const result = classifyValue(Infinity);
        assert.equal(result.category, ValueCategory.PRIMITIVE);
      });

      it('classifies empty string', () => {
        const result = classifyValue('');
        assert.equal(result.category, ValueCategory.PRIMITIVE);
      });
    });

    describe('BIGINT category', () => {
      it('classifies BigInt correctly', () => {
        const result = classifyValue(BigInt(9007199254740991));
        assert.equal(result.category, ValueCategory.BIGINT);
        assert.equal(result.isPrimitive, true);
        assert.equal(result.isObject, false);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies negative BigInt', () => {
        const result = classifyValue(BigInt(-100));
        assert.equal(result.category, ValueCategory.BIGINT);
      });

      it('classifies zero BigInt', () => {
        const result = classifyValue(BigInt(0));
        assert.equal(result.category, ValueCategory.BIGINT);
      });
    });

    describe('SYMBOL category', () => {
      it('classifies Symbol correctly', () => {
        const result = classifyValue(Symbol('test'));
        assert.equal(result.category, ValueCategory.SYMBOL);
        assert.equal(result.isPrimitive, true);
        assert.equal(result.isObject, false);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies Symbol without description', () => {
        const result = classifyValue(Symbol());
        assert.equal(result.category, ValueCategory.SYMBOL);
      });

      it('classifies well-known Symbols', () => {
        const result = classifyValue(Symbol.iterator);
        assert.equal(result.category, ValueCategory.SYMBOL);
      });
    });

    describe('DATE category', () => {
      it('classifies Date correctly', () => {
        const result = classifyValue(new Date());
        assert.equal(result.category, ValueCategory.DATE);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies invalid Date', () => {
        const result = classifyValue(new Date('invalid'));
        assert.equal(result.category, ValueCategory.DATE);
      });

      it('classifies epoch Date', () => {
        const result = classifyValue(new Date(0));
        assert.equal(result.category, ValueCategory.DATE);
      });
    });

    describe('FUNCTION category', () => {
      it('classifies function correctly', () => {
        const result = classifyValue(() => {});
        assert.equal(result.category, ValueCategory.FUNCTION);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies named function', () => {
        const result = classifyValue(function testFunc() {});
        assert.equal(result.category, ValueCategory.FUNCTION);
      });

      it('classifies arrow function', () => {
        const result = classifyValue((x: number) => x * 2);
        assert.equal(result.category, ValueCategory.FUNCTION);
      });

      it('classifies async function', () => {
        const result = classifyValue(async () => {});
        assert.equal(result.category, ValueCategory.FUNCTION);
      });

      it('classifies generator function', () => {
        const result = classifyValue(function* () {});
        assert.equal(result.category, ValueCategory.FUNCTION);
      });
    });

    describe('ARRAY category', () => {
      it('classifies Array correctly', () => {
        const result = classifyValue([1, 2, 3]);
        assert.equal(result.category, ValueCategory.ARRAY);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, true);
        assert.equal(result.needsSpecialSerialization, false);
      });

      it('classifies empty Array', () => {
        const result = classifyValue([]);
        assert.equal(result.category, ValueCategory.ARRAY);
      });

      it('classifies nested Array', () => {
        const result = classifyValue([[1, 2], [3, 4]]);
        assert.equal(result.category, ValueCategory.ARRAY);
      });

      it('classifies sparse Array', () => {
        const arr = new Array(10);
        arr[5] = 'value';
        const result = classifyValue(arr);
        assert.equal(result.category, ValueCategory.ARRAY);
      });
    });

    describe('MAP category', () => {
      it('classifies Map correctly', () => {
        const result = classifyValue(new Map([['key', 'value']]));
        assert.equal(result.category, ValueCategory.MAP);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, true);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies empty Map', () => {
        const result = classifyValue(new Map());
        assert.equal(result.category, ValueCategory.MAP);
      });

      it('classifies Map with object keys', () => {
        const map = new Map();
        map.set({ id: 1 }, 'value');
        const result = classifyValue(map);
        assert.equal(result.category, ValueCategory.MAP);
      });
    });

    describe('SET category', () => {
      it('classifies Set correctly', () => {
        const result = classifyValue(new Set([1, 2, 3]));
        assert.equal(result.category, ValueCategory.SET);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, true);
        assert.equal(result.needsSpecialSerialization, true);
      });

      it('classifies empty Set', () => {
        const result = classifyValue(new Set());
        assert.equal(result.category, ValueCategory.SET);
      });

      it('classifies Set with objects', () => {
        const set = new Set([{ id: 1 }, { id: 2 }]);
        const result = classifyValue(set);
        assert.equal(result.category, ValueCategory.SET);
      });
    });

    describe('OBJECT category', () => {
      it('classifies plain object correctly', () => {
        const result = classifyValue({ key: 'value' });
        assert.equal(result.category, ValueCategory.OBJECT);
        assert.equal(result.isPrimitive, false);
        assert.equal(result.isObject, true);
        assert.equal(result.isCollection, false);
        assert.equal(result.needsSpecialSerialization, false);
      });

      it('classifies empty object', () => {
        const result = classifyValue({});
        assert.equal(result.category, ValueCategory.OBJECT);
      });

      it('classifies nested object', () => {
        const result = classifyValue({ nested: { deep: 'value' } });
        assert.equal(result.category, ValueCategory.OBJECT);
      });

      it('classifies Object.create(null)', () => {
        const result = classifyValue(Object.create(null));
        assert.equal(result.category, ValueCategory.OBJECT);
      });
    });
  });

  describe('Type guard helpers', () => {
    describe('isNullish', () => {
      it('returns true for null', () => {
        assert.equal(isNullish(null), true);
      });

      it('returns true for undefined', () => {
        assert.equal(isNullish(undefined), true);
      });

      it('returns false for other values', () => {
        assert.equal(isNullish(0), false);
        assert.equal(isNullish(''), false);
        assert.equal(isNullish(false), false);
        assert.equal(isNullish({}), false);
      });
    });

    describe('isPrimitive', () => {
      it('returns true for primitives', () => {
        assert.equal(isPrimitive(null), true);
        assert.equal(isPrimitive(undefined), true);
        assert.equal(isPrimitive('string'), true);
        assert.equal(isPrimitive(42), true);
        assert.equal(isPrimitive(true), true);
        assert.equal(isPrimitive(BigInt(100)), true);
        assert.equal(isPrimitive(Symbol('test')), true);
      });

      it('returns false for objects', () => {
        assert.equal(isPrimitive({}), false);
        assert.equal(isPrimitive([]), false);
        assert.equal(isPrimitive(new Date()), false);
        assert.equal(isPrimitive(() => {}), false);
      });
    });

    describe('isPlainObject', () => {
      it('returns true for plain objects', () => {
        assert.equal(isPlainObject({}), true);
        assert.equal(isPlainObject({ key: 'value' }), true);
        assert.equal(isPlainObject(Object.create(null)), true);
      });

      it('returns false for non-plain objects', () => {
        assert.equal(isPlainObject(null), false);
        assert.equal(isPlainObject(undefined), false);
        assert.equal(isPlainObject([]), false);
        assert.equal(isPlainObject(new Date()), false);
        assert.equal(isPlainObject(new Map()), false);
        assert.equal(isPlainObject(new Set()), false);
      });
    });

    describe('isCollection', () => {
      it('returns true for collections', () => {
        assert.equal(isCollection([]), true);
        assert.equal(isCollection([1, 2, 3]), true);
        assert.equal(isCollection(new Map()), true);
        assert.equal(isCollection(new Set()), true);
      });

      it('returns false for non-collections', () => {
        assert.equal(isCollection({}), false);
        assert.equal(isCollection(null), false);
        assert.equal(isCollection('string'), false);
        assert.equal(isCollection(new Date()), false);
      });
    });

    describe('isObject', () => {
      it('returns true for objects', () => {
        assert.equal(isObject({}), true);
        assert.equal(isObject([]), true);
        assert.equal(isObject(new Date()), true);
        assert.equal(isObject(new Map()), true);
        assert.equal(isObject(() => {}), true);
      });

      it('returns false for non-objects', () => {
        assert.equal(isObject(null), false);
        assert.equal(isObject(undefined), false);
        assert.equal(isObject('string'), false);
        assert.equal(isObject(42), false);
        assert.equal(isObject(true), false);
      });
    });
  });
});
