/**
 * Integration tests for edge cases and stress tests
 *
 * Tests unusual scenarios, boundary conditions, and robustness.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createMemoryImage,
  serializeMemoryImageToJson,
  deserializeMemoryImageFromJson,
} from '../../../src/memimg/memimg.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';
import { replayFromEventLog } from '../../../src/memimg/replay.js';

describe('edge-cases integration', () => {
  describe('Empty and minimal values', () => {
    it('handles empty object', () => {
      const root = createMemoryImage({});

      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, {});
    });

    it('handles empty arrays', () => {
      const root: any = createMemoryImage({ arr: [] });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored.arr, []);
    });

    it('handles empty collections', () => {
      const root = createMemoryImage({
        map: new Map(),
        set: new Set()
      });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.map instanceof Map);
      assert.ok(restored.set instanceof Set);
      assert.equal(restored.map.size, 0);
      assert.equal(restored.set.size, 0);
    });

    it('handles empty strings', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.empty = '';

      assert.equal(root.empty, '');
    });

    it('handles zero values', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.zero = 0;
      root.bigZero = BigInt(0);

      assert.equal(root.zero, 0);
      assert.equal(root.bigZero, BigInt(0));
    });
  });

  describe('Null and undefined', () => {
    it('handles null values', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.nullable = null;

      assert.equal(root.nullable, null);
    });

    it('handles undefined values', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.optional = undefined;

      assert.equal(root.optional, undefined);
    });

    it('distinguishes null from undefined', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.nullValue = null;
      root.undefinedValue = undefined;

      assert.equal(root.nullValue, null);
      assert.equal(root.undefinedValue, undefined);
      assert.notEqual(root.nullValue, root.undefinedValue);
    });

    it('handles setting property to null', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ value: 'something' }, { eventLog });

      root.value = null;

      assert.equal(root.value, null);
    });
  });

  describe('Special numeric values', () => {
    it('handles NaN', () => {
      const root: any = createMemoryImage({ nan: NaN });

      assert.ok(Number.isNaN(root.nan));
    });

    it('handles Infinity', () => {
      const root: any = createMemoryImage({
        posInf: Infinity,
        negInf: -Infinity
      });

      assert.equal(root.posInf, Infinity);
      assert.equal(root.negInf, -Infinity);
    });

    it('handles very large numbers', () => {
      const root: any = createMemoryImage({
        large: Number.MAX_SAFE_INTEGER,
        larger: BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2)
      });

      assert.equal(root.large, Number.MAX_SAFE_INTEGER);
      assert.ok(root.larger > BigInt(Number.MAX_SAFE_INTEGER));
    });

    it('handles very small numbers', () => {
      const root: any = createMemoryImage({
        small: Number.MIN_SAFE_INTEGER,
        tiny: Number.EPSILON
      });

      assert.equal(root.small, Number.MIN_SAFE_INTEGER);
      assert.equal(root.tiny, Number.EPSILON);
    });
  });

  describe('Deep nesting', () => {
    it('handles deeply nested objects', () => {
      let nested: any = { value: 'deep' };
      for (let i = 0; i < 100; i++) {
        nested = { level: i, nested };
      }

      const root = createMemoryImage(nested);
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assert.ok(restored);
    });

    it('handles deeply nested arrays', () => {
      let nested: any = ['value'];
      for (let i = 0; i < 50; i++) {
        nested = [nested];
      }

      const root = createMemoryImage({ arr: nested });
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assert.ok(restored);
    });

    it('handles deeply nested mutations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        a: { b: { c: { d: { e: { f: {} } } } } }
      }, { eventLog });

      root.a.b.c.d.e.f.value = 42;

      assert.equal(root.a.b.c.d.e.f.value, 42);
      assert.ok(eventLog.events.length > 0);
    });
  });

  describe('Large data volumes', () => {
    it('handles many properties', () => {
      const large: any = {};
      for (let i = 0; i < 1000; i++) {
        large[`prop${i}`] = i;
      }

      const root = createMemoryImage(large);
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assert.equal(Object.keys(restored).length, 1000);
    });

    it('handles large arrays', () => {
      const arr = Array.from({ length: 1000 }, (_, i) => i);
      const root = createMemoryImage({ items: arr });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.items.length, 1000);
      assert.equal(restored.items[999], 999);
    });

    it('handles many events', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [] }, { eventLog });

      for (let i = 0; i < 500; i++) {
        root.items.push(i);
      }

      assert.equal(root.items.length, 500);
      assert.ok(eventLog.events.length >= 500);
    });

    it('handles large Maps', () => {
      const map = new Map();
      for (let i = 0; i < 500; i++) {
        map.set(`key${i}`, i);
      }

      const root = createMemoryImage({ map });
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.map.size, 500);
    });

    it('handles large Sets', () => {
      const set = new Set();
      for (let i = 0; i < 500; i++) {
        set.add(i);
      }

      const root = createMemoryImage({ set });
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.set.size, 500);
    });
  });

  describe('Unusual keys and properties', () => {
    it('handles numeric string keys', () => {
      const root: any = createMemoryImage({
        '0': 'zero',
        '1': 'one',
        '100': 'hundred'
      });

      assert.equal(root['0'], 'zero');
      assert.equal(root['100'], 'hundred');
    });

    it('handles keys with special characters', () => {
      const root: any = createMemoryImage({
        'key-with-dash': 'value1',
        'key.with.dots': 'value2',
        'key with spaces': 'value3'
      });

      assert.equal(root['key-with-dash'], 'value1');
      assert.equal(root['key.with.dots'], 'value2');
      assert.equal(root['key with spaces'], 'value3');
    });

    it('handles symbol properties', () => {
      const sym = Symbol('test');
      const obj = { [sym]: 'value', regular: 'prop' };
      const root: any = createMemoryImage(obj);

      assert.equal(root[sym], 'value');
      assert.equal(root.regular, 'prop');
    });

    it('handles very long property names', async () => {
      const eventLog = createMockEventLog();
      const longKey = 'a'.repeat(1000);
      const root: any = createMemoryImage({}, { eventLog });

      root[longKey] = 'value';

      assert.equal(root[longKey], 'value');
    });
  });

  describe('Rapid mutations', () => {
    it('handles rapid property changes', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ count: 0 }, { eventLog });

      for (let i = 1; i <= 100; i++) {
        root.count = i;
      }

      assert.equal(root.count, 100);
      assert.equal(eventLog.events.length, 100);
    });

    it('handles rapid array mutations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ arr: [] }, { eventLog });

      for (let i = 0; i < 50; i++) {
        root.arr.push(i);
        root.arr.pop();
      }

      assert.equal(root.arr.length, 0);
    });

    it('handles rapid collection mutations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        map: new Map(),
        set: new Set()
      }, { eventLog });

      for (let i = 0; i < 50; i++) {
        root.map.set(i, i);
        root.set.add(i);
      }

      assert.equal(root.map.size, 50);
      assert.equal(root.set.size, 50);
    });
  });

  describe('Unusual mutation patterns', () => {
    it('handles delete then set same property', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ value: 'original' }, { eventLog });

      delete root.value;
      assert.equal(root.value, undefined);

      root.value = 'new';
      assert.equal(root.value, 'new');
    });

    it('handles set then delete then set', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.temp = 'value1';
      delete root.temp;
      root.temp = 'value2';

      assert.equal(root.temp, 'value2');
    });

    it('handles replacing object with primitive', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        value: { nested: 'object' }
      }, { eventLog });

      root.value = 'primitive';

      assert.equal(root.value, 'primitive');
    });

    it('handles replacing primitive with object', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        value: 'primitive'
      }, { eventLog });

      root.value = { nested: 'object' };

      assert.equal(root.value.nested, 'object');
    });

    it('handles replacing array with map', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ coll: [] }, { eventLog });

      root.coll = new Map([['key', 'value']]);

      assert.ok(root.coll instanceof Map);
      assert.equal(root.coll.get('key'), 'value');
    });
  });

  describe('Null prototype objects', () => {
    it('handles objects with null prototype', () => {
      const obj = Object.create(null);
      obj.key = 'value';
      const root = createMemoryImage(obj);

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.key, 'value');
    });

    it('handles mutations on null prototype objects', async () => {
      const eventLog = createMockEventLog();
      const obj = Object.create(null);
      obj.initial = 'value';
      const root: any = createMemoryImage(obj, { eventLog });

      root.added = 'new';

      assert.equal(root.added, 'new');
    });
  });

  describe('Concurrent-like operations', () => {
    it('handles interleaved mutations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        a: 0,
        b: 0,
        c: 0
      }, { eventLog });

      root.a = 1;
      root.b = 1;
      root.a = 2;
      root.c = 1;
      root.b = 2;

      assert.equal(root.a, 2);
      assert.equal(root.b, 2);
      assert.equal(root.c, 1);
    });

    it('handles mutations on different paths', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        branch1: { value: 0 },
        branch2: { value: 0 }
      }, { eventLog });

      root.branch1.value = 1;
      root.branch2.value = 2;
      root.branch1.value = 3;

      assert.equal(root.branch1.value, 3);
      assert.equal(root.branch2.value, 2);
    });
  });

  describe('Type changes', () => {
    it('handles changing value types', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ value: 0 }, { eventLog });

      root.value = 'string';
      assert.equal(typeof root.value, 'string');

      root.value = true;
      assert.equal(typeof root.value, 'boolean');

      root.value = { obj: true };
      assert.equal(typeof root.value, 'object');

      root.value = [1, 2, 3];
      assert.ok(Array.isArray(root.value));
    });

    it('handles bigint to number conversions', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ value: BigInt(100) }, { eventLog });

      root.value = 50;

      assert.equal(typeof root.value, 'number');
      assert.equal(root.value, 50);
    });
  });

  describe('Memory and performance', () => {
    it('handles repeated serialization', () => {
      const root = createMemoryImage({ value: 'test' });

      for (let i = 0; i < 100; i++) {
        const json = serializeMemoryImageToJson(root);
        assert.ok(json.length > 0);
      }
    });

    it('handles repeated deserialization', () => {
      const root = createMemoryImage({ value: 'test' });
      const json = serializeMemoryImageToJson(root);

      for (let i = 0; i < 100; i++) {
        const restored = deserializeMemoryImageFromJson(json);
        assert.ok(restored);
      }
    });

    it('handles many replay cycles', async () => {
      for (let cycle = 0; cycle < 10; cycle++) {
        const eventLog = createMockEventLog();
        const root: any = createMemoryImage({}, { eventLog });

        root.cycle = cycle;

        const replayed: any = {};
        await replayFromEventLog(replayed, eventLog, { isReplaying: true });

        assert.equal(replayed.cycle, cycle);
      }
    });
  });

  describe('Boundary conditions', () => {
    it('handles maximum array length edge case', () => {
      // Not actually creating max length array (would crash)
      // but testing the pattern
      const root: any = createMemoryImage({ arr: [] });

      root.arr.length = 1000;
      assert.equal(root.arr.length, 1000);
    });

    it('handles Date at epoch', () => {
      const root = createMemoryImage({
        epoch: new Date(0)
      });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.epoch.getTime(), 0);
    });

    it('handles empty Map and Set operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        map: new Map(),
        set: new Set()
      }, { eventLog });

      const mapResult = root.map.delete('nonexistent');
      const setResult = root.set.delete('nonexistent');

      assert.equal(mapResult, false);
      assert.equal(setResult, false);
    });
  });
});
