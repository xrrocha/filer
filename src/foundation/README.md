# Foundation - Core Type Detection

Shared JavaScript type detection utilities used by both memimg and navigator.

**Zero Dependencies**: This module has NO imports from other Filer modules.
**Pure Functions**: All exports are stateless type guards and helpers.

## Purpose

Eliminates duplication of type detection logic across memimg (serialization) and navigator (UI). Provides a single source of truth for JavaScript type classification.

## Modules

- `js-types.ts` - Core type guards (isPrimitive, isCollection, isNullish, isPlainObject, isObject)

## Usage

```typescript
import { isPrimitive, isCollection, isNullish } from '../foundation/js-types.js';

if (isPrimitive(value)) {
  // Handle primitive values (null, undefined, string, number, boolean, bigint, symbol)
}

if (isCollection(value)) {
  // Handle collections (Array, Map, Set)
}

if (isNullish(value)) {
  // Handle null or undefined
}
```

## API Reference

### isPrimitive(value: unknown): boolean

Returns true for primitive values:
- `null`, `undefined`
- `string`, `number`, `boolean`
- `bigint`, `symbol`

**Example**:
```typescript
isPrimitive(42)           // true
isPrimitive('hello')      // true
isPrimitive(null)         // true
isPrimitive({})           // false
isPrimitive([])           // false
```

### isCollection(value: unknown): boolean

Returns true for collection types:
- `Array`
- `Map`
- `Set`

Note: WeakMap and WeakSet are NOT considered collections (not iterable/serializable).

**Example**:
```typescript
isCollection([1, 2, 3])          // true
isCollection(new Map())          // true
isCollection(new Set())          // true
isCollection({})                 // false
isCollection(new WeakMap())      // false
```

### isNullish(value: unknown): boolean

Returns true for `null` or `undefined`.

**Example**:
```typescript
isNullish(null)        // true
isNullish(undefined)   // true
isNullish(0)           // false
isNullish('')          // false
isNullish(false)       // false
```

### isPlainObject(value: unknown): boolean

Returns true for plain objects (not null, not arrays, not special objects like Date/Map/Set).

**Example**:
```typescript
isPlainObject({})              // true
isPlainObject({ a: 1 })        // true
isPlainObject(Object.create(null)) // true
isPlainObject([])              // false
isPlainObject(new Date())      // false
isPlainObject(null)            // false
```

### isObject(value: unknown): boolean

Returns true for any object (not null), including functions.

In JavaScript, almost everything that's not a primitive is an object.

**Example**:
```typescript
isObject({})              // true
isObject([])              // true
isObject(new Date())      // true
isObject(() => {})        // true (functions are objects)
isObject(null)            // false
isObject(undefined)       // false
isObject(42)              // false
```

## Design Principles

1. **Zero Dependencies**: No imports from memimg, navigator, or metadata
2. **Pure Functions**: No side effects, deterministic outputs
3. **Type Safety**: Full TypeScript type guards where applicable
4. **Single Responsibility**: Each function does ONE thing well
5. **Exhaustive Testing**: 100% test coverage required

## Testing

All type guards have comprehensive unit tests:

```bash
npm test -- test/foundation
```

Target coverage: 100%

## Consumers

- `src/memimg/type-classifier.ts` - Re-exports for serialization layer
- `src/navigator/value-types.ts` - Re-exports for UI layer
- `src/navigator/collections.ts` - Re-exports for collection adapters

## Non-Consumers

- `src/metadata/javascript-types.js` - Independent (reflective type system)
