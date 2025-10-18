# JavaScript Type System - Core

A minimal, reflective model of JavaScript's type system stripped of validation, constraints, and entity semantics.

## Overview

This is **Layer 1** - the pure structural foundation. It models JavaScript's actual type system:
- Primitives (number, string, boolean, bigint, symbol, null, undefined)
- Objects (everything else)
- Factory synthesis (dynamically create constructors from metadata)

**What this is NOT:**
- ❌ A validation framework (Layer 3)
- ❌ A UI metadata system (Layer 2)
- ❌ An ORM or entity tracker (Layer 3)
- ❌ TypeScript reimplemented in JavaScript

**What this IS:**
- ✅ Pure structural type modeling
- ✅ Factory-as-type pattern (metadata → constructor)
- ✅ Introspection support (examine types at runtime)
- ✅ Foundation for layered extensions

## Architecture

```
Type (abstract base)
├── PrimitiveType
│   ├── NumberType
│   ├── StringType
│   ├── BooleanType
│   ├── BigIntType
│   ├── SymbolType
│   ├── UndefinedType
│   └── NullType
│
└── ObjectType (base for all non-primitives)
    ├── FunctionType
    ├── ArrayType
    ├── SetType
    ├── MapType
    └── DateType
```

**Key Insight**: In JavaScript, almost everything is an object. Arrays, Functions, Dates, Sets, Maps - all are objects. This hierarchy reflects that reality.

## Core API

### Type Checking

All types have a `.check(value)` method for structural type checking:

```javascript
import { NumberType, StringType, Dept } from './core.js';

NumberType.check(42);        // true
NumberType.check("42");      // false
StringType.check("hello");   // true
Dept.check(deptInstance);    // true (if deptInstance created by Dept factory)
```

This is `typeof`/`instanceof` checking, **not validation**. It answers "is this value structurally compatible?"

### Defining Object Types

Use `ObjectType()` to create factory functions from metadata:

```javascript
import { ObjectType, NumberType, StringType } from './core.js';

const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: { type: NumberType },
    dname: { type: StringType },
    loc: { type: StringType }
  }
});

// Dept is now a factory function
const accounting = Dept({
  deptno: 10,
  dname: "ACCOUNTING",
  loc: "NEW YORK"
});

// Introspection
console.log(Dept.typeName);        // "Dept"
console.log(Dept.properties);      // { deptno: {...}, dname: {...}, loc: {...} }
console.log(accounting.__type__);  // Dept (the factory itself)
```

### Object References

Types can reference other types:

```javascript
const Emp = ObjectType({
  name: 'Emp',
  properties: {
    empno: { type: NumberType },
    ename: { type: StringType },
    dept: { type: Dept }  // Reference to Dept type
  }
});

const smith = Emp({
  empno: 7369,
  ename: "SMITH",
  dept: accounting  // Reference to dept instance
});

console.log(smith.dept.dname);  // "ACCOUNTING"
```

### Prototype Chain

You can specify a prototype for methods:

```javascript
const personPrototype = {
  getFullName() {
    return `${this.firstName} ${this.lastName}`;
  }
};

const Person = ObjectType({
  name: 'Person',
  properties: {
    firstName: { type: StringType },
    lastName: { type: StringType }
  },
  prototype: personPrototype
});

const john = Person({ firstName: "John", lastName: "Doe" });
console.log(john.getFullName());  // "John Doe"
```

### Collection Types

Arrays, Sets, and Maps can be parameterized with element/value types:

```javascript
import { ArrayType, SetType, MapType } from './core.js';

// Typed array (type checking deferred to Layer 3)
const NumberArray = new ArrayType(NumberType);
console.log(NumberArray.typeName);  // "Array<number>"

// Typed set
const StringSet = new SetType(StringType);
console.log(StringSet.typeName);  // "Set<string>"

// Typed map
const StringToNumberMap = new MapType(StringType, NumberType);
console.log(StringToNumberMap.typeName);  // "Map<string, number>"
```

**Note**: Type checking for collections is structural only at this layer. Enforcement (preventing `arr.push("wrong")`) belongs in Layer 3.

## Example: Scott Schema

See [`../../test/metadata/scott-minimal.js`](./../../test/metadata/scott-minimal.js) for a complete example:

```javascript
const Dept = ObjectType({
  name: 'Dept',
  properties: {
    deptno: { type: NumberType },
    dname: { type: StringType },
    loc: { type: StringType }
  }
});

const Emp = ObjectType({
  name: 'Emp',
  properties: {
    empno: { type: NumberType },
    ename: { type: StringType },
    dept: { type: Dept }
  }
});

const accounting = Dept({ deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" });
const king = Emp({ empno: 7839, ename: "KING", dept: accounting });

console.log(king.dept.dname);  // "ACCOUNTING"
```

## What's Missing (By Design)

This is intentionally minimal. The following belong in higher layers:

### Layer 2: Behavioral Metadata
- `formatter` - How to display values
- `label`, `placeholder`, `helpText` - UI hints
- `widget` - UI component type
- `readOnly`, `hidden` - UI visibility
- Lifecycle hooks: `onCreate`, `onUpdate`, `onDelete`

### Layer 3: Integrity Constraints
- Validation rules (required, min/max, regex, custom)
- Type enforcement (Proxy traps to prevent wrong types)
- Reference integrity
- Uniqueness constraints
- Entity tracking (ID assignment, repository pattern)
- TypeRegistry (global type lookup)

### Layer 4: UI Generation
- Form synthesis from metadata
- Table/list view generation
- Detail view generation
- Validation feedback

## Design Principles

1. **Minimize Complexity**: ~250 lines, no dependencies, pure JavaScript
2. **Model Reality**: Reflect JavaScript's actual type system, not idealized versions
3. **Enable Introspection**: Types are first-class objects you can examine
4. **Factory-as-Type**: The factory function IS the type (no separation)
5. **No Magic**: Explicit, straightforward code
6. **Layered Extension**: Foundation for adding validation, UI, constraints separately

## Future Layers

Once this core is stable, we'll layer on:

1. **Behavioral Metadata** (`src/types/behavioral.js`)
   - Extend property descriptors with UI hints
   - Add formatters, labels, widgets

2. **Integrity Constraints** (`src/types/constraints.js`)
   - Validation framework
   - Proxy-based enforcement
   - EntityType with tracking

3. **UI Generation** (`src/navigator/metadata-ui.js`)
   - Form generator
   - Table generator
   - Widget registry

4. **Metamodel** (`src/types/metamodel.js`)
   - The type system describes itself
   - Enables interactive schema definition in Navigator

## Size Comparison

- **Old javascript-types.js**: ~970 lines (validation, entities, registry, functions)
- **New core.js**: ~250 lines (just structure)
- **Reduction**: 74% smaller, 100% clearer

## Testing

Run the Scott example:

```bash
node src/types/../../test/metadata/scott-minimal.js
```

Expected output:
```
=== Scott Schema - Core Type System Demo ===

Type Information:
- Dept type name: Dept
- Dept properties: [ 'deptno', 'dname', 'loc' ]
...
=== Core Type System Working! ===
```

## Philosophy

> "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away."
> — Antoine de Saint-Exupéry

This core models JavaScript's type system **as it actually is**, not as we wish it were. Validation, constraints, and UI concerns are important - but they're separate layers built on this foundation.

The goal: **Clarity through simplification, power through layering**.
