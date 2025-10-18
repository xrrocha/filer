/**
 * Integration tests for persistence
 *
 * Tests full save/load cycles with event sourcing.
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

describe('persistence integration', () => {
  describe('Full save/load cycle', () => {
    it('persists simple object', () => {
      const original = { name: 'Alice', age: 30 };
      const root = createMemoryImage(original);

      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('persists nested objects', () => {
      const original = {
        user: {
          profile: {
            name: 'Alice',
            contact: {
              email: 'alice@example.com'
            }
          }
        }
      };
      const root = createMemoryImage(original);

      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('persists arrays', () => {
      const original = {
        items: [1, 2, 3, 4, 5],
        nested: [[1, 2], [3, 4]]
      };
      const root = createMemoryImage(original);

      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assertDeepEqual(restored, original);
    });

    it('persists collections', () => {
      const original = {
        map: new Map([['a', 1], ['b', 2]]),
        set: new Set([1, 2, 3])
      };
      const root = createMemoryImage(original);

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.map instanceof Map);
      assert.ok(restored.set instanceof Set);
      assert.equal(restored.map.get('a'), 1);
      assert.equal(restored.set.has(1), true);
    });
  });

  describe('Event log persistence', () => {
    it('reconstructs state from event log', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.name = 'Alice';
      root.age = 30;
      root.items = [1, 2, 3];

      // Replay from log
      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.name, 'Alice');
      assert.equal(replayed.age, 30);
      assertDeepEqual(replayed.items, [1, 2, 3]);
    });

    it('handles multiple mutation cycles', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      // First cycle
      root.count = 0;

      // Second cycle
      root.count = 1;

      // Third cycle
      root.count = 2;

      // Replay
      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.count, 2);
    });

    it('handles complex event sequence', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.users = [];
      root.users.push({ name: 'Alice', age: 30 });
      root.users.push({ name: 'Bob', age: 25 });
      root.users[0].age = 31;
      delete root.users[1].age;

      // Replay
      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.users.length, 2);
      assert.equal(replayed.users[0].age, 31);
      assert.equal(replayed.users[1].age, undefined);
    });
  });

  describe('Snapshot + events', () => {
    it('combines snapshot with incremental events', async () => {
      // Create initial state and snapshot
      const root1: any = createMemoryImage({});
      root1.name = 'Alice';
      root1.count = 0;

      const snapshot = serializeMemoryImageToJson(root1);

      // Restore from snapshot and continue with events
      const root2: any = deserializeMemoryImageFromJson(snapshot);
      const eventLog = createMockEventLog();
      const proxied: any = createMemoryImage(root2, { eventLog });

      proxied.count = 1;
      proxied.count = 2;

      assert.equal(proxied.count, 2);
    });

    it('handles large initial state with mutations', async () => {
      const initialState = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `User${i}`
        }))
      };

      const root1 = createMemoryImage(initialState);
      const snapshot = serializeMemoryImageToJson(root1);

      // Load and mutate
      const root2: any = deserializeMemoryImageFromJson(snapshot);
      const eventLog = createMockEventLog();
      const proxied: any = createMemoryImage(root2, { eventLog });

      proxied.users[0].name = 'Modified';

      assert.equal(proxied.users[0].name, 'Modified');
      assert.equal(eventLog.events.length, 1);
    });
  });

  describe('Incremental persistence', () => {
    it('supports append-only event log', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      // Day 1
      root.count = 0;

      const events1 = [...eventLog.events];

      // Day 2
      root.count = 1;

      const events2 = [...eventLog.events];

      // All events should be preserved
      assert.ok(events2.length > events1.length);
    });

    it('replays from specific point in event log', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.a = 1;
      root.b = 2;
      root.c = 3;

      // Take snapshot at event 2
      const partialEvents = eventLog.events.slice(0, 2);
      const partialLog = {
        events: partialEvents,
        getAll: async () => partialEvents,
        append: async () => {},
        clear: async () => {}
      };

      const partial: any = {};
      await replayFromEventLog(partial, partialLog, { isReplaying: true });

      // Should have first two properties
      assert.ok('a' in partial);
      assert.ok('b' in partial);
      assert.ok(!('c' in partial));
    });
  });

  describe('Error recovery', () => {
    it('handles corrupted snapshot gracefully', () => {
      const corrupted = '{ invalid json }';

      assert.throws(() => {
        deserializeMemoryImageFromJson(corrupted);
      });
    });

    it('continues from valid events after error', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.valid1 = 'ok';
      // Imagine an event failed here
      root.valid2 = 'ok';

      // Should be able to replay valid events
      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.valid1, 'ok');
      assert.equal(replayed.valid2, 'ok');
    });
  });

  describe('Large dataset persistence', () => {
    it('handles large object graphs', () => {
      const large: any = {};
      for (let i = 0; i < 1000; i++) {
        large[`prop${i}`] = `value${i}`;
      }

      const root = createMemoryImage(large);
      const json = serializeMemoryImageToJson(root);
      const restored = deserializeMemoryImageFromJson(json);

      assert.equal(Object.keys(restored).length, 1000);
    });

    it('handles many events', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({ count: 0 }, { eventLog });

      for (let i = 1; i <= 100; i++) {
        root.count = i;
      }

      assert.equal(eventLog.events.length, 100);

      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.equal(replayed.count, 100);
    });
  });

  describe('Special types persistence', () => {
    it('persists Date objects', () => {
      const original = {
        created: new Date('2024-01-01'),
        updated: new Date('2024-12-31')
      };

      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.created instanceof Date);
      assert.ok(restored.updated instanceof Date);
      assert.equal(restored.created.getTime(), original.created.getTime());
    });

    it('persists BigInt values', () => {
      const original = {
        big: BigInt('9007199254740991')
      };

      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(typeof restored.big, 'bigint');
      assert.equal(restored.big, BigInt('9007199254740991'));
    });

    it('persists mixed special types', () => {
      const original = {
        date: new Date('2024-01-01'),
        big: BigInt(100),
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3])
      };

      const root = createMemoryImage(original);
      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.ok(restored.date instanceof Date);
      assert.equal(typeof restored.big, 'bigint');
      assert.ok(restored.map instanceof Map);
      assert.ok(restored.set instanceof Set);
    });
  });

  describe('Real-world scenarios', () => {
    it('simulates user session persistence', async () => {
      const eventLog = createMockEventLog();
      const session: any = createMemoryImage({
        user: { id: 1, name: 'Alice' },
        cart: [],
        preferences: {}
      }, { eventLog });

      // User actions
      session.cart.push({ item: 'Book', price: 29.99 });
      session.cart.push({ item: 'Pen', price: 4.99 });
      session.preferences.theme = 'dark';

      // Save snapshot
      const snapshot = serializeMemoryImageToJson(session);

      // Restore in new session
      const restored: any = deserializeMemoryImageFromJson(snapshot);

      assert.equal(restored.user.name, 'Alice');
      assert.equal(restored.cart.length, 2);
      assert.equal(restored.preferences.theme, 'dark');
    });

    it('simulates game state persistence', async () => {
      const eventLog = createMockEventLog();
      const game: any = createMemoryImage({
        player: { name: 'Hero', level: 1, hp: 100 },
        inventory: [],
        quests: new Set()
      }, { eventLog });

      // Gameplay
      game.player.level = 2;
      game.player.hp = 150;
      game.inventory.push('Sword', 'Shield');
      game.quests.add('Quest1');
      game.quests.add('Quest2');

      // Save
      const save = serializeMemoryImageToJson(game);

      // Load
      const loaded: any = deserializeMemoryImageFromJson(save);

      assert.equal(loaded.player.level, 2);
      assert.equal(loaded.inventory.length, 2);
      assert.equal(loaded.quests.size, 2);
    });
  });
});
