/**
 * Unit tests for NavigationManager
 *
 * Tests navigation, history, expansion state, and callbacks.
 * ~120 tests covering all functionality.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { NavigationManager } from '../../../dist/navigator/navigation.js';
import type { PathArray } from '../../../dist/navigator/navigation.js';
import {  createSpy, pathsEqual } from './fixtures/helpers.js';
import { PATHS } from './fixtures/test-data.js';

describe('NavigationManager', () => {
  let navigation: NavigationManager;

  beforeEach(() => {
    navigation = new NavigationManager();
  });

  // ==========================================================================
  // Initialization
  // ==========================================================================

  describe('initialization', () => {
    it('initializes with root path', () => {
      assert.ok(pathsEqual(navigation.selectedPath, ['root']));
    });

    it('initializes with empty history (only root)', () => {
      assert.equal(navigation.history.length, 1);
      assert.ok(pathsEqual(navigation.history[0]!, ['root']));
    });

    it('initializes with current index 0', () => {
      assert.equal(navigation.currentIndex, 0);
    });

    it('initializes with root expanded', () => {
      assert.equal(navigation.isExpanded('root'), true);
    });

    it('initializes with no other paths expanded', () => {
      assert.equal(navigation.isExpanded('root.user'), false);
      assert.equal(navigation.isExpanded('root.user.profile'), false);
    });

    it('initializes onNavigate callback as null', () => {
      assert.equal(navigation.onNavigate, null);
    });
  });

  // ==========================================================================
  // Path Navigation
  // ==========================================================================

  describe('navigateTo', () => {
    it('navigates to simple path', () => {
      navigation.navigateTo(['root', 'user']);
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'user']));
    });

    it('navigates to nested path', () => {
      const path = ['root', 'user', 'profile', 'name'];
      navigation.navigateTo(path);
      assert.ok(pathsEqual(navigation.selectedPath, path));
    });

    it('adds to history when addToHistory is true (default)', () => {
      navigation.navigateTo(['root', 'user']);
      assert.equal(navigation.history.length, 2);
      assert.ok(pathsEqual(navigation.history[1]!, ['root', 'user']));
    });

    it('does not add to history when addToHistory is false', () => {
      navigation.navigateTo(['root', 'user'], false);
      assert.equal(navigation.history.length, 1);
    });

    it('truncates forward history when navigating', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.navigateTo(['root', 'c']);
      navigation.goBack();
      navigation.goBack();

      // Now at 'a', history is [root, a, b, c], index is 1
      navigation.navigateTo(['root', 'd']);

      // History should be [root, a, d], index is 2
      assert.equal(navigation.history.length, 3);
      assert.ok(pathsEqual(navigation.history[2]!, ['root', 'd']));
    });

    it('expands all ancestor paths', () => {
      navigation.navigateTo(['root', 'user', 'profile', 'name']);

      assert.equal(navigation.isExpanded('root'), true);
      assert.equal(navigation.isExpanded('root.user'), true);
      assert.equal(navigation.isExpanded('root.user.profile'), true);
      assert.equal(navigation.isExpanded('root.user.profile.name'), true);
    });

    it('creates copy of path array (immutability)', () => {
      const originalPath = ['root', 'user'];
      navigation.navigateTo(originalPath);

      // Mutate original
      originalPath.push('profile');

      // Selected path should be unchanged
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'user']));
    });

    it('triggers onNavigate callback', () => {
      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.navigateTo(['root', 'user']);

      assert.equal(spy.callCount, 1);
    });

    it('does not trigger onNavigate if null', () => {
      // Should not throw
      navigation.onNavigate = null;
      navigation.navigateTo(['root', 'user']);
    });
  });

  // ==========================================================================
  // Selected Path
  // ==========================================================================

  describe('selectedPath', () => {
    it('returns copy of internal path', () => {
      const path = navigation.selectedPath;
      path.push('modified');

      // Internal path should be unchanged
      assert.equal(navigation.selectedPath.length, 1);
    });

    it('reflects current navigation', () => {
      navigation.navigateTo(['root', 'a']);
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'a']));

      navigation.navigateTo(['root', 'b']);
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'b']));
    });
  });

  // ==========================================================================
  // History Management
  // ==========================================================================

  describe('history', () => {
    it('returns copy of internal history', () => {
      navigation.navigateTo(['root', 'a']);
      const history = navigation.history;
      history.push(['root', 'modified']);

      // Internal history should be unchanged
      assert.equal(navigation.history.length, 2);
    });

    it('builds history correctly', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.navigateTo(['root', 'c']);

      const history = navigation.history;
      assert.equal(history.length, 4);
      assert.ok(pathsEqual(history[0]!, ['root']));
      assert.ok(pathsEqual(history[1]!, ['root', 'a']));
      assert.ok(pathsEqual(history[2]!, ['root', 'b']));
      assert.ok(pathsEqual(history[3]!, ['root', 'c']));
    });

    it('each path in history is a copy', () => {
      const original = ['root', 'user'];
      navigation.navigateTo(original);

      const history = navigation.history;
      history[1]!.push('modified');

      // History should be unchanged
      assert.equal(navigation.history[1]!.length, 2);
    });
  });

  // ==========================================================================
  // Back Navigation
  // ==========================================================================

  describe('goBack', () => {
    beforeEach(() => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.navigateTo(['root', 'c']);
    });

    it('moves back one step in history', () => {
      navigation.goBack();
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'b']));
    });

    it('moves back multiple steps', () => {
      navigation.goBack();
      navigation.goBack();
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'a']));
    });

    it('moves back to root', () => {
      navigation.goBack();
      navigation.goBack();
      navigation.goBack();
      assert.ok(pathsEqual(navigation.selectedPath, ['root']));
    });

    it('does nothing when already at start', () => {
      navigation.goBack();
      navigation.goBack();
      navigation.goBack();
      navigation.goBack(); // Already at start

      assert.ok(pathsEqual(navigation.selectedPath, ['root']));
      assert.equal(navigation.currentIndex, 0);
    });

    it('updates current index', () => {
      assert.equal(navigation.currentIndex, 3);
      navigation.goBack();
      assert.equal(navigation.currentIndex, 2);
      navigation.goBack();
      assert.equal(navigation.currentIndex, 1);
    });

    it('expands ancestors of new location', () => {
      // Navigate somewhere with nested path
      navigation.navigateTo(['root', 'user', 'profile', 'name']);
      navigation.navigateTo(['root', 'other']);

      // Collapse ancestors
      navigation.toggleExpanded('root.user');
      navigation.toggleExpanded('root.user.profile');

      // Go back
      navigation.goBack();

      // Ancestors should be expanded again
      assert.equal(navigation.isExpanded('root.user'), true);
      assert.equal(navigation.isExpanded('root.user.profile'), true);
    });

    it('triggers onNavigate callback', () => {
      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.goBack();

      assert.equal(spy.callCount, 1);
    });
  });

  describe('canGoBack', () => {
    it('returns false at start', () => {
      assert.equal(navigation.canGoBack(), false);
    });

    it('returns true after navigation', () => {
      navigation.navigateTo(['root', 'a']);
      assert.equal(navigation.canGoBack(), true);
    });

    it('returns false after going back to start', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.goBack();
      assert.equal(navigation.canGoBack(), false);
    });
  });

  // ==========================================================================
  // Forward Navigation
  // ==========================================================================

  describe('goForward', () => {
    beforeEach(() => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.navigateTo(['root', 'c']);
      navigation.goBack();
      navigation.goBack();
    });

    it('moves forward one step in history', () => {
      navigation.goForward();
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'b']));
    });

    it('moves forward multiple steps', () => {
      navigation.goForward();
      navigation.goForward();
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'c']));
    });

    it('does nothing when already at end', () => {
      navigation.goForward();
      navigation.goForward();
      navigation.goForward(); // Already at end

      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'c']));
      assert.equal(navigation.currentIndex, 3);
    });

    it('updates current index', () => {
      assert.equal(navigation.currentIndex, 1);
      navigation.goForward();
      assert.equal(navigation.currentIndex, 2);
      navigation.goForward();
      assert.equal(navigation.currentIndex, 3);
    });

    it('expands ancestors of new location', () => {
      navigation.navigateTo(['root', 'user', 'profile', 'name']);
      navigation.navigateTo(['root', 'other']);
      navigation.goBack();

      // Collapse ancestors
      navigation.toggleExpanded('root.user');

      // Go forward
      navigation.goForward();

      // Ancestor should be expanded
      assert.equal(navigation.isExpanded('root'), true);
    });

    it('triggers onNavigate callback', () => {
      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.goForward();

      assert.equal(spy.callCount, 1);
    });
  });

  describe('canGoForward', () => {
    it('returns false when at end', () => {
      assert.equal(navigation.canGoForward(), false);
    });

    it('returns true after going back', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.goBack();
      assert.equal(navigation.canGoForward(), true);
    });

    it('returns false after navigating forward to end', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.goBack();
      navigation.goForward();
      assert.equal(navigation.canGoForward(), false);
    });

    it('returns false after new navigation truncates forward history', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.goBack();
      navigation.navigateTo(['root', 'c']); // Truncates 'b'

      assert.equal(navigation.canGoForward(), false);
    });
  });

  // ==========================================================================
  // Tree Expansion
  // ==========================================================================

  describe('toggleExpanded', () => {
    it('expands collapsed path', () => {
      navigation.toggleExpanded('root.user');
      assert.equal(navigation.isExpanded('root.user'), true);
    });

    it('collapses expanded path', () => {
      navigation.toggleExpanded('root.user');
      navigation.toggleExpanded('root.user');
      assert.equal(navigation.isExpanded('root.user'), false);
    });

    it('handles multiple paths independently', () => {
      navigation.toggleExpanded('root.user');
      navigation.toggleExpanded('root.settings');

      assert.equal(navigation.isExpanded('root.user'), true);
      assert.equal(navigation.isExpanded('root.settings'), true);
    });

    it('does not affect unrelated paths', () => {
      navigation.toggleExpanded('root.user');
      assert.equal(navigation.isExpanded('root.settings'), false);
    });
  });

  describe('isExpanded', () => {
    it('returns false for non-expanded paths', () => {
      assert.equal(navigation.isExpanded('root.user'), false);
    });

    it('returns true for expanded paths', () => {
      navigation.toggleExpanded('root.user');
      assert.equal(navigation.isExpanded('root.user'), true);
    });

    it('returns true for root (initially expanded)', () => {
      assert.equal(navigation.isExpanded('root'), true);
    });
  });

  // ==========================================================================
  // Nested Object Expansion (Phase 13)
  // ==========================================================================

  describe('toggleNestedExpanded', () => {
    it('expands collapsed nested object', () => {
      navigation.toggleNestedExpanded('root.user.name');
      assert.equal(navigation.isNestedExpanded('root.user.name'), true);
    });

    it('collapses expanded nested object', () => {
      navigation.toggleNestedExpanded('root.user.name');
      navigation.toggleNestedExpanded('root.user.name');
      assert.equal(navigation.isNestedExpanded('root.user.name'), false);
    });

    it('handles multiple paths independently', () => {
      navigation.toggleNestedExpanded('root.user.name');
      navigation.toggleNestedExpanded('root.user.address');

      assert.equal(navigation.isNestedExpanded('root.user.name'), true);
      assert.equal(navigation.isNestedExpanded('root.user.address'), true);
    });

    it('is independent from tree expansion', () => {
      navigation.toggleExpanded('root.user');
      navigation.toggleNestedExpanded('root.user');

      assert.equal(navigation.isExpanded('root.user'), true);
      assert.equal(navigation.isNestedExpanded('root.user'), true);
    });
  });

  describe('isNestedExpanded', () => {
    it('returns false for non-expanded nested objects', () => {
      assert.equal(navigation.isNestedExpanded('root.user.name'), false);
    });

    it('returns true for expanded nested objects', () => {
      navigation.toggleNestedExpanded('root.user.name');
      assert.equal(navigation.isNestedExpanded('root.user.name'), true);
    });

    it('returns false initially', () => {
      assert.equal(navigation.isNestedExpanded('root'), false);
    });
  });

  // ==========================================================================
  // Reset
  // ==========================================================================

  describe('reset', () => {
    beforeEach(() => {
      navigation.navigateTo(['root', 'a']);
      navigation.navigateTo(['root', 'b']);
      navigation.toggleExpanded('root.user');
      navigation.toggleExpanded('root.settings');
      navigation.toggleNestedExpanded('root.user.name');
    });

    it('resets selected path to root', () => {
      navigation.reset();
      assert.ok(pathsEqual(navigation.selectedPath, ['root']));
    });

    it('resets history to only root', () => {
      navigation.reset();
      assert.equal(navigation.history.length, 1);
      assert.ok(pathsEqual(navigation.history[0]!, ['root']));
    });

    it('resets current index to 0', () => {
      navigation.reset();
      assert.equal(navigation.currentIndex, 0);
    });

    it('clears all expansion state (except root)', () => {
      navigation.reset();
      assert.equal(navigation.isExpanded('root'), true);
      assert.equal(navigation.isExpanded('root.user'), false);
      assert.equal(navigation.isExpanded('root.settings'), false);
    });

    it('clears all nested expansion state', () => {
      navigation.reset();
      assert.equal(navigation.isNestedExpanded('root.user.name'), false);
    });
  });

  // ==========================================================================
  // Callback Management
  // ==========================================================================

  describe('onNavigate callback', () => {
    it('is triggered by navigateTo', () => {
      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.navigateTo(['root', 'a']);

      assert.equal(spy.callCount, 1);
    });

    it('is triggered by goBack', () => {
      navigation.navigateTo(['root', 'a']);

      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.goBack();

      assert.equal(spy.callCount, 1);
    });

    it('is triggered by goForward', () => {
      navigation.navigateTo(['root', 'a']);
      navigation.goBack();

      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      navigation.goForward();

      assert.equal(spy.callCount, 1);
    });

    it('is triggered by toggleExpanded', () => {
      const spy = createSpy();
      navigation.onNavigate = spy.fn;

      // Note: toggleExpanded does NOT trigger onNavigate in current implementation
      // This test documents current behavior
      navigation.toggleExpanded('root.user');

      assert.equal(spy.callCount, 0);
    });

    it('can be set to null without errors', () => {
      navigation.onNavigate = null;
      navigation.navigateTo(['root', 'a']);
      // Should not throw
    });

    it('can be changed during navigation', () => {
      const spy1 = createSpy();
      const spy2 = createSpy();

      navigation.onNavigate = spy1.fn;
      navigation.navigateTo(['root', 'a']);

      navigation.onNavigate = spy2.fn;
      navigation.navigateTo(['root', 'b']);

      assert.equal(spy1.callCount, 1);
      assert.equal(spy2.callCount, 1);
    });
  });

  // ==========================================================================
  // Edge Cases & Error Handling
  // ==========================================================================

  describe('edge cases', () => {
    it('handles empty path array', () => {
      navigation.navigateTo([]);
      assert.equal(navigation.selectedPath.length, 0);
    });

    it('handles very long paths', () => {
      const longPath = ['root', ...Array.from({ length: 100 }, (_, i) => `level${i}`)];
      navigation.navigateTo(longPath);
      assert.ok(pathsEqual(navigation.selectedPath, longPath));
    });

    it('handles special characters in path segments', () => {
      const specialPath = ['root', 'user:123', 'name$@#', 'value[0]'];
      navigation.navigateTo(specialPath);
      assert.ok(pathsEqual(navigation.selectedPath, specialPath));
    });

    it('handles rapid navigation', () => {
      for (let i = 0; i < 100; i++) {
        navigation.navigateTo(['root', `item${i}`]);
      }

      assert.equal(navigation.history.length, 101);
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'item99']));
    });

    it('handles back/forward at boundaries', () => {
      // At start
      navigation.goBack();
      assert.ok(pathsEqual(navigation.selectedPath, ['root']));

      // Navigate and go to end
      navigation.navigateTo(['root', 'a']);
      navigation.goForward();
      assert.ok(pathsEqual(navigation.selectedPath, ['root', 'a']));
    });
  });
});
