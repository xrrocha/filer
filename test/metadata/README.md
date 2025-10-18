# Metadata Test Suite

Comprehensive testing for the Metadata schema system - type checking, validation, and GUI synthesis.

## Test Coverage

**Status**: Infrastructure in place, tests to be implemented

- **Unit Tests** (planned): Type system core, behavioral metadata, constraints
- **Integration Tests** (planned): Schema definitions, GUI synthesis, validation flows

## Quick Start

```bash
# Run all metadata tests
npm run test:metadata

# Run with coverage
npm run test:metadata:coverage

# Watch mode (TDD)
npm run test:metadata:watch

# Run only unit tests
npm run test:metadata:unit

# Run only integration tests
npm run test:metadata:integration

# Filter by pattern
npm run test:metadata:filter -- <pattern>
```

## Planned Test Structure

### Unit Tests (~150 tests estimated)

#### 1. Type System Core (60 tests)
- PrimitiveType (7 types × 5 tests = 35)
  - NumberType, StringType, BooleanType
  - BigIntType, SymbolType
  - NullType, UndefinedType
- ObjectType factory (15 tests)
  - Factory creation from metadata
  - Instance creation
  - Property assignment
  - __type__ metadata
  - Introspection (typeName, properties)
- Collection types (10 tests)
  - ArrayType
  - SetType
  - MapType

#### 2. Behavioral Metadata (40 tests)
- Formatters
- Labels and placeholders
- UI hints (widget, readonly, hidden)
- Lifecycle hooks

#### 3. Constraints & Validation (50 tests)
- Required fields
- Min/max constraints
- Regex patterns
- Custom validators
- Type enforcement

### Integration Tests (~50 tests estimated)

#### 1. Schema Definitions (20 tests)
- Scott schema (EMP/DEPT)
- Circular references
- Complex nested schemas

#### 2. GUI Synthesis (20 tests)
- Form generation from schema
- Table generation
- Validation feedback UI

#### 3. Cross-Component (10 tests)
- Metadata + MemImg (typed persistence)
- Metadata + Navigator (schema-driven UI)
- Full stack workflows

## Test Fixtures

### Schemas
- `scott-schema.ts`: Classic EMP/DEPT schema for testing
- Additional schemas to be added as needed

### Helpers
- `assertTypeCheck()`: Verify type checking results
- Additional utilities to be added

## Current Status

✅ Test infrastructure created
✅ Test runner configured
✅ Placeholder tests in place
📝 Comprehensive test implementation pending

## Next Steps

1. Convert `src/metadata/javascript-types.js` to TypeScript (`src/metadata/core.ts`)
2. Implement comprehensive unit tests for type system
3. Add behavioral metadata layer and tests
4. Add constraints/validation layer and tests
5. Implement integration tests with Navigator

---

**Test Suite Status**: Infrastructure ready, awaiting implementation
**Quality Target**: 95%+ coverage, 200+ tests
