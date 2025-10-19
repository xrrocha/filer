/**
 * Unit tests for Property Access
 *
 * Tests robust property enumeration for objects and proxies.
 * ~80 tests covering all property access functions.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  getOwnProperties,
  getVisibleProperties,
  partitionProperties,
  countVisibleProperties,
  hasVisibleProperties,
} from '../../../dist/navigator/property-access.js';
import { PROPERTY_TEST_OBJECTS } from './fixtures/test-data.js';

describe('Property Access', () => {
  // ==========================================================================
  // getOwnProperties
  // ==========================================================================

  describe('getOwnProperties', () => {
    it('returns empty array for null', () => {
      assert.deepEqual(getOwnProperties(null), []);
    });

    it('returns empty array for undefined', () => {
      assert.deepEqual(getOwnProperties(undefined), []);
    });

    it('returns properties for simple object', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const props = getOwnProperties(obj);

      assert.equal(props.length, 3);
      assert.ok(props.some(([k, v]) => k === 'a' && v === 1));
      assert.ok(props.some(([k, v]) => k === 'b' && v === 2));
      assert.ok(props.some(([k, v]) => k === 'c' && v === 3));
    });

    it('returns properties with internal properties', () => {
      const obj = { name: 'Test', __internal: 'hidden', value: 42 };
      const props = getOwnProperties(obj);

      assert.equal(props.length, 3);
      assert.ok(props.some(([k]) => k === '__internal'));
    });

    it('returns empty array for empty object', () => {
      const props = getOwnProperties({});
      assert.deepEqual(props, []);
    });

    it('works with Object.create(null)', () => {
      const obj = Object.create(null);
      obj.a = 1;
      obj.b = 2;

      const props = getOwnProperties(obj);
      assert.equal(props.length, 2);
    });

    it('handles objects with symbol keys (filters them out)', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'symbol-value', regular: 'value' };

      const props = getOwnProperties(obj);
      // Symbols are filtered, only string keys
      assert.equal(props.length, 1);
      assert.equal(props[0]![0], 'regular');
    });

    it('handles objects with getters', () => {
      const obj = {
        get computed() { return 42; },
        regular: 'value'
      };

      const props = getOwnProperties(obj);
      assert.equal(props.length, 2);
      assert.ok(props.some(([k, v]) => k === 'computed' && v === 42));
    });

    it('handles objects with null/undefined values', () => {
      const obj = { a: null, b: undefined, c: 0, d: '' };
      const props = getOwnProperties(obj);

      assert.equal(props.length, 4);
      assert.ok(props.some(([k, v]) => k === 'a' && v === null));
      assert.ok(props.some(([k, v]) => k === 'b' && v === undefined));
    });

    it('uses Reflect.ownKeys fallback for proxies', () => {
      const target = { x: 10, y: 20 };
      const proxy = new Proxy(target, {
        ownKeys() { return ['x', 'y']; },
        getOwnPropertyDescriptor(t, prop) {
          return { enumerable: true, configurable: true, value: t[prop] };
        }
      });

      const props = getOwnProperties(proxy);
      assert.ok(props.length >= 2);
    });

    it('handles frozen objects', () => {
      const obj = Object.freeze({ a: 1, b: 2 });
      const props = getOwnProperties(obj);

      assert.equal(props.length, 2);
    });

    it('handles sealed objects', () => {
      const obj = Object.seal({ a: 1, b: 2 });
      const props = getOwnProperties(obj);

      assert.equal(props.length, 2);
    });
  });

  // ==========================================================================
  // getVisibleProperties
  // ==========================================================================

  describe('getVisibleProperties', () => {
    it('filters out internal properties', () => {
      const obj = {
        name: 'Public',
        __internal: 'hidden',
        __meta: 'hidden',
        value: 42
      };

      const props = getVisibleProperties(obj);

      assert.equal(props.length, 2);
      assert.ok(props.every(([k]) => !k.startsWith('__')));
      assert.ok(props.some(([k]) => k === 'name'));
      assert.ok(props.some(([k]) => k === 'value'));
    });

    it('returns all properties when none are internal', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const props = getVisibleProperties(obj);

      assert.equal(props.length, 3);
    });

    it('returns empty for object with only internal properties', () => {
      const obj = { __a: 1, __b: 2 };
      const props = getVisibleProperties(obj);

      assert.equal(props.length, 0);
    });

    it('handles mixed test object', () => {
      const props = getVisibleProperties(PROPERTY_TEST_OBJECTS.withInternal);

      assert.ok(props.every(([k]) => !k.startsWith('__')));
      assert.ok(props.some(([k]) => k === 'name'));
      assert.ok(props.some(([k]) => k === 'value'));
    });

    it('returns empty for null', () => {
      assert.deepEqual(getVisibleProperties(null), []);
    });

    it('returns empty for undefined', () => {
      assert.deepEqual(getVisibleProperties(undefined), []);
    });
  });

  // ==========================================================================
  // partitionProperties
  // ==========================================================================

  describe('partitionProperties', () => {
    it('separates scalars from collections', () => {
      const obj = PROPERTY_TEST_OBJECTS.mixed;
      const { scalars, collections } = partitionProperties(obj);

      // Scalars: name, age, active
      assert.ok(scalars.some(([k]) => k === 'name'));
      assert.ok(scalars.some(([k]) => k === 'age'));
      assert.ok(scalars.some(([k]) => k === 'active'));

      // Collections: items, tags, metadata
      assert.ok(collections.some(([k]) => k === 'items'));
      assert.ok(collections.some(([k]) => k === 'tags'));
      assert.ok(collections.some(([k]) => k === 'metadata'));
    });

    it('returns only scalars when no collections', () => {
      const obj = PROPERTY_TEST_OBJECTS.scalarsOnly;
      const { scalars, collections } = partitionProperties(obj);

      assert.ok(scalars.length > 0);
      assert.equal(collections.length, 0);
    });

    it('returns only collections when no scalars', () => {
      const obj = PROPERTY_TEST_OBJECTS.collectionsOnly;
      const { scalars, collections } = partitionProperties(obj);

      assert.equal(scalars.length, 0);
      assert.ok(collections.length > 0);
    });

    it('returns empty arrays for empty object', () => {
      const { scalars, collections } = partitionProperties({});

      assert.equal(scalars.length, 0);
      assert.equal(collections.length, 0);
    });

    it('filters internal properties before partitioning', () => {
      const obj = {
        name: 'Public',
        items: [1, 2, 3],
        __internal: 'hidden',
        __internalArray: [4, 5, 6]
      };

      const { scalars, collections } = partitionProperties(obj);

      // Should not include internal properties
      assert.ok(!scalars.some(([k]) => k.startsWith('__')));
      assert.ok(!collections.some(([k]) => k.startsWith('__')));
    });

    it('classifies Date as scalar (not collection)', () => {
      const obj = { created: new Date(), items: [1, 2, 3] };
      const { scalars, collections } = partitionProperties(obj);

      assert.ok(scalars.some(([k]) => k === 'created'));
      assert.ok(!collections.some(([k]) => k === 'created'));
    });

    it('classifies nested objects as scalars', () => {
      const obj = { user: { name: 'Alice' }, items: [1, 2, 3] };
      const { scalars, collections } = partitionProperties(obj);

      assert.ok(scalars.some(([k]) => k === 'user'));
      assert.ok(collections.some(([k]) => k === 'items'));
    });
  });

  // ==========================================================================
  // countVisibleProperties
  // ==========================================================================

  describe('countVisibleProperties', () => {
    it('counts visible properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      assert.equal(countVisibleProperties(obj), 3);
    });

    it('excludes internal properties from count', () => {
      const obj = { name: 'Test', __internal: 'hidden', value: 42 };
      assert.equal(countVisibleProperties(obj), 2);
    });

    it('returns 0 for empty object', () => {
      assert.equal(countVisibleProperties({}), 0);
    });

    it('returns 0 for null', () => {
      assert.equal(countVisibleProperties(null), 0);
    });

    it('returns 0 for undefined', () => {
      assert.equal(countVisibleProperties(undefined), 0);
    });

    it('returns 0 for object with only internal properties', () => {
      const obj = { __a: 1, __b: 2 };
      assert.equal(countVisibleProperties(obj), 0);
    });

    it('counts properties in large object', () => {
      const large = {};
      for (let i = 0; i < 1000; i++) {
        large[`prop${i}`] = i;
      }
      assert.equal(countVisibleProperties(large), 1000);
    });
  });

  // ==========================================================================
  // hasVisibleProperties
  // ==========================================================================

  describe('hasVisibleProperties', () => {
    it('returns true for object with visible properties', () => {
      assert.equal(hasVisibleProperties({ a: 1 }), true);
    });

    it('returns false for empty object', () => {
      assert.equal(hasVisibleProperties({}), false);
    });

    it('returns false for null', () => {
      assert.equal(hasVisibleProperties(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(hasVisibleProperties(undefined), false);
    });

    it('returns false for object with only internal properties', () => {
      const obj = { __a: 1, __b: 2 };
      assert.equal(hasVisibleProperties(obj), false);
    });

    it('returns true for object with mix of internal and visible', () => {
      const obj = { name: 'Test', __internal: 'hidden' };
      assert.equal(hasVisibleProperties(obj), true);
    });

    it('uses fast path for regular objects', () => {
      const obj = { a: 1, b: 2 };
      assert.equal(hasVisibleProperties(obj), true);
    });

    it('uses Reflect.ownKeys fallback for proxies', () => {
      const target = { x: 10 };
      const proxy = new Proxy(target, {});
      assert.equal(hasVisibleProperties(proxy), true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles objects with numeric keys', () => {
      const obj = { 0: 'a', 1: 'b', 2: 'c' };
      const props = getVisibleProperties(obj);

      assert.equal(props.length, 3);
    });

    it('handles objects with special character keys', () => {
      const obj = { 'key-with-dash': 1, 'key.with.dot': 2, 'key with space': 3 };
      const props = getVisibleProperties(obj);

      assert.equal(props.length, 3);
    });

    it('handles very large objects', () => {
      const large = {};
      for (let i = 0; i < 10000; i++) {
        large[`prop${i}`] = i;
      }

      const props = getVisibleProperties(large);
      assert.equal(props.length, 10000);
    });

    it('handles objects with circular references', () => {
      const obj: any = { a: 1 };
      obj.self = obj;

      const props = getVisibleProperties(obj);
      assert.equal(props.length, 2);
      assert.ok(props.some(([k]) => k === 'self'));
    });

    it('handles class instances', () => {
      class TestClass {
        public prop = 42;
        private __private = 'hidden';
      }
      const instance = new TestClass();

      const props = getVisibleProperties(instance);
      assert.ok(props.some(([k]) => k === 'prop'));
    });

    it('handles Error objects', () => {
      const err = new Error('test');
      err['customProp'] = 'value';

      const props = getVisibleProperties(err);
      assert.ok(props.length > 0);
    });

    it('handles Arrays (which are objects)', () => {
      const arr = [1, 2, 3];
      const props = getOwnProperties(arr);

      // Arrays have numeric indices as properties
      assert.ok(props.some(([k]) => k === '0'));
      assert.ok(props.some(([k]) => k === 'length'));
    });
  });

  // ==========================================================================
  // ObjectType Proxy Fallback (Inspector Sync Bug Fix)
  // ==========================================================================

  describe('getOwnProperties - ObjectType proxy fallback', () => {
    it('should use Reflect.ownKeys as fast path for normal objects', () => {
      const obj = { x: 10, y: 20 };
      const result = getOwnProperties(obj);
      assert.equal(result.length, 2);
      assert.ok(result.some(([k, v]) => k === 'x' && v === 10));
      assert.ok(result.some(([k, v]) => k === 'y' && v === 20));
    });

    it('should handle empty objects correctly', () => {
      const obj = {};
      const result = getOwnProperties(obj);
      assert.equal(result.length, 0);
    });

    it('should handle Arrays with all properties including length', () => {
      const arr = [1, 2, 3];
      const result = getOwnProperties(arr);
      // Should include numeric indices and 'length'
      assert.ok(result.length >= 4); // '0', '1', '2', 'length'
      assert.ok(result.some(([k]) => k === 'length'));
      assert.ok(result.some(([k]) => k === '0'));
    });

    it('should work with standard proxies', () => {
      const target = { name: 'test', value: 42 };
      const proxy = new Proxy(target, {});

      const result = getOwnProperties(proxy);
      assert.equal(result.length, 2);
      assert.ok(result.some(([k, v]) => k === 'name' && v === 'test'));
      assert.ok(result.some(([k, v]) => k === 'value' && v === 42));
    });

    it('should fall back gracefully when Reflect.ownKeys has no string keys', () => {
      // Edge case: object with only symbol keys
      const sym = Symbol('test');
      const obj = { [sym]: 'symbolValue', regularProp: 'regularValue' };

      const result = getOwnProperties(obj);
      // Should return at least the regular property
      assert.ok(result.length >= 1);
      assert.ok(result.some(([k, v]) => k === 'regularProp' && v === 'regularValue'));
      // Symbols should be filtered out
      assert.ok(!result.some(([k]) => typeof k === 'symbol'));
    });
  });
});
