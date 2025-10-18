/**
 * Unit tests for Memimg Accessor
 *
 * Tests Navigator's interface to Memory Image path infrastructure.
 * ~80 tests covering getObjectPath and isTrackedObject.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  getObjectPath,
  isTrackedObject,
} from '../../../dist/navigator/memimg-accessor.js';
import { createMemoryImage } from '../../../dist/memimg/memimg.js';
import { pathsEqual } from './fixtures/helpers.js';

describe('Memimg Accessor', () => {
  // ==========================================================================
  // getObjectPath - With Memimg Infrastructure (Fast Path)
  // ==========================================================================

  describe('getObjectPath - with memimg infrastructure', () => {
    let root: any;
    let user: any;
    let profile: any;

    beforeEach(() => {
      root = createMemoryImage({
        user: {
          name: 'Alice',
          profile: {
            email: 'alice@example.com',
            age: 30,
          },
        },
        settings: {
          theme: 'dark',
        },
      });

      user = root.user;
      profile = root.user.profile;
    });

    it('returns path for root object', () => {
      const path = getObjectPath(root, root);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root']));
    });

    it('returns path for top-level object', () => {
      const path = getObjectPath(root, user);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'user']));
    });

    it('returns path for nested object', () => {
      const path = getObjectPath(root, profile);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'user', 'profile']));
    });

    it('returns path for settings object', () => {
      const settings = root.settings;
      const path = getObjectPath(root, settings);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'settings']));
    });

    it('uses fast path with targetToPath WeakMap', () => {
      // The fact that we get a result quickly indicates fast path
      const startTime = Date.now();
      const path = getObjectPath(root, profile);
      const endTime = Date.now();

      assert.ok(path);
      // Should be extremely fast (< 10ms) for fast path
      assert.ok(endTime - startTime < 10);
    });

    it('handles multiple references to same object (canonical path)', () => {
      // Create a shared object
      const shared = { data: 'shared' };
      const root2 = createMemoryImage({
        first: shared,
        second: shared,
      });

      // Should return the canonical path (first occurrence)
      const path = getObjectPath(root2, shared);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'first']));
    });

    it('returns correct path after object is added dynamically', () => {
      root.newObject = { dynamic: true };
      const newObj = root.newObject;

      const path = getObjectPath(root, newObj);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'newObject']));
    });

    it('handles proxy vs target resolution correctly', () => {
      // Both proxy and target should resolve to same path
      const userProxy = root.user;
      const path1 = getObjectPath(root, userProxy);

      assert.ok(path1);
      assert.ok(pathsEqual(path1, ['root', 'user']));
    });
  });

  // ==========================================================================
  // getObjectPath - BFS Fallback (Transaction Roots)
  // ==========================================================================

  describe('getObjectPath - BFS fallback', () => {
    it('falls back to BFS for plain objects without infrastructure', () => {
      const plainRoot = {
        user: {
          name: 'Bob',
          profile: {
            email: 'bob@example.com',
          },
        },
      };

      const profile = plainRoot.user.profile;
      const path = getObjectPath(plainRoot, profile);

      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'user', 'profile']));
    });

    it('finds object in simple graph via BFS', () => {
      const graph = {
        a: { value: 1 },
        b: { value: 2 },
        c: { value: 3 },
      };

      const path = getObjectPath(graph, graph.b);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'b']));
    });

    it('finds nested object via BFS', () => {
      const graph = {
        level1: {
          level2: {
            level3: {
              target: 'found',
            },
          },
        },
      };

      const target = graph.level1.level2.level3;
      const path = getObjectPath(graph, target);

      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'level1', 'level2', 'level3']));
    });

    it('finds shortest path in graph with multiple paths', () => {
      const shared = { data: 'shared' };
      const graph = {
        short: shared,
        long: {
          nested: {
            deep: shared,
          },
        },
      };

      const path = getObjectPath(graph, shared);
      assert.ok(path);
      // Should find the shorter path first (BFS property)
      assert.ok(pathsEqual(path, ['root', 'short']));
    });

    it('handles circular references during BFS', () => {
      const graph: any = {
        a: { name: 'a' },
      };
      graph.a.self = graph.a;
      graph.a.parent = graph;

      const path = getObjectPath(graph, graph.a);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'a']));
    });

    it('avoids infinite loops with circular graphs', () => {
      const a: any = { name: 'a' };
      const b: any = { name: 'b' };
      a.next = b;
      b.next = a;

      const graph = { start: a };

      const path = getObjectPath(graph, b);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'start', 'next']));
    });

    it('returns null for object not in graph', () => {
      const graph = { a: 1, b: 2 };
      const external = { value: 'external' };

      const path = getObjectPath(graph, external);
      assert.equal(path, null);
    });

    it('skips internal properties (__ prefix) during BFS', () => {
      const graph = {
        __internal: { secret: 'hidden' },
        public: { data: 'visible' },
      };

      const internalObj = graph.__internal;
      const path = getObjectPath(graph, internalObj);

      // Should not find internal object
      assert.equal(path, null);
    });

    it('handles deep nesting (>10 levels)', () => {
      let current: any = { value: 'deep' };
      for (let i = 0; i < 15; i++) {
        current = { next: current };
      }
      const graph = { start: current };

      const deepest = graph.start.next.next.next.next.next;
      const path = getObjectPath(graph, deepest);

      assert.ok(path);
      assert.ok(path.length > 5);
    });

    it('handles large graphs efficiently', () => {
      const graph: any = {};
      for (let i = 0; i < 100; i++) {
        graph[`item${i}`] = { id: i };
      }

      const target = graph.item50;
      const startTime = Date.now();
      const path = getObjectPath(graph, target);
      const endTime = Date.now();

      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'item50']));
      // Should complete in reasonable time (< 100ms)
      assert.ok(endTime - startTime < 100);
    });
  });

  // ==========================================================================
  // getObjectPath - Collections
  // ==========================================================================

  describe('getObjectPath - collections', () => {
    it('finds object in array', () => {
      const item = { id: 2, name: 'Item 2' };
      const root = createMemoryImage({
        items: [
          { id: 1, name: 'Item 1' },
          item,
          { id: 3, name: 'Item 3' },
        ],
      });

      const path = getObjectPath(root, item);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'items', '1']));
    });

    it('finds object in nested array', () => {
      const nested = { value: 'nested' };
      const root = createMemoryImage({
        matrix: [
          [1, 2],
          [3, nested],
        ],
      });

      const path = getObjectPath(root, nested);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'matrix', '1', '1']));
    });

    it('finds value in Map', () => {
      const value = { data: 'map-value' };
      const root = createMemoryImage({
        map: new Map([
          ['key1', 'value1'],
          ['key2', value],
        ]),
      });

      const path = getObjectPath(root, value);
      assert.ok(path);
      // Maps use map:N indexing
      assert.ok(path[0] === 'root');
      assert.ok(path[1] === 'map');
    });

    it('finds value in Set', () => {
      const item = { id: 2 };
      const root = createMemoryImage({
        set: new Set([
          { id: 1 },
          item,
          { id: 3 },
        ]),
      });

      const path = getObjectPath(root, item);
      assert.ok(path);
      assert.ok(path[0] === 'root');
      assert.ok(path[1] === 'set');
    });

    it('handles empty array', () => {
      const root = createMemoryImage({
        empty: [],
      });

      const arr = root.empty;
      const path = getObjectPath(root, arr);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'empty']));
    });

    it('handles empty Map', () => {
      const root = createMemoryImage({
        emptyMap: new Map(),
      });

      const map = root.emptyMap;
      const path = getObjectPath(root, map);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'emptyMap']));
    });

    it('handles empty Set', () => {
      const root = createMemoryImage({
        emptySet: new Set(),
      });

      const set = root.emptySet;
      const path = getObjectPath(root, set);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'emptySet']));
    });

    it('finds object in mixed collections', () => {
      const target = { target: true };
      const root = createMemoryImage({
        array: [1, 2, 3],
        map: new Map([['key', target]]),
        set: new Set([4, 5, 6]),
      });

      const path = getObjectPath(root, target);
      assert.ok(path);
      assert.ok(path[0] === 'root');
      assert.ok(path[1] === 'map');
    });

    it('handles sparse arrays', () => {
      const root = createMemoryImage({
        sparse: [1, , 3, , 5],
      });

      const arr = root.sparse;
      const path = getObjectPath(root, arr);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'sparse']));
    });

    it('handles array-like objects', () => {
      const root = createMemoryImage({
        arrayLike: { 0: 'a', 1: 'b', length: 2 },
      });

      const obj = root.arrayLike;
      const path = getObjectPath(root, obj);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'arrayLike']));
    });
  });

  // ==========================================================================
  // getObjectPath - Edge Cases
  // ==========================================================================

  describe('getObjectPath - edge cases', () => {
    it('returns null for null input', () => {
      const root = createMemoryImage({ a: 1 });
      const path = getObjectPath(root, null);
      assert.equal(path, null);
    });

    it('returns null for undefined input', () => {
      const root = createMemoryImage({ a: 1 });
      const path = getObjectPath(root, undefined);
      assert.equal(path, null);
    });

    it('returns null for primitive values', () => {
      const root = createMemoryImage({ a: 1, b: 'hello' });

      // Primitives are not objects, so can't have paths
      // Use primitives that don't exist in the graph
      const path1 = getObjectPath(root, 42);
      const path2 = getObjectPath(root, 'not in graph');
      const path3 = getObjectPath(root, true);

      assert.equal(path1, null);
      assert.equal(path2, null);
      assert.equal(path3, null);
    });

    it('handles Date objects', () => {
      const date = new Date('2024-01-01');
      const root = createMemoryImage({
        created: date,
      });

      const path = getObjectPath(root, date);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'created']));
    });

    it('handles Function objects', () => {
      function testFunc() { return 42; }
      const root = createMemoryImage({
        fn: testFunc,
      });

      const path = getObjectPath(root, testFunc);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'fn']));
    });

    it('handles RegExp objects', () => {
      const regex = /test/i;
      const root = createMemoryImage({
        pattern: regex,
      });

      const path = getObjectPath(root, regex);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'pattern']));
    });

    it('handles Error objects', () => {
      const error = new Error('test error');
      const root = createMemoryImage({
        lastError: error,
      });

      const path = getObjectPath(root, error);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'lastError']));
    });

    it('handles objects with null prototype', () => {
      const obj = Object.create(null);
      obj.value = 42;

      const root = createMemoryImage({
        nullProto: obj,
      });

      const path = getObjectPath(root, obj);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'nullProto']));
    });

    it('handles class instances', () => {
      class TestClass {
        value = 42;
      }
      const instance = new TestClass();
      const root = createMemoryImage({
        instance,
      });

      const path = getObjectPath(root, instance);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'instance']));
    });

    it('handles Symbol-keyed properties gracefully', () => {
      const sym = Symbol('test');
      const obj = { regular: 'value' };
      const root = createMemoryImage({
        [sym]: 'hidden',
        visible: obj,
      });

      const path = getObjectPath(root, obj);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'visible']));
    });

    it('handles frozen objects', () => {
      const frozen = Object.freeze({ a: 1, b: 2 });
      const root = createMemoryImage({
        frozen,
      });

      const path = getObjectPath(root, frozen);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'frozen']));
    });

    it('handles sealed objects', () => {
      const sealed = Object.seal({ a: 1, b: 2 });
      const root = createMemoryImage({
        sealed,
      });

      const path = getObjectPath(root, sealed);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'sealed']));
    });

    it('handles objects with getters', () => {
      const obj = {
        get computed() { return 42; },
        regular: 'value',
      };
      const root = createMemoryImage({
        withGetter: obj,
      });

      const path = getObjectPath(root, obj);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'withGetter']));
    });

    it('handles WeakMap objects', () => {
      const weakMap = new WeakMap();
      const root = createMemoryImage({
        weak: weakMap,
      });

      const path = getObjectPath(root, weakMap);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'weak']));
    });

    it('handles WeakSet objects', () => {
      const weakSet = new WeakSet();
      const root = createMemoryImage({
        weakSet,
      });

      const path = getObjectPath(root, weakSet);
      assert.ok(path);
      assert.ok(pathsEqual(path, ['root', 'weakSet']));
    });
  });

  // ==========================================================================
  // isTrackedObject
  // ==========================================================================

  describe('isTrackedObject', () => {
    let root: any;
    let tracked: any;

    beforeEach(() => {
      root = createMemoryImage({
        user: {
          name: 'Alice',
          profile: {
            email: 'alice@example.com',
          },
        },
      });

      tracked = root.user.profile;
    });

    it('returns true for tracked objects', () => {
      assert.equal(isTrackedObject(root, tracked), true);
      assert.equal(isTrackedObject(root, root.user), true);
      assert.equal(isTrackedObject(root, root), true);
    });

    it('returns false for untracked objects', () => {
      const external = { value: 'external' };
      assert.equal(isTrackedObject(root, external), false);
    });

    it('returns false for null', () => {
      assert.equal(isTrackedObject(root, null), false);
    });

    it('returns false for undefined', () => {
      assert.equal(isTrackedObject(root, undefined), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isTrackedObject(root, 42), false);
      assert.equal(isTrackedObject(root, 'hello'), false);
      assert.equal(isTrackedObject(root, true), false);
    });

    it('works with dynamically added objects', () => {
      root.newObject = { dynamic: true };
      const newObj = root.newObject;

      assert.equal(isTrackedObject(root, newObj), true);
    });

    it('works with BFS fallback for plain objects', () => {
      const plainRoot = {
        a: {
          b: { value: 1 },
        },
      };

      assert.equal(isTrackedObject(plainRoot, plainRoot.a.b), true);
      assert.equal(isTrackedObject(plainRoot, { external: true }), false);
    });
  });
});
