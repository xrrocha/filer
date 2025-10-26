/**
 * Shared helper utilities for Navigator unit tests
 */

import { strict as assert } from 'node:assert';
import type { Event, EventLog } from 'ireneo';

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Mock EventLog for testing (in-memory implementation)
 */
export class MockEventLog implements EventLog {
  public events: Event[] = [];
  private _closed = false;

  async append(event: Event): Promise<void> {
    if (this._closed) {
      throw new Error('EventLog is closed');
    }
    this.events.push(event);
  }

  async getAll(): Promise<readonly Event[]> {
    if (this._closed) {
      throw new Error('EventLog is closed');
    }
    return [...this.events];
  }

  async clear(): Promise<void> {
    if (this._closed) {
      throw new Error('EventLog is closed');
    }
    this.events = [];
  }

  async close(): Promise<void> {
    this._closed = true;
  }

  async *stream(): AsyncIterable<Event> {
    if (this._closed) {
      throw new Error('EventLog is closed');
    }
    for (const event of this.events) {
      yield event;
    }
  }

  // Test utilities
  get isClosed(): boolean {
    return this._closed;
  }

  reset(): void {
    this.events = [];
    this._closed = false;
  }

  getEventsByType(type: string): Event[] {
    return this.events.filter(e => e.type === type);
  }

  getEventsByPath(path: readonly string[]): Event[] {
    return this.events.filter(e =>
      e.path.length === path.length &&
      e.path.every((p, i) => p === path[i])
    );
  }
}

/**
 * Create a mock EventLog
 */
export function createMockEventLog(): MockEventLog {
  return new MockEventLog();
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Deep equality assertion (handles cycles, special types)
 */
export function assertDeepEqual(actual: unknown, expected: unknown, message?: string): void {
  try {
    assert.deepEqual(actual, expected, message);
  } catch (error) {
    // Enhanced error message
    const err = error as Error;
    err.message = `${message ? message + '\n' : ''}${err.message}\n` +
      `Actual: ${JSON.stringify(actual, null, 2)}\n` +
      `Expected: ${JSON.stringify(expected, null, 2)}`;
    throw err;
  }
}

/**
 * Assert that two arrays have the same elements (order-insensitive)
 */
export function assertArrayContains<T>(actual: T[], expected: T[], message?: string): void {
  for (const item of expected) {
    assert.ok(
      actual.includes(item),
      `${message || 'Array should contain'}: ${JSON.stringify(item)}`
    );
  }
}

/**
 * Assert that a value matches a predicate
 */
export function assertMatches<T>(
  value: T,
  predicate: (v: T) => boolean,
  message?: string
): void {
  assert.ok(predicate(value), message || 'Value should match predicate');
}

/**
 * Assert that a function throws an error with a specific message
 */
export function assertThrows(
  fn: () => void,
  expectedMessage?: string | RegExp,
  message?: string
): void {
  let thrown = false;
  let actualError: Error | null = null;

  try {
    fn();
  } catch (error) {
    thrown = true;
    actualError = error as Error;

    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        assert.ok(
          actualError.message.includes(expectedMessage),
          `${message || 'Error message should contain'}: "${expectedMessage}"\n` +
          `Actual: "${actualError.message}"`
        );
      } else {
        assert.ok(
          expectedMessage.test(actualError.message),
          `${message || 'Error message should match'}: ${expectedMessage}\n` +
          `Actual: "${actualError.message}"`
        );
      }
    }
  }

  assert.ok(thrown, message || 'Function should throw an error');
}

/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(
  fn: () => Promise<void>,
  expectedMessage?: string | RegExp,
  message?: string
): Promise<void> {
  let thrown = false;
  let actualError: Error | null = null;

  try {
    await fn();
  } catch (error) {
    thrown = true;
    actualError = error as Error;

    if (expectedMessage) {
      if (typeof expectedMessage === 'string') {
        assert.ok(
          actualError.message.includes(expectedMessage),
          `${message || 'Error message should contain'}: "${expectedMessage}"\n` +
          `Actual: "${actualError.message}"`
        );
      } else {
        assert.ok(
          expectedMessage.test(actualError.message),
          `${message || 'Error message should match'}: ${expectedMessage}\n` +
          `Actual: "${actualError.message}"`
        );
      }
    }
  }

  assert.ok(thrown, message || 'Async function should throw an error');
}

// ============================================================================
// Test Data Utilities
// ============================================================================

/**
 * Generate a random UUID (for testing)
 */
export function generateTestUUID(): string {
  return 'test-' + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 10): string {
  return Math.random().toString(36).substr(2, length);
}

/**
 * Create a delay (for async testing)
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to become true
 */
export async function waitFor(
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await delay(interval);
  }
}

/**
 * Wait for a condition with async predicate
 */
