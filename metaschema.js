// metaschema.js

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

function EntityType(options = {supertypes[], properties, init}) {
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

const intType = new EntityType({
    supertypes: [metaObjectPrototype],
    properties: {
        name: "int",
        description: "Integer value type", // Corrected syntax: added comma
        kind: "ValueType",
        parse: (s) => parseInt(s), // Corrected syntax: using key: value for functions
        format: (i) => i.toString()
    }
});
