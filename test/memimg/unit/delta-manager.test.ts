/**
 * Unit tests for delta-manager.ts
 *
 * Tests delta tracking for transaction isolation.
 * Coverage: All public methods, checkpoint/restore, edge cases
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { DeltaManager } from '../../../src/memimg/delta-manager.js';
import { assertDeepEqual } from '../fixtures/helpers.js';

describe('delta-manager', () => {
  describe('initialization', () => {
    it('creates empty delta manager', () => {
      const dm = new DeltaManager();
      assert.equal(dm.isDirty(), false);
      assert.equal(dm.size(), 0);
    });

    it('provides DELETED symbol', () => {
      const dm = new DeltaManager();
      const symbol = dm.getDeletedSymbol();
      assert.equal(typeof symbol, 'symbol');
    });

    it('DELETED symbol is consistent', () => {
      const dm = new DeltaManager();
      const s1 = dm.getDeletedSymbol();
      const s2 = dm.getDeletedSymbol();
      assert.equal(s1, s2);
    });
  });

  describe('isDirty / size', () => {
    it('isDirty returns false when empty', () => {
      const dm = new DeltaManager();
      assert.equal(dm.isDirty(), false);
    });

    it('isDirty returns true after set', () => {
      const dm = new DeltaManager();
      dm.set('a.b', 'value');
      assert.equal(dm.isDirty(), true);
    });

    it('size returns 0 when empty', () => {
      const dm = new DeltaManager();
      assert.equal(dm.size(), 0);
    });

    it('size increases with each set', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      assert.equal(dm.size(), 1);
      dm.set('b', 2);
      assert.equal(dm.size(), 2);
    });

    it('size remains same for duplicate sets', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.set('a', 2);
      assert.equal(dm.size(), 1);
    });
  });

  describe('has / get / set', () => {
    it('has returns false for missing paths', () => {
      const dm = new DeltaManager();
      assert.equal(dm.has('a.b'), false);
    });

    it('has returns true after set', () => {
      const dm = new DeltaManager();
      dm.set('a.b', 'value');
      assert.equal(dm.has('a.b'), true);
    });

    it('get returns undefined for missing paths', () => {
      const dm = new DeltaManager();
      assert.equal(dm.get('a.b'), undefined);
    });

    it('get returns value after set', () => {
      const dm = new DeltaManager();
      dm.set('a.b', 'test');
      assert.equal(dm.get('a.b'), 'test');
    });

    it('set stores values correctly', () => {
      const dm = new DeltaManager();
      dm.set('user.name', 'Alice');
      dm.set('user.age', 30);
      assert.equal(dm.get('user.name'), 'Alice');
      assert.equal(dm.get('user.age'), 30);
    });

    it('set overwrites existing values', () => {
      const dm = new DeltaManager();
      dm.set('key', 'old');
      dm.set('key', 'new');
      assert.equal(dm.get('key'), 'new');
    });

    it('handles object values', () => {
      const dm = new DeltaManager();
      const obj = { nested: 'value' };
      dm.set('path', obj);
      assert.equal(dm.get('path'), obj);
    });

    it('handles array values', () => {
      const dm = new DeltaManager();
      const arr = [1, 2, 3];
      dm.set('path', arr);
      assertDeepEqual(dm.get('path'), arr);
    });
  });

  describe('delete / isDeleted', () => {
    it('delete marks path with DELETED symbol', () => {
      const dm = new DeltaManager();
      dm.delete('a.b');
      assert.equal(dm.has('a.b'), true);
      assert.equal(dm.isDeleted('a.b'), true);
    });

    it('isDeleted returns true for deleted paths', () => {
      const dm = new DeltaManager();
      dm.delete('user.name');
      assert.equal(dm.isDeleted('user.name'), true);
    });

    it('isDeleted returns false for regular values', () => {
      const dm = new DeltaManager();
      dm.set('key', 'value');
      assert.equal(dm.isDeleted('key'), false);
    });

    it('isDeleted returns false for missing paths', () => {
      const dm = new DeltaManager();
      assert.equal(dm.isDeleted('missing'), false);
    });

    it('delete increments size', () => {
      const dm = new DeltaManager();
      dm.delete('a');
      assert.equal(dm.size(), 1);
    });

    it('can set after delete', () => {
      const dm = new DeltaManager();
      dm.delete('key');
      dm.set('key', 'new-value');
      assert.equal(dm.isDeleted('key'), false);
      assert.equal(dm.get('key'), 'new-value');
    });
  });

  describe('clear', () => {
    it('clears all entries', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.set('b', 2);
      dm.set('c', 3);
      dm.clear();
      assert.equal(dm.size(), 0);
      assert.equal(dm.isDirty(), false);
    });

    it('clear removes all paths', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.delete('b');
      dm.clear();
      assert.equal(dm.has('a'), false);
      assert.equal(dm.has('b'), false);
    });

    it('can set after clear', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.clear();
      dm.set('b', 2);
      assert.equal(dm.size(), 1);
      assert.equal(dm.get('b'), 2);
    });
  });

  describe('entries', () => {
    it('returns empty array when empty', () => {
      const dm = new DeltaManager();
      assert.equal(dm.entries().length, 0);
    });

    it('returns all entries', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.set('b', 2);
      const entries = dm.entries();
      assert.equal(entries.length, 2);
    });

    it('sorts entries by depth (shallowest first)', () => {
      const dm = new DeltaManager();
      dm.set('a.b.c', 3);
      dm.set('a', 1);
      dm.set('a.b', 2);
      const entries = dm.entries();
      assert.equal(entries[0][0], 'a');      // depth 1
      assert.equal(entries[1][0], 'a.b');    // depth 2
      assert.equal(entries[2][0], 'a.b.c');  // depth 3
    });

    it('includes deleted entries', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.delete('b');
      const entries = dm.entries();
      assert.equal(entries.length, 2);
    });

    it('sorts complex paths correctly', () => {
      const dm = new DeltaManager();
      dm.set('user.profile.name', 'Alice');
      dm.set('user.id', 1);
      dm.set('settings', {});
      const entries = dm.entries();
      assert.equal(entries[0][0], 'settings');
      assert.equal(entries[1][0], 'user.id');
      assert.equal(entries[2][0], 'user.profile.name');
    });

    it('entries are [path, value] tuples', () => {
      const dm = new DeltaManager();
      dm.set('key', 'value');
      const entries = dm.entries();
      assert.equal(entries[0][0], 'key');
      assert.equal(entries[0][1], 'value');
    });
  });

  describe('createCheckpoint', () => {
    it('creates snapshot of current delta', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      dm.set('b', 2);
      const checkpoint = dm.createCheckpoint();
      assert.ok(checkpoint instanceof Map);
      assert.equal(checkpoint.size, 2);
    });

    it('checkpoint is independent copy', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      const checkpoint = dm.createCheckpoint();
      dm.set('b', 2);
      assert.equal(checkpoint.size, 1);
      assert.equal(dm.size(), 2);
    });

    it('checkpoint preserves values', () => {
      const dm = new DeltaManager();
      dm.set('user.name', 'Alice');
      const checkpoint = dm.createCheckpoint();
      assert.equal(checkpoint.get('user.name'), 'Alice');
    });

    it('checkpoint preserves deletions', () => {
      const dm = new DeltaManager();
      dm.delete('removed');
      const checkpoint = dm.createCheckpoint();
      const DELETED = dm.getDeletedSymbol();
      assert.equal(checkpoint.get('removed'), DELETED);
    });

    it('empty checkpoint', () => {
      const dm = new DeltaManager();
      const checkpoint = dm.createCheckpoint();
      assert.equal(checkpoint.size, 0);
    });
  });

  describe('restoreCheckpoint', () => {
    it('restores delta to checkpoint state', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      const checkpoint = dm.createCheckpoint();
      dm.set('b', 2);
      dm.set('c', 3);
      dm.restoreCheckpoint(checkpoint);
      assert.equal(dm.size(), 1);
      assert.equal(dm.get('a'), 1);
      assert.equal(dm.has('b'), false);
    });

    it('clears changes after checkpoint', () => {
      const dm = new DeltaManager();
      dm.set('original', 'value');
      const checkpoint = dm.createCheckpoint();
      dm.set('new', 'change');
      dm.restoreCheckpoint(checkpoint);
      assert.equal(dm.has('new'), false);
    });

    it('restores empty state', () => {
      const dm = new DeltaManager();
      const checkpoint = dm.createCheckpoint();
      dm.set('a', 1);
      dm.set('b', 2);
      dm.restoreCheckpoint(checkpoint);
      assert.equal(dm.size(), 0);
      assert.equal(dm.isDirty(), false);
    });

    it('handles multiple restore cycles', () => {
      const dm = new DeltaManager();
      dm.set('a', 1);
      const cp1 = dm.createCheckpoint();
      dm.set('b', 2);
      const cp2 = dm.createCheckpoint();
      dm.set('c', 3);

      dm.restoreCheckpoint(cp2);
      assert.equal(dm.size(), 2);

      dm.restoreCheckpoint(cp1);
      assert.equal(dm.size(), 1);
    });

    it('restores deletions', () => {
      const dm = new DeltaManager();
      dm.delete('removed');
      const checkpoint = dm.createCheckpoint();
      dm.clear();
      dm.restoreCheckpoint(checkpoint);
      assert.equal(dm.isDeleted('removed'), true);
    });
  });

  describe('edge cases', () => {
    it('handles paths with special characters', () => {
      const dm = new DeltaManager();
      dm.set('user-name', 'Alice');
      dm.set('user_age', 30);
      assert.equal(dm.get('user-name'), 'Alice');
      assert.equal(dm.get('user_age'), 30);
    });

    it('handles very long paths', () => {
      const dm = new DeltaManager();
      const longPath = Array(20).fill('level').join('.');
      dm.set(longPath, 'deep');
      assert.equal(dm.get(longPath), 'deep');
    });

    it('handles numeric path segments', () => {
      const dm = new DeltaManager();
      dm.set('items.0.id', 1);
      dm.set('items.1.id', 2);
      assert.equal(dm.get('items.0.id'), 1);
      assert.equal(dm.get('items.1.id'), 2);
    });

    it('handles single-segment paths', () => {
      const dm = new DeltaManager();
      dm.set('root', 'value');
      assert.equal(dm.get('root'), 'value');
    });

    it('handles many entries efficiently', () => {
      const dm = new DeltaManager();
      for (let i = 0; i < 1000; i++) {
        dm.set(`item.${i}`, i);
      }
      assert.equal(dm.size(), 1000);
      const entries = dm.entries();
      assert.equal(entries.length, 1000);
    });
  });
});
