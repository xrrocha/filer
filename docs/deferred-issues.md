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

## RegExp Mutation Tracking

**Issue**: RegExp `lastIndex` mutations are not tracked by MemImg's event sourcing system.

**Background**: Filer treats RegExp objects as value types (like Date objects), preserving their complete state during serialization/deserialization but not tracking mutations to their `lastIndex` property.

### What Works

✅ **RegExp serialization/deserialization** - Full round-trip preservation
- Pattern (`source`), flags, and `lastIndex` all preserved
- Functional equivalence maintained (`.test()`, `.exec()`, `.match()` work correctly)
- RegExp objects work in nested structures, arrays, and object graphs

```javascript
const memimg = createMemoryImage({
  emailPattern: /^[\w.-]+@[\w.-]+\.\w+$/i,
  urlPattern: /^https?:\/\/.+/
});

// Serialize and restore
const json = serializeMemoryImageToJson(memimg);
const restored = deserializeMemoryImageFromJson(json);

// RegExp fully functional after restore
restored.emailPattern.test('user@example.com'); // true
```

### Limitation

⚠️ **lastIndex mutations not tracked**:
```javascript
const pattern = /test/g;
pattern.lastIndex = 5;  // This mutation is NOT logged as an event

// After reload, lastIndex will be the value from last snapshot,
// not reflecting this mutation
```

### Recommended Pattern

**Use RegExp for validation patterns (immutable usage)**:
```javascript
const memimg = createMemoryImage({
  validators: {
    email: /^[\w.-]+@[\w.-]+\.\w+$/,
    phone: /^\d{3}-\d{3}-\d{4}$/,
    zip: /^\d{5}(-\d{4})?$/
  }
});

// Immutable usage - works perfectly
memimg.validators.email.test('user@example.com');  // true
```

### Workaround for Stateful Matching

If you need stateful RegExp matching (using `lastIndex` with global flag), store the index separately:

```javascript
// Instead of relying on regex.lastIndex (not tracked)
const pattern = /\d+/g;
let lastIndex = 0;  // Track manually

function findNext(text) {
  pattern.lastIndex = lastIndex;  // Restore state
  const match = pattern.exec(text);
  lastIndex = pattern.lastIndex;  // Save state
  return match;
}
```

Or use `String.prototype.matchAll()` which doesn't rely on stateful RegExp:

```javascript
const pattern = /\d+/g;
const matches = [...text.matchAll(pattern)];  // No state mutation
```

### Why This Design?

Most domain model usage of RegExp is for **validation patterns** (immutable), not stateful text processing. Treating RegExp as a value type simplifies the common case while still supporting advanced usage via manual state tracking.

### Future Enhancement

If you need `lastIndex` mutation tracking, please open an issue. We can add Proxy wrapping for RegExp objects in a future version if there's demand.

---

(More issues will be added as they're discovered)

---

**Last updated**: 2025-10-23
