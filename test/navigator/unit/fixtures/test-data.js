/**
 * Shared test fixtures and data generators for Navigator unit tests
 */
// ============================================================================
// Path Fixtures
// ============================================================================
export const PATHS = {
    root: ['root'],
    simple: ['root', 'user'],
    nested: ['root', 'user', 'profile', 'name'],
    array: ['root', 'items', '0'],
    map: ['root', 'map', 'map:0'],
    set: ['root', 'set', 'set:0'],
    deep: ['root', 'a', 'b', 'c', 'd', 'e'],
};
// ============================================================================
// Object Graph Fixtures
// ============================================================================
/**
 * Create a simple object graph for testing
 */
export function createSimpleGraph() {
    return {
        name: 'Alice',
        age: 30,
        active: true,
        created: new Date('2024-01-01'),
    };
}
/**
 * Create a nested object graph
 */
export function createNestedGraph() {
    return {
        user: {
            profile: {
                name: 'Bob',
                email: 'bob@example.com',
            },
            settings: {
                theme: 'dark',
                notifications: true,
            },
        },
        metadata: {
            createdAt: new Date('2024-01-01'),
            version: 1,
        },
    };
}
/**
 * Create a graph with circular references
 */
export function createCircularGraph() {
    const user = {
        name: 'Charlie',
        friends: [],
    };
    const friend = {
        name: 'Dave',
        friends: [user],
    };
    user.friends.push(friend);
    user.self = user;
    return { user, friend };
}
/**
 * Create a graph with collections
 */
export function createCollectionGraph() {
    return {
        array: [1, 2, 3, 4, 5],
        map: new Map([
            ['key1', 'value1'],
            ['key2', 'value2'],
            ['key3', { nested: true }],
        ]),
        set: new Set(['a', 'b', 'c']),
        nested: {
            array: [{ id: 1 }, { id: 2 }],
            map: new Map([['inner', new Map([['deep', 'value']])]]),
        },
    };
}
/**
 * Create a graph with all JavaScript types
 */
export function createAllTypesGraph() {
    return {
        // Primitives
        string: 'hello',
        number: 42,
        bigint: BigInt(9007199254740991),
        boolean: true,
        null: null,
        undefined: undefined,
        symbol: Symbol('test'),
        // Special
        date: new Date('2024-01-01'),
        func: function testFunc() { return 'result'; },
        arrow: () => 'arrow',
        // Collections
        array: [1, 2, 3],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
        // Objects
        object: { nested: 'value' },
        empty: {},
    };
}
/**
 * Create a deeply nested graph (for performance testing)
 */
export function createDeepGraph(depth = 10) {
    let current = { value: 'leaf' };
    for (let i = depth - 1; i >= 0; i--) {
        current = { [`level${i}`]: current };
    }
    return current;
}
/**
 * Create a large graph (for performance testing)
 */
export function createLargeGraph(size = 100) {
    const items = [];
    for (let i = 0; i < size; i++) {
        items.push({
            id: i,
            name: `Item ${i}`,
            value: Math.random() * 1000,
            active: i % 2 === 0,
            tags: ['tag1', 'tag2', 'tag3'],
        });
    }
    return { items };
}
// ============================================================================
// Memory Image Metadata Fixtures
// ============================================================================
/**
 * Create test memory image metadata
 */
export function createMemoryImageMetadata(overrides = {}) {
    return {
        id: 'test-id-' + Math.random().toString(36).substr(2, 9),
        name: 'Test Memory Image',
        description: 'A test memory image',
        createdAt: Date.now() - 86400000, // 1 day ago
        updatedAt: Date.now(),
        eventCount: 0,
        ...overrides,
    };
}
/**
 * Create multiple memory image metadata entries
 */
export function createMultipleMemoryImages(count = 3) {
    return Array.from({ length: count }, (_, i) => createMemoryImageMetadata({
        name: `Memory Image ${i + 1}`,
        description: `Description for image ${i + 1}`,
        createdAt: Date.now() - (count - i) * 3600000, // Staggered by hours
        updatedAt: Date.now() - (count - i) * 1800000,
        eventCount: i * 10,
    }));
}
// ============================================================================
// Script History Fixtures
// ============================================================================
/**
 * Create test script history entry
 */