export async function waitForAsync(
  condition: () => Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();

  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for async condition');
    }
    await delay(interval);
  }
}

// ============================================================================
// Mock DOM Utilities (for unit tests that need minimal DOM)
// ============================================================================

/**
 * Create a mock DOM element (for testing formatters/renderers)
 */
export function createMockElement(tag: string = 'div'): HTMLElement {
  // This is a minimal mock, not a real DOM element
  // For full DOM testing, use Playwright integration tests
  const element: any = {
    tagName: tag.toUpperCase(),
    children: [],
    className: '',
    textContent: '',
    innerHTML: '',
    attributes: new Map<string, string>(),

    appendChild(child: any) {
      this.children.push(child);
      return child;
    },

    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    },

    getAttribute(name: string) {
      return this.attributes.get(name) || null;
    },

    classList: {
      add(...classes: string[]) {
        const current = element.className.split(' ').filter(Boolean);
        element.className = [...current, ...classes].join(' ');
      },

      remove(...classes: string[]) {
        const current = element.className.split(' ').filter(Boolean);
        element.className = current.filter(c => !classes.includes(c)).join(' ');
      },

      contains(className: string) {
        return element.className.split(' ').includes(className);
      },
    },
  };

  return element as HTMLElement;
}

// ============================================================================
// Spy/Mock Function Utilities
// ============================================================================

/**
 * Create a spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(): {
  fn: T;
  calls: any[][];
  callCount: number;
  lastCall: any[] | null;
  reset: () => void;
} {
  const spy = {
    calls: [] as any[][],
    get callCount() {
      return this.calls.length;
    },
    get lastCall() {
      return this.calls[this.calls.length - 1] || null;
    },
    reset() {
      this.calls = [];
    },
    fn: ((...args: any[]) => {
      spy.calls.push(args);
    }) as T,
  };

  return spy;
}

/**
 * Create a mock function with a custom implementation
 */
