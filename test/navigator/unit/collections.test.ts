/**
 * Unit tests for Collection Adapters
 *
 * Tests unified interface for Array/Map/Set navigation.
 * ~60 tests covering all collection types.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  getCollectionAdapter,
  isCollection,
} from '../../../dist/navigator/collections.js';
import { COLLECTION_TEST_DATA } from './fixtures/test-data.js';
import { pathsEqual } from './fixtures/helpers.js';

describe('Collection Adapters', () => {
  // ==========================================================================
  // Array Adapter
  // ==========================================================================

  describe('ArrayAdapter', () => {
    describe('getChildren', () => {
      it('returns empty array for empty array', () => {
        const adapter = getCollectionAdapter([]);
        assert.ok(adapter);

        const children = adapter.getChildren([]);
        assert.equal(children.length, 0);
      });

      it('returns indexed children for simple array', () => {
        const arr = [1, 2, 3, 4, 5];
        const adapter = getCollectionAdapter(arr);
        assert.ok(adapter);

        const children = adapter.getChildren(arr);

        assert.equal(children.length, 5);
        assert.equal(children[0]![0], '[0]');
        assert.equal(children[0]![1], 1);
        assert.equal(children[4]![0], '[4]');
        assert.equal(children[4]![1], 5);
      });

      it('returns children for nested array', () => {
        const arr = COLLECTION_TEST_DATA.nestedArray;
        const adapter = getCollectionAdapter(arr);
        assert.ok(adapter);

        const children = adapter.getChildren(arr);

        assert.equal(children.length, 3);
        assert.equal(children[0]![0], '[0]');
        assert.deepEqual(children[0]![1], [1, 2]);
      });

      it('returns children for object array', () => {
        const arr = COLLECTION_TEST_DATA.objectArray;
        const adapter = getCollectionAdapter(arr);
        assert.ok(adapter);

        const children = adapter.getChildren(arr);

        assert.equal(children.length, 3);
        assert.equal(children[0]![0], '[0]');
        assert.deepEqual(children[0]![1], { id: 1, name: 'Alice' });
      });

      it('handles sparse arrays', () => {
        const sparse = [];
        sparse[0] = 'a';
        sparse[5] = 'b';
        sparse[10] = 'c';

        const adapter = getCollectionAdapter(sparse);
        assert.ok(adapter);

        const children = adapter.getChildren(sparse);

        // Sparse arrays still report length
        assert.equal(children.length, 11);
        assert.equal(children[0]![1], 'a');
        assert.equal(children[5]![1], 'b');
        assert.equal(children[10]![1], 'c');
      });

      it('handles arrays with mixed types', () => {
        const mixed = [1, 'hello', true, null, { a: 1 }, [1, 2]];
        const adapter = getCollectionAdapter(mixed);
        assert.ok(adapter);

        const children = adapter.getChildren(mixed);

        assert.equal(children.length, 6);
        assert.equal(children[1]![1], 'hello');
        assert.equal(children[2]![1], true);
        assert.equal(children[3]![1], null);
      });
    });

    describe('createChildPath', () => {
      it('creates numeric string path for array index', () => {
        const adapter = getCollectionAdapter([]);
        assert.ok(adapter);

        const path = adapter.createChildPath(['root', 'items'], 0);
        assert.ok(pathsEqual(path, ['root', 'items', '0']));
      });

      it('creates paths for multiple indices', () => {
        const adapter = getCollectionAdapter([]);
        assert.ok(adapter);

        assert.ok(pathsEqual(adapter.createChildPath(['root'], 0), ['root', '0']));
        assert.ok(pathsEqual(adapter.createChildPath(['root'], 5), ['root', '5']));
        assert.ok(pathsEqual(adapter.createChildPath(['root'], 99), ['root', '99']));
      });

      it('preserves parent path', () => {
        const adapter = getCollectionAdapter([]);
        assert.ok(adapter);

        const parent = ['root', 'nested', 'array'];
        const child = adapter.createChildPath(parent, 0);

        assert.ok(pathsEqual(child, ['root', 'nested', 'array', '0']));
        // Parent should be unchanged
        assert.equal(parent.length, 3);
      });
    });
  });

  // ==========================================================================
  // Map Adapter
  // ==========================================================================

  describe('MapAdapter', () => {
    describe('getChildren', () => {
      it('returns empty array for empty map', () => {
        const adapter = getCollectionAdapter(new Map());
        assert.ok(adapter);

        const children = adapter.getChildren(new Map());
        assert.equal(children.length, 0);
      });

      it('returns key-value children for simple map', () => {
        const map = COLLECTION_TEST_DATA.simpleMap;
        const adapter = getCollectionAdapter(map);
        assert.ok(adapter);

        const children = adapter.getChildren(map);

        assert.equal(children.length, 3);
        assert.equal(children[0]![0], 'a');
        assert.equal(children[0]![1], 1);
        assert.equal(children[1]![0], 'b');
        assert.equal(children[1]![1], 2);
      });

      it('returns children for nested map', () => {
        const map = COLLECTION_TEST_DATA.nestedMap;
        const adapter = getCollectionAdapter(map);
        assert.ok(adapter);

        const children = adapter.getChildren(map);

        assert.equal(children.length, 2);
        assert.equal(children[0]![0], 'outer');
        assert.ok(children[0]![1] instanceof Map);
      });

      it('handles numeric keys', () => {
        const map = new Map([[1, 'one'], [2, 'two'], [3, 'three']]);
        const adapter = getCollectionAdapter(map);
        assert.ok(adapter);

        const children = adapter.getChildren(map);

        assert.equal(children.length, 3);
        assert.equal(children[0]![0], '1');
        assert.equal(children[0]![1], 'one');
      });

      it('handles object keys', () => {
        const key1 = { id: 1 };
        const key2 = { id: 2 };
        const map = new Map([[key1, 'value1'], [key2, 'value2']]);
        const adapter = getCollectionAdapter(map);
        assert.ok(adapter);

        const children = adapter.getChildren(map);

        assert.equal(children.length, 2);
        // Object keys are stringified
        assert.ok(children[0]![0].includes('object'));
      });

      it('preserves insertion order', () => {
        const map = new Map([['z', 1], ['a', 2], ['m', 3]]);
        const adapter = getCollectionAdapter(map);
        assert.ok(adapter);

        const children = adapter.getChildren(map);

        assert.equal(children[0]![0], 'z');
        assert.equal(children[1]![0], 'a');
        assert.equal(children[2]![0], 'm');
      });
    });

    describe('createChildPath', () => {
      it('creates map:N path for map entry', () => {
        const adapter = getCollectionAdapter(new Map());
        assert.ok(adapter);

        const path = adapter.createChildPath(['root', 'map'], 0);
        assert.ok(pathsEqual(path, ['root', 'map', 'map:0']));
      });

      it('creates paths for multiple indices', () => {
        const adapter = getCollectionAdapter(new Map());
        assert.ok(adapter);

        assert.ok(pathsEqual(adapter.createChildPath(['root'], 0), ['root', 'map:0']));
        assert.ok(pathsEqual(adapter.createChildPath(['root'], 5), ['root', 'map:5']));
      });
    });
  });

  // ==========================================================================
  // Set Adapter
  // ==========================================================================

  describe('SetAdapter', () => {
    describe('getChildren', () => {
      it('returns empty array for empty set', () => {
        const adapter = getCollectionAdapter(new Set());
        assert.ok(adapter);

        const children = adapter.getChildren(new Set());
        assert.equal(children.length, 0);
      });

      it('returns indexed children for simple set', () => {
        const set = COLLECTION_TEST_DATA.simpleSet;
        const adapter = getCollectionAdapter(set);
        assert.ok(adapter);

        const children = adapter.getChildren(set);

        assert.equal(children.length, 5);
        assert.equal(children[0]![0], '[0]');
        assert.equal(children[0]![1], 1);
        assert.equal(children[4]![0], '[4]');
        assert.equal(children[4]![1], 5);
      });

      it('returns children for object set', () => {
        const set = COLLECTION_TEST_DATA.objectSet;
        const adapter = getCollectionAdapter(set);
        assert.ok(adapter);

        const children = adapter.getChildren(set);

        assert.equal(children.length, 3);
        assert.equal(children[0]![0], '[0]');
        assert.deepEqual(children[0]![1], { id: 1 });
      });

      it('preserves insertion order', () => {
        const set = new Set(['z', 'a', 'm']);
        const adapter = getCollectionAdapter(set);
        assert.ok(adapter);

        const children = adapter.getChildren(set);

        assert.equal(children[0]![1], 'z');
        assert.equal(children[1]![1], 'a');
        assert.equal(children[2]![1], 'm');
      });

      it('handles mixed type set', () => {
        const set = new Set([1, 'hello', true, { a: 1 }]);
        const adapter = getCollectionAdapter(set);
        assert.ok(adapter);

        const children = adapter.getChildren(set);

        assert.equal(children.length, 4);
        assert.equal(children[0]![1], 1);
        assert.equal(children[1]![1], 'hello');
        assert.equal(children[2]![1], true);
      });
    });

    describe('createChildPath', () => {
      it('creates set:N path for set entry', () => {
        const adapter = getCollectionAdapter(new Set());
        assert.ok(adapter);

        const path = adapter.createChildPath(['root', 'set'], 0);
        assert.ok(pathsEqual(path, ['root', 'set', 'set:0']));
      });

      it('creates paths for multiple indices', () => {
        const adapter = getCollectionAdapter(new Set());
        assert.ok(adapter);

        assert.ok(pathsEqual(adapter.createChildPath(['root'], 0), ['root', 'set:0']));
        assert.ok(pathsEqual(adapter.createChildPath(['root'], 5), ['root', 'set:5']));
      });
    });
  });

  // ==========================================================================
  // getCollectionAdapter
  // ==========================================================================

  describe('getCollectionAdapter', () => {
    it('returns ArrayAdapter for array', () => {
      const adapter = getCollectionAdapter([1, 2, 3]);
      assert.ok(adapter);

      const children = adapter.getChildren([1, 2, 3]);
      assert.equal(children[0]![0], '[0]');
    });

    it('returns MapAdapter for Map', () => {
      const adapter = getCollectionAdapter(new Map([['key', 'value']]));
      assert.ok(adapter);

      const path = adapter.createChildPath(['root'], 0);
      assert.ok(path[path.length - 1]!.startsWith('map:'));
    });

    it('returns SetAdapter for Set', () => {
      const adapter = getCollectionAdapter(new Set([1, 2, 3]));
      assert.ok(adapter);

      const path = adapter.createChildPath(['root'], 0);
      assert.ok(path[path.length - 1]!.startsWith('set:'));
    });

    it('returns null for non-collection', () => {
      assert.equal(getCollectionAdapter({}), null);
      assert.equal(getCollectionAdapter(null), null);
      assert.equal(getCollectionAdapter(undefined), null);
      assert.equal(getCollectionAdapter(42), null);
      assert.equal(getCollectionAdapter('hello'), null);
      assert.equal(getCollectionAdapter(true), null);
    });

    it('returns null for Date (not a collection)', () => {
      assert.equal(getCollectionAdapter(new Date()), null);
    });

    it('returns null for Function (not a collection)', () => {
      assert.equal(getCollectionAdapter(() => {}), null);
    });
  });

  // ==========================================================================
  // isCollection
  // ==========================================================================

  describe('isCollection', () => {
    it('returns true for array', () => {
      assert.equal(isCollection([]), true);
      assert.equal(isCollection([1, 2, 3]), true);
    });

    it('returns true for Map', () => {
      assert.equal(isCollection(new Map()), true);
      assert.equal(isCollection(new Map([['key', 'value']])), true);
    });

    it('returns true for Set', () => {
      assert.equal(isCollection(new Set()), true);
      assert.equal(isCollection(new Set([1, 2, 3])), true);
    });

    it('returns false for plain object', () => {
      assert.equal(isCollection({}), false);
      assert.equal(isCollection({ a: 1 }), false);
    });

    it('returns false for primitives', () => {
      assert.equal(isCollection(null), false);
      assert.equal(isCollection(undefined), false);
      assert.equal(isCollection(42), false);
      assert.equal(isCollection('hello'), false);
      assert.equal(isCollection(true), false);
    });

    it('returns false for Date', () => {
      assert.equal(isCollection(new Date()), false);
    });

    it('returns false for Function', () => {
      assert.equal(isCollection(() => {}), false);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles very large arrays', () => {
      const large = Array.from({ length: 10000 }, (_, i) => i);
      const adapter = getCollectionAdapter(large);
      assert.ok(adapter);

      const children = adapter.getChildren(large);
      assert.equal(children.length, 10000);
    });

    it('handles very large maps', () => {
      const large = new Map();
      for (let i = 0; i < 10000; i++) {
        large.set(`key${i}`, i);
      }

      const adapter = getCollectionAdapter(large);
      assert.ok(adapter);

      const children = adapter.getChildren(large);
      assert.equal(children.length, 10000);
    });

    it('handles very large sets', () => {
      const large = new Set();
      for (let i = 0; i < 10000; i++) {
        large.add(i);
      }

      const adapter = getCollectionAdapter(large);
      assert.ok(adapter);

      const children = adapter.getChildren(large);
      assert.equal(children.length, 10000);
    });

    it('handles arrays with undefined values', () => {
      const arr = [1, undefined, 3];
      const adapter = getCollectionAdapter(arr);
      assert.ok(adapter);

      const children = adapter.getChildren(arr);
      assert.equal(children[1]![1], undefined);
    });

    it('handles maps with undefined values', () => {
      const map = new Map([['key', undefined]]);
      const adapter = getCollectionAdapter(map);
      assert.ok(adapter);

      const children = adapter.getChildren(map);
      assert.equal(children[0]![1], undefined);
    });

    it('handles sets with objects (identity)', () => {
      const obj1 = { id: 1 };
      const obj2 = { id: 1 }; // Different object, same value
      const set = new Set([obj1, obj2]);

      const adapter = getCollectionAdapter(set);
      assert.ok(adapter);

      const children = adapter.getChildren(set);
      // Set maintains identity, so both objects are present
      assert.equal(children.length, 2);
    });
  });
});
