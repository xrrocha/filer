/**
 * Unit tests for event-handlers.ts
 *
 * Tests all 18 event handler classes and the EventHandlerRegistry.
 * Each handler is tested for both createEvent() and applyEvent().
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  EventHandlerRegistry,
  eventRegistry,
} from '../../../src/memimg/event-handlers.js';
import { EVENT_TYPES } from '../../../src/memimg/constants.js';
import { createMockEventLog, assertDeepEqual, assertThrows } from '../fixtures/helpers.js';
import type { Event, Path, ProxyInfrastructure } from '../../../src/memimg/types.js';

// Helper to create minimal infrastructure for testing
function createMockInfrastructure(): ProxyInfrastructure {
  return {
    targetToProxy: new WeakMap(),
    proxyToTarget: new WeakMap(),
    targetToPath: new WeakMap(),
    eventLog: createMockEventLog(),
    metadata: {
      getDescriptor: () => null,
      getKeyProperty: () => null,
      isDisplayProperty: () => false,
      getPropertyLabel: () => null,
    },
  };
}

describe('event-handlers', () => {
  describe('SetEventHandler', () => {
    it('creates SET event with primitive value', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET,
        ['name'],
        ['Alice'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SET);
      assertDeepEqual(event.path, ['name']);
      assert.equal((event as any).value, 'Alice');
      assert.ok(event.timestamp);
    });

    it('creates SET event with object value', () => {
      const infrastructure = createMockInfrastructure();
      const obj = { id: 1 };
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET,
        ['user'],
        [obj],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SET);
      assertDeepEqual((event as any).value, { id: 1 });
    });

    it('applies SET event', () => {
      const target: any = {};
      const event: Event = {
        type: EVENT_TYPES.SET,
        path: ['key'],
        value: 'test-value',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'key', target);
      assert.equal(target.key, 'test-value');
    });

    it('applies SET event with nested value', () => {
      const target: any = {};
      const event: Event = {
        type: EVENT_TYPES.SET,
        path: ['user'],
        value: { name: 'Bob', age: 30 },
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'user', target);
      assertDeepEqual(target.user, { name: 'Bob', age: 30 });
    });
  });

  describe('DeleteEventHandler', () => {
    it('creates DELETE event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.DELETE,
        ['temp'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.DELETE);
      assertDeepEqual(event.path, ['temp']);
      assert.ok(event.timestamp);
    });

    it('applies DELETE event', () => {
      const target: any = { temp: 'remove-me' };
      const event: Event = {
        type: EVENT_TYPES.DELETE,
        path: ['temp'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'temp', target);
      assert.equal('temp' in target, false);
    });

    it('applies DELETE event to nested property', () => {
      const target: any = { user: { temp: 'value' } };
      const event: Event = {
        type: EVENT_TYPES.DELETE,
        path: ['user', 'temp'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target.user, 'temp', target);
      assert.equal('temp' in target.user, false);
    });
  });

  describe('ArrayPushHandler', () => {
    it('creates ARRAY_PUSH event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_PUSH,
        ['items'],
        [1, 2, 3],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_PUSH);
      assertDeepEqual(event.path, ['items']);
      assertDeepEqual((event as any).items, [1, 2, 3]);
    });

    it('applies ARRAY_PUSH event', () => {
      const target: any = { items: [1, 2] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_PUSH,
        path: ['items'],
        items: [3, 4, 5],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 2, 3, 4, 5]);
    });

    it('applies ARRAY_PUSH event with objects', () => {
      const target: any = { items: [] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_PUSH,
        path: ['items'],
        items: [{ id: 1 }, { id: 2 }],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assert.equal(target.items.length, 2);
      assert.equal(target.items[0].id, 1);
    });
  });

  describe('ArrayPopHandler', () => {
    it('creates ARRAY_POP event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_POP,
        ['items'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_POP);
      assertDeepEqual(event.path, ['items']);
    });

    it('applies ARRAY_POP event', () => {
      const target: any = { items: [1, 2, 3] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_POP,
        path: ['items'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 2]);
    });

    it('applies ARRAY_POP event to empty array', () => {
      const target: any = { items: [] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_POP,
        path: ['items'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, []);
    });
  });

  describe('ArrayShiftHandler', () => {
    it('creates ARRAY_SHIFT event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_SHIFT,
        ['items'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_SHIFT);
      assertDeepEqual(event.path, ['items']);
    });

    it('applies ARRAY_SHIFT event', () => {
      const target: any = { items: [1, 2, 3] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_SHIFT,
        path: ['items'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [2, 3]);
    });
  });

  describe('ArrayUnshiftHandler', () => {
    it('creates ARRAY_UNSHIFT event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_UNSHIFT,
        ['items'],
        [0, -1],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_UNSHIFT);
      assertDeepEqual((event as any).items, [0, -1]);
    });

    it('applies ARRAY_UNSHIFT event', () => {
      const target: any = { items: [3, 4] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_UNSHIFT,
        path: ['items'],
        items: [1, 2],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 2, 3, 4]);
    });
  });

  describe('ArraySpliceHandler', () => {
    it('creates ARRAY_SPLICE event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_SPLICE,
        ['items'],
        [1, 2, 'a', 'b'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_SPLICE);
      assert.equal((event as any).start, 1);
      assert.equal((event as any).deleteCount, 2);
      assertDeepEqual((event as any).items, ['a', 'b']);
    });

    it('applies ARRAY_SPLICE event - replace elements', () => {
      const target: any = { items: [1, 2, 3, 4] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_SPLICE,
        path: ['items'],
        start: 1,
        deleteCount: 2,
        items: ['a', 'b'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 'a', 'b', 4]);
    });

    it('applies ARRAY_SPLICE event - insert only', () => {
      const target: any = { items: [1, 2, 3] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_SPLICE,
        path: ['items'],
        start: 1,
        deleteCount: 0,
        items: ['x'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 'x', 2, 3]);
    });

    it('applies ARRAY_SPLICE event - delete only', () => {
      const target: any = { items: [1, 2, 3, 4] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_SPLICE,
        path: ['items'],
        start: 1,
        deleteCount: 2,
        items: [],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 4]);
    });
  });

  describe('ArraySortHandler', () => {
    it('creates ARRAY_SORT event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_SORT,
        ['items'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_SORT);
    });

    it('applies ARRAY_SORT event', () => {
      const target: any = { items: [3, 1, 2] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_SORT,
        path: ['items'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 2, 3]);
    });
  });

  describe('ArrayReverseHandler', () => {
    it('creates ARRAY_REVERSE event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_REVERSE,
        ['items'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_REVERSE);
    });

    it('applies ARRAY_REVERSE event', () => {
      const target: any = { items: [1, 2, 3] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_REVERSE,
        path: ['items'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [3, 2, 1]);
    });
  });

  describe('ArrayFillHandler', () => {
    it('creates ARRAY_FILL event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_FILL,
        ['items'],
        [0, 1, 3],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_FILL);
      assert.equal((event as any).value, 0);
      assert.equal((event as any).start, 1);
      assert.equal((event as any).end, 3);
    });

    it('applies ARRAY_FILL event', () => {
      const target: any = { items: [1, 2, 3, 4, 5] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_FILL,
        path: ['items'],
        value: 0,
        start: 1,
        end: 4,
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [1, 0, 0, 0, 5]);
    });

    it('applies ARRAY_FILL event - full array', () => {
      const target: any = { items: [1, 2, 3] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_FILL,
        path: ['items'],
        value: 'x',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, ['x', 'x', 'x']);
    });
  });

  describe('ArrayCopyWithinHandler', () => {
    it('creates ARRAY_COPYWITHIN event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_COPYWITHIN,
        ['items'],
        [0, 3, 5],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.ARRAY_COPYWITHIN);
      assert.equal((event as any).target, 0);
      assert.equal((event as any).start, 3);
      assert.equal((event as any).end, 5);
    });

    it('applies ARRAY_COPYWITHIN event', () => {
      const target: any = { items: [1, 2, 3, 4, 5] };
      const event: Event = {
        type: EVENT_TYPES.ARRAY_COPYWITHIN,
        path: ['items'],
        target: 0,
        start: 3,
        end: 5,
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'items', target);
      assertDeepEqual(target.items, [4, 5, 3, 4, 5]);
    });
  });

  describe('MapSetHandler', () => {
    it('creates MAP_SET event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.MAP_SET,
        ['map'],
        ['key', 'value'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.MAP_SET);
      assert.equal((event as any).key, 'key');
      assert.equal((event as any).value, 'value');
    });

    it('applies MAP_SET event', () => {
      const target: any = { map: new Map() };
      const event: Event = {
        type: EVENT_TYPES.MAP_SET,
        path: ['map'],
        key: 'testKey',
        value: 'testValue',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'map', target);
      assert.equal(target.map.get('testKey'), 'testValue');
    });

    it('applies MAP_SET event with object key', () => {
      // To preserve object identity, the key must be in the root
      // so it can be resolved as a reference
      const keyObj = { id: 1 };
      const target: any = { map: new Map(), keyRef: keyObj };

      const event: Event = {
        type: EVENT_TYPES.MAP_SET,
        path: ['map'],
        key: { __type__: 'ref', path: ['keyRef'] },  // Reference to keyRef in root
        value: 'value',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'map', target);
      // Now the key should be the same object instance
      assert.equal(target.map.get(keyObj), 'value');
      assert.equal(target.map.size, 1);
    });
  });

  describe('MapDeleteHandler', () => {
    it('creates MAP_DELETE event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.MAP_DELETE,
        ['map'],
        ['key'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.MAP_DELETE);
      assert.equal((event as any).key, 'key');
    });

    it('applies MAP_DELETE event', () => {
      const target: any = { map: new Map([['key', 'value']]) };
      const event: Event = {
        type: EVENT_TYPES.MAP_DELETE,
        path: ['map'],
        key: 'key',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'map', target);
      assert.equal(target.map.has('key'), false);
    });
  });

  describe('MapClearHandler', () => {
    it('creates MAP_CLEAR event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.MAP_CLEAR,
        ['map'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.MAP_CLEAR);
    });

    it('applies MAP_CLEAR event', () => {
      const target: any = { map: new Map([['a', 1], ['b', 2]]) };
      const event: Event = {
        type: EVENT_TYPES.MAP_CLEAR,
        path: ['map'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'map', target);
      assert.equal(target.map.size, 0);
    });
  });

  describe('SetAddHandler', () => {
    it('creates SET_ADD event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET_ADD,
        ['set'],
        ['value'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SET_ADD);
      assert.equal((event as any).value, 'value');
    });

    it('applies SET_ADD event', () => {
      const target: any = { set: new Set([1, 2]) };
      const event: Event = {
        type: EVENT_TYPES.SET_ADD,
        path: ['set'],
        value: 3,
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'set', target);
      assert.equal(target.set.has(3), true);
      assert.equal(target.set.size, 3);
    });
  });

  describe('SetDeleteHandler', () => {
    it('creates SET_DELETE event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET_DELETE,
        ['set'],
        [2],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SET_DELETE);
      assert.equal((event as any).value, 2);
    });

    it('applies SET_DELETE event', () => {
      const target: any = { set: new Set([1, 2, 3]) };
      const event: Event = {
        type: EVENT_TYPES.SET_DELETE,
        path: ['set'],
        value: 2,
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'set', target);
      assert.equal(target.set.has(2), false);
      assert.equal(target.set.size, 2);
    });
  });

  describe('SetClearHandler', () => {
    it('creates SET_CLEAR event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET_CLEAR,
        ['set'],
        [],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SET_CLEAR);
    });

    it('applies SET_CLEAR event', () => {
      const target: any = { set: new Set([1, 2, 3]) };
      const event: Event = {
        type: EVENT_TYPES.SET_CLEAR,
        path: ['set'],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, target, 'set', target);
      assert.equal(target.set.size, 0);
    });
  });

  describe('ScriptEventHandler', () => {
    it('creates SCRIPT event', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SCRIPT,
        [],
        ['console.log("test")'],
        infrastructure
      );

      assert.equal(event.type, EVENT_TYPES.SCRIPT);
      assert.equal((event as any).source, 'console.log("test")');
    });

    it('applies SCRIPT event (no-op)', () => {
      const target: any = { value: 1 };
      const event: Event = {
        type: EVENT_TYPES.SCRIPT,
        path: [],
        source: 'test script',
        timestamp: Date.now(),
      };

      // Script events don't mutate state
      eventRegistry.applyEvent(event, target, 'value', target);
      assert.equal(target.value, 1);
    });
  });

  describe('EventHandlerRegistry', () => {
    it('registers handler', () => {
      const registry = new EventHandlerRegistry();
      const mockHandler = {
        createEvent: () => ({ type: 'TEST', path: [], timestamp: Date.now() }),
        applyEvent: () => {},
      };

      registry.register('TEST', mockHandler);
      assert.equal(registry.hasHandler('TEST'), true);
    });

    it('throws for unknown event type on createEvent', () => {
      const registry = new EventHandlerRegistry();
      const infrastructure = createMockInfrastructure();

      assertThrows(
        () => registry.createEvent('UNKNOWN', [], [], infrastructure),
        'No handler registered'
      );
    });

    it('throws for unknown event type on applyEvent', () => {
      const registry = new EventHandlerRegistry();
      const event: Event = {
        type: 'UNKNOWN',
        path: [],
        timestamp: Date.now(),
      };

      assertThrows(
        () => registry.applyEvent(event, {}, 'key', {}),
        'No handler registered'
      );
    });

    it('checks if handler exists', () => {
      assert.equal(eventRegistry.hasHandler(EVENT_TYPES.SET), true);
      assert.equal(eventRegistry.hasHandler(EVENT_TYPES.ARRAY_PUSH), true);
      assert.equal(eventRegistry.hasHandler('NONEXISTENT'), false);
    });

    it('has all 18 event handlers registered', () => {
      const expectedTypes = [
        EVENT_TYPES.SET,
        EVENT_TYPES.DELETE,
        EVENT_TYPES.ARRAY_PUSH,
        EVENT_TYPES.ARRAY_POP,
        EVENT_TYPES.ARRAY_SHIFT,
        EVENT_TYPES.ARRAY_UNSHIFT,
        EVENT_TYPES.ARRAY_SPLICE,
        EVENT_TYPES.ARRAY_SORT,
        EVENT_TYPES.ARRAY_REVERSE,
        EVENT_TYPES.ARRAY_FILL,
        EVENT_TYPES.ARRAY_COPYWITHIN,
        EVENT_TYPES.MAP_SET,
        EVENT_TYPES.MAP_DELETE,
        EVENT_TYPES.MAP_CLEAR,
        EVENT_TYPES.SET_ADD,
        EVENT_TYPES.SET_DELETE,
        EVENT_TYPES.SET_CLEAR,
        EVENT_TYPES.SCRIPT,
      ];

      for (const type of expectedTypes) {
        assert.equal(eventRegistry.hasHandler(type), true, `Missing handler for ${type}`);
      }
    });
  });

  describe('Event creation edge cases', () => {
    it('handles empty path', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET,
        [],
        ['value'],
        infrastructure
      );

      assertDeepEqual(event.path, []);
    });

    it('handles deeply nested path', () => {
      const infrastructure = createMockInfrastructure();
      const path = ['a', 'b', 'c', 'd', 'e'];
      const event = eventRegistry.createEvent(
        EVENT_TYPES.SET,
        path,
        ['value'],
        infrastructure
      );

      assertDeepEqual(event.path, path);
    });

    it('handles multiple arguments in array push', () => {
      const infrastructure = createMockInfrastructure();
      const event = eventRegistry.createEvent(
        EVENT_TYPES.ARRAY_PUSH,
        ['items'],
        [1, 2, 3, 4, 5],
        infrastructure
      );

      assert.equal((event as any).items.length, 5);
    });
  });

  describe('Event application edge cases', () => {
    it('applies event to nested target', () => {
      const root: any = { user: { profile: {} } };
      const event: Event = {
        type: EVENT_TYPES.SET,
        path: ['user', 'profile', 'name'],
        value: 'Alice',
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event, root.user.profile, 'name', root);
      assert.equal(root.user.profile.name, 'Alice');
    });

    it('applies multiple events in sequence', () => {
      const target: any = { items: [] };

      const event1: Event = {
        type: EVENT_TYPES.ARRAY_PUSH,
        path: ['items'],
        items: [1, 2],
        timestamp: Date.now(),
      };

      const event2: Event = {
        type: EVENT_TYPES.ARRAY_PUSH,
        path: ['items'],
        items: [3, 4],
        timestamp: Date.now(),
      };

      eventRegistry.applyEvent(event1, target, 'items', target);
      eventRegistry.applyEvent(event2, target, 'items', target);

      assertDeepEqual(target.items, [1, 2, 3, 4]);
    });
  });
});
