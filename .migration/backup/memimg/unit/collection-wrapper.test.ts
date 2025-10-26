/**
 * Unit tests for collection-wrapper.ts
 *
 * Tests unified collection method wrapping for Array, Map, and Set.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { wrapCollectionMethod } from '../../../src/memimg/collection-wrapper.js';
import { createMockEventLog, assertDeepEqual, assertThrows } from '../fixtures/helpers.js';
import type { ProxyInfrastructure } from '../../../src/memimg/types.js';

// Helper to create minimal infrastructure
function createMockInfrastructure(): ProxyInfrastructure {
  return {
    targetToProxy: new WeakMap(),
    proxyToTarget: new WeakMap(),
    targetToPath: new WeakMap(),
    metadata: {
      getDescriptor: () => null,
      getKeyProperty: () => null,
      isDisplayProperty: () => false,
      getPropertyLabel: () => null,
    },
  };
}

describe('collection-wrapper', () => {
  describe('Array methods', () => {
    it('wraps push method', () => {
      const arr = [1, 2];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped(3, 4);

      assert.equal(result, 4); // push returns new length
      assertDeepEqual(arr, [1, 2, 3, 4]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_PUSH');
    });

    it('wraps pop method', () => {
      const arr = [1, 2, 3];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'pop',
        arr.pop.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped();

      assert.equal(result, 3);
      assertDeepEqual(arr, [1, 2]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_POP');
    });

    it('wraps shift method', () => {
      const arr = [1, 2, 3];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'shift',
        arr.shift.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped();

      assert.equal(result, 1);
      assertDeepEqual(arr, [2, 3]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_SHIFT');
    });

    it('wraps unshift method', () => {
      const arr = [3, 4];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'unshift',
        arr.unshift.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped(1, 2);

      assert.equal(result, 4);
      assertDeepEqual(arr, [1, 2, 3, 4]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_UNSHIFT');
    });

    it('wraps splice method', () => {
      const arr = [1, 2, 3, 4];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'splice',
        arr.splice.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped(1, 2, 'a', 'b');

      assertDeepEqual(result, [2, 3]);
      assertDeepEqual(arr, [1, 'a', 'b', 4]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_SPLICE');
    });

    it('wraps sort method', () => {
      const arr = [3, 1, 2];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'sort',
        arr.sort.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped();

      assertDeepEqual(arr, [1, 2, 3]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_SORT');
    });

    it('wraps reverse method', () => {
      const arr = [1, 2, 3];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'reverse',
        arr.reverse.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped();

      assertDeepEqual(arr, [3, 2, 1]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_REVERSE');
    });

    it('wraps fill method', () => {
      const arr = [1, 2, 3, 4, 5];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'fill',
        arr.fill.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(0, 1, 4);

      assertDeepEqual(arr, [1, 0, 0, 0, 5]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_FILL');
    });

    it('wraps copyWithin method', () => {
      const arr = [1, 2, 3, 4, 5];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'copyWithin',
        arr.copyWithin.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(0, 3, 5);

      assertDeepEqual(arr, [4, 5, 3, 4, 5]);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_COPYWITHIN');
    });
  });

  describe('Map methods', () => {
    it('wraps set method', () => {
      const map = new Map([['a', 1]]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(map, ['map']);

      const wrapped = wrapCollectionMethod(
        map,
        'Map',
        'set',
        map.set.bind(map),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped('b', 2);

      assert.equal(map.get('b'), 2);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'MAP_SET');
    });

    it('wraps delete method', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(map, ['map']);

      const wrapped = wrapCollectionMethod(
        map,
        'Map',
        'delete',
        map.delete.bind(map),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped('a');

      assert.equal(result, true);
      assert.equal(map.has('a'), false);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'MAP_DELETE');
    });

    it('wraps clear method', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(map, ['map']);

      const wrapped = wrapCollectionMethod(
        map,
        'Map',
        'clear',
        map.clear.bind(map),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped();

      assert.equal(map.size, 0);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'MAP_CLEAR');
    });
  });

  describe('Set methods', () => {
    it('wraps add method', () => {
      const set = new Set([1, 2]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(set, ['set']);

      const wrapped = wrapCollectionMethod(
        set,
        'Set',
        'add',
        set.add.bind(set),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(3);

      assert.equal(set.has(3), true);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET_ADD');
    });

    it('wraps delete method', () => {
      const set = new Set([1, 2, 3]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(set, ['set']);

      const wrapped = wrapCollectionMethod(
        set,
        'Set',
        'delete',
        set.delete.bind(set),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped(2);

      assert.equal(result, true);
      assert.equal(set.has(2), false);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET_DELETE');
    });

    it('wraps clear method', () => {
      const set = new Set([1, 2, 3]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(set, ['set']);

      const wrapped = wrapCollectionMethod(
        set,
        'Set',
        'clear',
        set.clear.bind(set),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped();

      assert.equal(set.size, 0);
      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET_CLEAR');
    });
  });

  describe('Event logging', () => {
    it('does not log when no event log provided', () => {
      const arr = [1, 2];
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        undefined, // no event log
        replayState
      );

      wrapped(3);

      assertDeepEqual(arr, [1, 2, 3]);
    });

    it('does not log when replaying', () => {
      const arr = [1, 2];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: true }; // replaying
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(3);

      assertDeepEqual(arr, [1, 2, 3]);
      assert.equal(eventLog.events.length, 0); // no event logged
    });

    it('logs with correct path from infrastructure', () => {
      const arr = [1];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['user', 'items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(2);

      assert.equal(eventLog.events.length, 1);
      assertDeepEqual(eventLog.events[0].path, ['user', 'items']);
    });

    it('uses empty path when not in infrastructure', () => {
      const arr = [1];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      // Don't set path in infrastructure

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(2);

      assert.equal(eventLog.events.length, 1);
      assertDeepEqual(eventLog.events[0].path, []);
    });
  });

  describe('Error handling', () => {
    it('throws for unknown collection type', () => {
      const obj = {};
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };

      assertThrows(
        () => wrapCollectionMethod(
          obj as any,
          'UnknownType' as any,
          'method',
          () => {},
          infrastructure,
          eventLog,
          replayState
        ),
        'Unknown collection type'
      );
    });
  });

  describe('Method execution', () => {
    it('executes original method with correct context', () => {
      const arr = [1, 2];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(3, 4, 5);

      assertDeepEqual(arr, [1, 2, 3, 4, 5]);
    });

    it('returns original method result', () => {
      const map = new Map([['a', 1]]);
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(map, ['map']);

      const wrapped = wrapCollectionMethod(
        map,
        'Map',
        'set',
        map.set.bind(map),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped('b', 2);

      assert.equal(result, map); // set returns the map
    });

    it('handles methods with no arguments', () => {
      const arr = [1, 2, 3];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'pop',
        arr.pop.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      const result = wrapped();

      assert.equal(result, 3);
      assertDeepEqual(arr, [1, 2]);
    });
  });

  describe('Integration with event registry', () => {
    it('creates properly formatted events', () => {
      const arr = [1];
      const eventLog = createMockEventLog();
      const infrastructure = createMockInfrastructure();
      const replayState = { isReplaying: false };
      infrastructure.targetToPath.set(arr, ['items']);

      const wrapped = wrapCollectionMethod(
        arr,
        'Array',
        'push',
        arr.push.bind(arr),
        infrastructure,
        eventLog,
        replayState
      );

      wrapped(2, 3);

      assert.equal(eventLog.events.length, 1);
      const event = eventLog.events[0];
      assert.equal(event.type, 'ARRAY_PUSH');
      assert.ok(event.timestamp);
      assertDeepEqual(event.path, ['items']);
      assertDeepEqual((event as any).items, [2, 3]);
    });
  });
});
