import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  // Primitive types
  NumberType,
  StringType,
  BooleanType,
  BigIntType,
  SymbolType,
  UndefinedType,
  NullType,
  // Object types
  ObjectType,
  // Collection type instances
  ArrayTypeInstance,
  SetTypeInstance,
  MapTypeInstance,
  DateTypeInstance,
  RegExpTypeInstance,
} from '../../../dist/metadata/javascript-types.js';

describe('Metadata Type System Core', () => {
  describe('PrimitiveType', () => {
    describe('NumberType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(NumberType.typeName, 'number');
      });

      it('checks number values correctly', () => {
        assert.strictEqual(NumberType.check(42), true);
        assert.strictEqual(NumberType.check(3.14), true);
        assert.strictEqual(NumberType.check(0), true);
        assert.strictEqual(NumberType.check(-100), true);
        assert.strictEqual(NumberType.check(Infinity), true);
        assert.strictEqual(NumberType.check(NaN), true);
      });

      it('rejects non-number values', () => {
        assert.strictEqual(NumberType.check('42'), false);
        assert.strictEqual(NumberType.check(true), false);
        assert.strictEqual(NumberType.check(null), false);
        assert.strictEqual(NumberType.check(undefined), false);
        assert.strictEqual(NumberType.check({}), false);
      });
    });

    describe('StringType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(StringType.typeName, 'string');
      });

      it('checks string values correctly', () => {
        assert.strictEqual(StringType.check('hello'), true);
        assert.strictEqual(StringType.check(''), true);
        assert.strictEqual(StringType.check('123'), true);
      });

      it('rejects non-string values', () => {
        assert.strictEqual(StringType.check(42), false);
        assert.strictEqual(StringType.check(true), false);
        assert.strictEqual(StringType.check(null), false);
        assert.strictEqual(StringType.check(undefined), false);
      });
    });

    describe('BooleanType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(BooleanType.typeName, 'boolean');
      });

      it('checks boolean values correctly', () => {
        assert.strictEqual(BooleanType.check(true), true);
        assert.strictEqual(BooleanType.check(false), true);
      });

      it('rejects non-boolean values', () => {
        assert.strictEqual(BooleanType.check(1), false);
        assert.strictEqual(BooleanType.check(0), false);
        assert.strictEqual(BooleanType.check('true'), false);
        assert.strictEqual(BooleanType.check(null), false);
      });
    });

    describe('BigIntType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(BigIntType.typeName, 'bigint');
      });

      it('checks bigint values correctly', () => {
        assert.strictEqual(BigIntType.check(BigInt(42)), true);
        assert.strictEqual(BigIntType.check(BigInt(0)), true);
        assert.strictEqual(BigIntType.check(BigInt(-100)), true);
      });

      it('rejects non-bigint values', () => {
        assert.strictEqual(BigIntType.check(42), false);
        assert.strictEqual(BigIntType.check('42'), false);
        assert.strictEqual(BigIntType.check(null), false);
      });
    });

    describe('SymbolType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(SymbolType.typeName, 'symbol');
      });

      it('checks symbol values correctly', () => {
        assert.strictEqual(SymbolType.check(Symbol('test')), true);
        assert.strictEqual(SymbolType.check(Symbol.iterator), true);
      });

      it('rejects non-symbol values', () => {
        assert.strictEqual(SymbolType.check('symbol'), false);
        assert.strictEqual(SymbolType.check(42), false);
        assert.strictEqual(SymbolType.check(null), false);
      });
    });

    describe('UndefinedType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(UndefinedType.typeName, 'undefined');
      });

      it('checks undefined correctly', () => {
        assert.strictEqual(UndefinedType.check(undefined), true);
      });

      it('rejects non-undefined values', () => {
        assert.strictEqual(UndefinedType.check(null), false);
        assert.strictEqual(UndefinedType.check(0), false);
        assert.strictEqual(UndefinedType.check(''), false);
        assert.strictEqual(UndefinedType.check(false), false);
      });
    });

    describe('NullType', () => {
      it('has correct typeName', () => {
        assert.strictEqual(NullType.typeName, 'null');
      });

      it('checks null correctly', () => {
        assert.strictEqual(NullType.check(null), true);
      });

      it('rejects non-null values', () => {
        assert.strictEqual(NullType.check(undefined), false);
        assert.strictEqual(NullType.check(0), false);
        assert.strictEqual(NullType.check(''), false);
        assert.strictEqual(NullType.check(false), false);
      });
    });
  });

  describe('ObjectType factory', () => {
    it('creates type with correct typeName', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      assert.strictEqual(Person.typeName, 'Person');
    });

    it('creates instances with __type__ reference', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      assert.strictEqual((person as any).__type__, Person);
    });

    it('exposes properties metadata', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      assert.ok(Person.properties);
      assert.ok(Person.properties.name);
      assert.ok(Person.properties.age);
      assert.strictEqual(Person.properties.name.type, StringType);
      assert.strictEqual(Person.properties.age.type, NumberType);
    });

    it('exposes compiled metadata', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
        validations: [
          {
            name: 'age-positive',
            properties: ['age'],
            validate(p: any) { return p.age > 0; },
            errorMessage() { return 'Age must be positive'; },
          },
        ],
      });

      assert.ok(Person._compiled);
      assert.ok(Person._compiled.validationsByProperty);
      assert.ok(Person._compiled.validationsByProperty.has('age'));
    });

    it('supports type hierarchy with supertype', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      assert.strictEqual(Employee.supertype, Person);
    });

    it('collects properties from supertype chain', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      assert.ok(Employee.properties.name); // Inherited
      assert.ok(Employee.properties.empno); // Own
    });
  });

  describe('Built-in Object Type instances', () => {
    describe('ArrayTypeInstance', () => {
      it('has correct typeName', () => {
        assert.strictEqual(ArrayTypeInstance.typeName, 'Array');
      });

      it('checks array values correctly', () => {
        assert.strictEqual(ArrayTypeInstance.check([]), true);
        assert.strictEqual(ArrayTypeInstance.check([1, 2, 3]), true);
        assert.strictEqual(ArrayTypeInstance.check(['a', 'b']), true);
      });

      it('rejects non-array values', () => {
        assert.strictEqual(ArrayTypeInstance.check({}), false);
        assert.strictEqual(ArrayTypeInstance.check('array'), false);
        assert.strictEqual(ArrayTypeInstance.check(null), false);
      });
    });

    describe('SetTypeInstance', () => {
      it('has correct typeName', () => {
        assert.strictEqual(SetTypeInstance.typeName, 'Set');
      });

      it('checks Set values correctly', () => {
        assert.strictEqual(SetTypeInstance.check(new Set()), true);
        assert.strictEqual(SetTypeInstance.check(new Set([1, 2, 3])), true);
      });

      it('rejects non-Set values', () => {
        assert.strictEqual(SetTypeInstance.check([]), false);
        assert.strictEqual(SetTypeInstance.check({}), false);
        assert.strictEqual(SetTypeInstance.check(null), false);
      });
    });

    describe('MapTypeInstance', () => {
      it('has correct typeName', () => {
        assert.strictEqual(MapTypeInstance.typeName, 'Map<*, *>');
      });

      it('checks Map values correctly', () => {
        assert.strictEqual(MapTypeInstance.check(new Map()), true);
        assert.strictEqual(MapTypeInstance.check(new Map([['a', 1]])), true);
      });

      it('rejects non-Map values', () => {
        assert.strictEqual(MapTypeInstance.check({}), false);
        assert.strictEqual(MapTypeInstance.check([]), false);
        assert.strictEqual(MapTypeInstance.check(null), false);
      });
    });

    describe('DateTypeInstance', () => {
      it('has correct typeName', () => {
        assert.strictEqual(DateTypeInstance.typeName, 'Date');
      });

      it('checks Date values correctly', () => {
        assert.strictEqual(DateTypeInstance.check(new Date()), true);
        assert.strictEqual(DateTypeInstance.check(new Date('2020-01-01')), true);
      });

      it('rejects non-Date values', () => {
        assert.strictEqual(DateTypeInstance.check('2020-01-01'), false);
        assert.strictEqual(DateTypeInstance.check(123456789), false);
        assert.strictEqual(DateTypeInstance.check(null), false);
      });
    });

    describe('RegExpTypeInstance', () => {
      it('has correct typeName', () => {
        assert.strictEqual(RegExpTypeInstance.typeName, 'RegExp');
      });

      it('checks RegExp values correctly', () => {
        assert.strictEqual(RegExpTypeInstance.check(/test/), true);
        assert.strictEqual(RegExpTypeInstance.check(new RegExp('test')), true);
      });

      it('rejects non-RegExp values', () => {
        assert.strictEqual(RegExpTypeInstance.check('test'), false);
        assert.strictEqual(RegExpTypeInstance.check({}), false);
        assert.strictEqual(RegExpTypeInstance.check(null), false);
      });
    });
  });

  describe('Type checking integration', () => {
    it('validates types during object construction', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          age: { name: 'age', type: NumberType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice', age: 30 });
      assert.strictEqual(person.name, 'Alice');
      assert.strictEqual(person.age, 30);

      assert.throws(() => Person({ name: 'Alice', age: 'thirty' }));
      assert.throws(() => Person({ name: 123, age: 30 }));
    });

    it('validates types during property mutation', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          age: { name: 'age', type: NumberType, validation: { required: true, updatable: true } },
        },
      });

      const person = Person({ age: 30 });

      person.age = 31;
      assert.strictEqual(person.age, 31);

      assert.throws(() => { person.age = 'thirty-one' as any; });
    });

    it('validates custom ObjectType references', () => {
      const Dept = ObjectType({
        name: 'Dept',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Emp = ObjectType({
        name: 'Emp',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
          dept: { name: 'dept', type: Dept, validation: { required: true } },
        },
      });

      const sales = Dept({ name: 'Sales' });
      const emp = Emp({ name: 'Alice', dept: sales });

      assert.strictEqual(emp.dept, sales);

      assert.throws(() => Emp({ name: 'Bob', dept: 'Sales' }));
    });
  });

  describe('Type introspection', () => {
    it('allows checking type at runtime', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });

      assert.strictEqual((person as any).__type__, Person);
      assert.strictEqual((person as any).__type__.typeName, 'Person');
    });

    it('distinguishes between different ObjectTypes', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Dept = ObjectType({
        name: 'Dept',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const person = Person({ name: 'Alice' });
      const dept = Dept({ name: 'Sales' });

      assert.notStrictEqual((person as any).__type__, (dept as any).__type__);
    });

    it('preserves type through inheritance', () => {
      const Person = ObjectType({
        name: 'Person',
        properties: {
          name: { name: 'name', type: StringType, validation: { required: true } },
        },
      });

      const Employee = ObjectType({
        name: 'Employee',
        supertype: Person,
        properties: {
          empno: { name: 'empno', type: NumberType, validation: { required: true } },
        },
      });

      const emp = Employee({ name: 'Alice', empno: 100 });

      assert.strictEqual((emp as any).__type__, Employee);
      assert.strictEqual((emp as any).__type__.typeName, 'Employee');
      assert.strictEqual((emp as any).__type__.supertype, Person);
    });
  });
});
