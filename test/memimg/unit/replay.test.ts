/**
 * Unit tests for replay.ts
 *
 * Tests event replay logic and state reconstruction.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { replayEvents, replayFromEventLog } from '../../../src/memimg/replay.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';
import type { Event } from '../../../src/memimg/types.js';

describe('replay', () => {
  describe('replayEvents - array input', () => {
    it('replays SET event', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['name'], value: 'Alice', timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.name, 'Alice');
    });

    it('replays multiple SET events', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['a'], value: 1, timestamp: Date.now() },
        { type: 'SET', path: ['b'], value: 2, timestamp: Date.now() },
        { type: 'SET', path: ['c'], value: 3, timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.a, 1);
      assert.equal(root.b, 2);
      assert.equal(root.c, 3);
    });

    it('replays DELETE event', async () => {
      const root: any = { temp: 'remove' };
      const events: Event[] = [
        { type: 'DELETE', path: ['temp'], timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal('temp' in root, false);
    });

    it('replays nested SET events', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['user'], value: {}, timestamp: Date.now() },
        { type: 'SET', path: ['user', 'name'], value: 'Bob', timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.user.name, 'Bob');
    });

    it('replays ARRAY_PUSH event', async () => {
      const root: any = { items: [] };
      const events: Event[] = [
        { type: 'ARRAY_PUSH', path: ['items'], items: [1, 2, 3], timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assertDeepEqual(root.items, [1, 2, 3]);
    });

    it('replays MAP_SET event', async () => {
      const root: any = { map: new Map() };
      const events: Event[] = [
        { type: 'MAP_SET', path: ['map'], key: 'key', value: 'value', timestamp: Date.now() },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.map.get('key'), 'value');
    });

    it('handles empty event array', async () => {
      const root: any = { existing: 'data' };
      await replayEvents(root, [], { isReplaying: true });
      assert.equal(root.existing, 'data');
    });
  });

  describe('replayEvents - async iterable input', () => {
    async function* createAsyncIterable(events: Event[]) {
      for (const event of events) {
        yield event;
      }
    }

    it('replays events from async iterable', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['a'], value: 1, timestamp: Date.now() },
        { type: 'SET', path: ['b'], value: 2, timestamp: Date.now() },
      ];

      await replayEvents(root, createAsyncIterable(events), { isReplaying: true });
      assert.equal(root.a, 1);
      assert.equal(root.b, 2);
    });

    it('handles empty async iterable', async () => {
      const root: any = { existing: 'data' };
      await replayEvents(root, createAsyncIterable([]), { isReplaying: true });
      assert.equal(root.existing, 'data');
    });
  });

  describe('replayFromEventLog', () => {
    it('replays events from event log with getAll', async () => {
      const eventLog = createMockEventLog();
      await eventLog.append({ type: 'SET', path: ['x'], value: 10, timestamp: Date.now() });
      await eventLog.append({ type: 'SET', path: ['y'], value: 20, timestamp: Date.now() });

      const root: any = {};
      await replayFromEventLog(root, eventLog, { isReplaying: true });

      assert.equal(root.x, 10);
      assert.equal(root.y, 20);
    });

    it('replays events from event log with stream', async () => {
      async function* streamEvents() {
        yield { type: 'SET', path: ['a'], value: 1, timestamp: Date.now() } as Event;
        yield { type: 'SET', path: ['b'], value: 2, timestamp: Date.now() } as Event;
      }

      const eventLog = {
        getAll: async () => [],
        stream: streamEvents,
      };

      const root: any = {};
      await replayFromEventLog(root, eventLog, { isReplaying: true });

      assert.equal(root.a, 1);
      assert.equal(root.b, 2);
    });

    it('handles empty event log', async () => {
      const eventLog = createMockEventLog();
      const root: any = { existing: 'data' };

      await replayFromEventLog(root, eventLog, { isReplaying: true });
      assert.equal(root.existing, 'data');
    });
  });

  describe('replay state management', () => {
    it('sets isReplaying to true during replay', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['value'], value: 1, timestamp: Date.now() },
      ];

      const replayState = { isReplaying: false };
      await replayEvents(root, events, replayState);

      // Should be false after replay completes
      assert.equal(replayState.isReplaying, false);
    });

    it('restores isReplaying after replay', async () => {
      const root: any = {};
      const events: Event[] = [];

      const replayState = { isReplaying: false };
      await replayEvents(root, events, replayState);

      assert.equal(replayState.isReplaying, false);
    });
  });

  describe('event ordering', () => {
    it('replays events in order', async () => {
      const root: any = { counter: 0 };
      const events: Event[] = [
        { type: 'SET', path: ['counter'], value: 1, timestamp: 1000 },
        { type: 'SET', path: ['counter'], value: 2, timestamp: 2000 },
        { type: 'SET', path: ['counter'], value: 3, timestamp: 3000 },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.counter, 3);
    });

    it('handles interleaved paths correctly', async () => {
      const root: any = {};
      const events: Event[] = [
        { type: 'SET', path: ['a'], value: 1, timestamp: 1000 },
        { type: 'SET', path: ['b'], value: 2, timestamp: 2000 },
        { type: 'SET', path: ['a'], value: 10, timestamp: 3000 },
        { type: 'SET', path: ['b'], value: 20, timestamp: 4000 },
      ];

      await replayEvents(root, events, { isReplaying: true });
      assert.equal(root.a, 10);
      assert.equal(root.b, 20);
    });
  });
});
