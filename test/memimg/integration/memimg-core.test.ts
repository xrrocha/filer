/**
 * Integration tests for core memimg API
 *
 * Tests createMemoryImage, serialization, and core functionality end-to-end.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createMemoryImage,
  serializeMemoryImageToJson,
  deserializeMemoryImageFromJson,
  isMemoryImage,
  getMemoryImageMetadata,
  getMemoryImageInfrastructure,
} from '../../../src/memimg/memimg.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';
import { createScottData, createAllTypes } from '../fixtures/sample-data.js';

describe('memimg-core integration', () => {
  describe('createMemoryImage', () => {
    it('creates memory image from empty object', () => {
      const root = createMemoryImage({});
      assert.ok(root);
    });

    it('creates memory image from populated object', () => {
      const data = { name: 'Alice', age: 30 };
      const root: any = createMemoryImage(data);
      assert.equal(root.name, 'Alice');
      assert.equal(root.age, 30);
    });

    it('tracks mutations automatically with event log', () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.value = 42;
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET');
    });

    it('creates proxies for nested objects', () => {
      const root: any = createMemoryImage({ user: { name: 'Bob' } });
      assert.equal(root.user.name, 'Bob');
    });

    it('handles arrays in initial data', () => {
      const root: any = createMemoryImage({ items: [1, 2, 3] });
      assertDeepEqual(root.items, [1, 2, 3]);
    });

    it('handles Maps in initial data', () => {
      const root: any = createMemoryImage({ map: new Map([['key', 'value']]) });
      assert.equal(root.map.get('key'), 'value');
    });

    it('handles Sets in initial data', () => {
      const root: any = createMemoryImage({ set: new Set([1, 2, 3]) });
      assert.equal(root.set.has(1), true);
    });

    it('accepts metadata provider', () => {
      const metadata = {
        getDescriptor: () => 'name',
        getKeyProperty: () => 'id',
        isDisplayProperty: () => true,
        getPropertyLabel: () => null,
      };

      const root = createMemoryImage({}, { metadata });
      assert.ok(root);
    });
  });

  describe('Mutation tracking', () => {
    it('logs property assignments', () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.name = 'Alice';
      root.age = 30;

      assert.equal(eventLog.events.length, 2);
    });

    it('logs property deletions', () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ temp: 'remove' }, { eventLog });

      delete root.temp;

      const deleteEvent = eventLog.events.find((e: any) => e.type === 'DELETE');
      assert.ok(deleteEvent);
    });

    it('logs nested mutations', () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.user = {};
      root.user.name = 'Bob';

      assert.ok(eventLog.events.length >= 2);
    });

    it('logs array mutations', () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [] }, { eventLog });

      root.items.push(1, 2, 3);

      const pushEvent = eventLog.events.find((e: any) => e.type === 'ARRAY_PUSH');
      assert.ok(pushEvent);
    });
  });

  describe('Serialization', () => {
    it('serializes simple memory image', () => {
      const root = createMemoryImage({ a: 1, b: 2 });
      const json = serializeMemoryImageToJson(root);

      assert.ok(typeof json === 'string');
      const parsed = JSON.parse(json);
      assertDeepEqual(parsed, { a: 1, b: 2 });
    });

    it('serializes nested objects', () => {
      const root = createMemoryImage({ user: { name: 'Alice', age: 30 } });
      const json = serializeMemoryImageToJson(root);
      const parsed = JSON.parse(json);

      assert.equal(parsed.user.name, 'Alice');
    });

    it('serializes arrays', () => {
      const root = createMemoryImage({ items: [1, 2, 3] });
      const json = serializeMemoryImageToJson(root);
      const parsed = JSON.parse(json);

      assertDeepEqual(parsed.items, [1, 2, 3]);
    });

    it('serializes Maps', () => {
      const root = createMemoryImage({ map: new Map([['key', 'value']]) });
      const json = serializeMemoryImageToJson(root);
      const parsed = JSON.parse(json);

      assert.ok(parsed.map.__type__ === 'map');
    });

    it('serializes Sets', () => {
      const root = createMemoryImage({ set: new Set([1, 2, 3]) });
      const json = serializeMemoryImageToJson(root);
      const parsed = JSON.parse(json);

      assert.ok(parsed.set.__type__ === 'set');
    });

    it('handles circular references', () => {
      const root: any = createMemoryImage({});
      root.self = root;

      const json = serializeMemoryImageToJson(root);
      assert.ok(json.includes('ref'));
    });

    it('serializes Scott employee data', () => {
      const scottData = createScottData();
      const root = createMemoryImage(scottData);
      const json = serializeMemoryImageToJson(root);

      assert.ok(typeof json === 'string');
      assert.ok(json.length > 100);
    });
  });

  describe('Deserialization', () => {
    it('deserializes simple JSON', () => {
      const json = JSON.stringify({ a: 1, b: 2 });
      const result: any = deserializeMemoryImageFromJson(json);

      assert.equal(result.a, 1);
      assert.equal(result.b, 2);
    });

    it('deserializes nested objects', () => {
      const json = JSON.stringify({ user: { name: 'Alice' } });
      const result: any = deserializeMemoryImageFromJson(json);

      assert.equal(result.user.name, 'Alice');
    });

    it('deserializes arrays', () => {
      const json = JSON.stringify({ items: [1, 2, 3] });
      const result: any = deserializeMemoryImageFromJson(json);

      assertDeepEqual(result.items, [1, 2, 3]);
    });

    it('deserializes Maps', () => {
      const json = JSON.stringify({
        map: { __type__: 'map', entries: [['key', 'value']] }
      });
      const result: any = deserializeMemoryImageFromJson(json);

      assert.ok(result.map instanceof Map);
      assert.equal(result.map.get('key'), 'value');
    });

    it('deserializes Sets', () => {
      const json = JSON.stringify({
        set: { __type__: 'set', values: [1, 2, 3] }
      });
      const result: any = deserializeMemoryImageFromJson(json);

      assert.ok(result.set instanceof Set);
      assert.ok(result.set.has(1));
    });

    it('deserializes Dates', () => {
      const date = new Date('2024-01-01');
      const json = JSON.stringify({
        date: { __type__: 'date', value: date.toISOString() }
      });
      const result: any = deserializeMemoryImageFromJson(json);

      assert.ok(result.date instanceof Date);
    });
  });

  describe('Serialization roundtrip', () => {
    it('preserves simple data', () => {
      const original = { a: 1, b: 'test', c: true };
      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('preserves nested structures', () => {
      const original = { user: { profile: { name: 'Alice', age: 30 } } };
      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('preserves arrays', () => {
      const original = { items: [1, 2, [3, 4], { nested: true }] };
      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('preserves all JavaScript types', () => {
      const allTypes = createAllTypes();
      const root = createMemoryImage(allTypes as any);
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.string, allTypes.string);
      assert.equal(restored.number, allTypes.number);
      assert.equal(restored.boolean, allTypes.boolean);
    });
  });

  describe('isMemoryImage', () => {
    it('returns true for memory image', () => {
      const root = createMemoryImage({});
      assert.equal(isMemoryImage(root), true);
    });

    it('returns false for plain object', () => {
      const obj = {};
      assert.equal(isMemoryImage(obj), false);
    });

    it('returns false for null', () => {
      assert.equal(isMemoryImage(null), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isMemoryImage('string'), false);
      assert.equal(isMemoryImage(42), false);
    });
  });

  describe('getMemoryImageMetadata', () => {
    it('returns custom metadata provider', () => {
      const customMetadata = {
        getDescriptor: () => 'name',
        getKeyProperty: () => 'id',
        isDisplayProperty: () => true,
        getPropertyLabel: () => null,
      };

      const root = createMemoryImage({}, { metadata: customMetadata });
      const metadata = getMemoryImageMetadata(root);

      assert.equal(metadata.getDescriptor({}), 'name');
    });

    it('returns default metadata for memory image without custom provider', () => {
      const root = createMemoryImage({});
      const metadata = getMemoryImageMetadata(root);

      assert.ok(metadata);
      assert.equal(typeof metadata.getDescriptor, 'function');
    });
  });

  describe('getMemoryImageInfrastructure', () => {
    it('returns infrastructure for memory image', () => {
      const root = createMemoryImage({});
      const infrastructure = getMemoryImageInfrastructure(root);

      assert.ok(infrastructure);
      assert.ok(infrastructure.targetToProxy instanceof WeakMap);
      assert.ok(infrastructure.proxyToTarget instanceof WeakMap);
      assert.ok(infrastructure.targetToPath instanceof WeakMap);
    });

    it('returns null for non-memory image', () => {
      const obj = {};
      const infrastructure = getMemoryImageInfrastructure(obj);

      assert.equal(infrastructure, null);
    });
  });
});