export function createMock<T extends (...args: any[]) => any>(
  implementation?: T
): {
  fn: T;
  calls: any[][];
  callCount: number;
  lastCall: any[] | null;
  reset: () => void;
} {
  const spy = createSpy<T>();

  if (implementation) {
    spy.fn = ((...args: any[]) => {
      spy.calls.push(args);
      return implementation(...args);
    }) as T;
  }

  return spy;
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Compare two paths for equality
 */
export function pathsEqual(path1: readonly string[], path2: readonly string[]): boolean {
  return path1.length === path2.length &&
    path1.every((segment, i) => segment === path2[i]);
}

/**
 * Convert path array to dot notation
 */
export function pathToDotNotation(path: readonly string[]): string {
  return path.join('.');
}

/**
 * Convert dot notation to path array
 */
export function dotNotationToPath(dotPath: string): string[] {
  return dotPath.split('.');
}

// ============================================================================
// IndexedDB Mock Utilities
// ============================================================================

/**
 * Mock IndexedDB Index for unit testing
 */
export class MockIDBIndex {
  constructor(
    public name: string,
    public keyPath: string | string[],
    public unique: boolean = false
  ) {}
}

/**
 * Mock IndexedDB Object Store for unit testing
 */
export class MockIDBObjectStore {
  public name: string;
  public keyPath: string | string[] | null;
  public autoIncrement: boolean;
  private data: Map<any, any> = new Map();
  private indexes: Map<string, MockIDBIndex> = new Map();
  private nextKey: number = 1;

  constructor(name: string, options?: IDBObjectStoreParameters) {
    this.name = name;
    this.keyPath = options?.keyPath || null;
    this.autoIncrement = options?.autoIncrement || false;
  }

  async add(value: any, key?: any): Promise<any> {
    const actualKey = key || (this.autoIncrement ? this.nextKey++ : this.extractKey(value));

    if (this.data.has(actualKey)) {
      throw new Error('Key already exists');
    }

    this.data.set(actualKey, value);
    return actualKey;
  }

  async put(value: any, key?: any): Promise<any> {
    const actualKey = key || (this.autoIncrement ? this.extractKey(value) || this.nextKey++ : this.extractKey(value));
    this.data.set(actualKey, value);
    return actualKey;
  }

  async get(key: any): Promise<any> {
    return this.data.get(key);
  }

  async delete(key: any): Promise<void> {
    this.data.delete(key);
  }

  async clear(): Promise<void> {
    this.data.clear();
    this.nextKey = 1;
  }

  async count(): Promise<number> {
    return this.data.size;
  }

  async getAll(): Promise<any[]> {
    return Array.from(this.data.values());
  }

  async getAllKeys(): Promise<any[]> {
    return Array.from(this.data.keys());
  }

  createIndex(name: string, keyPath: string | string[], options?: IDBIndexParameters): MockIDBIndex {
    const index = new MockIDBIndex(name, keyPath, options?.unique || false);
    this.indexes.set(name, index);
    return index;
  }

  index(name: string): MockIDBIndex {
    const idx = this.indexes.get(name);
    if (!idx) throw new Error(`Index "${name}" not found`);
    return idx;
  }

  private extractKey(value: any): any {
    if (!this.keyPath) return undefined;

    if (typeof this.keyPath === 'string') {
      return value[this.keyPath];
    }

    // Array keyPath
    return this.keyPath.map(k => value[k]);
  }
}

/**
 * Mock IndexedDB Transaction for unit testing
 */
export class MockIDBTransaction {
  public mode: IDBTransactionMode;
  private stores: Map<string, MockIDBObjectStore>;
  private storeNames: string[];
  private _error: Error | null = null;
  private _aborted = false;

  constructor(
    stores: Map<string, MockIDBObjectStore>,
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ) {
    this.stores = stores;
    this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
    this.mode = mode;
  }

  objectStore(name: string): MockIDBObjectStore {
    if (!this.storeNames.includes(name)) {
      throw new Error(`Object store "${name}" not found in transaction`);
    }

    const store = this.stores.get(name);
    if (!store) {
      throw new Error(`Object store "${name}" does not exist`);
    }

    return store;
  }

  abort(): void {
    this._aborted = true;
  }

  get error(): Error | null {
    return this._error;
  }
}

/**
 * Mock IndexedDB Database for unit testing
 */
export class MockIDBDatabase {
  public name: string;
  public version: number;
  public objectStoreNames: string[] = [];
  private stores: Map<string, MockIDBObjectStore> = new Map();
  private _closed = false;

  constructor(name: string, version: number = 1) {
    this.name = name;
    this.version = version;
  }

  transaction(
    storeNames: string | string[],
    mode: IDBTransactionMode = 'readonly'
  ): MockIDBTransaction {
    if (this._closed) {
      throw new Error('Database is closed');
    }

    return new MockIDBTransaction(this.stores, storeNames, mode);
  }

  createObjectStore(name: string, options?: IDBObjectStoreParameters): MockIDBObjectStore {
    if (this.stores.has(name)) {
      throw new Error(`Object store "${name}" already exists`);
    }

    const store = new MockIDBObjectStore(name, options);
    this.stores.set(name, store);
    this.objectStoreNames.push(name);
    return store;
  }

  deleteObjectStore(name: string): void {
    this.stores.delete(name);
    this.objectStoreNames = this.objectStoreNames.filter(n => n !== name);
  }

  close(): void {
    this._closed = true;
  }

  get isClosed(): boolean {
    return this._closed;
  }
}

/**
 * Mock IndexedDB Factory for unit testing
 */
export class MockIDBFactory {
  private databases: Map<string, MockIDBDatabase> = new Map();

  async open(name: string, version?: number): Promise<MockIDBDatabase> {
    let db = this.databases.get(name);

    if (!db) {
      db = new MockIDBDatabase(name, version || 1);
      this.databases.set(name, db);
    } else if (version && version > db.version) {
      // Simulate version upgrade
      db.version = version;
    }

    return db;
  }

  async deleteDatabase(name: string): Promise<void> {
    const db = this.databases.get(name);
    if (db) {
      db.close();
      this.databases.delete(name);
    }
  }

  // Test utility to reset all databases
  reset(): void {
    for (const db of this.databases.values()) {
      db.close();
    }
    this.databases.clear();
  }

  // Test utility to get all database names
  getDatabaseNames(): string[] {
    return Array.from(this.databases.keys());
  }
}

/**
 * Global mock IndexedDB instance
 */
let mockIndexedDB: MockIDBFactory | null = null;

/**
 * Setup mock IndexedDB for testing
 *
 * Call this in beforeEach() to ensure a clean IndexedDB state
 */
export function setupMockIndexedDB(): MockIDBFactory {
  mockIndexedDB = new MockIDBFactory();

  // Install into global if running in Node.js
  if (typeof global !== 'undefined') {
    (global as any).indexedDB = mockIndexedDB;
  }

  return mockIndexedDB;
}

/**
 * Teardown mock IndexedDB after testing
 *
 * Call this in afterEach() to clean up
 */
export function teardownMockIndexedDB(): void {
  if (mockIndexedDB) {
    mockIndexedDB.reset();
    mockIndexedDB = null;
  }

  if (typeof global !== 'undefined') {
    delete (global as any).indexedDB;
  }
}

/**
 * Get the current mock IndexedDB instance
 */
export function getMockIndexedDB(): MockIDBFactory {
  if (!mockIndexedDB) {
    throw new Error('Mock IndexedDB not initialized. Call setupMockIndexedDB() first.');
  }
  return mockIndexedDB;
}
