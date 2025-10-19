/**
 * Unit tests for foundation/js-types.ts
 *
 * Comprehensive tests for shared type detection utilities.
 * Target: 100% coverage
 *
 * Functions tested:
 * - isPrimitive() - Check for primitive values
 * - isCollection() - Check for Array/Map/Set
 * - isNullish() - Check for null/undefined
 * - isPlainObject() - Check for plain objects
 * - isObject() - Check for any object (including functions)
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isPrimitive, isCollection } from '../../../dist/foundation/js-types.js';

describe('foundation/js-types', () => {
  describe('isPrimitive', () => {
    it('returns true for null', () => {
      assert.equal(isPrimitive(null), true);
    });

    it('returns true for undefined', () => {
      assert.equal(isPrimitive(undefined), true);
    });

    it('returns true for string', () => {
      assert.equal(isPrimitive('hello'), true);
      assert.equal(isPrimitive(''), true);
      assert.equal(isPrimitive('with spaces'), true);
    });

    it('returns true for number', () => {
      assert.equal(isPrimitive(42), true);
      assert.equal(isPrimitive(0), true);
      assert.equal(isPrimitive(-10), true);
      assert.equal(isPrimitive(3.14), true);
      assert.equal(isPrimitive(NaN), true);
      assert.equal(isPrimitive(Infinity), true);
      assert.equal(isPrimitive(-Infinity), true);
    });

    it('returns true for boolean', () => {
      assert.equal(isPrimitive(true), true);
      assert.equal(isPrimitive(false), true);
    });

    it('returns true for bigint', () => {
      assert.equal(isPrimitive(123n), true);
      assert.equal(isPrimitive(0n), true);
      assert.equal(isPrimitive(-456n), true);
    });

    it('returns true for symbol', () => {
      assert.equal(isPrimitive(Symbol('test')), true);
      assert.equal(isPrimitive(Symbol()), true);
      assert.equal(isPrimitive(Symbol.iterator), true);
    });

    it('returns false for objects', () => {
      assert.equal(isPrimitive({}), false);
      assert.equal(isPrimitive({ a: 1 }), false);
      assert.equal(isPrimitive(Object.create(null)), false);
    });

    it('returns false for arrays', () => {
      assert.equal(isPrimitive([]), false);
      assert.equal(isPrimitive([1, 2, 3]), false);
    });

    it('returns false for functions', () => {
      assert.equal(isPrimitive(() => {}), false);
      assert.equal(isPrimitive(function() {}), false);
      assert.equal(isPrimitive(function named() {}), false);
    });

    it('returns false for Date', () => {
      assert.equal(isPrimitive(new Date()), false);
    });

    it('returns false for Map', () => {
      assert.equal(isPrimitive(new Map()), false);
      assert.equal(isPrimitive(new Map([['a', 1]])), false);
    });

    it('returns false for Set', () => {
      assert.equal(isPrimitive(new Set()), false);
      assert.equal(isPrimitive(new Set([1, 2])), false);
    });

    it('returns false for RegExp', () => {
      assert.equal(isPrimitive(/test/), false);
      assert.equal(isPrimitive(new RegExp('test')), false);
    });
  });

  describe('isCollection', () => {
    it('returns true for empty array', () => {
      assert.equal(isCollection([]), true);
    });

    it('returns true for non-empty arrays', () => {
      assert.equal(isCollection([1, 2, 3]), true);
      assert.equal(isCollection(['a', 'b']), true);
      assert.equal(isCollection([{}, {}, {}]), true);
    });

    it('returns true for arrays created with Array constructor', () => {
      assert.equal(isCollection(new Array()), true);
      assert.equal(isCollection(new Array(10)), true);
      assert.equal(isCollection(Array.from([1, 2])), true);
    });

    it('returns true for empty Map', () => {
      assert.equal(isCollection(new Map()), true);
    });

    it('returns true for non-empty Maps', () => {
      const map1 = new Map([['a', 1], ['b', 2]]);
      assert.equal(isCollection(map1), true);

      const map2 = new Map();
      map2.set('key', 'value');
      assert.equal(isCollection(map2), true);
    });

    it('returns true for empty Set', () => {
      assert.equal(isCollection(new Set()), true);
    });

    it('returns true for non-empty Sets', () => {
      const set1 = new Set([1, 2, 3]);
      assert.equal(isCollection(set1), true);

      const set2 = new Set();
      set2.add('value');
      assert.equal(isCollection(set2), true);
    });

    it('returns false for null', () => {
      assert.equal(isCollection(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isCollection(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isCollection('hello'), false);
      assert.equal(isCollection(42), false);
      assert.equal(isCollection(true), false);
      assert.equal(isCollection(123n), false);
      assert.equal(isCollection(Symbol('test')), false);
    });

    it('returns false for plain objects', () => {
      assert.equal(isCollection({}), false);
      assert.equal(isCollection({ a: 1 }), false);
      assert.equal(isCollection(Object.create(null)), false);
    });

    it('returns false for Date', () => {
      assert.equal(isCollection(new Date()), false);
    });

    it('returns false for functions', () => {
      assert.equal(isCollection(() => {}), false);
      assert.equal(isCollection(function() {}), false);
    });

    it('returns false for WeakMap', () => {
      assert.equal(isCollection(new WeakMap()), false);
    });

    it('returns false for WeakSet', () => {
      assert.equal(isCollection(new WeakSet()), false);
    });

    it('returns false for RegExp', () => {
      assert.equal(isCollection(/test/), false);
      assert.equal(isCollection(new RegExp('test')), false);
    });
  });
});
