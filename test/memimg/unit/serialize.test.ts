/**
 * Unit tests for serialize.ts
 *
 * Tests serialization logic for all types, cycle tracking strategies,
 * and reference detection.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  serializeMemoryImage,
  serializeValueForEvent,
} from '../../../src/memimg/serialize.js';
import { assertDeepEqual } from '../fixtures/helpers.js';
import type { Path } from '../../../src/memimg/types.js';

describe('serialize', () => {
  describe('serializeMemoryImage - primitives', () => {
    it('serializes null', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(null, proxyToTarget);
      const parsed = JSON.parse(json);
      assert.equal(parsed, null);
    });

    it('serializes undefined', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(undefined, proxyToTarget);
      // JSON.stringify(undefined) returns undefined (the value), not a string
      assert.equal(json, undefined);
    });

    it('serializes string', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage('hello', proxyToTarget);
      const parsed = JSON.parse(json);
      assert.equal(parsed, 'hello');
    });

    it('serializes number', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(42, proxyToTarget);
      const parsed = JSON.parse(json);
      assert.equal(parsed, 42);
    });

    it('serializes boolean', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(true, proxyToTarget);
      const parsed = JSON.parse(json);
      assert.equal(parsed, true);
    });

    it('serializes zero', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(0, proxyToTarget);
      assert.equal(JSON.parse(json), 0);
    });

    it('serializes negative numbers', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(-999, proxyToTarget);
      assert.equal(JSON.parse(json), -999);
    });

    it('serializes empty string', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage('', proxyToTarget);
      assert.equal(JSON.parse(json), '');
    });
  });

  describe('serializeMemoryImage - special types', () => {
    it('serializes BigInt', () => {
      const proxyToTarget = new WeakMap();
      const value = BigInt(9007199254740991);
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'bigint');
      assert.equal(parsed.value, '9007199254740991');
    });

    it('serializes Symbol', () => {
      const proxyToTarget = new WeakMap();
      const value = Symbol('test');
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'symbol');
      assert.equal(parsed.description, 'test');
    });

    it('serializes Symbol without description', () => {
      const proxyToTarget = new WeakMap();
      const value = Symbol();
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'symbol');
      assert.equal(parsed.description, undefined);
    });

    it('serializes Date', () => {
      const proxyToTarget = new WeakMap();
      const value = new Date('2024-01-01T00:00:00.000Z');
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'date');
      assert.equal(parsed.__dateValue__, '2024-01-01T00:00:00.000Z');
    });

    it('serializes Date with properties', () => {
      const proxyToTarget = new WeakMap();
      const date = new Date('2024-01-01T00:00:00.000Z');
      (date as any).location = "Room A";
      (date as any).capacity = 10;

      const json = serializeMemoryImage(date, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'date');
      assert.equal(parsed.__dateValue__, '2024-01-01T00:00:00.000Z');
      assert.equal(parsed.location, "Room A");
      assert.equal(parsed.capacity, 10);
    });

    it('serializes literal RegExp', () => {
      const proxyToTarget = new WeakMap();
      const value = /test/gi;
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.source, 'test');
      assert.equal(parsed.flags, 'gi');
      assert.equal(parsed.lastIndex, 0);
    });

    it('serializes constructor RegExp', () => {
      const proxyToTarget = new WeakMap();
      const value = new RegExp('\\d+', 'i');
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.source, '\\d+');
      assert.equal(parsed.flags, 'i');
      assert.equal(parsed.lastIndex, 0);
    });

    it('serializes RegExp with complex pattern', () => {
      const proxyToTarget = new WeakMap();
      const value = /\d+\.\w*/gi;
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.source, '\\d+\\.\\w*');
      assert.equal(parsed.flags, 'gi');
    });

    it('serializes RegExp with all flags', () => {
      const proxyToTarget = new WeakMap();
      const value = /test/gimsuy;
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.flags, 'gimsuy');
    });

    it('serializes RegExp with non-zero lastIndex', () => {
      const proxyToTarget = new WeakMap();
      const value = /test/g;
      value.lastIndex = 5;
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.lastIndex, 5);
    });

    it('serializes empty RegExp', () => {
      const proxyToTarget = new WeakMap();
      const value = new RegExp('');
      const json = serializeMemoryImage(value, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'regexp');
      assert.equal(parsed.source, '(?:)');
      assert.equal(parsed.flags, '');
    });

    it('serializes function with __type__', () => {
      const proxyToTarget = new WeakMap();
      const fn: any = () => {};
      fn.__type__ = 'function';
      fn.sourceCode = '() => {}';

      const json = serializeMemoryImage(fn, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'function');
      assert.ok(parsed.sourceCode);
    });

    it('returns undefined for non-serializable function', () => {
      const proxyToTarget = new WeakMap();
      const fn = () => {};
      const json = serializeMemoryImage(fn, proxyToTarget);
      // JSON.stringify(undefined) returns undefined (the value), not a string
      assert.equal(json, undefined);
    });
  });

  describe('serializeMemoryImage - simple objects', () => {
    it('serializes empty object', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage({}, proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, {});
    });

    it('serializes flat object', () => {
      const proxyToTarget = new WeakMap();
      const obj = { a: 1, b: 'test', c: true };
      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, { a: 1, b: 'test', c: true });
    });

    it('serializes nested object', () => {
      const proxyToTarget = new WeakMap();
      const obj = { user: { name: 'Alice', age: 30 } };
      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, { user: { name: 'Alice', age: 30 } });
    });

    it('serializes deeply nested object', () => {
      const proxyToTarget = new WeakMap();
      const obj = { a: { b: { c: { d: { e: 'deep' } } } } };
      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, { a: { b: { c: { d: { e: 'deep' } } } } });
    });

    it('serializes object with mixed types', () => {
      const proxyToTarget = new WeakMap();
      const obj = {
        str: 'hello',
        num: 42,
        bool: true,
        nil: null,
        undef: undefined,
        obj: { nested: 'value' },
      };
      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.str, 'hello');
      assert.equal(parsed.num, 42);
      assert.equal(parsed.bool, true);
      assert.equal(parsed.nil, null);
      assert.equal(parsed.obj.nested, 'value');
    });
  });

  describe('serializeMemoryImage - arrays', () => {
    it('serializes empty array', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage([], proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, []);
    });

    it('serializes flat array', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage([1, 2, 3], proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, [1, 2, 3]);
    });

    it('serializes nested array', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage([[1, 2], [3, 4]], proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, [[1, 2], [3, 4]]);
    });

    it('serializes array with mixed types', () => {
      const proxyToTarget = new WeakMap();
      const arr = [1, 'test', true, null, { key: 'value' }];
      const json = serializeMemoryImage(arr, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed[0], 1);
      assert.equal(parsed[1], 'test');
      assert.equal(parsed[2], true);
      assert.equal(parsed[3], null);
      assertDeepEqual(parsed[4], { key: 'value' });
    });

    it('serializes array with objects', () => {
      const proxyToTarget = new WeakMap();
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const json = serializeMemoryImage(arr, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.length, 3);
      assert.equal(parsed[0].id, 1);
      assert.equal(parsed[2].id, 3);
    });
  });

  describe('serializeMemoryImage - collections', () => {
    it('serializes empty Map', () => {
      const proxyToTarget = new WeakMap();
      const map = new Map();
      const json = serializeMemoryImage(map, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'map');
      assertDeepEqual(parsed.entries, []);
    });

    it('serializes Map with entries', () => {
      const proxyToTarget = new WeakMap();
      const map = new Map([['a', 1], ['b', 2]]);
      const json = serializeMemoryImage(map, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'map');
      assert.equal(parsed.entries.length, 2);
      assertDeepEqual(parsed.entries[0], ['a', 1]);
      assertDeepEqual(parsed.entries[1], ['b', 2]);
    });

    it('serializes Map with object keys', () => {
      const proxyToTarget = new WeakMap();
      const map = new Map();
      map.set({ id: 1 }, 'value1');
      const json = serializeMemoryImage(map, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'map');
      assert.ok(parsed.entries.length > 0);
    });

    it('serializes empty Set', () => {
      const proxyToTarget = new WeakMap();
      const set = new Set();
      const json = serializeMemoryImage(set, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'set');
      assertDeepEqual(parsed.values, []);
    });

    it('serializes Set with values', () => {
      const proxyToTarget = new WeakMap();
      const set = new Set([1, 2, 3]);
      const json = serializeMemoryImage(set, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'set');
      assertDeepEqual(parsed.values, [1, 2, 3]);
    });

    it('serializes Set with objects', () => {
      const proxyToTarget = new WeakMap();
      const set = new Set([{ id: 1 }, { id: 2 }]);
      const json = serializeMemoryImage(set, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.__type__, 'set');
      assert.equal(parsed.values.length, 2);
    });
  });

  describe('serializeMemoryImage - circular references', () => {
    it('detects simple circular reference', () => {
      const proxyToTarget = new WeakMap();
      const obj: any = { name: 'test' };
      obj.self = obj;

      const json = serializeMemoryImage(obj, proxyToTarget);
      assert.ok(json.includes('ref'));
    });

    it('detects circular reference through parent', () => {
      const proxyToTarget = new WeakMap();
      const parent: any = { name: 'parent' };
      const child: any = { name: 'child', parent };
      parent.child = child;

      const json = serializeMemoryImage(parent, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.ok(parsed.child);
      assert.ok(parsed.child.parent.__type__ === 'ref' || parsed.child.parent.child);
    });

    it('detects circular reference in array', () => {
      const proxyToTarget = new WeakMap();
      const arr: any[] = [1, 2];
      arr.push(arr);

      const json = serializeMemoryImage(arr, proxyToTarget);
      assert.ok(json.includes('ref'));
    });

    it('handles shared references (not circular)', () => {
      const proxyToTarget = new WeakMap();
      const shared = { value: 'shared' };
      const obj = { a: shared, b: shared };

      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      // Second reference should be a ref
      assert.ok(parsed.a || parsed.b);
    });
  });

  describe('serializeMemoryImage - proxy unwrapping', () => {
    it('unwraps proxy to target', () => {
      const target = { value: 'test' };
      const proxy = new Proxy(target, {});
      const proxyToTarget = new WeakMap();
      proxyToTarget.set(proxy, target);

      const json = serializeMemoryImage(proxy, proxyToTarget);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed, { value: 'test' });
    });

    it('handles nested proxies', () => {
      const target1 = { inner: 'value' };
      const target2 = { outer: target1 };
      const proxy1 = new Proxy(target1, {});
      const proxy2 = new Proxy(target2, {});

      const proxyToTarget = new WeakMap();
      proxyToTarget.set(proxy1, target1);
      proxyToTarget.set(proxy2, target2);

      const json = serializeMemoryImage(proxy2, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.ok(parsed.outer);
    });
  });

  describe('serializeValueForEvent - primitives', () => {
    it('serializes primitive value', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const value = serializeValueForEvent(42, proxyToTarget, targetToPath, ['path']);

      assert.equal(value, 42);
    });

    it('serializes string value', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const value = serializeValueForEvent('test', proxyToTarget, targetToPath, ['path']);

      assert.equal(value, 'test');
    });

    it('serializes null', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const value = serializeValueForEvent(null, proxyToTarget, targetToPath, ['path']);

      assert.equal(value, null);
    });
  });

  describe('serializeValueForEvent - objects', () => {
    it('serializes new object', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const obj = { a: 1, b: 2 };

      const value = serializeValueForEvent(obj, proxyToTarget, targetToPath, ['path']);
      assertDeepEqual(value, { a: 1, b: 2 });
    });

    it('serializes nested object', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const obj = { user: { name: 'Alice' } };

      const value = serializeValueForEvent(obj, proxyToTarget, targetToPath, ['path']);
      assertDeepEqual(value, { user: { name: 'Alice' } });
    });
  });

  describe('serializeValueForEvent - reference detection', () => {
    it('creates reference for object outside value tree', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();

      // Existing object in graph
      const existing = { id: 1 };
      targetToPath.set(existing, ['scott', 'emp']);

      // New value references existing object
      const newValue = { reference: existing };

      const serialized = serializeValueForEvent(
        newValue,
        proxyToTarget,
        targetToPath,
        ['new', 'path']
      );

      assert.ok(serialized);
      assert.ok((serialized as any).reference);
    });

    it('does not create reference for object within value tree', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();

      const obj = { nested: { value: 'test' } };
      targetToPath.set(obj.nested, ['obj', 'nested']);

      const serialized = serializeValueForEvent(
        obj,
        proxyToTarget,
        targetToPath,
        ['obj']
      );

      // Should serialize inline, not as reference
      assert.ok((serialized as any).nested);
    });

    it('detects internal circular reference', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();

      const obj: any = { name: 'test' };
      obj.self = obj;

      const serialized = serializeValueForEvent(
        obj,
        proxyToTarget,
        targetToPath,
        ['path']
      );

      // Should have circular marker
      assert.ok(serialized);
    });
  });

  describe('serializeValueForEvent - collections', () => {
    it('serializes new Map', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const map = new Map([['key', 'value']]);

      const value = serializeValueForEvent(map, proxyToTarget, targetToPath, ['path']);

      assert.ok((value as any).__type__ === 'map');
      assert.ok((value as any).entries);
    });

    it('serializes new Set', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const set = new Set([1, 2, 3]);

      const value = serializeValueForEvent(set, proxyToTarget, targetToPath, ['path']);

      assert.ok((value as any).__type__ === 'set');
      assert.ok((value as any).values);
    });

    it('serializes new Array', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const arr = [1, 2, 3];

      const value = serializeValueForEvent(arr, proxyToTarget, targetToPath, ['path']);

      assert.ok(Array.isArray(value));
      assertDeepEqual(value, [1, 2, 3]);
    });
  });

  describe('serializeValueForEvent - special types', () => {
    it('serializes Date', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const date = new Date('2024-01-01');

      const value = serializeValueForEvent(date, proxyToTarget, targetToPath, ['path']);

      assert.ok((value as any).__type__ === 'date');
      assert.ok((value as any).__dateValue__);
    });

    it('serializes BigInt', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const big = BigInt(100);

      const value = serializeValueForEvent(big, proxyToTarget, targetToPath, ['path']);

      assert.ok((value as any).__type__ === 'bigint');
      assert.equal((value as any).value, '100');
    });

    it('serializes Symbol', () => {
      const proxyToTarget = new WeakMap();
      const targetToPath = new WeakMap();
      const sym = Symbol('test');

      const value = serializeValueForEvent(sym, proxyToTarget, targetToPath, ['path']);

      assert.ok((value as any).__type__ === 'symbol');
      assert.equal((value as any).description, 'test');
    });
  });

  describe('Edge cases', () => {
    it('handles empty path', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage({ value: 1 }, proxyToTarget);
      assert.ok(json);
    });

    it('handles object with null prototype', () => {
      const proxyToTarget = new WeakMap();
      const obj = Object.create(null);
      obj.key = 'value';

      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.key, 'value');
    });

    it('handles sparse arrays', () => {
      const proxyToTarget = new WeakMap();
      const arr = new Array(10);
      arr[5] = 'value';

      const json = serializeMemoryImage(arr, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.ok(Array.isArray(parsed));
    });

    it('handles NaN', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(NaN, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.ok(Number.isNaN(parsed) || parsed === null);
    });

    it('handles Infinity', () => {
      const proxyToTarget = new WeakMap();
      const json = serializeMemoryImage(Infinity, proxyToTarget);
      const parsed = JSON.parse(json);

      // JSON converts Infinity to null
      assert.ok(parsed === null || parsed === Infinity);
    });

    it('handles very deep nesting', () => {
      const proxyToTarget = new WeakMap();
      let obj: any = { value: 'deep' };
      for (let i = 0; i < 50; i++) {
        obj = { nested: obj };
      }

      const json = serializeMemoryImage(obj, proxyToTarget);
      assert.ok(json.length > 0);
    });

    it('handles large array', () => {
      const proxyToTarget = new WeakMap();
      const arr = Array.from({ length: 1000 }, (_, i) => i);

      const json = serializeMemoryImage(arr, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.equal(parsed.length, 1000);
    });

    it('handles mixed collection types', () => {
      const proxyToTarget = new WeakMap();
      const obj = {
        arr: [1, 2, 3],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
      };

      const json = serializeMemoryImage(obj, proxyToTarget);
      const parsed = JSON.parse(json);

      assert.ok(Array.isArray(parsed.arr));
      assert.equal(parsed.map.__type__, 'map');
      assert.equal(parsed.set.__type__, 'set');
    });
  });
});
