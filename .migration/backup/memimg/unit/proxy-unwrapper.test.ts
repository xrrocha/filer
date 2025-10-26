/**
 * Unit tests for proxy-unwrapper.ts
 *
 * Tests deep proxy unwrapping with circular reference handling.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { deepUnwrap } from '../../../src/memimg/proxy-unwrapper.js';
import { assertDeepEqual } from '../fixtures/helpers.js';

describe('proxy-unwrapper', () => {
  describe('deepUnwrap - primitives', () => {
    it('returns primitives unchanged', () => {
      const cache = new WeakMap();
      assert.equal(deepUnwrap('hello', cache), 'hello');
      assert.equal(deepUnwrap(42, cache), 42);
      assert.equal(deepUnwrap(true, cache), true);
      assert.equal(deepUnwrap(null, cache), null);
      assert.equal(deepUnwrap(undefined, cache), undefined);
    });

    it('returns BigInt unchanged', () => {
      const cache = new WeakMap();
      const big = BigInt(100);
      assert.equal(deepUnwrap(big, cache), big);
    });

    it('returns Symbol unchanged', () => {
      const cache = new WeakMap();
      const sym = Symbol('test');
      assert.equal(deepUnwrap(sym, cache), sym);
    });
  });

  describe('deepUnwrap - proxy unwrapping', () => {
    it('unwraps proxy to target', () => {
      const target = { value: 'original' };
      const proxy = new Proxy(target, {});
      const cache = new WeakMap();
      cache.set(proxy, target);

      const result = deepUnwrap(proxy, cache);
      assert.equal(result, target);
    });

    it('returns object as-is if not a proxy', () => {
      const obj = { value: 'test' };
      const cache = new WeakMap();

      const result = deepUnwrap(obj, cache);
      // Since it's not in cache, returns unwrapped version
      assert.ok(typeof result === 'object');
    });

    it('handles nested proxies', () => {
      const target1 = { value: 'inner' };
      const target2 = { child: target1 };
      const proxy1 = new Proxy(target1, {});
      const proxy2 = new Proxy(target2, {});

      const cache = new WeakMap();
      cache.set(proxy1, target1);
      cache.set(proxy2, target2);

      const result: any = deepUnwrap(proxy2, cache);
      assert.ok(result);
    });
  });

  describe('deepUnwrap - arrays', () => {
    it('unwraps array elements', () => {
      const cache = new WeakMap();
      const arr = [1, 2, 3];

      const result = deepUnwrap(arr, cache);
      assertDeepEqual(result, [1, 2, 3]);
    });

    it('recursively unwraps nested arrays', () => {
      const cache = new WeakMap();
      const arr = [[1, 2], [3, 4]];

      const result = deepUnwrap(arr, cache);
      assertDeepEqual(result, [[1, 2], [3, 4]]);
    });

    it('unwraps proxied array elements', () => {
      const target = { value: 'test' };
      const proxy = new Proxy(target, {});
      const arr = [proxy];

      const cache = new WeakMap();
      cache.set(proxy, target);

      const result: any = deepUnwrap(arr, cache);
      assert.ok(Array.isArray(result));
      assert.equal(result[0], target);
    });
  });

  describe('deepUnwrap - objects', () => {
    it('unwraps object properties', () => {
      const cache = new WeakMap();
      const obj = { a: 1, b: 2 };

      const result = deepUnwrap(obj, cache);
      assertDeepEqual(result, { a: 1, b: 2 });
    });

    it('recursively unwraps nested objects', () => {
      const cache = new WeakMap();
      const obj = { outer: { inner: 'value' } };

      const result = deepUnwrap(obj, cache);
      assertDeepEqual(result, { outer: { inner: 'value' } });
    });

    it('unwraps proxied property values', () => {
      const target = { value: 'test' };
      const proxy = new Proxy(target, {});
      const obj = { prop: proxy };

      const cache = new WeakMap();
      cache.set(proxy, target);

      const result: any = deepUnwrap(obj, cache);
      assert.equal(result.prop, target);
    });
  });

  describe('deepUnwrap - circular references', () => {
    it('handles circular object references with seen map', () => {
      const cache = new WeakMap();
      const seen = new WeakMap();

      const obj: any = { name: 'test' };
      obj.self = obj;

      const result: any = deepUnwrap(obj, cache, seen);
      assert.ok(result);
      assert.equal(result.self, result);
    });

    it('handles circular array references', () => {
      const cache = new WeakMap();
      const seen = new WeakMap();

      const arr: any[] = [1, 2];
      arr.push(arr);

      const result: any = deepUnwrap(arr, cache, seen);
      assert.ok(Array.isArray(result));
      assert.equal(result[2], result);
    });

    it('handles complex circular graphs', () => {
      const cache = new WeakMap();
      const seen = new WeakMap();

      const a: any = { name: 'a' };
      const b: any = { name: 'b' };
      a.ref = b;
      b.ref = a;

      const result: any = deepUnwrap(a, cache, seen);
      assert.ok(result);
      assert.ok(result.ref);
      assert.equal(result.ref.ref, result);
    });
  });

  describe('deepUnwrap - mixed structures', () => {
    it('handles objects containing arrays', () => {
      const cache = new WeakMap();
      const obj = { items: [1, 2, 3] };

      const result = deepUnwrap(obj, cache);
      assertDeepEqual(result, { items: [1, 2, 3] });
    });

    it('handles arrays containing objects', () => {
      const cache = new WeakMap();
      const arr = [{ a: 1 }, { b: 2 }];

      const result = deepUnwrap(arr, cache);
      assertDeepEqual(result, [{ a: 1 }, { b: 2 }]);
    });

    it('handles deeply nested mixed structures', () => {
      const cache = new WeakMap();
      const data = {
        users: [
          { id: 1, tags: ['admin', 'user'] },
          { id: 2, tags: ['user'] }
        ]
      };

      const result = deepUnwrap(data, cache);
      assertDeepEqual(result, data);
    });
  });

  describe('deepUnwrap - edge cases', () => {
    it('handles empty objects', () => {
      const cache = new WeakMap();
      const result = deepUnwrap({}, cache);
      assertDeepEqual(result, {});
    });

    it('handles empty arrays', () => {
      const cache = new WeakMap();
      const result = deepUnwrap([], cache);
      assertDeepEqual(result, []);
    });

    it('handles objects with null prototype', () => {
      const cache = new WeakMap();
      const obj = Object.create(null);
      obj.key = 'value';

      const result = deepUnwrap(obj, cache);
      assert.ok(result);
    });

    it('preserves object identity when seen', () => {
      const cache = new WeakMap();
      const seen = new WeakMap();

      const shared = { value: 'shared' };
      const obj = { a: shared, b: shared };

      const result: any = deepUnwrap(obj, cache, seen);
      assert.ok(result.a === result.b);
    });
  });
});
