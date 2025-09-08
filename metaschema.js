// metaschema.js
import './prelude.js';

class Graph {
    constructor() {
        this.graph = new Map();
    }
   addEdge(u, v) {
        // If node u is not yet in the graph, initialize its adjacency list as a Set
        if (!this.graph.has(u)) {
            this.graph.set(u, new Set());
        }
        // Add the neighbor v to the Set for node u.
        // Sets automatically handle uniqueness, so adding an existing neighbor has no effect.
        this.graph.get(u).add(v);
    }
    topologicalSortUtil(v, visited, stack) {
        visited.add(v);
        // Retrieve neighbors as a Set. If v has no neighbors, default to an empty Set.
        const neighbors = this.graph.get(v) || new Set();
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                this.topologicalSortUtil(neighbor, visited, stack);
            }
        }
        stack.push(v);
    }
    topologicalSort() {
        const visited = new Set();
        const stack = [];
        for (const vertex of this.graph.keys()) {
            if (!visited.has(vertex)) {
                this.topologicalSortUtil(vertex, visited, stack);
            }
        }
        return stack.reverse();
    }
}

function SeqGenerator({startWith = 0, incrementBy = 1}) {
    let val = startWith;
    this.nextVal = () => {
        const retVal = val;
        val += incrementBy;
        return retVal;
    };
}

// Global sequence generator for meta objects
const metaObjectSeq = new SeqGenerator({}); // Initialize with empty object to use defaults

function EntityType(options = {supertypes, properties, init}) {
    // Computes distinct, ordered set of dependencies
    const dag = new Graph();
    // TODO Make sure to add MetaObject root mixin .add(MetaObject);
    const supertypes = new Set(options?.supertypes || []);
    for (const parent of supertypes) {
        for (const grandParent of (parent?.supertypes || [])) {
            dag.addEdge(grandParent, parent);
        }
    }
    const orderedDependencies = dag.topologicalSort();

    // Performs structural copying of supertypes to new oject
    const properties = orderedDependencies.reduce(
        (obj, dependency) => Object.assign(obj, dependency.properties),
        { id: metaObjectSeq.nextVal() }
    );
    if (options?.properties) {
        Object.assign(properties, options.properties);
    }


    // Initializes new object properties
    this.kind = "EntityType";
    this.supertypes = orderedDependencies;
    this.properties = properties;
    this.init = options.init;

    orderedDependencies.forEach(dep => dep.init?.call());
    this.init?.call();
}

////////////////////////////////////////////////////////////////////////////////
// Assuming 'EntityType' constructor and 'metaObjectSeq' are defined and accessible
// from the 'metaschema.js' source, and 'system.formatDate' is available
// (e.g., loaded from prelude.js for Date formatting) [12-14].

const intType = new EntityType({
  // supertypes: [metaObjectPrototype], // Placeholder for a universal base MetaObject [15]
  properties: {
    name: "int",
    description: "Integer value type",
    kind: "ValueType", // Discriminator for metaconcept type [15, 16]
    parse: (s) => parseInt(s), // Converts string to integer [13, 14]
    format: (i) => i.toString() // Converts integer to string [13, 14]
  }
});

const floatType = new EntityType({
  properties: {
    name: "float",
    description: "Floating-point number value type",
    kind: "ValueType",
    parse: (s) => parseFloat(s), // Converts string to float [13, 14]
    format: (f) => f.toString() // Converts float to string [13, 14]
  }
});

const stringType = new EntityType({
  properties: {
    name: "string",
    description: "String value type",
    kind: "ValueType",
    parse: (s) => s, // Returns the input string itself [13, 14]
    format: (s) => s // Returns the string itself [13, 14]
  }
});

const booleanType = new EntityType({
  properties: {
    name: "boolean",
    description: "Boolean value type",
    kind: "ValueType",
    // Parses string to boolean, treating "true" (case-insensitive) as true [13, 14]
    parse: (s) => s.toLowerCase() === 'true',
    format: (b) => b.toString() // Converts boolean to string [13, 14]
  }
});

const dateType = new EntityType({
  properties: {
    name: "date",
    description: "Date value type",
    kind: "ValueType",
    parse: (s) => new Date(s), // Creates a new Date object from string [13, 14]
    // Formats Date object using system.formatDate helper with default [12-14]
    format: (d, formatStr = "yyyy-MM-dd") => system.formatDate(d, formatStr)
  }
});

const bigIntType = new EntityType({
  properties: {
    name: "bigint",
    description: "BigInt value type",
    kind: "ValueType",
    parse: (s) => BigInt(s), // Creates a BigInt from string [13, 14]
    format: (b) => b.toString() // Converts BigInt to string [13, 14]
  }
});

const symbolType = new EntityType({
  properties: {
    name: "symbol",
    description: "Symbol value type",
    kind: "ValueType",
    parse: (s) => {
      // Extracts description from "Symbol(description)" format to recreate Symbol using Symbol.for() [13, 14]
      const match = s.match(/^Symbol\((.*)\)$/);
      if (match && match[17] !== undefined) {
        return Symbol.for(match[17]);
      }
      // If the string does not conform to the expected format, it's considered an invalid input
      throw new Error(`Invalid Symbol string format: "${s}". Expected "Symbol(description)".`);
    },
    format: (sym) => sym.toString() // Converts Symbol to its string representation [13, 14]
  }
});

const nullType = new EntityType({
  properties: {
    name: "null",
    description: "Null value type",
    kind: "ValueType",
    // Returns null if input is 'null', otherwise null [13, 14]
    parse: (s) => (s === 'null' ? null : null),
    format: (n) => 'null' // Returns the string 'null' [13, 14]
  }
});

const undefinedType = new EntityType({
  properties: {
    name: "undefined",
    description: "Undefined value type",
    kind: "ValueType",
    // Returns undefined if input is 'undefined', otherwise undefined [13, 14]
    parse: (s) => (s === 'undefined' ? undefined : undefined),
    format: (u) => 'undefined' // Returns the string 'undefined' [13, 14]
  }
});

const ValueTypes = {
    values: {
        intType: intType,
        floatType: floatType,
        stringType: stringType,
        booleanType: booleanType,
        dateType: dateType,
        bigIntType: bigIntType,
        symbolType: symbolType,
        nullType: nullType,
        undefinedType: undefinedType,
    },
};
Object.keys(ValueTypes.values).forEach(name =>
    ValueTypes[name] = ValueTypes.values[name])
console.log(ValueTypes);
