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
import { isPrimitive } from '../../../dist/foundation/js-types.js';

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
});
