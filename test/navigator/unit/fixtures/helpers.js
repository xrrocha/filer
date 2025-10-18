/**
 * Shared helper utilities for Navigator unit tests
 */
import { strict as assert } from 'node:assert';
// ============================================================================
// Mock Implementations
// ============================================================================
/**
 * Mock EventLog for testing (in-memory implementation)
 */
export class MockEventLog {
    events = [];
    _closed = false;
    async append(event) {
        if (this._closed) {
            throw new Error('EventLog is closed');
        }
        this.events.push(event);
    }
    async getAll() {
        if (this._closed) {
            throw new Error('EventLog is closed');
        }
        return [...this.events];
    }
    async clear() {
        if (this._closed) {
            throw new Error('EventLog is closed');
        }
        this.events = [];
    }
    async close() {
        this._closed = true;
    }
    async *stream() {
        if (this._closed) {
            throw new Error('EventLog is closed');
        }
        for (const event of this.events) {
            yield event;
        }
    }
    // Test utilities
    get isClosed() {
        return this._closed;
    }
    reset() {
        this.events = [];
        this._closed = false;
    }
    getEventsByType(type) {
        return this.events.filter(e => e.type === type);
    }
    getEventsByPath(path) {
        return this.events.filter(e => e.path.length === path.length &&
            e.path.every((p, i) => p === path[i]));
    }
}
/**
 * Create a mock EventLog
 */
export function createMockEventLog() {
    return new MockEventLog();
}
// ============================================================================
// Assertion Helpers
// ============================================================================
/**
 * Deep equality assertion (handles cycles, special types)
 */
export function assertDeepEqual(actual, expected, message) {
    try {
        assert.deepEqual(actual, expected, message);
    }
    catch (error) {
        // Enhanced error message
        const err = error;
        err.message = `${message ? message + '\n' : ''}${err.message}\n` +
            `Actual: ${JSON.stringify(actual, null, 2)}\n` +
            `Expected: ${JSON.stringify(expected, null, 2)}`;
        throw err;
    }
}
/**
 * Assert that two arrays have the same elements (order-insensitive)
 */
export function assertArrayContains(actual, expected, message) {
    for (const item of expected) {
        assert.ok(actual.includes(item), `${message || 'Array should contain'}: ${JSON.stringify(item)}`);
    }
}
/**
 * Assert that a value matches a predicate
 */
export function assertMatches(value, predicate, message) {
    assert.ok(predicate(value), message || 'Value should match predicate');
}
/**
 * Assert that a function throws an error with a specific message
 */
export function assertThrows(fn, expectedMessage, message) {
    let thrown = false;
    let actualError = null;
    try {
        fn();
    }
    catch (error) {
        thrown = true;
        actualError = error;
        if (expectedMessage) {
            if (typeof expectedMessage === 'string') {
                assert.ok(actualError.message.includes(expectedMessage), `${message || 'Error message should contain'}: "${expectedMessage}"\n` +
                    `Actual: "${actualError.message}"`);
            }
            else {
                assert.ok(expectedMessage.test(actualError.message), `${message || 'Error message should match'}: ${expectedMessage}\n` +
                    `Actual: "${actualError.message}"`);
            }
        }
    }
    assert.ok(thrown, message || 'Function should throw an error');
}
/**
 * Assert that an async function throws an error
 */
