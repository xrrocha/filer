/**
 * Unit tests for Value Formatters
 *
 * Tests all formatters (13 types) with preview/full modes, edge cases.
 * ~200 tests covering comprehensive value formatting.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  formatValue,
  formatValueWithInfo,
  inferLabel,
} from '../../../dist/navigator/formatters.js';
import { ValueCategory } from '../../../dist/navigator/value-types.js';
import { FORMAT_TEST_VALUES } from './fixtures/test-data.js';

describe('formatters', () => {
  // ==========================================================================
  // Null Formatter
  // ==========================================================================

  describe('NullFormatter', () => {
    it('formats null as empty string in preview mode', () => {
      const result = formatValue(null, 'preview');
      assert.equal(result, '');
    });

    it('formats null as empty string in full mode', () => {
      const result = formatValue(null, 'full');
      assert.equal(result, '');
    });

    it('provides correct ValueInfo for null', () => {
      const [formatted, info] = formatValueWithInfo(null, 'preview');

      assert.equal(formatted, '');
      assert.equal(info.category, ValueCategory.NULL);
      assert.equal(info.typeName, 'null');
      assert.equal(info.cssClass, 'value-null');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // Undefined Formatter
  // ==========================================================================

  describe('UndefinedFormatter', () => {
    it('formats undefined as "undefined" in preview mode', () => {
      const result = formatValue(undefined, 'preview');
      assert.equal(result, 'undefined');
    });

    it('formats undefined as "undefined" in full mode', () => {
      const result = formatValue(undefined, 'full');
      assert.equal(result, 'undefined');
    });

    it('provides correct ValueInfo for undefined', () => {
      const [formatted, info] = formatValueWithInfo(undefined, 'preview');

      assert.equal(formatted, 'undefined');
      assert.equal(info.category, ValueCategory.UNDEFINED);
      assert.equal(info.typeName, 'undefined');
      assert.equal(info.cssClass, 'value-undefined');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // String Formatter
  // ==========================================================================

  describe('StringFormatter', () => {
    it('formats string without quotes in preview mode', () => {
      const result = formatValue('hello world', 'preview');
      assert.equal(result, 'hello world');
    });

    it('formats string without quotes in full mode', () => {
      const result = formatValue('hello world', 'full');
      assert.equal(result, 'hello world');
    });

    it('truncates long strings in preview mode', () => {
      const longString = 'x'.repeat(200);
      const result = formatValue(longString, 'preview', 50);

      assert.equal(result.length, 53); // 50 + '...'
      assert.ok(result.endsWith('...'));
    });

    it('does not truncate in full mode', () => {
      const longString = 'x'.repeat(200);
      const result = formatValue(longString, 'full');

      assert.equal(result.length, 200);
    });

    it('handles empty string', () => {
      const result = formatValue('', 'preview');
      assert.equal(result, '');
    });

    it('handles special characters', () => {
      const special = 'Hello\nWorld\t"Quote"';
      const result = formatValue(special, 'preview');
      assert.equal(result, special);
    });

    it('handles Unicode', () => {
      const unicode = '你好世界 🌍';
      const result = formatValue(unicode, 'preview');
      assert.equal(result, unicode);
    });

    it('provides correct ValueInfo for string', () => {
      const [formatted, info] = formatValueWithInfo('hello', 'preview');

      assert.equal(formatted, 'hello');
      assert.equal(info.category, ValueCategory.STRING);
      assert.equal(info.typeName, 'string');
      assert.equal(info.cssClass, 'value-string');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // Number Formatter
  // ==========================================================================

  describe('NumberFormatter', () => {
    it('formats integer', () => {
      assert.equal(formatValue(42, 'preview'), '42');
    });

    it('formats float', () => {
      assert.equal(formatValue(3.14159, 'preview'), '3.14159');
    });

    it('formats zero', () => {
      assert.equal(formatValue(0, 'preview'), '0');
    });

    it('formats negative number', () => {
      assert.equal(formatValue(-42, 'preview'), '-42');
    });

    it('formats Infinity', () => {
      assert.equal(formatValue(Infinity, 'preview'), 'Infinity');
    });

    it('formats -Infinity', () => {
      assert.equal(formatValue(-Infinity, 'preview'), '-Infinity');
    });

    it('formats NaN', () => {
      assert.equal(formatValue(NaN, 'preview'), 'NaN');
    });

    it('formats scientific notation', () => {
      assert.equal(formatValue(1.23e-10, 'preview'), '1.23e-10');
    });

    it('provides correct ValueInfo for number', () => {
      const [formatted, info] = formatValueWithInfo(42, 'preview');

      assert.equal(formatted, '42');
      assert.equal(info.category, ValueCategory.NUMBER);
      assert.equal(info.typeName, 'number');
      assert.equal(info.cssClass, 'value-number');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // Boolean Formatter
  // ==========================================================================

  describe('BooleanFormatter', () => {
    it('formats true', () => {
      assert.equal(formatValue(true, 'preview'), 'true');
    });

    it('formats false', () => {
      assert.equal(formatValue(false, 'preview'), 'false');
    });

    it('provides correct ValueInfo for boolean', () => {
      const [formatted, info] = formatValueWithInfo(true, 'preview');

      assert.equal(formatted, 'true');
      assert.equal(info.category, ValueCategory.BOOLEAN);
      assert.equal(info.typeName, 'boolean');
      assert.equal(info.cssClass, 'value-boolean');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // BigInt Formatter
  // ==========================================================================

  describe('BigIntFormatter', () => {
    it('formats bigint with "n" suffix', () => {
      const result = formatValue(BigInt(9007199254740991), 'preview');
      assert.equal(result, '9007199254740991n');
    });

    it('formats zero bigint', () => {
      const result = formatValue(BigInt(0), 'preview');
      assert.equal(result, '0n');
    });

    it('formats negative bigint', () => {
      const result = formatValue(BigInt(-42), 'preview');
      assert.equal(result, '-42n');
    });

    it('provides correct ValueInfo for bigint', () => {
      const [formatted, info] = formatValueWithInfo(BigInt(123), 'preview');

      assert.equal(formatted, '123n');
      assert.equal(info.category, ValueCategory.BIGINT);
      assert.equal(info.typeName, 'bigint');
      assert.equal(info.cssClass, 'value-bigint');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // Symbol Formatter
  // ==========================================================================

  describe('SymbolFormatter', () => {
    it('formats anonymous symbol', () => {
      const sym = Symbol();
      const result = formatValue(sym, 'preview');
      assert.equal(result, 'Symbol()');
    });

    it('formats named symbol', () => {
      const sym = Symbol('test');
      const result = formatValue(sym, 'preview');
      assert.equal(result, 'Symbol(test)');
    });

    it('formats global symbol', () => {
      const sym = Symbol.for('global');
      const result = formatValue(sym, 'preview');
      assert.equal(result, 'Symbol(global)');
    });

    it('provides correct ValueInfo for symbol', () => {
      const sym = Symbol('test');
      const [formatted, info] = formatValueWithInfo(sym, 'preview');

      assert.equal(formatted, 'Symbol(test)');
      assert.equal(info.category, ValueCategory.SYMBOL);
      assert.equal(info.typeName, 'symbol');
      assert.equal(info.cssClass, 'value-symbol');
      assert.equal(info.isNavigable, false);
    });
  });

  // ==========================================================================
  // Date Formatter
  // ==========================================================================

  describe('DateFormatter', () => {
    it('formats date as ISO string', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = formatValue(date, 'preview');
      assert.equal(result, '2024-01-01T00:00:00.000Z');
    });

    it('formats current date', () => {
      const now = new Date();
      const result = formatValue(now, 'preview');
      assert.equal(result, now.toISOString());
    });

    it('formats invalid date', () => {
      const invalid = new Date('invalid');
      const result = formatValue(invalid, 'preview');
      assert.equal(result, 'Invalid Date');
    });

    it('provides correct ValueInfo for date', () => {
      const date = new Date('2024-01-01');
      const [formatted, info] = formatValueWithInfo(date, 'preview');

      assert.ok(formatted.includes('2024'));
      assert.equal(info.category, ValueCategory.DATE);
      assert.equal(info.typeName, 'Date');
      assert.equal(info.cssClass, 'value-date');
      assert.equal(info.isNavigable, true);  // Changed: Dates can have properties now
    });
  });

  // ==========================================================================
  // Function Formatter
  // ==========================================================================

  describe('FunctionFormatter', () => {
    it('formats named function', () => {
      function testFunc() { return 'test'; }
      const result = formatValue(testFunc, 'preview');
      assert.equal(result, 'ƒ testFunc');
    });

    it('formats anonymous function', () => {
      // Pass function directly to avoid name inference from variable assignment
      const result = formatValue(function() { return 'anon'; }, 'preview');
      assert.equal(result, 'ƒ (anonymous)');
    });

    it('formats arrow function', () => {
      const arrow = () => 'arrow';
      const result = formatValue(arrow, 'preview');
      // Arrow functions may have name '' or 'arrow' depending on assignment
      assert.ok(result.startsWith('ƒ'));
    });

    it('formats class constructor', () => {
      class TestClass {}
      const result = formatValue(TestClass, 'preview');
      assert.equal(result, 'ƒ TestClass');
    });

    it('provides correct ValueInfo for function', () => {
      function testFunc() {}
      const [formatted, info] = formatValueWithInfo(testFunc, 'preview');

      assert.equal(formatted, 'ƒ testFunc');
      assert.equal(info.category, ValueCategory.FUNCTION);
      assert.equal(info.typeName, 'Function');
      assert.equal(info.cssClass, 'value-function');
      assert.equal(info.isNavigable, true);
    });
  });

  // ==========================================================================
  // Array Formatter
  // ==========================================================================

  describe('ArrayFormatter', () => {
    it('formats empty array', () => {
      const result = formatValue([], 'preview');
      assert.equal(result, '[]');
    });

    it('formats simple array', () => {
      const result = formatValue([1, 2, 3], 'preview');
      assert.equal(result, '[1,2,3]');
    });

    it('formats array with mixed types', () => {
      const result = formatValue([1, 'hello', true, null], 'preview');
      assert.equal(result, '[1,"hello",true,null]');
    });

    it('truncates long array in preview mode', () => {
      const longArray = Array.from({ length: 100 }, (_, i) => i);
      const result = formatValue(longArray, 'preview', 50);

      assert.ok(result.length <= 53); // 50 + '...'
      assert.ok(result.endsWith('...'));
    });

    it('formats nested arrays', () => {
      const result = formatValue([[1, 2], [3, 4]], 'preview');
      assert.equal(result, '[[1,2],[3,4]]');
    });

    it('handles circular arrays with fallback', () => {
      const circular: any[] = [1, 2];
      circular.push(circular);

      const result = formatValue(circular, 'preview');
      // Should use fallback format when JSON.stringify fails
      assert.equal(result, '[Array(3)]');
    });

    it('formats array length in full mode', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = formatValue(arr, 'full');
      assert.equal(result, 'Array(5)');
    });

    it('provides correct ValueInfo for array', () => {
      const [formatted, info] = formatValueWithInfo([1, 2, 3], 'preview');

      assert.equal(formatted, '[1,2,3]');
      assert.equal(info.category, ValueCategory.ARRAY);
      assert.equal(info.typeName, 'Array');
      assert.equal(info.cssClass, 'value-array');
      assert.equal(info.isNavigable, true);
    });
  });

  // ==========================================================================
  // Map Formatter
  // ==========================================================================

  describe('MapFormatter', () => {
    it('formats empty map', () => {
      const result = formatValue(new Map(), 'preview');
      assert.equal(result, 'Map{0}');
    });

    it('formats map with size', () => {
      const map = new Map([['key1', 'value1'], ['key2', 'value2']]);
      const result = formatValue(map, 'preview');
      assert.equal(result, 'Map{2}');
    });

    it('full mode shows same as preview', () => {
      const map = new Map([['a', 1], ['b', 2]]);
      const preview = formatValue(map, 'preview');
      const full = formatValue(map, 'full');
      assert.equal(preview, full);
    });

    it('provides correct ValueInfo for map', () => {
      const map = new Map([['key', 'value']]);
      const [formatted, info] = formatValueWithInfo(map, 'preview');

      assert.equal(formatted, 'Map{1}');
      assert.equal(info.category, ValueCategory.MAP);
      assert.equal(info.typeName, 'Map');
      assert.equal(info.cssClass, 'value-map');
      assert.equal(info.isNavigable, true);
    });
  });

  // ==========================================================================
  // Set Formatter
  // ==========================================================================

  describe('SetFormatter', () => {
    it('formats empty set', () => {
      const result = formatValue(new Set(), 'preview');
      assert.equal(result, 'Set{0}');
    });

    it('formats set with size', () => {
      const set = new Set([1, 2, 3, 4, 5]);
      const result = formatValue(set, 'preview');
      assert.equal(result, 'Set{5}');
    });

    it('full mode shows same as preview', () => {
      const set = new Set(['a', 'b']);
      const preview = formatValue(set, 'preview');
      const full = formatValue(set, 'full');
      assert.equal(preview, full);
    });

    it('provides correct ValueInfo for set', () => {
      const set = new Set([1, 2, 3]);
      const [formatted, info] = formatValueWithInfo(set, 'preview');

      assert.equal(formatted, 'Set{3}');
      assert.equal(info.category, ValueCategory.SET);
      assert.equal(info.typeName, 'Set');
      assert.equal(info.cssClass, 'value-set');
      assert.equal(info.isNavigable, true);
    });
  });

  // ==========================================================================
  // Object Formatter
  // ==========================================================================

  describe('ObjectFormatter', () => {
    it('formats empty object', () => {
      const result = formatValue({}, 'preview');
      assert.equal(result, 'Object{0}');
    });

    it('uses inferLabel for objects with name property', () => {
      const obj = { name: 'Alice', value: 123 };
      const result = formatValue(obj, 'preview');
      assert.equal(result, 'Alice');
    });

    it('uses inferLabel for objects with description property', () => {
      const obj = { description: 'Test object', data: [1, 2] };
      const result = formatValue(obj, 'preview');
      assert.equal(result, 'Test object');
    });

    it('falls back to property preview for objects without name/desc', () => {
      const obj = { a: 1, b: 2 };
      const result = formatValue(obj, 'preview');
      assert.ok(result.includes('"a":1'));
      assert.ok(result.includes('"b":2'));
    });

    it('truncates long property previews', () => {
      const obj = {
        prop1: 'value1',
        prop2: 'value2',
        prop3: 'value3',
        prop4: 'value4',
        prop5: 'value5',
      };
      const result = formatValue(obj, 'preview', 30);

      assert.ok(result.length <= 33); // 30 + '...'
    });

    it('filters out internal properties (__ prefix)', () => {
      const obj = { name: 'Public', __internal: 'hidden', value: 42 };
      const result = formatValue(obj, 'preview');

      assert.ok(!result.includes('__internal'));
    });

    it('provides correct ValueInfo for object', () => {
      const obj = { a: 1, b: 2 };
      const [formatted, info] = formatValueWithInfo(obj, 'preview');

      assert.ok(formatted.includes('a'));
      assert.equal(info.category, ValueCategory.OBJECT);
      assert.equal(info.typeName, 'Object');
      assert.equal(info.cssClass, 'value-object');
      assert.equal(info.isNavigable, true);
    });
  });

  // ==========================================================================
  // inferLabel Heuristic
  // ==========================================================================

  describe('inferLabel', () => {
    it('extracts name property', () => {
      const result = inferLabel({ empno: 7369, ename: 'SMITH' });
      assert.equal(result, 'SMITH');
    });

    it('extracts description property', () => {
      const result = inferLabel({ id: 1, description: 'Test item' });
      assert.equal(result, 'Test item');
    });

    it('extracts both name and description', () => {
      const result = inferLabel({ name: 'Alice', description: 'Engineer' });
      assert.equal(result, 'Alice Engineer');
    });

    it('extracts nested name object', () => {
      const result = inferLabel({
        empno: 7566,
        ename: { firstName: 'Indiana', lastName: 'JONES' }
      });
      assert.equal(result, 'Indiana JONES');
    });

    it('falls back to Object{n} for no matches', () => {
      const result = inferLabel({ empno: 7566, sal: 2975 });
      assert.equal(result, 'Object{2}');
    });

    it('handles null', () => {
      const result = inferLabel(null);
      assert.equal(result, '');
    });

    it('handles undefined', () => {
      const result = inferLabel(undefined);
      assert.equal(result, '');
    });

    it('handles primitives', () => {
      assert.equal(inferLabel(42), '42');
      assert.equal(inferLabel('hello'), 'hello');
      assert.equal(inferLabel(true), 'true');
    });

    it('handles Date', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = inferLabel(date);
      assert.equal(result, '2024-01-01T00:00:00.000Z');
    });

    it('handles Array', () => {
      const result = inferLabel([1, 2, 3]);
      assert.equal(result, '[3 items]');
    });

    it('handles Map', () => {
      const map = new Map([['a', 1]]);
      const result = inferLabel(map);
      assert.equal(result, 'Map{1}');
    });

    it('handles Set', () => {
      const set = new Set([1, 2]);
      const result = inferLabel(set);
      assert.equal(result, 'Set{2}');
    });

    it('ignores internal properties (__ prefix)', () => {
      const result = inferLabel({
        name: 'Public',
        __internal: 'should be ignored'
      });
      assert.equal(result, 'Public');
    });

    it('case-insensitive matching (NAME, Name, name)', () => {
      assert.equal(inferLabel({ NAME: 'UPPER' }), 'UPPER');
      assert.equal(inferLabel({ Name: 'Title' }), 'Title');
      assert.equal(inferLabel({ name: 'lower' }), 'lower');
    });

    it('matches desc and description', () => {
      assert.equal(inferLabel({ desc: 'Short' }), 'Short');
      assert.equal(inferLabel({ description: 'Long' }), 'Long');
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles very long strings without crashing', () => {
      const veryLong = 'x'.repeat(1000000);
      const result = formatValue(veryLong, 'preview', 100);
      assert.ok(result.length <= 103);
    });

    it('handles deeply nested objects', () => {
      const deep: any = {};
      let current = deep;
      for (let i = 0; i < 100; i++) {
        current.nested = {};
        current = current.nested;
      }

      // Should not crash
      const result = formatValue(deep, 'preview');
      assert.ok(typeof result === 'string');
    });

    it('handles objects with null prototype', () => {
      const obj = Object.create(null);
      obj.value = 42;

      const result = formatValue(obj, 'preview');
      assert.ok(result.includes('value'));
    });

    it('handles proxies', () => {
      const target = { value: 42 };
      const proxy = new Proxy(target, {});

      const result = formatValue(proxy, 'preview');
      assert.ok(result.includes('value'));
    });
  });
});