export function createScriptEntry(overrides = {}) {
    const code = overrides.code || 'this.value = 42;';
    return {
        id: 'script-id-' + Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        code,
        status: 'success',
        characterCount: code.length,
        ...overrides,
    };
}
/**
 * Create multiple script history entries
 */
export function createMultipleScripts(count = 10) {
    return Array.from({ length: count }, (_, i) => createScriptEntry({
        code: `// Script ${i + 1}\nthis.value${i} = ${i * 10};`,
        timestamp: Date.now() - (count - i) * 60000, // Staggered by minutes
    }));
}
/**
 * Create a large script (for size limit testing)
 */
export function createLargeScript(sizeKB = 50) {
    const chunkSize = 1000;
    const chunks = Math.floor((sizeKB * 1024) / chunkSize);
    let script = '// Large script\n';
    for (let i = 0; i < chunks; i++) {
        script += `// Chunk ${i}: ${'x'.repeat(chunkSize - 20)}\n`;
    }
    return script;
}
// ============================================================================
// Value Formatting Test Data
// ============================================================================
export const FORMAT_TEST_VALUES = {
    // Primitives
    nullValue: null,
    undefinedValue: undefined,
    string: 'hello world',
    longString: 'x'.repeat(200),
    number: 42,
    float: 3.14159,
    bigint: BigInt('9007199254740991'),
    booleanTrue: true,
    booleanFalse: false,
    symbol: Symbol('test'),
    symbolNamed: Symbol.for('named'),
    // Special
    date: new Date('2024-01-01T00:00:00.000Z'),
    namedFunction: function testFunc() { return 'result'; },
    anonymousFunction: function () { return 'anon'; },
    arrowFunction: () => 'arrow',
    // Collections
    emptyArray: [],
    array: [1, 2, 3],
    largeArray: Array.from({ length: 100 }, (_, i) => i),
    emptyMap: new Map(),
    map: new Map([['key1', 'value1'], ['key2', 'value2']]),
    emptySet: new Set(),
    set: new Set([1, 2, 3]),
    // Objects
    emptyObject: {},
    simpleObject: { a: 1, b: 2 },
    nestedObject: { user: { name: 'Alice', age: 30 } },
    objectWithName: { name: 'Bob', value: 123 },
    objectWithDescription: { description: 'Test object', data: [1, 2, 3] },
    objectWithNestedName: {
        empno: 7566,
        ename: { firstName: 'Indiana', lastName: 'JONES' }
    },
};
// ============================================================================
// Collection Test Data
// ============================================================================
export const COLLECTION_TEST_DATA = {
    simpleArray: [1, 2, 3, 4, 5],
    nestedArray: [[1, 2], [3, 4], [5, 6]],
    objectArray: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
        { id: 3, name: 'Charlie' },
    ],
    simpleMap: new Map([
        ['a', 1],
        ['b', 2],
        ['c', 3],
    ]),
    nestedMap: new Map([
        ['outer', new Map([['inner', 'value']])],
        ['array', [1, 2, 3]],
    ]),
    simpleSet: new Set([1, 2, 3, 4, 5]),
    objectSet: new Set([
        { id: 1 },
        { id: 2 },
        { id: 3 },
    ]),
};
// ============================================================================
// Property Access Test Data
// ============================================================================
export const PROPERTY_TEST_OBJECTS = {
    // Object with both scalars and collections
    mixed: {
        name: 'Test',
        age: 30,
        active: true,
        items: [1, 2, 3],
        tags: new Set(['a', 'b']),
        metadata: new Map([['key', 'value']]),
    },
    // Object with internal properties
    withInternal: {
        name: 'Public',
        __internal: 'hidden',
        __metadata: { secret: true },
        value: 42,
    },
    // Object with only scalars
    scalarsOnly: {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
    },
    // Object with only collections
    collectionsOnly: {
        array: [1, 2, 3],
        map: new Map([['key', 'value']]),
        set: new Set([1, 2, 3]),
    },
    // Empty object
    empty: {},
};
