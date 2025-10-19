/**
 * Unit tests for Value Type Classification
 *
 * Tests classifyValue and type detection for all JavaScript types.
 * ~100 tests covering comprehensive type identification.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  classifyValue,
  ValueCategory,
  isLeafLikeObject,
} from '../../../dist/navigator/value-types.js';
import { FORMAT_TEST_VALUES } from './fixtures/test-data.js';

describe('Value Types', () => {
  // ==========================================================================
  // classifyValue - Primitives
  // ==========================================================================

  describe('classifyValue - primitives', () => {
    it('classifies null', () => {
      const info = classifyValue(null);

      assert.equal(info.category, ValueCategory.NULL);
      assert.equal(info.typeName, 'null');
      assert.equal(info.cssClass, 'value-null');
      assert.equal(info.isNavigable, false);
    });

    it('classifies undefined', () => {
      const info = classifyValue(undefined);

      assert.equal(info.category, ValueCategory.UNDEFINED);
      assert.equal(info.typeName, 'undefined');
      assert.equal(info.cssClass, 'value-undefined');
      assert.equal(info.isNavigable, false);
    });

    it('classifies string', () => {
      const info = classifyValue('hello');

      assert.equal(info.category, ValueCategory.STRING);
      assert.equal(info.typeName, 'string');
      assert.equal(info.cssClass, 'value-string');
      assert.equal(info.isNavigable, false);
    });

    it('classifies empty string', () => {
      const info = classifyValue('');

      assert.equal(info.category, ValueCategory.STRING);
      assert.equal(info.typeName, 'string');
    });

    it('classifies number', () => {
      const info = classifyValue(42);

      assert.equal(info.category, ValueCategory.NUMBER);
      assert.equal(info.typeName, 'number');
      assert.equal(info.cssClass, 'value-number');
      assert.equal(info.isNavigable, false);
    });

    it('classifies zero', () => {
      const info = classifyValue(0);
      assert.equal(info.category, ValueCategory.NUMBER);
    });

    it('classifies negative number', () => {
      const info = classifyValue(-42);
      assert.equal(info.category, ValueCategory.NUMBER);
    });

    it('classifies float', () => {
      const info = classifyValue(3.14);
      assert.equal(info.category, ValueCategory.NUMBER);
    });

    it('classifies Infinity', () => {
      const info = classifyValue(Infinity);
      assert.equal(info.category, ValueCategory.NUMBER);
    });

    it('classifies NaN', () => {
      const info = classifyValue(NaN);
      assert.equal(info.category, ValueCategory.NUMBER);
    });

    it('classifies boolean true', () => {
      const info = classifyValue(true);

      assert.equal(info.category, ValueCategory.BOOLEAN);
      assert.equal(info.typeName, 'boolean');
      assert.equal(info.cssClass, 'value-boolean');
      assert.equal(info.isNavigable, false);
    });

    it('classifies boolean false', () => {
      const info = classifyValue(false);
      assert.equal(info.category, ValueCategory.BOOLEAN);
    });

    it('classifies bigint', () => {
      const info = classifyValue(BigInt(9007199254740991));

      assert.equal(info.category, ValueCategory.BIGINT);
      assert.equal(info.typeName, 'bigint');
      assert.equal(info.cssClass, 'value-bigint');
      assert.equal(info.isNavigable, false);
    });

    it('classifies symbol', () => {
      const info = classifyValue(Symbol('test'));

      assert.equal(info.category, ValueCategory.SYMBOL);
      assert.equal(info.typeName, 'symbol');
      assert.equal(info.cssClass, 'value-symbol');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // classifyValue - Special Types
  // ==========================================================================

  describe('classifyValue - special types', () => {
    it('classifies Date', () => {
      const info = classifyValue(new Date());

      assert.equal(info.category, ValueCategory.DATE);
      assert.equal(info.typeName, 'Date');
      assert.equal(info.cssClass, 'value-date');
      assert.equal(info.isNavigable, true);  // Changed: Dates can have properties now
    });

    it('classifies invalid Date', () => {
      const info = classifyValue(new Date('invalid'));
      assert.equal(info.category, ValueCategory.DATE);
    });

    it('classifies named function', () => {
      function testFunc() {}
      const info = classifyValue(testFunc);

      assert.equal(info.category, ValueCategory.FUNCTION);
      assert.equal(info.typeName, 'Function');
      assert.equal(info.cssClass, 'value-function');
      assert.equal(info.isNavigable, true);
    });

    it('classifies anonymous function', () => {
      const func = function() {};
      const info = classifyValue(func);
      assert.equal(info.category, ValueCategory.FUNCTION);
      assert.equal(info.isNavigable, true);
    });

    it('classifies arrow function', () => {
      const arrow = () => {};
      const info = classifyValue(arrow);
      assert.equal(info.category, ValueCategory.FUNCTION);
      assert.equal(info.isNavigable, true);
    });

    it('classifies class constructor', () => {
      class TestClass {}
      const info = classifyValue(TestClass);
      assert.equal(info.category, ValueCategory.FUNCTION);
    });

    it('classifies async function', () => {
      async function asyncFunc() {}
      const info = classifyValue(asyncFunc);
      assert.equal(info.category, ValueCategory.FUNCTION);
    });

    it('classifies generator function', () => {
      function* generatorFunc() { yield 1; }
      const info = classifyValue(generatorFunc);
      assert.equal(info.category, ValueCategory.FUNCTION);
    });
  });

  // ==========================================================================
  // classifyValue - Collections
  // ==========================================================================

  describe('classifyValue - collections', () => {
    it('classifies empty array', () => {
      const info = classifyValue([]);

      assert.equal(info.category, ValueCategory.ARRAY);
      assert.equal(info.typeName, 'Array');
      assert.equal(info.cssClass, 'value-array');
      assert.equal(info.isNavigable, true);
    });

    it('classifies simple array', () => {
      const info = classifyValue([1, 2, 3]);
      assert.equal(info.category, ValueCategory.ARRAY);
      assert.equal(info.isNavigable, true);
    });

    it('classifies nested array', () => {
      const info = classifyValue([[1, 2], [3, 4]]);
      assert.equal(info.category, ValueCategory.ARRAY);
    });

    it('classifies typed array as array', () => {
      const info = classifyValue(new Uint8Array([1, 2, 3]));
      // Typed arrays are objects, but should they be arrays? Depends on implementation
      // Just verify it classifies
      assert.ok(info.category);
    });

    it('classifies empty Map', () => {
      const info = classifyValue(new Map());

      assert.equal(info.category, ValueCategory.MAP);
      assert.equal(info.typeName, 'Map');
      assert.equal(info.cssClass, 'value-map');
      assert.equal(info.isNavigable, true);
    });

    it('classifies Map with entries', () => {
      const map = new Map([['key', 'value']]);
      const info = classifyValue(map);
      assert.equal(info.category, ValueCategory.MAP);
      assert.equal(info.isNavigable, true);
    });

    it('classifies empty Set', () => {
      const info = classifyValue(new Set());

      assert.equal(info.category, ValueCategory.SET);
      assert.equal(info.typeName, 'Set');
      assert.equal(info.cssClass, 'value-set');
      assert.equal(info.isNavigable, true);
    });

    it('classifies Set with values', () => {
      const set = new Set([1, 2, 3]);
      const info = classifyValue(set);
      assert.equal(info.category, ValueCategory.SET);
      assert.equal(info.isNavigable, true);
    });

    it('classifies WeakMap as object (not Map)', () => {
      const info = classifyValue(new WeakMap());
      // WeakMap is an object, not specifically categorized
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies WeakSet as object (not Set)', () => {
      const info = classifyValue(new WeakSet());
      assert.equal(info.category, ValueCategory.OBJECT);
    });
  });

  // ==========================================================================
  // classifyValue - Objects
  // ==========================================================================

  describe('classifyValue - objects', () => {
    it('classifies empty object', () => {
      const info = classifyValue({});

      assert.equal(info.category, ValueCategory.OBJECT);
      assert.equal(info.typeName, 'Object');
      assert.equal(info.cssClass, 'value-object');
      assert.equal(info.isNavigable, true);
    });

    it('classifies simple object', () => {
      const info = classifyValue({ a: 1, b: 2 });
      assert.equal(info.category, ValueCategory.OBJECT);
      assert.equal(info.isNavigable, true);
    });

    it('classifies nested object', () => {
      const info = classifyValue({ user: { name: 'Alice' } });
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies object with null prototype', () => {
      const obj = Object.create(null);
      const info = classifyValue(obj);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies class instance as object', () => {
      class TestClass {
        value = 42;
      }
      const instance = new TestClass();
      const info = classifyValue(instance);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies RegExp as object', () => {
      const info = classifyValue(/test/);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies Error as object', () => {
      const info = classifyValue(new Error('test'));
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies Promise as object', () => {
      const info = classifyValue(Promise.resolve(42));
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('classifies proxy as object', () => {
      const proxy = new Proxy({}, {});
      const info = classifyValue(proxy);
      assert.equal(info.category, ValueCategory.OBJECT);
    });
  });

  // ==========================================================================
  // isLeafLikeObject
  // ==========================================================================

  describe('isLeafLikeObject', () => {
    it('returns true for small objects (≤ 5 properties)', () => {
      assert.equal(isLeafLikeObject({ a: 1 }), true);
      assert.equal(isLeafLikeObject({ a: 1, b: 2 }), true);
      assert.equal(isLeafLikeObject({ a: 1, b: 2, c: 3 }), true);
      assert.equal(isLeafLikeObject({ a: 1, b: 2, c: 3, d: 4, e: 5 }), true);
    });

    it('returns false for large objects (> 5 properties)', () => {
      assert.equal(
        isLeafLikeObject({ a: 1, b: 2, c: 3, d: 4, e: 5, f: 6 }),
        false
      );
    });

    it('excludes internal properties (__) from count', () => {
      const obj = {
        name: 'Test',
        __internal1: 'hidden',
        __internal2: 'hidden',
        value: 42,
      };
      // Only 2 non-internal properties
      assert.equal(isLeafLikeObject(obj), true);
    });

    it('returns false for null', () => {
      assert.equal(isLeafLikeObject(null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isLeafLikeObject(undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isLeafLikeObject(42), false);
      assert.equal(isLeafLikeObject('hello'), false);
      assert.equal(isLeafLikeObject(true), false);
    });

    it('returns false for Date', () => {
      assert.equal(isLeafLikeObject(new Date()), false);
    });

    it('returns false for Array', () => {
      assert.equal(isLeafLikeObject([1, 2, 3]), false);
    });

    it('returns false for Map', () => {
      assert.equal(isLeafLikeObject(new Map()), false);
    });

    it('returns false for Set', () => {
      assert.equal(isLeafLikeObject(new Set()), false);
    });

    it('returns false for Function', () => {
      assert.equal(isLeafLikeObject(() => {}), false);
    });

    it('returns false for objects with nested objects', () => {
      const obj = {
        nested: { value: 42 },
        scalar: 'hello',
      };
      // Has nested object, so not leaf-like
      assert.equal(isLeafLikeObject(obj), false);
    });

    it('returns false for objects with arrays', () => {
      const obj = {
        items: [1, 2, 3],
        name: 'Test',
      };
      assert.equal(isLeafLikeObject(obj), false);
    });

    it('returns true for objects with only scalar properties', () => {
      const obj = {
        name: 'Alice',
        age: 30,
        active: true,
        score: 95.5,
      };
      assert.equal(isLeafLikeObject(obj), true);
    });

    it('returns true for objects with null/undefined values', () => {
      const obj = {
        name: 'Test',
        value: null,
        other: undefined,
      };
      assert.equal(isLeafLikeObject(obj), true);
    });

    it('returns true for empty object', () => {
      assert.equal(isLeafLikeObject({}), true);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles all test values from FORMAT_TEST_VALUES', () => {
      // Verify all predefined test values classify without errors
      for (const [key, value] of Object.entries(FORMAT_TEST_VALUES)) {
        const info = classifyValue(value);
        assert.ok(info.category, `Failed to classify ${key}`);
        assert.ok(info.typeName, `No type name for ${key}`);
        assert.ok(info.cssClass, `No CSS class for ${key}`);
        assert.equal(typeof info.isNavigable, 'boolean', `isNavigable not boolean for ${key}`);
      }
    });

    it('handles circular references', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      const info = classifyValue(circular);
      assert.equal(info.category, ValueCategory.OBJECT);
      assert.equal(info.isNavigable, true);
    });

    it('handles very deeply nested objects', () => {
      let deep: any = { value: 'leaf' };
      for (let i = 0; i < 100; i++) {
        deep = { nested: deep };
      }

      const info = classifyValue(deep);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('handles objects with symbol keys', () => {
      const sym = Symbol('key');
      const obj = { [sym]: 'value', regular: 'prop' };

      const info = classifyValue(obj);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('handles frozen objects', () => {
      const frozen = Object.freeze({ a: 1, b: 2 });
      const info = classifyValue(frozen);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('handles sealed objects', () => {
      const sealed = Object.seal({ a: 1, b: 2 });
      const info = classifyValue(sealed);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('handles objects with getters', () => {
      const obj = {
        get computed() {
          return 42;
        }
      };
      const info = classifyValue(obj);
      assert.equal(info.category, ValueCategory.OBJECT);
    });

    it('handles Buffer as object (Node.js)', () => {
      if (typeof Buffer !== 'undefined') {
        const buf = Buffer.from('hello');
        const info = classifyValue(buf);
        // Buffer is an object in Node.js
        assert.ok(info.category);
      }
    });
  });

  // ==========================================================================
  // Navigability
  // ==========================================================================

  describe('navigability', () => {
    it('marks primitives as non-navigable', () => {
      assert.equal(classifyValue(null).isNavigable, false);
      assert.equal(classifyValue(undefined).isNavigable, false);
      assert.equal(classifyValue(42).isNavigable, false);
      assert.equal(classifyValue('hello').isNavigable, false);
      assert.equal(classifyValue(true).isNavigable, false);
      assert.equal(classifyValue(BigInt(123)).isNavigable, false);
      assert.equal(classifyValue(Symbol('test')).isNavigable, false);
    });

    it('marks Date as navigable', () => {
      assert.equal(classifyValue(new Date()).isNavigable, true);  // Changed: Dates can have properties now
    });

    it('marks objects as navigable', () => {
      assert.equal(classifyValue({}).isNavigable, true);
      assert.equal(classifyValue({ a: 1 }).isNavigable, true);
    });

    it('marks arrays as navigable', () => {
      assert.equal(classifyValue([]).isNavigable, true);
      assert.equal(classifyValue([1, 2, 3]).isNavigable, true);
    });

    it('marks collections as navigable', () => {
      assert.equal(classifyValue(new Map()).isNavigable, true);
      assert.equal(classifyValue(new Set()).isNavigable, true);
    });

    it('marks functions as navigable', () => {
      assert.equal(classifyValue(() => {}).isNavigable, true);
      assert.equal(classifyValue(function() {}).isNavigable, true);
    });
  });
});
