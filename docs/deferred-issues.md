# Filer - Recommended Patterns & Known Limitations

This document describes recommended patterns and current limitations in Filer.

Filer is a research project exploring metadata-driven domain modeling. While we strive for quality and correctness, some edge cases and complex scenarios are deferred to maintain research momentum. This document helps you write code that works correctly with Filer's persistence system.

---

## Writing Serializable Validators (Recommended Pattern)

**Background**: Filer's metadata (validators, formatters) must be serializable to work with the event-sourced persistence system. Functions that capture external variables via closures don't serialize correctly.

### ❌ Anti-Pattern: Closure Capture

```javascript
const minSalary = 3000;
const validator = {
  rule: (v) => v >= minSalary,  // ❌ Captures minSalary - won't serialize
  errorMessage: `Must be >= ${minSalary}`
};
```

**Why it fails**: After page reload or export/import, the `rule` function is lost because closures can't be serialized to JSON.

### ✅ Recommended Pattern: Object Properties + `this`

**Use ES6 shorthand properties to copy values into the validator object:**

```javascript
const minSalary = 3000;
const maxSalary = 25000;

const validator = {
  minSalary,  // ES6 shorthand copies value (minSalary: 3000)
  maxSalary,  // No closure created!

  rule(value) {
    return value >= this.minSalary && value <= this.maxSalary;
  },

  errorMessage() {
    return `Must be between ${this.minSalary} and ${this.maxSalary}`;
  }
};
```

**Why it works**:
- `{minSalary}` shorthand **copies the value** into the object (no closure)
- Methods reference `this.minSalary` (binds to object property at runtime)
- Filer serializes both the values AND the function source code
- After deserialization, everything works correctly

### Advanced: Multiple Languages

Arrow functions inside methods are fine (they lexically capture `this` from the method scope):

```javascript
const minSal = 30000;
const maxSal = 250000;

const validator = {
  minSal,
  maxSal,

  rule(value) {
    return value >= this.minSal && value <= this.maxSal;
  },

  message(value, lang = 'en') {
    const templates = {
      'en': (v) => `salary (${v}) out of range [${this.minSal}, ${this.maxSal}]`,
      'es': (v) => `salario (${v}) fuera de rango [${this.minSal}, ${this.maxSal}]`
    };
    return (templates[lang] || templates['en'])(value);
  }
};
```

### Using Validator Libraries

You can also use the provided validator library which follows this pattern:

```javascript
import { minInclusive, maxInclusive } from './validators.js';

const salValidator = {
  ...minInclusive(3000),
  ...maxInclusive(25000)
};
```

---

## Schema Persistence

**Issue**: Type definitions (ObjectType, validators) are not persisted in MemImg.

**Consequence**: You must re-define your schema on every page load.

**Workaround**: Define schemas in separate JavaScript files and import them:

```javascript
// schema.js - Define once
export const Dept = ObjectType({
  name: 'Dept',
  properties: { /* ... */ }
});

// app.js - Import and use
import { Dept } from './schema.js';

const dept = Dept({ deptno: 10, dname: 'ACCOUNTING' });
memimg.root.depts.push(dept);  // Only instances are persisted
```

---

## RegExp Support ✅ COMPLETE

**Status**: Full transparent persistence with mutation tracking.

### Features

✅ **Complete serialization/deserialization**
- Pattern (`source`), flags, and `lastIndex` all preserved
- Functional equivalence maintained (`.test()`, `.exec()`, `.match()` work correctly)
- Works in nested structures, arrays, and object graphs

✅ **Mutation tracking**
- `lastIndex` mutations tracked via event sourcing
- Events logged automatically when `lastIndex` changes
- Full replay support - state restored correctly from events

### Usage Examples

**Validation patterns**:
```javascript
const memimg = createMemoryImage({
  validators: {
    email: /^[\w.-]+@[\w.-]+\.\w+$/i,
    phone: /^\d{3}-\d{3}-\d{4}$/,
    zip: /^\d{5}(-\d{4})?$/
  }
});

// Use immediately
memimg.validators.email.test('user@example.com');  // true

// Serialize and restore
const json = serializeMemoryImageToJson(memimg);
const restored = deserializeMemoryImageFromJson(json);
restored.validators.email.test('test@example.com');  // true
```

**Stateful matching with mutation tracking**:
```javascript
const eventLog = createMockEventLog();
const root = createMemoryImage({ pattern: /test/g }, { eventLog });

// Mutate lastIndex - automatically tracked
root.pattern.lastIndex = 10;  // ✅ SET event logged

// Replay from events
const replayed = {};
await replayFromEventLog(replayed, eventLog);
replayed.pattern.lastIndex;  // 10 - correctly restored!
```

**Text scanning**:
```javascript
const root = createMemoryImage({ scanner: /\w+/g });

const text = 'hello world foo bar';
root.scanner.exec(text);  // 'hello'
root.scanner.exec(text);  // 'world'
root.scanner.lastIndex = 0;  // Reset - tracked

// State persists across save/load
const json = serializeMemoryImageToJson(root);
const restored = deserializeMemoryImageFromJson(json);
restored.scanner.lastIndex;  // 0 - preserved
```

### Implementation

RegExp objects are wrapped in Proxies (like other objects):
- Methods (`.test()`, `.exec()`) bound to target for correct behavior
- Property mutations tracked via SET trap
- Complete round-trip fidelity through serialization and events

---

(More issues will be added as they're discovered)

---

**Last updated**: 2025-10-23
