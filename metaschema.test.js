// metaschema.test.js
/*
import {
    assert,
    assertEquals,
    assertStrictEquals,
    assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
*/
import {
    assertEquals,
    assertNotEquals,
    assertMatch,
    assertStrictEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
/*
import { test } from "https://deno.land/std@0.224.0/testing/mod.ts";
*/

// Import the components from metaschema.js
import { Graph, SeqGenerator, EntityType /*, metaObjectSeq*/ } from "./metaschema.js";

// --- Graph Class Tests ---
Deno.test("Graph: constructor initializes an empty graph", () => {
    const graph = new Graph();
    assert(graph.graph instanceof Map, "graph should be a Map");
    assertEquals(graph.graph.size, 0, "graph should be empty");
});

Deno.test("Graph: addEdge adds nodes and edges correctly", () => {
    const graph = new Graph();
    graph.addEdge("A", "B");
    assertEquals(graph.graph.size, 2, "Graph should contain nodes 'A' and 'B'"); // B is added as a node even if no outgoing edges
    assert(graph.graph.has("A"), "Graph should contain node 'A'");
    assert(graph.graph.get("A").has("B"), "Node 'A' should have edge to 'B'");

    graph.addEdge("A", "C");
    assertEquals(graph.graph.get("A").size, 2, "Node 'A' should have two edges");
    assert(graph.graph.get("A").has("C"), "Node 'A' should have edge to 'C'");

    graph.addEdge("B", "D");
    assertEquals(graph.graph.size, 4, "Graph should contain nodes 'A', 'B', 'C', 'D'");
    assert(graph.graph.has("B"), "Graph should contain node 'B'");
    assert(graph.graph.get("B").has("D"), "Node 'B' should have edge to 'D'");
});

Deno.test("Graph: addEdge handles duplicate edges gracefully", () => {
    const graph = new Graph();
    graph.addEdge("X", "Y");
    graph.addEdge("X", "Y"); // Add duplicate
    assertEquals(graph.graph.get("X").size, 1, "Duplicate edge should not increase size");
});

Deno.test("Graph: topologicalSort handles an empty graph", () => {
    const graph = new Graph();
    assertEquals(graph.topologicalSort(), [], "Should return an empty array for empty graph");
});

Deno.test("Graph: topologicalSort sorts a simple acyclic graph", () => {
    const graph = new Graph();
    graph.addEdge("A", "B");
    graph.addEdge("A", "C");
    graph.addEdge("B", "D");
    graph.addEdge("C", "D");
    graph.addEdge("E", "F");

    const sorted = graph.topologicalSort();
    
    // Test relative order
    const index = (arr, val) => arr.indexOf(val);
    assert(index(sorted, "D") > index(sorted, "B"), "D must come after B");
    assert(index(sorted, "D") > index(sorted, "C"), "D must come after C");
    assert(index(sorted, "B") > index(sorted, "A"), "B must come after A");
    assert(index(sorted, "C") > index(sorted, "A"), "C must come after A");
    assert(index(sorted, "F") > index(sorted, "E"), "F must come after E");

    // All nodes should be present
    assertEquals(sorted.length, 6, "All nodes should be in the sorted list");
    assert(sorted.includes("A") && sorted.includes("B") && sorted.includes("C") && sorted.includes("D") && sorted.includes("E") && sorted.includes("F"), "All nodes must be present");
});

Deno.test("Graph: topologicalSort detects cycles", () => {
    const graph = new Graph();
    graph.addEdge("A", "B");
    graph.addEdge("B", "C");
    graph.addEdge("C", "A"); // Cycle A -> B -> C -> A

    assertThrows(() => {
        graph.topologicalSort();
    }, Error, "Cycle detected in graph");
});

Deno.test("Graph: topologicalSort handles disconnected components", () => {
    const graph = new Graph();
    graph.addEdge("1", "2");
    graph.addEdge("3", "4");
    graph.addEdge("2", "5");

    const sorted = graph.topologicalSort();
    assertEquals(sorted.length, 5);
    const index = (arr, val) => arr.indexOf(val);
    assert(index(sorted, "2") > index(sorted, "1"));
    assert(index(sorted, "5") > index(sorted, "2"));
    assert(index(sorted, "4") > index(sorted, "3"));
});

// --- SeqGenerator Class Tests ---
Deno.test("SeqGenerator: constructor initializes with default values", () => {
    const generator = new SeqGenerator();
    assertEquals(generator.val, 0, "Default startFrom should be 0");
    assertEquals(generator.incrementBy, 1, "Default incrementBy should be 1");
});

Deno.test("SeqGenerator: constructor initializes with custom values", () => {
    const generator = new SeqGenerator({ startFrom: 10, incrementBy: 5 });
    assertEquals(generator.val, 10, "Custom startFrom should be 10");
    assertEquals(generator.incrementBy, 5, "Custom incrementBy should be 5");
});

Deno.test("SeqGenerator: next() returns current value and increments", () => {
    const generator = new SeqGenerator();
    assertEquals(generator.next(), 0, "First call should return 0");
    assertEquals(generator.next(), 1, "Second call should return 1");
    assertEquals(generator.val, 2, "Value should be incremented to 2");
});

Deno.test("SeqGenerator: next() with custom incrementBy", () => {
    const generator = new SeqGenerator({ startFrom: 10, incrementBy: 3 });
    assertEquals(generator.next(), 10, "First call should return 10");
    assertEquals(generator.next(), 13, "Second call should return 13");
    assertEquals(generator.val, 16, "Value should be incremented to 16");
});

Deno.test("metaObjectSeq: is a SeqGenerator instance and increments globally", () => {
    // Resetting for consistent test results if metaObjectSeq is used across tests
    // In a real scenario, this is a global instance and its state would persist.
    // For isolated testing, we might want to temporarily reset it or create new instances.
    // Since it's 'const', we can't reassign, so we test its initial behavior.
    const initialVal = metaObjectSeq.val;
    
    assert(metaObjectSeq instanceof SeqGenerator, "metaObjectSeq should be a SeqGenerator");
    assertEquals(metaObjectSeq.next(), initialVal, "metaObjectSeq should return its current value");
    assertEquals(metaObjectSeq.next(), initialVal + 1, "metaObjectSeq should increment");
});

// --- EntityType Constructor Function Tests ---

Deno.test("EntityType: instantiates a basic entity type with properties", () => {
    const myEntityType = new EntityType({
        properties: {
            name: "MyEntity",
            description: "A test entity",
            id: 101,
        },
    });

    assertEquals(myEntityType.name, "MyEntity");
    assertEquals(myEntityType.description, "A test entity");
    assertEquals(myEntityType.id, 101);
    assertEquals(myEntityType.supertypes.length, 0);
    assertStrictEquals(myEntityType.init, undefined, "init should be undefined if not provided");
});

Deno.test("EntityType: correctly applies init function", () => {
    let initCalled = false;
    const myEntityType = new EntityType({
        properties: { name: "TestInit" },
        init: function() {
            initCalled = true;
            assertEquals(this.name, "TestInit", "Init should have access to 'this' context");
            this.initialized = true;
        },
    });

    assert(initCalled, "Init function should have been called");
    assertEquals(myEntityType.name, "TestInit");
    assert(myEntityType.initialized, "Init function should modify the instance");
});

Deno.test("EntityType: handles simple supertype inheritance (structural copying)", () => {
    const BaseEntityType = new EntityType({
        properties: {
            baseName: "Base",
            baseMethod: () => "base",
        },
        init: function() { this.baseInitCalled = true; },
    });

    const DerivedEntityType = new EntityType({
        supertypes: [BaseEntityType],
        properties: {
            derivedName: "Derived",
            derivedMethod: () => "derived",
        },
        init: function() { this.derivedInitCalled = true; },
    });

    // Check properties
    assertEquals(DerivedEntityType.baseName, "Base", "Should inherit baseName");
    assertEquals(DerivedEntityType.derivedName, "Derived", "Should have its own derivedName");
    assertEquals(DerivedEntityType.baseMethod(), "base", "Should inherit baseMethod");
    assertEquals(DerivedEntityType.derivedMethod(), "derived", "Should have its own derivedMethod");

    // Check init calls (chaining)
    assert(DerivedEntityType.baseInitCalled, "Base init should be called");
    assert(DerivedEntityType.derivedInitCalled, "Derived init should be called");
    assert(DerivedEntityType.init instanceof Function, "Derived init should be a function after chaining");
    assert(DerivedEntityType.supertypes.includes(BaseEntityType), "Should list BaseEntityType as direct supertype");
});

Deno.test("EntityType: property overriding in derived types", () => {
    const Base = new EntityType({
        properties: { common: "base", uniqueBase: "onlyBase" },
    });
    const Derived = new EntityType({
        supertypes: [Base],
        properties: { common: "derived", uniqueDerived: "onlyDerived" },
    });

    assertEquals(Derived.common, "derived", "Derived property should override base property");
    assertEquals(Derived.uniqueBase, "onlyBase", "Base unique property should be present");
    assertEquals(Derived.uniqueDerived, "onlyDerived", "Derived unique property should be present");
});

Deno.test("EntityType: init function chaining and context", () => {
    let callOrder = [];
    const Super = new EntityType({
        properties: { name: "Super" },
        init: function() {
            callOrder.push("SuperInit");
            this.superInitValue = 1;
        },
    });

    const Sub = new EntityType({
        supertypes: [Super],
        properties: { name: "Sub" },
        init: function() {
            callOrder.push("SubInit");
            this.subInitValue = 2;
        },
    });

    assertEquals(callOrder, ["SuperInit", "SubInit"], "Init functions should be called in topological order");
    assertEquals(Sub.superInitValue, 1, "Super init should modify derived object");
    assertEquals(Sub.subInitValue, 2, "Sub init should modify derived object");
});

Deno.test("EntityType: handles multiple supertypes (structural copying)", () => {
    const SuperA = new EntityType({ properties: { a: 1, common: "A_from_SuperA" } });
    const SuperB = new EntityType({ properties: { b: 2, common: "B_from_SuperB" } });

    // The order of supertypes in the array can influence the final value if properties clash,
    // as `Object.assign` is applied in the topological sort order.
    // The specific 'common' value depends on which supertype comes later in the topological sort.
    const Child = new EntityType({
        supertypes: [SuperA, SuperB], // Order might be A,B or B,A topologically
        properties: { c: 3 },
    });

    assert(Child.hasOwnProperty('a') && Child.a === 1, "Should have property 'a' from SuperA");
    assert(Child.hasOwnProperty('b') && Child.b === 2, "Should have property 'b' from SuperB");
    assertEquals(Child.c, 3, "Should have its own property 'c'");
    
    // Test that one of the 'common' properties from supertypes exists
    assert(Child.common === "A_from_SuperA" || Child.common === "B_from_SuperB", "One of the common properties from supertypes should be present");

    const ChildWithOwnCommon = new EntityType({
        supertypes: [SuperA, SuperB],
        properties: { c: 3, common: "Child's Own Common" },
    });
    assertEquals(ChildWithOwnCommon.common, "Child's Own Common", "Child's property should override supertype properties");
});

Deno.test("EntityType: handles transitive supertype inheritance and correct init order", () => {
    let callOrder = [];

    const Grandparent = new EntityType({
        properties: { gpProp: "GP" },
        init: function() { callOrder.push("GrandparentInit"); this.gpVal = 1; },
    });

    const Parent = new EntityType({
        supertypes: [Grandparent],
        properties: { pProp: "P" },
        init: function() { callOrder.push("ParentInit"); this.pVal = 2; },
    });

    const Child = new EntityType({
        supertypes: [Parent],
        properties: { cProp: "C" },
        init: function() { callOrder.push("ChildInit"); this.cVal = 3; },
    });

    assertEquals(Child.gpProp, "GP", "Should inherit Grandparent property");
    assertEquals(Child.pProp, "P", "Should inherit Parent property");
    assertEquals(Child.cProp, "C", "Should have Child property");

    assertEquals(callOrder, ["GrandparentInit", "ParentInit", "ChildInit"], "Init functions should be called in correct topological order");
    assertEquals(Child.gpVal, 1);
    assertEquals(Child.pVal, 2);
    assertEquals(Child.cVal, 3);
});

Deno.test("EntityType: intType example from source", () => {
    const intType = new EntityType({
        properties: {
            name: "int",
            description: "Integer value type",
            kind: "ValueType",
            parse: (s) => parseInt(s, 10), // Specify radix for parseInt
            format: (i) => i.toString(),
        },
    });

    assertEquals(intType.name, "int");
    assertEquals(intType.description, "Integer value type");
    assertEquals(intType.kind, "ValueType");
    assert(typeof intType.parse === "function", "parse should be a function");
    assert(typeof intType.format === "function", "format should be a function");
    assertEquals(intType.parse("123"), 123);
    assertEquals(intType.format(456), "456");
});

Deno.test("EntityType: detects cycle in supertype hierarchy", () => {
    const RecursiveA = {};
    const RecursiveB = { supertypes: [RecursiveA] };
    RecursiveA.supertypes = [RecursiveB]; // A -> B -> A cycle

    assertThrows(() => {
        new EntityType({
            supertypes: [RecursiveA],
            properties: { name: "CyclicEntity" },
        });
    }, Error, "Cycle detected in supertype hierarchy for EntityType: CyclicEntity");
});

Deno.test("EntityType: ensures init functions are called in correct order even with complex hierarchies", () => {
    let callOrder = [];

    const Top = new EntityType({ properties: { order: "Top" }, init: function() { callOrder.push("Top"); } });
    const MiddleA = new EntityType({ supertypes: [Top], properties: { order: "MiddleA" }, init: function() { callOrder.push("MiddleA"); } });
    const MiddleB = new EntityType({ supertypes: [Top], properties: { order: "MiddleB" }, init: function() { callOrder.push("MiddleB"); } });
    const Bottom = new EntityType({ supertypes: [MiddleA, MiddleB], properties: { order: "Bottom" }, init: function() { callOrder.push("Bottom"); } });

    // The exact order of MiddleA and MiddleB might vary depending on Map iteration order
    // (which is stable but not guaranteed in general between different JS engines for custom objects).
    // However, Top must be first, and Bottom last among its direct dependencies.
    const topIndex = callOrder.indexOf("Top");
    const middleAIndex = callOrder.indexOf("MiddleA");
    const middleBIndex = callOrder.indexOf("MiddleB");
    const bottomIndex = callOrder.indexOf("Bottom");

    assertEquals(topIndex, 0, "Top should be called first");
    assert(middleAIndex > topIndex, "MiddleA should be called after Top");
    assert(middleBIndex > topIndex, "MiddleB should be called after Top");
    assert(bottomIndex > middleAIndex && bottomIndex > middleBIndex, "Bottom should be called after both MiddleA and MiddleB");
    assertEquals(callOrder.length, 4, "All init functions should be called");
});
