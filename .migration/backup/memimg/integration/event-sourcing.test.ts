/**
 * Integration tests for complete event-sourcing cycle
 *
 * Tests the full mutation → event → replay flow that is the core
 * of memimg's event-sourcing architecture.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createMemoryImage, replayEventsFromLog } from '../../../src/memimg/memimg.js';
import { assertDeepEqual, createMockEventLog } from '../fixtures/helpers.js';
import { createEmployee, createScottData } from '../fixtures/sample-data.js';

describe('event-sourcing integration', () => {
  describe('basic mutation-event-replay cycle', () => {
    it('logs SET event and replays correctly', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      // Mutation
      root.name = 'Alice';

      // Verify event logged
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET');
      assertDeepEqual(eventLog.events[0].path, ['name']);
      assert.equal(eventLog.events[0].value, 'Alice');

      // Replay
      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.name, 'Alice');
    });

    it('logs DELETE event and replays correctly', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ temp: 'remove-me' }, { eventLog });

      // Mutation
      delete root.temp;

      // Verify event
      const events = eventLog.events;
      const deleteEvent = events.find((e: any) => e.type === 'DELETE');
      assert.ok(deleteEvent);
      assertDeepEqual(deleteEvent.path, ['temp']);

      // Replay
      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal('temp' in replayed, false);
    });

    it('logs nested property SET and replays', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.user = { name: 'Alice', age: 30 };

      // Two events: one for root.user, one for the object value
      assert.ok(eventLog.events.length > 0);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.user, { name: 'Alice', age: 30 });
    });
  });

  describe('array mutations', () => {
    it('ARRAY_PUSH event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [];

      root.items.push(1, 2, 3);

      const pushEvent = eventLog.events.find((e: any) => e.type === 'ARRAY_PUSH');
      assert.ok(pushEvent);
      assertDeepEqual(pushEvent.path, ['items']);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 2, 3]);
    });

    it('ARRAY_POP event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3];

      root.items.pop();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 2]);
    });

    it('ARRAY_SHIFT event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3];

      root.items.shift();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [2, 3]);
    });

    it('ARRAY_UNSHIFT event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [2, 3];

      root.items.unshift(0, 1);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [0, 1, 2, 3]);
    });

    it('ARRAY_SPLICE event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3, 4, 5];

      root.items.splice(2, 1, 99);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 2, 99, 4, 5]);
    });

    it('ARRAY_SORT event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [3, 1, 2];

      root.items.sort();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 2, 3]);
    });

    it('ARRAY_REVERSE event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3];

      root.items.reverse();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [3, 2, 1]);
    });

    it('ARRAY_FILL event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3, 4];

      root.items.fill(0, 1, 3);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 0, 0, 4]);
    });

    it('ARRAY_COPYWITHIN event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3, 4, 5];

      root.items.copyWithin(0, 3);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [4, 5, 3, 4, 5]);
    });
  });

  describe('Map mutations', () => {
    it('MAP_SET event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.map = new Map();

      root.map.set('key', 'value');

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.map.get('key'), 'value');
    });

    it('MAP_DELETE event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.map = new Map([['key', 'value']]);

      root.map.delete('key');

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.map.has('key'), false);
    });

    it('MAP_CLEAR event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.map = new Map([['a', 1], ['b', 2]]);

      root.map.clear();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.map.size, 0);
    });
  });

  describe('Set mutations', () => {
    it('SET_ADD event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.set = new Set();

      root.set.add('value');

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.set.has('value'), true);
    });

    it('SET_DELETE event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.set = new Set(['value']);

      root.set.delete('value');

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.set.has('value'), false);
    });

    it('SET_CLEAR event cycle', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.set = new Set([1, 2, 3]);

      root.set.clear();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.set.size, 0);
    });
  });

  describe('complex scenarios', () => {
    it('multiple mutations replay in correct order', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.counter = 0;
      root.counter = 1;
      root.counter = 2;
      root.counter = 3;

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.counter, 3);
    });

    it('nested object mutations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.user = { name: 'Alice' };
      root.user.age = 30;
      root.user.profile = { bio: 'Developer' };

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.user.name, 'Alice');
      assert.equal(replayed.user.age, 30);
      assert.equal(replayed.user.profile.bio, 'Developer');
    });

    it('mixed collection operations', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.arr = [];
      root.map = new Map();
      root.set = new Set();

      root.arr.push(1, 2);
      root.map.set('key', 'value');
      root.set.add('item');
      root.arr.pop();

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.arr, [1]);
      assert.equal(replayed.map.get('key'), 'value');
      assert.equal(replayed.set.has('item'), true);
    });

    it('employee-department data', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      const scottData = createScottData();
      root.depts = scottData.depts;
      root.emps = scottData.emps;

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.emps.king.ename, 'KING');
      assert.equal(replayed.depts.accounting.dname, 'ACCOUNTING');
      assert.equal(replayed.depts.accounting.employees.length, 1);
    });

    it('property deletion and recreation', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.temp = 'old';

      delete root.temp;
      root.temp = 'new';

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.temp, 'new');
    });

    it('array element modification', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });
      root.items = [1, 2, 3];

      root.items[1] = 99;

      const replayed: any = await replayEventsFromLog({ eventLog });
      assertDeepEqual(replayed.items, [1, 99, 3]);
    });
  });

  describe('special types', () => {
    it('Date values survive replay', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      const date = new Date('2024-01-01');
      root.timestamp = date;

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.ok(replayed.timestamp instanceof Date);
      assert.equal(replayed.timestamp.toISOString(), date.toISOString());
    });

    it('BigInt values survive replay', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.bigNum = BigInt(9007199254740991);

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(typeof replayed.bigNum, 'bigint');
      assert.equal(replayed.bigNum, BigInt(9007199254740991));
    });

    it('Function values survive replay', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.add = function(a: number, b: number) { return a + b; };

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(typeof replayed.add, 'function');
      assert.equal(replayed.add(2, 3), 5);
    });
  });

  describe('event ordering and timestamps', () => {
    it('events have monotonically increasing timestamps', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.a = 1;
      root.b = 2;
      root.c = 3;

      const events = eventLog.events;
      for (let i = 1; i < events.length; i++) {
        assert.ok(events[i].timestamp >= events[i-1].timestamp);
      }
    });

    it('replay applies events in timestamp order', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ value: 0 }, { eventLog });

      root.value = 1;
      root.value = 2;
      root.value = 3;

      const replayed: any = await replayEventsFromLog({ eventLog });
      assert.equal(replayed.value, 3);
    });
  });
});
