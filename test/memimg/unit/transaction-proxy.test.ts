/**
 * Unit tests for transaction-proxy.ts
 *
 * Tests transaction proxy creation and delta tracking integration.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTransactionProxy } from '../../../src/memimg/transaction-proxy.js';
import { DeltaManager } from '../../../src/memimg/delta-manager.js';
import { assertDeepEqual } from '../fixtures/helpers.js';

describe('transaction-proxy', () => {
  describe('createTransactionProxy', () => {
    it('creates proxy for memory image', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.ok(proxy);
      assert.equal(proxy.name, 'Alice');
    });

    it('caches proxy for same object', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy1 = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const proxy2 = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(proxy1, proxy2);
    });

    it('registers proxy in target cache', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(targetCache.get(proxy), memimg);
    });
  });

  describe('GET trap', () => {
    it('reads from base memimg', () => {
      const memimg = { name: 'Alice', age: 30 };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(proxy.name, 'Alice');
      assert.equal(proxy.age, 30);
    });

    it('reads from delta when property modified', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Bob';

      assert.equal(proxy.name, 'Bob');
      assert.equal(memimg.name, 'Alice'); // base unchanged
    });

    it('returns undefined for deleted properties', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      assert.equal(proxy.temp, undefined);
      assert.equal(memimg.temp, 'value'); // base unchanged
    });

    it('wraps nested objects in proxies', () => {
      const memimg = { user: { name: 'Alice' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const user = proxy.user;

      // Should return a proxy
      assert.notEqual(user, memimg.user);
    });

    it('does not double-wrap proxies', () => {
      const memimg = { user: { name: 'Alice' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const user1 = proxy.user;
      const user2 = proxy.user;

      assert.equal(user1, user2);
    });

    it('passes through symbols unchanged', () => {
      const sym = Symbol('test');
      const memimg = { [sym]: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(proxy[sym], 'value');
    });
  });

  describe('SET trap', () => {
    it('stores changes in delta', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Bob';

      assert.ok(deltaManager.has('name'));
      assert.equal(deltaManager.get('name'), 'Bob');
    });

    it('does not modify base memimg', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Bob';

      assert.equal(memimg.name, 'Alice');
    });

    it('tracks nested property changes', () => {
      const memimg = { user: { name: 'Alice' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.user.name = 'Bob';

      assert.ok(deltaManager.has('user.name'));
      assert.equal(deltaManager.get('user.name'), 'Bob');
    });

    it('handles multiple changes to same property', () => {
      const memimg = { count: 0 };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.count = 1;
      proxy.count = 2;
      proxy.count = 3;

      assert.equal(proxy.count, 3);
      assert.equal(deltaManager.get('count'), 3);
    });

    it('handles adding new properties', () => {
      const memimg: any = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.age = 30;

      assert.equal(proxy.age, 30);
      assert.equal(memimg.age, undefined);
    });
  });

  describe('DELETE trap', () => {
    it('marks property as deleted in delta', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      assert.ok(deltaManager.has('temp'));
      assert.equal(deltaManager.get('temp'), deltaManager.getDeletedSymbol());
    });

    it('does not modify base memimg', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      assert.equal(memimg.temp, 'value');
    });

    it('handles deleting nested properties', () => {
      const memimg = { user: { name: 'Alice', temp: 'value' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.user.temp;

      assert.ok(deltaManager.has('user.temp'));
      assert.equal(proxy.user.temp, undefined);
    });
  });

  describe('HAS trap', () => {
    it('checks base memimg for property', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal('name' in proxy, true);
      assert.equal('age' in proxy, false);
    });

    it('returns true for added properties in delta', () => {
      const memimg: any = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.age = 30;

      assert.equal('age' in proxy, true);
    });

    it('returns false for deleted properties', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      assert.equal('temp' in proxy, false);
    });

    it('checks nested object properties', () => {
      const memimg = { user: { name: 'Alice' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal('name' in proxy.user, true);
      assert.equal('age' in proxy.user, false);
    });

    it('returns true for delta property marked as non-deleted', () => {
      const memimg: any = {};
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.newProp = 'value';

      assert.equal('newProp' in proxy, true);
      assert.ok(deltaManager.has('newProp'));
      assert.notEqual(deltaManager.get('newProp'), deltaManager.getDeletedSymbol());
    });
  });

  describe('ownKeys trap', () => {
    it('returns base keys', () => {
      const memimg = { name: 'Alice', age: 30 };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const keys = Object.keys(proxy);

      assertDeepEqual(keys.sort(), ['age', 'name']);
    });

    it('includes added keys from delta', () => {
      const memimg: any = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.age = 30;

      const keys = Object.keys(proxy);
      assert.ok(keys.includes('name'));
      assert.ok(keys.includes('age'));
    });

    it('excludes deleted keys', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      const keys = Object.keys(proxy);
      assert.ok(keys.includes('name'));
      assert.ok(!keys.includes('temp'));
    });

    it('handles nested object keys', () => {
      const memimg = { user: { name: 'Alice', age: 30 } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const userKeys = Object.keys(proxy.user);

      assert.ok(userKeys.includes('name'));
      assert.ok(userKeys.includes('age'));
    });

    it('combines base and delta keys without duplicates', () => {
      const memimg: any = { a: 1, b: 2 };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.c = 3;
      proxy.d = 4;

      const keys = Object.keys(proxy);
      assert.equal(keys.length, 4);
      assert.ok(keys.includes('a'));
      assert.ok(keys.includes('b'));
      assert.ok(keys.includes('c'));
      assert.ok(keys.includes('d'));
    });

    it('handles complex delta operations on keys', () => {
      const memimg: any = { a: 1, b: 2, c: 3 };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.b;
      proxy.d = 4;

      const keys = Object.keys(proxy);
      assert.ok(keys.includes('a'));
      assert.ok(!keys.includes('b'));
      assert.ok(keys.includes('c'));
      assert.ok(keys.includes('d'));
    });
  });

  describe('getOwnPropertyDescriptor trap', () => {
    it('returns descriptor for base properties', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'name');

      assert.ok(descriptor);
      assert.equal(descriptor.value, 'Alice');
      assert.equal(descriptor.writable, true);
      assert.equal(descriptor.enumerable, true);
      assert.equal(descriptor.configurable, true);
    });

    it('returns descriptor for delta properties', () => {
      const memimg: any = {};
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Alice';

      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'name');
      assert.ok(descriptor);
      assert.equal(descriptor.value, 'Alice');
      assert.equal(descriptor.writable, true);
      assert.equal(descriptor.enumerable, true);
      assert.equal(descriptor.configurable, true);
    });

    it('returns undefined for deleted properties', () => {
      const memimg = { name: 'Alice', temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      delete proxy.temp;

      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'temp');
      assert.equal(descriptor, undefined);
    });

    it('returns descriptor for nested properties', () => {
      const memimg = { user: { name: 'Alice' } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const descriptor = Object.getOwnPropertyDescriptor(proxy.user, 'name');

      assert.ok(descriptor);
      assert.equal(descriptor.value, 'Alice');
    });

    it('returns descriptor for modified delta properties', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Bob';

      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'name');
      assert.ok(descriptor);
      assert.equal(descriptor.value, 'Bob');
    });

    it('returns undefined for non-existent properties', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const descriptor = Object.getOwnPropertyDescriptor(proxy, 'nonexistent');

      assert.equal(descriptor, undefined);
    });
  });

  describe('Array method interception', () => {
    it('intercepts array push', () => {
      const memimg = { items: [1, 2] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.items.push(3);

      assert.ok(deltaManager.has('items'));
      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [1, 2, 3]);
      assertDeepEqual(memimg.items, [1, 2]); // base unchanged
    });

    it('intercepts array pop', () => {
      const memimg = { items: [1, 2, 3] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const result = proxy.items.pop();

      assert.equal(result, 3);
      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [1, 2]);
      assertDeepEqual(memimg.items, [1, 2, 3]); // base unchanged
    });

    it('intercepts array shift', () => {
      const memimg = { items: [1, 2, 3] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const result = proxy.items.shift();

      assert.equal(result, 1);
      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [2, 3]);
    });

    it('intercepts array unshift', () => {
      const memimg = { items: [2, 3] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.items.unshift(1);

      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [1, 2, 3]);
    });

    it('intercepts array splice', () => {
      const memimg = { items: [1, 2, 3, 4] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.items.splice(1, 2, 5, 6);

      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [1, 5, 6, 4]);
    });

    it('intercepts array sort', () => {
      const memimg = { items: [3, 1, 2] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.items.sort();

      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [1, 2, 3]);
      assertDeepEqual(memimg.items, [3, 1, 2]); // base unchanged
    });

    it('intercepts array reverse', () => {
      const memimg = { items: [1, 2, 3] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.items.reverse();

      const deltaItems = deltaManager.get('items') as number[];
      assertDeepEqual(deltaItems, [3, 2, 1]);
    });

    it('binds non-mutating array methods correctly', () => {
      const memimg = { items: [1, 2, 3] };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      const mapped = proxy.items.map((x: number) => x * 2);

      assertDeepEqual(mapped, [2, 4, 6]);
      assertDeepEqual(memimg.items, [1, 2, 3]); // unchanged
    });
  });

  describe('Complex scenarios', () => {
    it('handles deep nested changes', () => {
      const memimg = { a: { b: { c: { d: 1 } } } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.a.b.c.d = 42;

      assert.equal(proxy.a.b.c.d, 42);
      assert.equal(memimg.a.b.c.d, 1); // base unchanged
    });

    it('handles mixed operations', () => {
      const memimg: any = { name: 'Alice', items: [1, 2], temp: 'value' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.name = 'Bob';
      proxy.items.push(3);
      delete proxy.temp;
      proxy.age = 30;

      assert.equal(proxy.name, 'Bob');
      assertDeepEqual(proxy.items, [1, 2, 3]);
      assert.equal(proxy.temp, undefined);
      assert.equal(proxy.age, 30);

      // Base unchanged
      assert.equal(memimg.name, 'Alice');
      assertDeepEqual(memimg.items, [1, 2]);
      assert.equal(memimg.temp, 'value');
      assert.equal(memimg.age, undefined);
    });

    it('maintains delta count correctly', () => {
      const memimg: any = {};
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.a = 1;
      proxy.b = 2;
      proxy.c = 3;

      assert.equal(deltaManager.size(), 3);
    });
  });

  describe('Edge cases', () => {
    it('handles empty object', () => {
      const memimg = {};
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.ok(proxy);
    });

    it('handles null prototype objects', () => {
      const memimg = Object.create(null);
      memimg.key = 'value';
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(proxy.key, 'value');
    });

    it('handles reading undefined properties', () => {
      const memimg = { name: 'Alice' };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);

      assert.equal(proxy.nonexistent, undefined);
    });

    it('handles multiple proxy levels', () => {
      const memimg = { user: { profile: { name: 'Alice' } } };
      const deltaManager = new DeltaManager();
      const proxyCache = new WeakMap();
      const targetCache = new WeakMap();

      const proxy = createTransactionProxy(memimg, deltaManager, [], proxyCache, targetCache);
      proxy.user.profile.name = 'Bob';

      assert.equal(proxy.user.profile.name, 'Bob');
      assert.equal(memimg.user.profile.name, 'Alice');
    });
  });
});
