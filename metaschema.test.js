// metaschema.test.js
import {
    assertEquals,
    assertNotEquals,
    assertMatch,
    assertStrictEquals
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import {
    ObjectGraph,
    SeqGenerator,
    metaObjectPrototype,
    intType,
    metaObjectSeq
} from "./metaschema.js";

Deno.test("SeqGenerator should generate incrementing values", () => {
    // Resetting the global sequence for consistent test results
    // This is an external action for testing, not part of the core SeqGenerator logic.
    metaObjectSeq.nextVal = new SeqGenerator({ startWith: 0, incrementBy: 1 }).nextVal;

    const generator1 = new SeqGenerator({ startWith: 10, incrementBy: 2 });
    assertEquals(generator1.nextVal(), 10, "First value should be startWith");
    assertEquals(generator1.nextVal(), 12, "Second value should increment by incrementBy");
    assertEquals(generator1.nextVal(), 14, "Third value should increment again");

    const generator2 = new SeqGenerator({ startWith: 0, incrementBy: 100 });
    assertEquals(generator2.nextVal(), 0, "New generator instance should have its own sequence");
    assertEquals(generator2.nextVal(), 100, "New generator should increment independently");
});

Deno.test("metaObjectPrototype should generate objects with unique, incrementing IDs", () => {
    // Resetting the global sequence for consistent test results
    metaObjectSeq.nextVal = new SeqGenerator({ startWith: 0, incrementBy: 1 }).nextVal;

    const obj1 = metaObjectPrototype();
    assertEquals(obj1.id, 0, "First meta-object should have ID 0");
    assertEquals(obj1.name, undefined, "Name should be undefined by default");
    assertEquals(obj1.description, undefined, "Description should be undefined by default");
    assertEquals(obj1.kind, undefined, "Kind should be undefined by default");

    const obj2 = metaObjectPrototype();
    assertEquals(obj2.id, 1, "Second meta-object should have incremented ID");
    assertNotEquals(obj1.id, obj2.id, "IDs should be unique");

    const obj3 = metaObjectPrototype();
    assertEquals(obj3.id, 2, "Third meta-object should have incremented ID");
});

Deno.test("ObjectGraph should compose objects from mixins and properties", () => {
    // Resetting the global sequence for consistent test results
    metaObjectSeq.nextVal = new SeqGenerator({ startWith: 0, incrementBy: 1 }).nextVal;

    const mixin1 = () => ({ propA: 1, commonProp: 'A' });
    const mixin2 = () => ({ propB: 2, commonProp: 'B' }); // commonProp will be overwritten

    const composedObject = new ObjectGraph({
        mixins: [mixin1, mixin2, metaObjectPrototype], // Using metaObjectPrototype as a mixin
        properties: {
            customProp: 'hello',
            propA: 100 // Should overwrite mixin1.propA
        }
    });

    assertEquals(composedObject.propA, 100, "Properties should override mixins");
    assertEquals(composedObject.propB, 2, "Mixin2 property should be present");
    assertEquals(composedObject.commonProp, 'B', "Later mixin should override earlier one");
    assertEquals(composedObject.customProp, 'hello', "Custom properties should be added");
    assertNotEquals(composedObject.id, undefined, "ID from metaObjectPrototype mixin should be present");
    assertEquals(typeof composedObject.id, 'number', "ID should be a number");
});

Deno.test("intType should be a correctly defined value type", () => {
    // Resetting the global sequence for consistent test results
    metaObjectSeq.nextVal = new SeqGenerator({ startWith: 0, incrementBy: 1 }).nextVal;

    // Re-create intType to ensure its ID is predictable after sequence reset
    const localIntType = new ObjectGraph({
        mixins: [metaObjectPrototype],
        properties: {
            name: "int",
            description: "Integer value type",
            kind: "valueType",
            parse: (s) => parseInt(s),
            format: (i) => i.toString()
        }
    });

    assertNotEquals(localIntType.id, undefined, "intType should have an ID");
    assertEquals(typeof localIntType.id, 'number', "intType ID should be a number");
    assertEquals(localIntType.name, "int", "intType name should be 'int'");
    assertEquals(localIntType.description, "Integer value type", "intType description should be correct");
    assertEquals(localIntType.kind, "valueType", "intType kind should be 'valueType'");

    // Test parse method
    assertEquals(localIntType.parse("123"), 123, "parse should convert a string to an integer");
    assertEquals(localIntType.parse("-42"), -42, "parse should handle negative integers");
    assertStrictEquals(localIntType.parse("3.14"), 3, "parse should truncate floats to integers");
    assertStrictEquals(localIntType.parse("abc"), NaN, "parse should return NaN for non-numeric strings");

    // Test format method
    assertEquals(localIntType.format(123), "123", "format should convert an integer to a string");
    assertEquals(localIntType.format(0), "0", "format should handle zero");
    assertEquals(localIntType.format(-50), "-50", "format should handle negative integers");
    assertEquals(localIntType.format(3.14), "3.14", "format should convert float to its string representation"); // JS toString() on a float

    // Verify format and parse are functions (executable properties)
    assertEquals(typeof localIntType.parse, 'function', "parse property should be a function");
    assertEquals(typeof localIntType.format, 'function', "format property should be a function");
});
