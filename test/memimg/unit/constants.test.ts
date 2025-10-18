/**
 * Unit tests for constants.ts
 *
 * Validates all constant definitions and ensures no duplicates.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  EVENT_TYPES,
  TYPE_MARKERS,
  PATH_SEPARATOR,
  NUMERIC_KEY_PATTERN,
  MUTATING_ARRAY_METHODS,
  MUTATING_MAP_METHODS,
  MUTATING_SET_METHODS,
  DEFAULT_DB_NAME,
  DEFAULT_STORE_NAME,
  DEFAULT_LOCALSTORAGE_KEY,
} from '../../../src/memimg/constants.js';
import { assertContains } from '../fixtures/helpers.js';

describe('constants', () => {
  describe('EVENT_TYPES', () => {
    it('has all 18 event types defined', () => {
      const types = Object.keys(EVENT_TYPES);
      assert.equal(types.length, 18);
    });

    it('includes all property event types', () => {
      assert.equal(EVENT_TYPES.SET, 'SET');
      assert.equal(EVENT_TYPES.DELETE, 'DELETE');
    });

    it('includes all array event types', () => {
      assert.equal(EVENT_TYPES.ARRAY_PUSH, 'ARRAY_PUSH');
      assert.equal(EVENT_TYPES.ARRAY_POP, 'ARRAY_POP');
      assert.equal(EVENT_TYPES.ARRAY_SHIFT, 'ARRAY_SHIFT');
      assert.equal(EVENT_TYPES.ARRAY_UNSHIFT, 'ARRAY_UNSHIFT');
      assert.equal(EVENT_TYPES.ARRAY_SPLICE, 'ARRAY_SPLICE');
      assert.equal(EVENT_TYPES.ARRAY_SORT, 'ARRAY_SORT');
      assert.equal(EVENT_TYPES.ARRAY_REVERSE, 'ARRAY_REVERSE');
      assert.equal(EVENT_TYPES.ARRAY_FILL, 'ARRAY_FILL');
      assert.equal(EVENT_TYPES.ARRAY_COPYWITHIN, 'ARRAY_COPYWITHIN');
    });

    it('includes all Map event types', () => {
      assert.equal(EVENT_TYPES.MAP_SET, 'MAP_SET');
      assert.equal(EVENT_TYPES.MAP_DELETE, 'MAP_DELETE');
      assert.equal(EVENT_TYPES.MAP_CLEAR, 'MAP_CLEAR');
    });

    it('includes all Set event types', () => {
      assert.equal(EVENT_TYPES.SET_ADD, 'SET_ADD');
      assert.equal(EVENT_TYPES.SET_DELETE, 'SET_DELETE');
      assert.equal(EVENT_TYPES.SET_CLEAR, 'SET_CLEAR');
    });

    it('includes SCRIPT event type', () => {
      assert.equal(EVENT_TYPES.SCRIPT, 'SCRIPT');
    });

    it('has no duplicate values', () => {
      const values = Object.values(EVENT_TYPES);
      const unique = new Set(values);
      assert.equal(unique.size, values.length);
    });

    it('all values are uppercase strings', () => {
      for (const value of Object.values(EVENT_TYPES)) {
        assert.equal(typeof value, 'string');
        assert.equal(value, value.toUpperCase());
      }
    });
  });

  describe('TYPE_MARKERS', () => {
    it('has TYPE marker', () => {
      assert.equal(TYPE_MARKERS.TYPE, '__type__');
    });

    it('has UNRESOLVED marker', () => {
      assert.equal(TYPE_MARKERS.UNRESOLVED, '__isUnresolved');
    });

    it('has UNRESOLVED_REF marker', () => {
      assert.equal(TYPE_MARKERS.UNRESOLVED_REF, '__unresolved_ref__');
    });

    it('has no duplicate values', () => {
      const values = Object.values(TYPE_MARKERS);
      const unique = new Set(values);
      assert.equal(unique.size, values.length);
    });
  });

  describe('PATH_SEPARATOR', () => {
    it('is a dot character', () => {
      assert.equal(PATH_SEPARATOR, '.');
    });
  });

  describe('NUMERIC_KEY_PATTERN', () => {
    it('matches numeric strings', () => {
      assert.ok(NUMERIC_KEY_PATTERN.test('0'));
      assert.ok(NUMERIC_KEY_PATTERN.test('1'));
      assert.ok(NUMERIC_KEY_PATTERN.test('42'));
      assert.ok(NUMERIC_KEY_PATTERN.test('999'));
    });

    it('does not match non-numeric strings', () => {
      assert.ok(!NUMERIC_KEY_PATTERN.test('a'));
      assert.ok(!NUMERIC_KEY_PATTERN.test('1a'));
      assert.ok(!NUMERIC_KEY_PATTERN.test('-1'));
      assert.ok(!NUMERIC_KEY_PATTERN.test('1.5'));
    });
  });

  describe('MUTATING_ARRAY_METHODS', () => {
    it('includes all 9 mutating methods', () => {
      assert.equal(MUTATING_ARRAY_METHODS.length, 9);
    });

    it('includes expected methods', () => {
      assertContains(MUTATING_ARRAY_METHODS as any, [
        'push', 'pop', 'shift', 'unshift', 'splice',
        'sort', 'reverse', 'fill', 'copyWithin'
      ]);
    });

    it('has no duplicates', () => {
      const unique = new Set(MUTATING_ARRAY_METHODS);
      assert.equal(unique.size, MUTATING_ARRAY_METHODS.length);
    });
  });

  describe('MUTATING_MAP_METHODS', () => {
    it('includes all 3 mutating methods', () => {
      assert.equal(MUTATING_MAP_METHODS.length, 3);
    });

    it('includes expected methods', () => {
      assertContains(MUTATING_MAP_METHODS as any, ['set', 'delete', 'clear']);
    });
  });

  describe('MUTATING_SET_METHODS', () => {
    it('includes all 3 mutating methods', () => {
      assert.equal(MUTATING_SET_METHODS.length, 3);
    });

    it('includes expected methods', () => {
      assertContains(MUTATING_SET_METHODS as any, ['add', 'delete', 'clear']);
    });
  });

  describe('Storage constants', () => {
    it('has DEFAULT_DB_NAME', () => {
      assert.equal(typeof DEFAULT_DB_NAME, 'string');
      assert.ok(DEFAULT_DB_NAME.length > 0);
    });

    it('has DEFAULT_STORE_NAME', () => {
      assert.equal(typeof DEFAULT_STORE_NAME, 'string');
      assert.ok(DEFAULT_STORE_NAME.length > 0);
    });

    it('has DEFAULT_LOCALSTORAGE_KEY', () => {
      assert.equal(typeof DEFAULT_LOCALSTORAGE_KEY, 'string');
      assert.ok(DEFAULT_LOCALSTORAGE_KEY.length > 0);
    });
  });
});