export async function assertThrowsAsync(fn, expectedMessage, message) {
    let thrown = false;
    let actualError = null;
    try {
        await fn();
    }
    catch (error) {
        thrown = true;
        actualError = error;
        if (expectedMessage) {
            if (typeof expectedMessage === 'string') {
                assert.ok(actualError.message.includes(expectedMessage), `${message || 'Error message should contain'}: "${expectedMessage}"\n` +
                    `Actual: "${actualError.message}"`);
            }
            else {
                assert.ok(expectedMessage.test(actualError.message), `${message || 'Error message should match'}: ${expectedMessage}\n` +
                    `Actual: "${actualError.message}"`);
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
export function generateTestUUID() {
    return 'test-' + Math.random().toString(36).substr(2, 9);
}
/**
 * Generate a random string
 */
export function generateRandomString(length = 10) {
    return Math.random().toString(36).substr(2, length);
}
/**
 * Create a delay (for async testing)
 */
export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Wait for a condition to become true
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
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
export async function waitForAsync(condition, timeout = 5000, interval = 100) {
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
export function createMockElement(tag = 'div') {
    // This is a minimal mock, not a real DOM element
    // For full DOM testing, use Playwright integration tests
    const element = {
        tagName: tag.toUpperCase(),
        children: [],
        className: '',
        textContent: '',
        innerHTML: '',
        attributes: new Map(),
        appendChild(child) {
            this.children.push(child);
            return child;
        },
        setAttribute(name, value) {
            this.attributes.set(name, value);
        },
        getAttribute(name) {
            return this.attributes.get(name) || null;
        },
        classList: {
            add(...classes) {
                const current = element.className.split(' ').filter(Boolean);
                element.className = [...current, ...classes].join(' ');
            },
            remove(...classes) {
                const current = element.className.split(' ').filter(Boolean);
                element.className = current.filter(c => !classes.includes(c)).join(' ');
            },
            contains(className) {
                return element.className.split(' ').includes(className);
            },
        },
    };
    return element;
}
// ============================================================================
// Spy/Mock Function Utilities
// ============================================================================
/**
 * Create a spy function that tracks calls
 */
export function createSpy() {
    const spy = {
        calls: [],
        get callCount() {
            return this.calls.length;
        },
        get lastCall() {
            return this.calls[this.calls.length - 1] || null;
        },
        reset() {
            this.calls = [];
        },
        fn: ((...args) => {
            spy.calls.push(args);
        }),
    };
    return spy;
}
/**
 * Create a mock function with a custom implementation
 */
export function createMock(implementation) {
    const spy = createSpy();
    if (implementation) {
        spy.fn = ((...args) => {
            spy.calls.push(args);
            return implementation(...args);
        });
    }
    return spy;
}
// ============================================================================
// Path Utilities
// ============================================================================
/**
 * Compare two paths for equality
 */
export function pathsEqual(path1, path2) {
    return path1.length === path2.length &&
        path1.every((segment, i) => segment === path2[i]);
}
/**
 * Convert path array to dot notation
 */
export function pathToDotNotation(path) {
    return path.join('.');
}
/**
 * Convert dot notation to path array
 */
export function dotNotationToPath(dotPath) {
    return dotPath.split('.');
}
// ============================================================================
// IndexedDB Mock Utilities
// ============================================================================
/**
 * Mock IndexedDB Index for unit testing
 */
export class MockIDBIndex {
    name;
    keyPath;
    unique;
    constructor(name, keyPath, unique = false) {
        this.name = name;
        this.keyPath = keyPath;
        this.unique = unique;
    }
}
/**
 * Mock IndexedDB Object Store for unit testing
 */
export class MockIDBObjectStore {
    name;
    keyPath;
    autoIncrement;
    data = new Map();
    indexes = new Map();
    nextKey = 1;
    constructor(name, options) {
        this.name = name;
        this.keyPath = options?.keyPath || null;
        this.autoIncrement = options?.autoIncrement || false;
    }
    async add(value, key) {
        const actualKey = key || (this.autoIncrement ? this.nextKey++ : this.extractKey(value));
        if (this.data.has(actualKey)) {
            throw new Error('Key already exists');
        }
        this.data.set(actualKey, value);
        return actualKey;
    }
    async put(value, key) {
        const actualKey = key || (this.autoIncrement ? this.extractKey(value) || this.nextKey++ : this.extractKey(value));
        this.data.set(actualKey, value);
        return actualKey;
    }
    async get(key) {
        return this.data.get(key);
    }
    async delete(key) {
        this.data.delete(key);
    }
    async clear() {
        this.data.clear();
        this.nextKey = 1;
    }
    async count() {
        return this.data.size;
    }
    async getAll() {
        return Array.from(this.data.values());
    }
    async getAllKeys() {
        return Array.from(this.data.keys());
    }
    createIndex(name, keyPath, options) {
        const index = new MockIDBIndex(name, keyPath, options?.unique || false);
        this.indexes.set(name, index);
        return index;
    }
    index(name) {
        const idx = this.indexes.get(name);
        if (!idx)
            throw new Error(`Index "${name}" not found`);
        return idx;
    }
    extractKey(value) {
        if (!this.keyPath)
            return undefined;
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
    mode;
    stores;
    storeNames;
    _error = null;
    _aborted = false;
    constructor(stores, storeNames, mode = 'readonly') {
        this.stores = stores;
        this.storeNames = Array.isArray(storeNames) ? storeNames : [storeNames];
        this.mode = mode;
    }
    objectStore(name) {
        if (!this.storeNames.includes(name)) {
            throw new Error(`Object store "${name}" not found in transaction`);
        }
        const store = this.stores.get(name);
        if (!store) {
            throw new Error(`Object store "${name}" does not exist`);
        }
        return store;
    }
    abort() {
        this._aborted = true;
    }
    get error() {
        return this._error;
    }
}
/**
 * Mock IndexedDB Database for unit testing
 */
export class MockIDBDatabase {
    name;
    version;
    objectStoreNames = [];
    stores = new Map();
    _closed = false;
    constructor(name, version = 1) {
        this.name = name;
        this.version = version;
    }
    transaction(storeNames, mode = 'readonly') {
        if (this._closed) {
            throw new Error('Database is closed');
        }
        return new MockIDBTransaction(this.stores, storeNames, mode);
    }
    createObjectStore(name, options) {
        if (this.stores.has(name)) {
            throw new Error(`Object store "${name}" already exists`);
        }
        const store = new MockIDBObjectStore(name, options);
        this.stores.set(name, store);
        this.objectStoreNames.push(name);
        return store;
    }
    deleteObjectStore(name) {
        this.stores.delete(name);
        this.objectStoreNames = this.objectStoreNames.filter(n => n !== name);
    }
    close() {
        this._closed = true;
    }
    get isClosed() {
        return this._closed;
    }
}
/**
 * Mock IndexedDB Factory for unit testing
 */
export class MockIDBFactory {
    databases = new Map();
    async open(name, version) {
        let db = this.databases.get(name);
        if (!db) {
            db = new MockIDBDatabase(name, version || 1);
            this.databases.set(name, db);
        }
        else if (version && version > db.version) {
            // Simulate version upgrade
            db.version = version;
        }
        return db;
    }
    async deleteDatabase(name) {
        const db = this.databases.get(name);
        if (db) {
            db.close();
            this.databases.delete(name);
        }
    }
    // Test utility to reset all databases
    reset() {
        for (const db of this.databases.values()) {
            db.close();
        }
        this.databases.clear();
    }
    // Test utility to get all database names
    getDatabaseNames() {
        return Array.from(this.databases.keys());
    }
}
/**
 * Global mock IndexedDB instance
 */
let mockIndexedDB = null;
/**
 * Setup mock IndexedDB for testing
 *
 * Call this in beforeEach() to ensure a clean IndexedDB state
 */
export function setupMockIndexedDB() {
    mockIndexedDB = new MockIDBFactory();
    // Install into global if running in Node.js
    if (typeof global !== 'undefined') {
        global.indexedDB = mockIndexedDB;
    }
    return mockIndexedDB;
}
/**
 * Teardown mock IndexedDB after testing
 *
 * Call this in afterEach() to clean up
 */
export function teardownMockIndexedDB() {
    if (mockIndexedDB) {
        mockIndexedDB.reset();
        mockIndexedDB = null;
    }
    if (typeof global !== 'undefined') {
        delete global.indexedDB;
    }
}
/**
 * Get the current mock IndexedDB instance
 */
export function getMockIndexedDB() {
    if (!mockIndexedDB) {
        throw new Error('Mock IndexedDB not initialized. Call setupMockIndexedDB() first.');
    }
    return mockIndexedDB;
}
