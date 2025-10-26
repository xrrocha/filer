/**
 * Unit tests for event-log.ts
 *
 * Tests all 4 event log backends: InMemory, File, IndexedDB, LocalStorage.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createInMemoryEventLog,
  createFileEventLog,
  createIndexedDBEventLog,
  createLocalStorageEventLog,
} from '../../../src/memimg/event-log.js';
import { assertDeepEqual, assertThrows, assertRejects } from '../fixtures/helpers.js';
import type { Event } from '../../../src/memimg/types.js';
import * as fs from 'fs';
import * as path from 'path';

// Helper to create test event
function createEvent(type: string, eventPath: string[], value?: any): Event {
  return {
    type,
    path: eventPath,
    value,
    timestamp: Date.now(),
  };
}

describe('event-log', () => {
  describe('createInMemoryEventLog', () => {
    it('creates event log', () => {
      const log = createInMemoryEventLog();

      assert.ok(log);
      assert.equal(typeof log.append, 'function');
      assert.equal(typeof log.getAll, 'function');
      assert.equal(typeof log.clear, 'function');
    });

    it('starts with zero length', () => {
      const log = createInMemoryEventLog();

      assert.equal(log.length, 0);
    });

    it('appends event', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['name'], 'Alice');

      await log.append(event);

      assert.equal(log.length, 1);
    });

    it('appends multiple events', async () => {
      const log = createInMemoryEventLog();

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));
      await log.append(createEvent('SET', ['c'], 3));

      assert.equal(log.length, 3);
    });

    it('getAll returns empty array initially', async () => {
      const log = createInMemoryEventLog();
      const events = await log.getAll();

      assertDeepEqual(events, []);
    });

    it('getAll returns all events', async () => {
      const log = createInMemoryEventLog();
      const event1 = createEvent('SET', ['a'], 1);
      const event2 = createEvent('SET', ['b'], 2);

      await log.append(event1);
      await log.append(event2);

      const events = await log.getAll();
      assert.equal(events.length, 2);
      assert.equal(events[0].type, 'SET');
      assert.equal(events[1].type, 'SET');
    });

    it('getAll returns copy (not original array)', async () => {
      const log = createInMemoryEventLog();
      await log.append(createEvent('SET', ['a'], 1));

      const events1 = await log.getAll();
      const events2 = await log.getAll();

      assert.notEqual(events1, events2);
    });

    it('clear removes all events', async () => {
      const log = createInMemoryEventLog();

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));
      await log.clear();

      assert.equal(log.length, 0);
      const events = await log.getAll();
      assertDeepEqual(events, []);
    });

    it('maintains event order', async () => {
      const log = createInMemoryEventLog();

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));
      await log.append(createEvent('SET', ['c'], 3));

      const events = await log.getAll();
      assert.equal(events[0].value, 1);
      assert.equal(events[1].value, 2);
      assert.equal(events[2].value, 3);
    });

    it('handles events with complex values', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['user'], { name: 'Alice', age: 30 });

      await log.append(event);

      const events = await log.getAll();
      assertDeepEqual(events[0].value, { name: 'Alice', age: 30 });
    });

    it('handles DELETE events', async () => {
      const log = createInMemoryEventLog();
      const event = {
        type: 'DELETE',
        path: ['temp'],
        timestamp: Date.now(),
      };

      await log.append(event);

      assert.equal(log.length, 1);
      const events = await log.getAll();
      assert.equal(events[0].type, 'DELETE');
    });

    it('handles large number of events', async () => {
      const log = createInMemoryEventLog();

      for (let i = 0; i < 1000; i++) {
        await log.append(createEvent('SET', ['item', String(i)], i));
      }

      assert.equal(log.length, 1000);
    });
  });

  describe('createFileEventLog', () => {
    const testDir = path.join(process.cwd(), 'test-event-logs');
    const testFile = path.join(testDir, 'test-events.ndjson');

    // Setup: create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Cleanup: remove test file after each test
    async function cleanup() {
      if (fs.existsSync(testFile)) {
        fs.unlinkSync(testFile);
      }
    }

    it('creates event log', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      assert.ok(log);
      assert.equal(typeof log.append, 'function');
      assert.equal(typeof log.getAll, 'function');
      assert.equal(typeof log.stream, 'function');
      assert.equal(typeof log.clear, 'function');

      await cleanup();
    });

    it('creates file if it does not exist', async () => {
      await cleanup();
      await createFileEventLog(testFile);

      assert.ok(fs.existsSync(testFile));

      await cleanup();
    });

    it('appends event to file', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);
      const event = createEvent('SET', ['name'], 'Alice');

      await log.append(event);

      const content = fs.readFileSync(testFile, 'utf8');
      assert.ok(content.includes('SET'));
      assert.ok(content.includes('Alice'));

      await cleanup();
    });

    it('appends multiple events', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));
      await log.append(createEvent('SET', ['c'], 3));

      const events = await log.getAll();
      assert.equal(events.length, 3);

      await cleanup();
    });

    it('getAll returns empty array for empty file', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);
      const events = await log.getAll();

      assertDeepEqual(events, []);

      await cleanup();
    });

    it('getAll returns all events', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));

      const events = await log.getAll();
      assert.equal(events.length, 2);
      assert.equal(events[0].value, 1);
      assert.equal(events[1].value, 2);

      await cleanup();
    });

    it('maintains NDJSON format', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));

      const content = fs.readFileSync(testFile, 'utf8');
      const lines = content.trim().split('\n');
      assert.equal(lines.length, 2);

      // Each line should be valid JSON
      JSON.parse(lines[0]);
      JSON.parse(lines[1]);

      await cleanup();
    });

    it('stream returns async iterable', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));

      const events: Event[] = [];
      for await (const event of log.stream!()) {
        events.push(event);
      }

      assert.equal(events.length, 2);

      await cleanup();
    });

    it('stream works for large files', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      // Add many events
      for (let i = 0; i < 100; i++) {
        await log.append(createEvent('SET', ['item', String(i)], i));
      }

      let count = 0;
      for await (const event of log.stream!()) {
        count++;
      }

      assert.equal(count, 100);

      await cleanup();
    });

    it('clear empties file', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);

      await log.append(createEvent('SET', ['a'], 1));
      await log.append(createEvent('SET', ['b'], 2));
      await log.clear();

      const events = await log.getAll();
      assertDeepEqual(events, []);

      await cleanup();
    });

    it('persists events across log instances', async () => {
      await cleanup();
      const log1 = await createFileEventLog(testFile);
      await log1.append(createEvent('SET', ['a'], 1));

      const log2 = await createFileEventLog(testFile);
      const events = await log2.getAll();

      assert.equal(events.length, 1);

      await cleanup();
    });

    it('handles events with complex values', async () => {
      await cleanup();
      const log = await createFileEventLog(testFile);
      const event = createEvent('SET', ['user'], {
        name: 'Alice',
        items: [1, 2, 3],
        metadata: { timestamp: Date.now() }
      });

      await log.append(event);

      const events = await log.getAll();
      assert.ok(events[0].value.name);
      assert.ok(events[0].value.items);

      await cleanup();
    });
  });

  describe('createIndexedDBEventLog', () => {
    // IndexedDB is only available in browsers, so these tests will be skipped in Node.js
    const isNode = typeof indexedDB === 'undefined';

    if (isNode) {
      it('throws error in Node.js environment', async () => {
        const log = createIndexedDBEventLog();
        // Try to use it - should reject asynchronously
        await assertRejects(
          () => log.append(createEvent('SET', ['test'], 1)),
          'IndexedDB not available'
        );
      });
    } else {
      // Browser tests (if running in browser environment)
      it('creates event log', () => {
        const log = createIndexedDBEventLog();

        assert.ok(log);
        assert.equal(typeof log.append, 'function');
        assert.equal(typeof log.getAll, 'function');
        assert.equal(typeof log.clear, 'function');
        assert.equal(typeof log.close, 'function');
      });

      it('uses default database name', () => {
        const log = createIndexedDBEventLog();
        assert.ok(log);
      });

      it('uses custom database name', () => {
        const log = createIndexedDBEventLog('test-db', 'test-store');
        assert.ok(log);
      });
    }

    it('has close method', async () => {
      const log = createIndexedDBEventLog();
      assert.equal(typeof log.close, 'function');

      // In Node.js, close the log to prevent unhandled rejection
      // The initPromise will reject, but close() handles this gracefully
      if (isNode) {
        await log.close();
      }
    });
  });

  describe('createLocalStorageEventLog', () => {
    // LocalStorage is only available in browsers
    const isNode = typeof localStorage === 'undefined';

    if (isNode) {
      it('throws error in Node.js environment', () => {
        assertThrows(
          () => createLocalStorageEventLog(),
          'LocalStorage not available'
        );
      });
    } else {
      // Browser tests
      it('creates event log', () => {
        const log = createLocalStorageEventLog('test-events');

        assert.ok(log);
        assert.equal(typeof log.append, 'function');
        assert.equal(typeof log.getAll, 'function');
        assert.equal(typeof log.clear, 'function');
      });

      it('uses default key', () => {
        const log = createLocalStorageEventLog();
        assert.ok(log);
      });

      it('appends event', async () => {
        const log = createLocalStorageEventLog('test-events');
        const event = createEvent('SET', ['name'], 'Alice');

        await log.append(event);

        const events = await log.getAll();
        assert.equal(events.length, 1);

        // Cleanup
        await log.clear();
      });

      it('getAll returns all events', async () => {
        const log = createLocalStorageEventLog('test-events');

        await log.clear();
        await log.append(createEvent('SET', ['a'], 1));
        await log.append(createEvent('SET', ['b'], 2));

        const events = await log.getAll();
        assert.equal(events.length, 2);

        await log.clear();
      });

      it('clear removes all events', async () => {
        const log = createLocalStorageEventLog('test-events');

        await log.append(createEvent('SET', ['a'], 1));
        await log.clear();

        const events = await log.getAll();
        assertDeepEqual(events, []);
      });

      it('persists events across log instances', async () => {
        const log1 = createLocalStorageEventLog('test-persist');
        await log1.clear();
        await log1.append(createEvent('SET', ['a'], 1));

        const log2 = createLocalStorageEventLog('test-persist');
        const events = await log2.getAll();

        assert.equal(events.length, 1);

        await log1.clear();
      });
    }
  });

  describe('EventLog interface compliance', () => {
    it('InMemoryEventLog implements EventLog interface', () => {
      const log = createInMemoryEventLog();

      assert.equal(typeof log.append, 'function');
      assert.equal(typeof log.getAll, 'function');
      assert.equal(typeof log.clear, 'function');
    });

    it('all event logs return promises', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['test'], 1);

      const appendResult = log.append(event);
      assert.ok(appendResult instanceof Promise);

      const getAllResult = log.getAll();
      assert.ok(getAllResult instanceof Promise);

      const clearResult = log.clear();
      assert.ok(clearResult instanceof Promise);

      await Promise.all([appendResult, getAllResult, clearResult]);
    });
  });

  describe('Event preservation', () => {
    it('preserves event type', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['name'], 'Alice');

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].type, 'SET');
    });

    it('preserves event path', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['user', 'profile', 'name'], 'Alice');

      await log.append(event);

      const events = await log.getAll();
      assertDeepEqual(events[0].path, ['user', 'profile', 'name']);
    });

    it('preserves event value', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['data'], { nested: { value: 42 } });

      await log.append(event);

      const events = await log.getAll();
      assertDeepEqual(events[0].value, { nested: { value: 42 } });
    });

    it('preserves event timestamp', async () => {
      const log = createInMemoryEventLog();
      const now = Date.now();
      const event = createEvent('SET', ['time'], now);
      event.timestamp = now;

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].timestamp, now);
    });
  });

  describe('Edge cases', () => {
    it('handles empty path', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', [], 'value');

      await log.append(event);

      const events = await log.getAll();
      assertDeepEqual(events[0].path, []);
    });

    it('handles null value', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['nullable'], null);

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].value, null);
    });

    it('handles undefined value', async () => {
      const log = createInMemoryEventLog();
      const event = createEvent('SET', ['optional'], undefined);

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].value, undefined);
    });

    it('handles events without value property', async () => {
      const log = createInMemoryEventLog();
      const event: Event = {
        type: 'DELETE',
        path: ['temp'],
        timestamp: Date.now(),
      };

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].type, 'DELETE');
    });

    it('handles very long paths', async () => {
      const log = createInMemoryEventLog();
      const longPath = Array.from({ length: 100 }, (_, i) => `level${i}`);
      const event = createEvent('SET', longPath, 'deep');

      await log.append(event);

      const events = await log.getAll();
      assert.equal(events[0].path.length, 100);
    });
  });

  describe('Performance', () => {
    it('handles rapid appends', async () => {
      const log = createInMemoryEventLog();
      const promises = [];

      for (let i = 0; i < 100; i++) {
        promises.push(log.append(createEvent('SET', ['item', String(i)], i)));
      }

      await Promise.all(promises);

      assert.equal(log.length, 100);
    });

    it('getAll is efficient for large logs', async () => {
      const log = createInMemoryEventLog();

      for (let i = 0; i < 1000; i++) {
        await log.append(createEvent('SET', ['item', String(i)], i));
      }

      const start = Date.now();
      const events = await log.getAll();
      const duration = Date.now() - start;

      assert.equal(events.length, 1000);
      assert.ok(duration < 1000); // Should complete in less than 1 second
    });
  });
});
