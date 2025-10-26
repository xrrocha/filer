/**
 * Unit tests for types.ts
 *
 * Tests type guards, conversion functions, and type utilities.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  toMutablePath,
  toPath,
  isSerializedReference,
  isUnresolvedReference,
  isObject,
  type Path,
  type MutablePath,
} from '../../../src/memimg/types.js';
import { assertDeepEqual } from '../fixtures/helpers.js';

describe('types', () => {
  describe('Path conversion functions', () => {
    describe('toMutablePath', () => {
      it('converts immutable Path to mutable array', () => {
        const immutable: Path = ['a', 'b', 'c'];
        const mutable = toMutablePath(immutable);

        assert.ok(Array.isArray(mutable));
        assertDeepEqual(mutable, ['a', 'b', 'c']);
      });

      it('returns new array instance', () => {
        const immutable: Path = ['x', 'y'];
        const mutable = toMutablePath(immutable);

        assert.notEqual(mutable, immutable);
      });

      it('handles empty path', () => {
        const mutable = toMutablePath([]);
        assertDeepEqual(mutable, []);
      });

      it('handles single-segment path', () => {
        const mutable = toMutablePath(['root']);
        assertDeepEqual(mutable, ['root']);
      });

      it('creates independent copy', () => {
        const immutable: Path = ['a', 'b'];
        const mutable = toMutablePath(immutable);
        mutable.push('c');

        assert.equal(immutable.length, 2);
        assert.equal(mutable.length, 3);
      });
    });

    describe('toPath', () => {
      it('converts mutable array to immutable Path', () => {
        const mutable: MutablePath = ['a', 'b', 'c'];
        const immutable = toPath(mutable);

        assertDeepEqual(immutable, ['a', 'b', 'c']);
      });

      it('returns same reference (no copy)', () => {
        const mutable: MutablePath = ['x', 'y'];
        const immutable = toPath(mutable);

        // toPath just returns the array as-is (readonly cast)
        assert.equal(immutable as any, mutable);
      });

      it('handles empty array', () => {
        const immutable = toPath([]);
        assertDeepEqual(immutable, []);
      });

      it('handles single-segment array', () => {
        const immutable = toPath(['root']);
        assertDeepEqual(immutable, ['root']);
      });
    });

    describe('roundtrip conversion', () => {
      it('Path -> MutablePath -> Path preserves content', () => {
        const original: Path = ['a', 'b', 'c'];
        const mutable = toMutablePath(original);
        const restored = toPath(mutable);

        assertDeepEqual(restored, original);
      });

      it('handles deep paths', () => {
        const deep: Path = ['level1', 'level2', 'level3', 'level4', 'level5'];
        const mutable = toMutablePath(deep);
        const restored = toPath(mutable);

        assertDeepEqual(restored, deep);
      });
    });
  });

  describe('isSerializedReference', () => {
    it('returns true for valid reference objects', () => {
      const ref = {
        __type__: 'ref',
        path: ['a', 'b'],
      };

      assert.equal(isSerializedReference(ref), true);
    });

    it('returns false for objects without __type__', () => {
      const obj = { path: ['a', 'b'] };
      assert.equal(isSerializedReference(obj), false);
    });

    it('returns false for objects with wrong __type__', () => {
      const obj = {
        __type__: 'function',
        path: ['a', 'b'],
      };

      assert.equal(isSerializedReference(obj), false);
    });

    it('returns false for null', () => {
      assert.equal(isSerializedReference(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isSerializedReference(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isSerializedReference('string'), false);
      assert.equal(isSerializedReference(42), false);
      assert.equal(isSerializedReference(true), false);
    });

    it('returns false for arrays', () => {
      assert.equal(isSerializedReference([]), false);
    });

    it('returns true for ref with empty path', () => {
      const ref = {
        __type__: 'ref',
        path: [],
      };

      assert.equal(isSerializedReference(ref), true);
    });

    it('returns false for objects missing path property', () => {
      const obj = { __type__: 'ref' };
      assert.equal(isSerializedReference(obj), false);
    });
  });

  describe('isUnresolvedReference', () => {
    it('returns true for unresolved reference markers', () => {
      const unresolved = {
        __isUnresolved: true,
        path: ['a', 'b'],
      };

      assert.equal(isUnresolvedReference(unresolved), true);
    });

    it('returns false for objects without __isUnresolved', () => {
      const obj = { path: ['a', 'b'] };
      assert.equal(isUnresolvedReference(obj), false);
    });

    it('returns false for objects with __isUnresolved false', () => {
      const obj = {
        __isUnresolved: false,
        path: ['a', 'b'],
      };

      assert.equal(isUnresolvedReference(obj), false);
    });

    it('returns false for null', () => {
      assert.equal(isUnresolvedReference(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isUnresolvedReference(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isUnresolvedReference('string'), false);
      assert.equal(isUnresolvedReference(42), false);
    });

    it('returns true even without path property', () => {
      const unresolved = { __isUnresolved: true };
      assert.equal(isUnresolvedReference(unresolved), true);
    });
  });

  describe('isObject', () => {
    it('returns true for plain objects', () => {
      assert.equal(isObject({}), true);
      assert.equal(isObject({ key: 'value' }), true);
    });

    it('returns true for arrays', () => {
      assert.equal(isObject([]), true);
      assert.equal(isObject([1, 2, 3]), true);
    });

    it('returns true for Date objects', () => {
      assert.equal(isObject(new Date()), true);
    });

    it('returns true for Map and Set', () => {
      assert.equal(isObject(new Map()), true);
      assert.equal(isObject(new Set()), true);
    });

    it('returns false for functions', () => {
      assert.equal(isObject(() => {}), false);
      assert.equal(isObject(function() {}), false);
    });

    it('returns false for null', () => {
      assert.equal(isObject(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isObject(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isObject('string'), false);
      assert.equal(isObject(42), false);
      assert.equal(isObject(true), false);
      assert.equal(isObject(false), false);
    });

    it('returns false for BigInt', () => {
      assert.equal(isObject(BigInt(100)), false);
    });

    it('returns false for Symbol', () => {
      assert.equal(isObject(Symbol('test')), false);
    });

    it('returns true for Object.create(null)', () => {
      assert.equal(isObject(Object.create(null)), true);
    });

    it('returns true for custom class instances', () => {
      class CustomClass {}
      assert.equal(isObject(new CustomClass()), true);
    });
  });
});
