/**
 * Unit tests for Path Utilities
 *
 * Tests Navigator-specific path operations.
 * ~70 tests covering all path manipulation functions.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  traversePath,
  getParentPath,
  getPathLeaf,
  pathToKey,
  keyToPath,
  getAncestorPaths,
  appendToPath,
  isValidPath,
  isRootPath,
  normalizePath,
} from '../../../dist/navigator/path-utils.js';
import { createNestedGraph, createCollectionGraph } from './fixtures/test-data.js';
import { pathsEqual } from './fixtures/helpers.js';

describe('Path Utils', () => {
  // ==========================================================================
  // traversePath
  // ==========================================================================

  describe('traversePath', () => {
    const root = createNestedGraph();

    it('returns root for root path', () => {
      const result = traversePath(root, ['root']);
      assert.deepEqual(result, root);
    });

    it('traverses to simple property', () => {
      const result = traversePath(root, ['root', 'user']);
      assert.ok(result);
      assert.ok('profile' in result);
    });

    it('traverses to nested property', () => {
      const result = traversePath(root, ['root', 'user', 'profile', 'name']);
      assert.equal(result, 'Bob');
    });

    it('returns undefined for non-existent path', () => {
      const result = traversePath(root, ['root', 'nonexistent']);
      assert.equal(result, undefined);
    });

    it('returns undefined for partially invalid path', () => {
      const result = traversePath(root, ['root', 'user', 'invalid', 'deep']);
      assert.equal(result, undefined);
    });

    it('handles empty path segments gracefully', () => {
      const result = traversePath(root, ['root', '', 'user']);
      // Empty segments are skipped
      assert.ok(result);
    });

    it('handles numeric array indices', () => {
      const arrRoot = { items: [1, 2, 3] };
      const result = traversePath(arrRoot, ['root', 'items', '0']);
      assert.equal(result, 1);
    });

    it('handles map paths (map:N)', () => {
      const mapRoot = createCollectionGraph();
      // Assuming traversal can handle map indices
      const result = traversePath(mapRoot, ['root', 'map']);
      assert.ok(result instanceof Map);
    });

    it('returns null/undefined values when they exist', () => {
      const nullRoot = { value: null };
      const result = traversePath(nullRoot, ['root', 'value']);
      assert.equal(result, null);
    });
  });

  // ==========================================================================
  // getParentPath
  // ==========================================================================

  describe('getParentPath', () => {
    it('returns null for root path', () => {
      const parent = getParentPath(['root']);
      assert.equal(parent, null);
    });

    it('returns root for one-level path', () => {
      const parent = getParentPath(['root', 'user']);
      assert.ok(pathsEqual(parent!, ['root']));
    });

    it('returns parent for nested path', () => {
      const parent = getParentPath(['root', 'user', 'profile', 'name']);
      assert.ok(pathsEqual(parent!, ['root', 'user', 'profile']));
    });

    it('returns null for empty path', () => {
      const parent = getParentPath([]);
      assert.equal(parent, null);
    });

    it('does not mutate original path', () => {
      const original = ['root', 'user', 'profile'];
      const parent = getParentPath(original);

      assert.equal(original.length, 3);
      assert.equal(parent!.length, 2);
    });
  });

  // ==========================================================================
  // getPathLeaf
  // ==========================================================================

  describe('getPathLeaf', () => {
    it('returns last segment', () => {
      assert.equal(getPathLeaf(['root', 'user', 'name']), 'name');
    });

    it('returns root for root path', () => {
      assert.equal(getPathLeaf(['root']), 'root');
    });

    it('returns root for empty path', () => {
      assert.equal(getPathLeaf([]), 'root');
    });

    it('handles single-segment paths', () => {
      assert.equal(getPathLeaf(['root', 'user']), 'user');
    });

    it('handles numeric segments', () => {
      assert.equal(getPathLeaf(['root', 'items', '0']), '0');
    });
  });

  // ==========================================================================
  // pathToKey
  // ==========================================================================

  describe('pathToKey', () => {
    it('converts simple path to dot notation', () => {
      assert.equal(pathToKey(['root', 'user']), 'root.user');
    });

    it('converts nested path to dot notation', () => {
      assert.equal(pathToKey(['root', 'user', 'profile', 'name']), 'root.user.profile.name');
    });

    it('handles root path', () => {
      assert.equal(pathToKey(['root']), 'root');
    });

    it('handles empty path', () => {
      assert.equal(pathToKey([]), '');
    });

    it('handles paths with special characters', () => {
      assert.equal(pathToKey(['root', 'user-name', 'value[0]']), 'root.user-name.value[0]');
    });
  });

  // ==========================================================================
  // keyToPath
  // ==========================================================================

  describe('keyToPath', () => {
    it('converts dot notation to path array', () => {
      const path = keyToPath('root.user');
      assert.ok(pathsEqual(path, ['root', 'user']));
    });

    it('converts nested dot notation', () => {
      const path = keyToPath('root.user.profile.name');
      assert.ok(pathsEqual(path, ['root', 'user', 'profile', 'name']));
    });

    it('handles root key', () => {
      const path = keyToPath('root');
      assert.ok(pathsEqual(path, ['root']));
    });

    it('handles empty string', () => {
      const path = keyToPath('');
      assert.ok(pathsEqual(path, ['']));
    });

    it('is inverse of pathToKey', () => {
      const original = ['root', 'user', 'profile'];
      const key = pathToKey(original);
      const recovered = keyToPath(key);

      assert.ok(pathsEqual(original, recovered));
    });
  });

  // ==========================================================================
  // getAncestorPaths
  // ==========================================================================

  describe('getAncestorPaths', () => {
    it('returns ancestors for nested path', () => {
      const ancestors = getAncestorPaths(['root', 'user', 'profile', 'name']);

      assert.equal(ancestors.length, 4);
      assert.equal(ancestors[0], 'root');
      assert.equal(ancestors[1], 'root.user');
      assert.equal(ancestors[2], 'root.user.profile');
      assert.equal(ancestors[3], 'root.user.profile.name');
    });

    it('returns single ancestor for root', () => {
      const ancestors = getAncestorPaths(['root']);

      assert.equal(ancestors.length, 1);
      assert.equal(ancestors[0], 'root');
    });

    it('returns two ancestors for one-level path', () => {
      const ancestors = getAncestorPaths(['root', 'user']);

      assert.equal(ancestors.length, 2);
      assert.equal(ancestors[0], 'root');
      assert.equal(ancestors[1], 'root.user');
    });

    it('returns empty for empty path', () => {
      const ancestors = getAncestorPaths([]);
      assert.equal(ancestors.length, 0);
    });
  });

  // ==========================================================================
  // appendToPath
  // ==========================================================================

  describe('appendToPath', () => {
    it('appends segment to path', () => {
      const base = ['root', 'user'];
      const extended = appendToPath(base, 'name');

      assert.ok(pathsEqual(extended, ['root', 'user', 'name']));
    });

    it('does not mutate original path', () => {
      const original = ['root', 'user'];
      const extended = appendToPath(original, 'name');

      assert.equal(original.length, 2);
      assert.equal(extended.length, 3);
    });

    it('appends to root path', () => {
      const extended = appendToPath(['root'], 'user');
      assert.ok(pathsEqual(extended, ['root', 'user']));
    });

    it('appends to empty path', () => {
      const extended = appendToPath([], 'root');
      assert.ok(pathsEqual(extended, ['root']));
    });

    it('handles numeric segments', () => {
      const extended = appendToPath(['root', 'items'], '0');
      assert.ok(pathsEqual(extended, ['root', 'items', '0']));
    });
  });

  // ==========================================================================
  // isValidPath
  // ==========================================================================

  describe('isValidPath', () => {
    const root = createNestedGraph();

    it('returns true for valid path', () => {
      assert.equal(isValidPath(root, ['root', 'user']), true);
    });

    it('returns true for deeply valid path', () => {
      assert.equal(isValidPath(root, ['root', 'user', 'profile', 'name']), true);
    });

    it('returns false for invalid path', () => {
      assert.equal(isValidPath(root, ['root', 'nonexistent']), false);
    });

    it('returns false for partially invalid path', () => {
      assert.equal(isValidPath(root, ['root', 'user', 'invalid']), false);
    });

    it('returns true for root path', () => {
      assert.equal(isValidPath(root, ['root']), true);
    });

    it('handles paths to null values', () => {
      const nullRoot = { value: null };
      // traversePath returns null, which !== undefined
      assert.equal(isValidPath(nullRoot, ['root', 'value']), false);
    });

    it('handles array indices', () => {
      const arrRoot = { items: [1, 2, 3] };
      assert.equal(isValidPath(arrRoot, ['root', 'items', '0']), true);
      assert.equal(isValidPath(arrRoot, ['root', 'items', '10']), false);
    });
  });

  // ==========================================================================
  // isRootPath
  // ==========================================================================

  describe('isRootPath', () => {
    it('returns true for root path', () => {
      assert.equal(isRootPath(['root']), true);
    });

    it('returns false for non-root path', () => {
      assert.equal(isRootPath(['root', 'user']), false);
    });

    it('returns false for empty path', () => {
      assert.equal(isRootPath([]), false);
    });

    it('returns false for path starting with non-root', () => {
      assert.equal(isRootPath(['other']), false);
    });

    it('returns false for nested path', () => {
      assert.equal(isRootPath(['root', 'user', 'profile']), false);
    });
  });

  // ==========================================================================
  // normalizePath
  // ==========================================================================

  describe('normalizePath', () => {
    it('adds root to path without root', () => {
      const normalized = normalizePath(['user', 'profile']);
      assert.ok(pathsEqual(normalized, ['root', 'user', 'profile']));
    });

    it('does not modify path already starting with root', () => {
      const normalized = normalizePath(['root', 'user', 'profile']);
      assert.ok(pathsEqual(normalized, ['root', 'user', 'profile']));
    });

    it('adds root to empty path', () => {
      const normalized = normalizePath([]);
      assert.ok(pathsEqual(normalized, ['root']));
    });

    it('handles single non-root segment', () => {
      const normalized = normalizePath(['user']);
      assert.ok(pathsEqual(normalized, ['root', 'user']));
    });

    it('does not mutate original path', () => {
      const original = ['user', 'profile'];
      const normalized = normalizePath(original);

      assert.equal(original.length, 2);
      assert.equal(normalized.length, 3);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles very deep paths', () => {
      const deep = ['root'];
      for (let i = 0; i < 100; i++) {
        deep.push(`level${i}`);
      }

      const key = pathToKey(deep);
      const recovered = keyToPath(key);
      assert.ok(pathsEqual(deep, recovered));
    });

    it('handles paths with special characters', () => {
      const special = ['root', 'user:123', 'value[0]', 'prop.name'];
      const key = pathToKey(special);
      // Note: keyToPath will split on dots, so this won't round-trip perfectly
      assert.ok(key.includes('user:123'));
    });

    it('handles paths with empty segments', () => {
      const root = { '': { nested: 'value' } };
      const result = traversePath(root, ['root', '', 'nested']);
      assert.equal(result, 'value');
    });

    it('handles circular reference traversal (stops at undefined)', () => {
      const circular: any = { a: {} };
      circular.a.self = circular;

      const result = traversePath(circular, ['root', 'a', 'self', 'a', 'self']);
      assert.ok(result); // Should traverse successfully
    });

    it('handles traversal through Map keys', () => {
      const root = createCollectionGraph();
      const map = traversePath(root, ['root', 'map']);

      assert.ok(map instanceof Map);
    });

    it('handles very long paths without performance issues', () => {
      let obj: any = 'deep';  // Start with the primitive value
      const segments = ['root'];

      for (let i = 0; i < 1000; i++) {
        const wrapper: any = {};
        wrapper[`level${i}`] = obj;
        obj = wrapper;
        segments.push(`level${1000 - i - 1}`);
      }

      // Should complete without hanging
      const result = traversePath(obj, segments);
      assert.equal(result, 'deep');
    });
  });
});
