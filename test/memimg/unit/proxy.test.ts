/**
 * Unit tests for proxy.ts
 *
 * Tests proxy infrastructure, recursive wrapping, and proxy handlers.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createProxyInfrastructure,
  wrapIfNeeded,
} from '../../../src/memimg/proxy.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';

describe('proxy', () => {
  describe('createProxyInfrastructure', () => {
    it('creates infrastructure with WeakMaps', () => {
      const infrastructure = createProxyInfrastructure();

      assert.ok(infrastructure.targetToProxy instanceof WeakMap);
      assert.ok(infrastructure.proxyToTarget instanceof WeakMap);
      assert.ok(infrastructure.targetToPath instanceof WeakMap);
    });

    it('accepts optional metadata provider', () => {
      const metadata = {
        getDescriptor: () => 'test',
        getKeyProperty: () => 'id',
        isDisplayProperty: () => true,
        getPropertyLabel: () => null,
      };

      const infrastructure = createProxyInfrastructure(metadata);

      assert.equal(infrastructure.metadata, metadata);
    });

    it('creates infrastructure without metadata', () => {
      const infrastructure = createProxyInfrastructure();

      assert.equal(infrastructure.metadata, undefined);
    });
  });

  describe('wrapIfNeeded - primitives', () => {
    it('returns null unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const result = wrapIfNeeded(null, [], infrastructure);

      assert.equal(result, null);
    });

    it('returns undefined unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const result = wrapIfNeeded(undefined, [], infrastructure);

      assert.equal(result, undefined);
    });

    it('returns string unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const result = wrapIfNeeded('test', [], infrastructure);

      assert.equal(result, 'test');
    });

    it('returns number unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const result = wrapIfNeeded(42, [], infrastructure);

      assert.equal(result, 42);
    });

    it('returns boolean unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const result = wrapIfNeeded(true, [], infrastructure);

      assert.equal(result, true);
    });

    it('returns BigInt unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const big = BigInt(100);
      const result = wrapIfNeeded(big, [], infrastructure);

      assert.equal(result, big);
    });

    it('returns Symbol unchanged', () => {
      const infrastructure = createProxyInfrastructure();
      const sym = Symbol('test');
      const result = wrapIfNeeded(sym, [], infrastructure);

      assert.equal(result, sym);
    });
  });

  describe('Date proxying', () => {
    it('should proxy Date objects', () => {
      const infrastructure = createProxyInfrastructure();
      const date = new Date('2024-01-01');
      const proxied = wrapIfNeeded(date, [], infrastructure);

      // Should be proxied (not the same reference)
      assert.notEqual(proxied, date);

      // Infrastructure should track it
      assert.ok(infrastructure.proxyToTarget.has(proxied as object));
      assert.equal(infrastructure.proxyToTarget.get(proxied as object), date);
    });

    it('should preserve Date methods through proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const date = new Date('2024-01-15T10:30:45.123Z');
      const proxied = wrapIfNeeded(date, [], infrastructure) as Date;

      // All Date methods should work (use UTC methods for consistent results)
      assert.equal(proxied.getUTCFullYear(), 2024);
      assert.equal(proxied.getUTCMonth(), 0);  // January
      assert.equal(proxied.getUTCDate(), 15);
      assert.equal(proxied.getUTCHours(), 10);
      assert.equal(proxied.toISOString(), '2024-01-15T10:30:45.123Z');
      assert.equal(typeof proxied.getTime(), 'number');
    });

    it('should allow Date property mutations through proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const date = new Date('2024-01-01');
      (date as any).location = "Room A";
      (date as any).capacity = 10;

      const proxied = wrapIfNeeded(date, ['meeting'], infrastructure) as any;

      // Should be able to read existing properties
      assert.equal(proxied.location, "Room A");
      assert.equal(proxied.capacity, 10);

      // Should be able to set properties
      proxied.location = "Room B";
      proxied.capacity = 20;

      // Changes should be visible
      assert.equal(proxied.location, "Room B");
      assert.equal(proxied.capacity, 20);
    });

    it('should handle Date type coercion through proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const date = new Date('2024-01-15');
      const proxied = wrapIfNeeded(date, [], infrastructure) as Date;

      // Should coerce to number (timestamp)
      const timestamp = +proxied;
      assert.equal(typeof timestamp, 'number');
      assert.equal(timestamp, date.getTime());

      // Should coerce to string
      const str = String(proxied);
      assert.equal(typeof str, 'string');
    });

    it('should handle Date with nested object properties', () => {
      const infrastructure = createProxyInfrastructure();
      const date = new Date('2024-01-01');
      (date as any).metadata = {
        organizer: "Alice",
        room: { number: 101 }
      };

      const proxied = wrapIfNeeded(date, [], infrastructure) as any;

      // Nested properties should also be proxied
      assert.ok(infrastructure.proxyToTarget.has(proxied.metadata));
      assert.equal(proxied.metadata.organizer, "Alice");
      assert.equal(proxied.metadata.room.number, 101);
    });
  });

  describe('wrapIfNeeded - functions', () => {
    it('wraps function with metadata', () => {
      const infrastructure = createProxyInfrastructure();
      const fn = () => 42;
      const result = wrapIfNeeded(fn, [], infrastructure) as any;

      assert.equal(typeof result, 'function');
      assert.equal(result.__type__, 'function');
      assert.ok(result.sourceCode);
    });

    it('wrapped function remains callable', () => {
      const infrastructure = createProxyInfrastructure();
      const fn = (x: number) => x * 2;
      const result = wrapIfNeeded(fn, [], infrastructure) as any;

      assert.equal(result(5), 10);
    });

    it('wrapped function has source code', () => {
      const infrastructure = createProxyInfrastructure();
      const fn = function testFn() { return 1; };
      const result = wrapIfNeeded(fn, [], infrastructure) as any;

      assert.ok(result.sourceCode.includes('testFn'));
    });
  });

  describe('wrapIfNeeded - objects', () => {
    it('wraps plain object in proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const result = wrapIfNeeded(obj, [], infrastructure);

      assert.notEqual(result, obj);
      assert.ok(infrastructure.proxyToTarget.has(result as object));
    });

    it('registers object in targetToProxy', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const proxy = wrapIfNeeded(obj, [], infrastructure);

      assert.equal(infrastructure.targetToProxy.get(obj), proxy);
    });

    it('registers proxy in proxyToTarget', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const proxy = wrapIfNeeded(obj, [], infrastructure);

      assert.equal(infrastructure.proxyToTarget.get(proxy as object), obj);
    });

    it('registers path in targetToPath', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const path = ['user', 'profile'];
      wrapIfNeeded(obj, path, infrastructure);

      assertDeepEqual(infrastructure.targetToPath.get(obj), path);
    });

    it('returns same proxy for same object', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const proxy1 = wrapIfNeeded(obj, [], infrastructure);
      const proxy2 = wrapIfNeeded(obj, [], infrastructure);

      assert.equal(proxy1, proxy2);
    });

    it('returns proxy if value is already a proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { a: 1 };
      const proxy = wrapIfNeeded(obj, [], infrastructure);
      const result = wrapIfNeeded(proxy, [], infrastructure);

      assert.equal(result, proxy);
    });
  });

  describe('wrapIfNeeded - arrays', () => {
    it('wraps array in proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const arr = [1, 2, 3];
      const result = wrapIfNeeded(arr, [], infrastructure);

      assert.notEqual(result, arr);
      assert.ok(Array.isArray(result));
    });

    it('recursively wraps array elements', () => {
      const infrastructure = createProxyInfrastructure();
      const arr = [{ a: 1 }, { b: 2 }];
      const proxy = wrapIfNeeded(arr, ['items'], infrastructure) as any;

      // Elements should be wrapped
      assert.ok(infrastructure.proxyToTarget.has(proxy[0]));
      assert.ok(infrastructure.proxyToTarget.has(proxy[1]));
    });

    it('preserves array length', () => {
      const infrastructure = createProxyInfrastructure();
      const arr = [1, 2, 3];
      const proxy = wrapIfNeeded(arr, [], infrastructure) as any;

      assert.equal(proxy.length, 3);
    });
  });

  describe('wrapIfNeeded - Map', () => {
    it('wraps Map in proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const map = new Map([['a', 1]]);
      const result = wrapIfNeeded(map, [], infrastructure);

      assert.notEqual(result, map);
      assert.ok(result instanceof Map);
    });

    it('recursively wraps Map values', () => {
      const infrastructure = createProxyInfrastructure();
      const map = new Map([['key', { value: 1 }]]);
      const proxy = wrapIfNeeded(map, ['map'], infrastructure) as Map<string, any>;

      const value = proxy.get('key');
      assert.ok(infrastructure.proxyToTarget.has(value));
    });

    it('recursively wraps Map keys if they are objects', () => {
      const infrastructure = createProxyInfrastructure();
      const keyObj = { id: 1 };
      const map = new Map([[keyObj, 'value']]);
      wrapIfNeeded(map, ['map'], infrastructure);

      // Key should be wrapped
      assert.ok(infrastructure.targetToProxy.has(keyObj));
    });

    it('preserves Map size', () => {
      const infrastructure = createProxyInfrastructure();
      const map = new Map([['a', 1], ['b', 2]]);
      const proxy = wrapIfNeeded(map, [], infrastructure) as Map<string, number>;

      assert.equal(proxy.size, 2);
    });
  });

  describe('wrapIfNeeded - Set', () => {
    it('wraps Set in proxy', () => {
      const infrastructure = createProxyInfrastructure();
      const set = new Set([1, 2, 3]);
      const result = wrapIfNeeded(set, [], infrastructure);

      assert.notEqual(result, set);
      assert.ok(result instanceof Set);
    });

    it('recursively wraps Set values if they are objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj1 = { id: 1 };
      const obj2 = { id: 2 };
      const set = new Set([obj1, obj2]);
      wrapIfNeeded(set, ['set'], infrastructure);

      // Values should be wrapped
      assert.ok(infrastructure.targetToProxy.has(obj1));
      assert.ok(infrastructure.targetToProxy.has(obj2));
    });

    it('preserves Set size', () => {
      const infrastructure = createProxyInfrastructure();
      const set = new Set([1, 2, 3]);
      const proxy = wrapIfNeeded(set, [], infrastructure) as Set<number>;

      assert.equal(proxy.size, 3);
    });
  });

  describe('wrapIfNeeded - nested structures', () => {
    it('recursively wraps nested objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = {
        user: {
          profile: {
            name: 'Alice'
          }
        }
      };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      assert.ok(infrastructure.proxyToTarget.has(proxy.user));
      assert.ok(infrastructure.proxyToTarget.has(proxy.user.profile));
    });

    it('assigns correct paths to nested objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { user: { profile: { name: 'Alice' } } };
      wrapIfNeeded(obj, ['root'], infrastructure);

      // After wrapping, obj.user and obj.user.profile are proxies
      // We need to unwrap them to get the targets for path lookup
      const userProxy = (obj as any).user;
      const profileProxy = userProxy.profile;

      const userTarget = infrastructure.proxyToTarget.get(userProxy);
      const profileTarget = infrastructure.proxyToTarget.get(profileProxy);

      assertDeepEqual(infrastructure.targetToPath.get(userTarget), ['root', 'user']);
      assertDeepEqual(infrastructure.targetToPath.get(profileTarget), ['root', 'user', 'profile']);
    });

    it('wraps nested arrays', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { items: [[1, 2], [3, 4]] };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      assert.ok(infrastructure.proxyToTarget.has(proxy.items));
      assert.ok(infrastructure.proxyToTarget.has(proxy.items[0]));
      assert.ok(infrastructure.proxyToTarget.has(proxy.items[1]));
    });
  });

  describe('wrapIfNeeded - circular references', () => {
    it('handles simple circular reference', () => {
      const infrastructure = createProxyInfrastructure();
      const obj: any = { name: 'test' };
      obj.self = obj;

      const proxy = wrapIfNeeded(obj, [], infrastructure);

      // Should not infinite loop
      assert.ok(proxy);
    });

    it('handles circular reference through child', () => {
      const infrastructure = createProxyInfrastructure();
      const parent: any = { name: 'parent' };
      const child: any = { name: 'child', parent };
      parent.child = child;

      const proxy = wrapIfNeeded(parent, [], infrastructure);

      // Should not infinite loop
      assert.ok(proxy);
    });

    it('reuses same proxy for circular reference', () => {
      const infrastructure = createProxyInfrastructure();
      const obj: any = { name: 'test' };
      obj.self = obj;

      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      // self should point to the same proxy
      assert.equal(proxy.self, proxy);
    });
  });

  describe('Proxy GET trap', () => {
    it('intercepts property access', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { name: 'Alice' };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      assert.equal(proxy.name, 'Alice');
    });

    it('returns wrapped values for object properties', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { user: { name: 'Bob' } };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      assert.ok(infrastructure.proxyToTarget.has(proxy.user));
    });

    it('wraps Array mutation methods', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const arr = [1, 2];
      const proxy = wrapIfNeeded(arr, ['items'], infrastructure, eventLog, replayState) as any;

      // push should be wrapped
      const pushMethod = proxy.push;
      assert.equal(typeof pushMethod, 'function');
    });

    it('wraps Map mutation methods', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const map = new Map();
      const proxy = wrapIfNeeded(map, ['map'], infrastructure, eventLog, replayState) as any;

      // set should be wrapped
      const setMethod = proxy.set;
      assert.equal(typeof setMethod, 'function');
    });

    it('wraps Set mutation methods', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const set = new Set();
      const proxy = wrapIfNeeded(set, ['set'], infrastructure, eventLog, replayState) as any;

      // add should be wrapped
      const addMethod = proxy.add;
      assert.equal(typeof addMethod, 'function');
    });
  });

  describe('Proxy SET trap', () => {
    it('intercepts property assignment', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = {};
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      proxy.name = 'Alice';

      assert.equal(obj.name, 'Alice');
    });

    it('wraps assigned object values', () => {
      const infrastructure = createProxyInfrastructure();
      const obj: any = {};
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      proxy.user = { name: 'Bob' };

      assert.ok(infrastructure.proxyToTarget.has(obj.user));
    });

    it('logs SET event when event log provided', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const obj = {};
      const proxy = wrapIfNeeded(obj, ['root'], infrastructure, eventLog, replayState) as any;

      proxy.name = 'Alice';

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET');
      assertDeepEqual(eventLog.events[0].path, ['root', 'name']);
    });

    it('does not log during replay', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: true };
      const obj = {};
      const proxy = wrapIfNeeded(obj, [], infrastructure, eventLog, replayState) as any;

      proxy.name = 'Alice';

      assert.equal(eventLog.events.length, 0);
    });

    it('assigns correct path to new objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj: any = {};
      const proxy = wrapIfNeeded(obj, ['root'], infrastructure) as any;

      proxy.user = { name: 'Alice' };

      // obj.user is now a proxy, unwrap it to get the target
      const userProxy = obj.user;
      const userTarget = infrastructure.proxyToTarget.get(userProxy);
      assertDeepEqual(infrastructure.targetToPath.get(userTarget), ['root', 'user']);
    });
  });

  describe('Proxy DELETE trap', () => {
    it('intercepts property deletion', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = { temp: 'value' };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      delete proxy.temp;

      assert.equal('temp' in obj, false);
    });

    it('logs DELETE event when event log provided', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const obj = { temp: 'value' };
      const proxy = wrapIfNeeded(obj, ['root'], infrastructure, eventLog, replayState) as any;

      delete proxy.temp;

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'DELETE');
      assertDeepEqual(eventLog.events[0].path, ['root', 'temp']);
    });

    it('does not log during replay', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: true };
      const obj = { temp: 'value' };
      const proxy = wrapIfNeeded(obj, [], infrastructure, eventLog, replayState) as any;

      delete proxy.temp;

      assert.equal(eventLog.events.length, 0);
    });
  });

  describe('Collection method wrapping', () => {
    it('wrapped Array.push logs event', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const arr = [1, 2];
      const proxy = wrapIfNeeded(arr, ['items'], infrastructure, eventLog, replayState) as any;

      proxy.push(3);

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'ARRAY_PUSH');
    });

    it('wrapped Map.set logs event', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const map = new Map();
      const proxy = wrapIfNeeded(map, ['map'], infrastructure, eventLog, replayState) as any;

      proxy.set('key', 'value');

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'MAP_SET');
    });

    it('wrapped Set.add logs event', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const set = new Set();
      const proxy = wrapIfNeeded(set, ['set'], infrastructure, eventLog, replayState) as any;

      proxy.add(1);

      assert.equal(eventLog.events.length, 1);
      assert.equal(eventLog.events[0].type, 'SET_ADD');
    });
  });

  describe('Complex scenarios', () => {
    it('handles deeply nested mutations', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const obj = { a: { b: { c: {} } } };
      const proxy = wrapIfNeeded(obj, ['root'], infrastructure, eventLog, replayState) as any;

      proxy.a.b.c.value = 42;

      assert.equal(obj.a.b.c.value, 42);
      assert.equal(eventLog.events.length, 1);
      assertDeepEqual(eventLog.events[0].path, ['root', 'a', 'b', 'c', 'value']);
    });

    it('handles mixed mutations', () => {
      const infrastructure = createProxyInfrastructure();
      const eventLog = createMockEventLog();
      const replayState = { isReplaying: false };
      const obj: any = { arr: [1, 2], map: new Map() };
      const proxy = wrapIfNeeded(obj, ['root'], infrastructure, eventLog, replayState) as any;

      proxy.arr.push(3);
      proxy.map.set('key', 'value');
      proxy.newProp = 'test';

      assert.equal(eventLog.events.length, 3);
    });

    it('preserves object identity through mutations', () => {
      const infrastructure = createProxyInfrastructure();
      const obj: any = { user: { name: 'Alice' } };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      const user1 = proxy.user;
      const user2 = proxy.user;

      assert.equal(user1, user2);
    });
  });

  describe('Edge cases', () => {
    it('handles empty objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = {};
      const proxy = wrapIfNeeded(obj, [], infrastructure);

      assert.ok(proxy);
    });

    it('handles empty arrays', () => {
      const infrastructure = createProxyInfrastructure();
      const arr: any[] = [];
      const proxy = wrapIfNeeded(arr, [], infrastructure);

      assert.ok(proxy);
    });

    it('handles null prototype objects', () => {
      const infrastructure = createProxyInfrastructure();
      const obj = Object.create(null);
      obj.key = 'value';
      const proxy = wrapIfNeeded(obj, [], infrastructure);

      assert.ok(proxy);
    });

    it('handles objects with symbols', () => {
      const infrastructure = createProxyInfrastructure();
      const sym = Symbol('test');
      const obj = { [sym]: 'value' };
      const proxy = wrapIfNeeded(obj, [], infrastructure) as any;

      assert.equal(proxy[sym], 'value');
    });
  });
});
