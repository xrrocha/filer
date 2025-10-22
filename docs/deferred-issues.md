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

(More issues will be added as they're discovered)

---

**Last updated**: 2025-10-22
