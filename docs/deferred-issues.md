# Filer - Known Limitations & Workarounds

This document describes current limitations in Filer and how to work around them.

Filer is a research project exploring metadata-driven domain modeling. While we strive for quality and correctness, some edge cases and complex scenarios are deferred to maintain research momentum. This document helps you avoid common pitfalls.

---

## Closure Serialization in Validators

**Issue**: Validators and formatters that use closures with captured variables cannot be serialized.

**Example of problem**:
```javascript
const minSalary = 3000;
const validator = {
  rule: (v) => v >= minSalary,  // ❌ Captures minSalary - won't serialize
  errorMessage: `Must be >= ${minSalary}`
};
```

**Consequence**: Schema appears to work but fails when you reload the page or export/import data.

**Workaround**: Store captured values as object properties instead:

```javascript
// ✅ Use object properties
const validator = {
  minSalary: 3000,  // Store as property
  rule: function(v) { return v >= this.minSalary; },
  errorMessage: function() { return `Must be >= ${this.minSalary}`; }
};
```

Or use the provided validator library which handles this correctly:
```javascript
import { minInclusive } from './validators.js';

const validator = minInclusive(3000);  // ✅ Properly structured
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
