/**
 * Test helper utilities
 */

import { strict as assert } from 'node:assert';
import type { Event, Path } from '../../../src/memimg/types.js';

/**
 * Deep equality check for objects including Maps, Sets, and Dates
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Map comparison
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, val] of a.entries()) {
      if (!b.has(key) || !deepEqual(val, b.get(key))) return false;
    }
    return true;
  }

  // Set comparison
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) return false;
    for (const val of a) {
      if (!b.has(val)) return false;
    }
    return true;
  }

  // Array comparison
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  // Object comparison
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key) || !deepEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return false;
}

/**
 * Assert that two values are deeply equal
 */
export function assertDeepEqual(actual: any, expected: any, message?: string) {
  if (!deepEqual(actual, expected)) {
    const msg = message || `Expected values to be deeply equal`;
    throw new assert.AssertionError({
      message: msg,
      actual,
      expected,
      operator: 'deepEqual',
    });
  }
}

/**
 * Assert that a function throws an error
 */
export function assertThrows(
  fn: () => void,
  errorMatch?: string | RegExp,
  message?: string
) {
  try {
    fn();
    throw new assert.AssertionError({
      message: message || 'Expected function to throw',
      operator: 'throws',
    });
  } catch (error) {
    if (errorMatch) {
      const errMessage = (error as Error).message;
      if (typeof errorMatch === 'string') {
        if (!errMessage.includes(errorMatch)) {
          throw new assert.AssertionError({
            message: `Expected error message to include "${errorMatch}", got "${errMessage}"`,
            actual: errMessage,
            expected: errorMatch,
            operator: 'throws',
          });
        }
      } else {
        if (!errorMatch.test(errMessage)) {
          throw new assert.AssertionError({
            message: `Expected error message to match ${errorMatch}, got "${errMessage}"`,
            actual: errMessage,
            expected: errorMatch,
            operator: 'throws',
          });
        }
      }
    }
  }
}

/**
 * Assert that an async function throws an error
 */
export async function assertRejects(
  fn: () => Promise<void>,
  errorMatch?: string | RegExp,
  message?: string
) {
  try {
    await fn();
    throw new assert.AssertionError({
      message: message || 'Expected async function to reject',
      operator: 'rejects',
    });
  } catch (error) {
    if (errorMatch) {
      const errMessage = (error as Error).message;
      if (typeof errorMatch === 'string') {
        if (!errMessage.includes(errorMatch)) {
          throw new assert.AssertionError({
            message: `Expected error message to include "${errorMatch}", got "${errMessage}"`,
            actual: errMessage,
            expected: errorMatch,
            operator: 'rejects',
          });
        }
      } else {
        if (!errorMatch.test(errMessage)) {
          throw new assert.AssertionError({
            message: `Expected error message to match ${errorMatch}, got "${errMessage}"`,
            actual: errMessage,
            expected: errorMatch,
            operator: 'rejects',
          });
        }
      }
    }
  }
}

/**
 * Wait for a specified amount of time
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a spy function that records calls
 */
export function createSpy<T extends (...args: any[]) => any>(
  implementation?: T
): T & { calls: any[][]; callCount: number; reset: () => void } {
  const calls: any[][] = [];
  const spy = ((...args: any[]) => {
    calls.push(args);
    return implementation?.(...args);
  }) as any;

  Object.defineProperty(spy, 'calls', {
    get: () => calls,
  });

  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length,
  });

  spy.reset = () => {
    calls.length = 0;
  };

  return spy;
}

/**
 * Assert that an event matches expected properties
 */
export function assertEvent(
  event: Event,
  expected: {
    type?: string;
    path?: Path;
    value?: any;
    [key: string]: any;
  }
) {
  if (expected.type !== undefined) {
    assert.equal(event.type, expected.type, 'Event type mismatch');
  }
  if (expected.path !== undefined) {
    assertDeepEqual(event.path, expected.path, 'Event path mismatch');
  }
  for (const key of Object.keys(expected)) {
    if (key !== 'type' && key !== 'path') {
      assertDeepEqual((event as any)[key], expected[key], `Event ${key} mismatch`);
    }
  }
}

/**
 * Assert that an array contains all expected elements (order-independent)
 */
export function assertContains<T>(array: T[], expected: T[], message?: string) {
  for (const item of expected) {
    if (!array.includes(item)) {
      throw new assert.AssertionError({
        message: message || `Expected array to contain ${item}`,
        actual: array,
        expected,
        operator: 'contains',
      });
    }
  }
}

/**
 * Get all property keys including symbols
 */
export function getAllKeys(obj: any): (string | symbol)[] {
  return [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)];
}

/**
 * Check if a value is a proxy
 */
export function isProxy(value: any): boolean {
  try {
    // Proxies can't be reliably detected, but we can use util.types.isProxy in Node.js
    const util = require('util');
    return util.types?.isProxy?.(value) || false;
  } catch {
    return false;
  }
}

/**
 * Create a mock event log for testing
 */
export function createMockEventLog() {
  const events: Event[] = [];

  return {
    events,
    append: async (event: Event) => {
      events.push(event);
    },
    getAll: async () => [...events],
    clear: async () => {
      events.length = 0;
    },
  };
}

/**
 * Format path for display
 */
export function formatPath(path: Path): string {
  return path.length === 0 ? '<root>' : path.join('.');
}

/**
 * Generate a range of numbers
 */
export function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

/**
 * Clone an object deeply (non-proxy-aware)
 */
export function clone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj) as any;
  }

  if (obj instanceof Map) {
    return new Map(
      Array.from(obj.entries()).map(([k, v]) => [clone(k), clone(v)])
    ) as any;
  }

  if (obj instanceof Set) {
    return new Set(Array.from(obj).map(clone)) as any;
  }

  if (Array.isArray(obj)) {
    return obj.map(clone) as any;
  }

  const cloned: any = {};
  for (const key of Object.keys(obj)) {
    cloned[key] = clone((obj as any)[key]);
  }
  return cloned;
}
