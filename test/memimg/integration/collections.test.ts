/**
 * Integration tests for collection operations
 *
 * Tests Array, Map, and Set operations end-to-end with event sourcing.
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

describe('collections integration', () => {
  describe('Array operations', () => {
    it('tracks array push operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [] }, { eventLog });

      root.items.push(1, 2, 3);

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_PUSH');
      assertDeepEqual(root.items, [1, 2, 3]);
    });

    it('tracks array pop operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [1, 2, 3] }, { eventLog });

      const popped = root.items.pop();

      assert.equal(popped, 3);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_POP');
      assertDeepEqual(root.items, [1, 2]);
    });

    it('tracks array shift operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [1, 2, 3] }, { eventLog });

      const shifted = root.items.shift();

      assert.equal(shifted, 1);
      assertDeepEqual(root.items, [2, 3]);
    });

    it('tracks array unshift operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [2, 3] }, { eventLog });

      root.items.unshift(1);

      assertDeepEqual(root.items, [1, 2, 3]);
    });

    it('tracks array splice operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [1, 2, 3, 4] }, { eventLog });

      root.items.splice(1, 2, 5, 6);

      assertDeepEqual(root.items, [1, 5, 6, 4]);
      assert.equal(eventLog.events[0].type, 'ARRAY_SPLICE');
    });

    it('replays array operations correctly', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [];  // Set as mutation so it gets logged

      root.items.push(1, 2);
      root.items.push(3);
      root.items.pop();
      root.items.unshift(0);

      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assertDeepEqual(replayed.items, [0, 1, 2]);
    });

    it('handles array with object elements', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [] }, { eventLog });

      root.items.push({ id: 1, name: 'Alice' });
      root.items.push({ id: 2, name: 'Bob' });

      assert.equal(root.items.length, 2);
      assert.equal(root.items[0].name, 'Alice');
    });

    it('serializes and deserializes arrays', () => {
      const root: any = createMemoryImage({ items: [1, 2, 3, { nested: 'value' }] });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored.items, [1, 2, 3, { nested: 'value' }]);
    });

    it('handles nested arrays', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ matrix: [] }, { eventLog });

      root.matrix.push([1, 2, 3]);
      root.matrix.push([4, 5, 6]);

      assert.equal(root.matrix.length, 2);
      assertDeepEqual(root.matrix[0], [1, 2, 3]);
    });

    it('handles array sort', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [3, 1, 2] }, { eventLog });

      root.items.sort();

      assertDeepEqual(root.items, [1, 2, 3]);
      assert.equal(eventLog.events[0].type, 'ARRAY_SORT');
    });

    it('handles array reverse', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ items: [1, 2, 3] }, { eventLog });

      root.items.reverse();

      assertDeepEqual(root.items, [3, 2, 1]);
      assert.equal(eventLog.events[0].type, 'ARRAY_REVERSE');
    });
  });

  describe('Map operations', () => {
    it('tracks Map set operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ map: new Map() }, { eventLog });

      root.map.set('key1', 'value1');
      root.map.set('key2', 'value2');

      assert.equal(eventLog.events.length, 2);
      assert.equal(eventLog.events[0].type, 'MAP_SET');
      assert.equal(root.map.get('key1'), 'value1');
    });

    it('tracks Map delete operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        map: new Map([['key1', 'value1'], ['key2', 'value2']])
      }, { eventLog });

      root.map.delete('key1');

      assert.equal(root.map.has('key1'), false);
      assert.equal(eventLog.events[0].type, 'MAP_DELETE');
    });

    it('tracks Map clear operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        map: new Map([['key1', 'value1'], ['key2', 'value2']])
      }, { eventLog });

      root.map.clear();

      assert.equal(root.map.size, 0);
      assert.equal(eventLog.events[0].type, 'MAP_CLEAR');
    });

    it('replays Map operations correctly', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.map = new Map();  // Set as mutation so it gets logged

      root.map.set('a', 1);
      root.map.set('b', 2);
      root.map.delete('a');

      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.map.has('a'), false);
      assert.equal(replayed.map.get('b'), 2);
    });

    it('handles Map with object values', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ map: new Map() }, { eventLog });

      root.map.set('user1', { name: 'Alice', age: 30 });
      root.map.set('user2', { name: 'Bob', age: 25 });

      const user1 = root.map.get('user1');
      assert.equal(user1.name, 'Alice');
    });

    it('handles Map with object keys', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ map: new Map() }, { eventLog });

      const key1 = { id: 1 };
      const key2 = { id: 2 };
      root.map.set(key1, 'value1');
      root.map.set(key2, 'value2');

      assert.equal(root.map.get(key1), 'value1');
      assert.equal(root.map.size, 2);
    });

    it('serializes and deserializes Maps', () => {
      const root: any = createMemoryImage({
        map: new Map([['a', 1], ['b', 2], ['c', 3]])
      });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.map instanceof Map);
      assert.equal(restored.map.get('a'), 1);
      assert.equal(restored.map.get('b'), 2);
      assert.equal(restored.map.size, 3);
    });

    it('handles nested Maps', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        map: new Map([['nested', new Map([['key', 'value']])]])
      }, { eventLog });

      const nested = root.map.get('nested');
      assert.equal(nested.get('key'), 'value');
    });
  });

  describe('Set operations', () => {
    it('tracks Set add operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ set: new Set() }, { eventLog });

      root.set.add(1);
      root.set.add(2);
      root.set.add(3);

      assert.equal(eventLog.events.length, 3);
      assert.equal(eventLog.events[0].type, 'SET_ADD');
      assert.equal(root.set.size, 3);
    });

    it('tracks Set delete operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        set: new Set([1, 2, 3])
      }, { eventLog });

      root.set.delete(2);

      assert.equal(root.set.has(2), false);
      assert.equal(eventLog.events[0].type, 'SET_DELETE');
    });

    it('tracks Set clear operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        set: new Set([1, 2, 3])
      }, { eventLog });

      root.set.clear();

      assert.equal(root.set.size, 0);
      assert.equal(eventLog.events[0].type, 'SET_CLEAR');
    });

    it('replays Set operations correctly', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.set = new Set();  // Set as mutation so it gets logged

      root.set.add(1);
      root.set.add(2);
      root.set.add(3);
      root.set.delete(2);

      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.set.has(1), true);
      assert.equal(replayed.set.has(2), false);
      assert.equal(replayed.set.has(3), true);
    });

    it('handles Set with object values', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ set: new Set() }, { eventLog });

      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      root.set.add(obj1);
      root.set.add(obj2);

      assert.equal(root.set.size, 2);
      assert.equal(root.set.has(obj1), true);
    });

    it('serializes and deserializes Sets', () => {
      const root: any = createMemoryImage({
        set: new Set([1, 2, 3, 4, 5])
      });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.set instanceof Set);
      assert.equal(restored.set.size, 5);
      assert.equal(restored.set.has(1), true);
      assert.equal(restored.set.has(5), true);
    });

    it('handles nested Sets', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        set: new Set([new Set([1, 2]), new Set([3, 4])])
      }, { eventLog });

      assert.equal(root.set.size, 2);
    });

    it('Set does not add duplicates', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ set: new Set() }, { eventLog });

      root.set.add(1);
      root.set.add(1);
      root.set.add(1);

      assert.equal(root.set.size, 1);
      assert.equal(eventLog.events.length, 3); // All adds are logged
    });
  });

  describe('Mixed collection operations', () => {
    it('handles arrays, maps, and sets together', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        arr: [],
        map: new Map(),
        set: new Set()
      }, { eventLog });

      root.arr.push(1);
      root.map.set('key', 'value');
      root.set.add(1);

      assert.equal(eventLog.events.length, 3);
      assert.equal(root.arr.length, 1);
      assert.equal(root.map.size, 1);
      assert.equal(root.set.size, 1);
    });

    it('handles collections containing other collections', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({
        arr: [new Map(), new Set()]
      }, { eventLog });

      root.arr[0].set('key', 'value');
      root.arr[1].add(1);

      assert.equal(root.arr[0].get('key'), 'value');
      assert.equal(root.arr[1].has(1), true);
    });

    it('serializes mixed collections', () => {
      const root: any = createMemoryImage({
        arr: [1, 2, 3],
        map: new Map([['a', 1]]),
        set: new Set([1, 2, 3])
      });

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(Array.isArray(restored.arr));
      assert.ok(restored.map instanceof Map);
      assert.ok(restored.set instanceof Set);
    });

    it('replays mixed collection operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      // Set initial state as mutations so they get logged
      root.arr = [];
      root.map = new Map();
      root.set = new Set();

      root.arr.push(1, 2);
      root.map.set('a', 1);
      root.set.add('x');
      root.arr.pop();

      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assertDeepEqual(replayed.arr, [1]);
      assert.equal(replayed.map.get('a'), 1);
      assert.equal(replayed.set.has('x'), true);
    });
  });

  describe('Collection edge cases', () => {
    it('handles empty collections', () => {
      const root: any = createMemoryImage({
        arr: [],
        map: new Map(),
        set: new Set()
      });

      assert.equal(root.arr.length, 0);
      assert.equal(root.map.size, 0);
      assert.equal(root.set.size, 0);
    });

    it('handles large arrays', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ arr: [] }, { eventLog });

      for (let i = 0; i < 100; i++) {
        root.arr.push(i);
      }

      assert.equal(root.arr.length, 100);
    });

    it('handles sparse arrays', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.arr = new Array(10);
      root.arr[5] = 'value';

      assert.equal(root.arr.length, 10);
      assert.equal(root.arr[5], 'value');
    });

    it('handles Map with mixed key types', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ map: new Map() }, { eventLog });

      root.map.set('string', 1);
      root.map.set(42, 2);
      root.map.set({ obj: true }, 3);

      assert.equal(root.map.size, 3);
    });
  });
});
