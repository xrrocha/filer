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

const CardIssuer = {id:"CardIssuer"};
const Named = {id:"Named", properties: { name: {} /*string.withRegex(/^[A-Z][_a-zA-Z0-9]*$/)*/ } };
const Organization = {id:"Organization", supertypes: [Named] }
const Bank = {id:"Bank", supertypes: [Organization, CardIssuer] }

function sortSupertypes(types) {
  const dag = new Graph();
  for (const typeIndex in types || []) {
    const type = types[typeIndex]
    console.log(`type: ${type}`);
    for (const supertypeIndex in type.supertypes || []) {
      const supertype = type.supertypes[supertypeIndex];
      console.log(`${supertype}: ${type}`);
      dag.addEdge(supertype, type)
    }
  }
  return dag.topologicalSort();
}

console.log(sortSupertypes([Bank, Organization, Named, CardIssuer, Organization]));

/*
function ObjectGraph({mixins = [metaObjectPrototype], properties}) {
    const result = mixins.reduce(
        (obj, mixin) => Object.assign(obj, mixin()),
        {}
    )
    if (properties) {
        Object.assign(result, properties)
    }
    return result;
}

function SeqGenerator({startWith = 0, incrementBy = 1}) {
    let val = startWith;
    this.nextVal = () => {
        const retVal = val;
        val += incrementBy;
        return retVal;
    };
}
const metaObjectSeq = new SeqGenerator();
const metaObjectPrototype = (proto = {}) => ({
    id: metaObjectSeq.nextVal(),
    name: undefined,
    description: undefined,
    kind: undefined
});

const intType = new ObjectGraph({
    mixins: [metaObjectPrototype],
    properties: {
        name: "int",
        description: "Integer value type"
        kind: "valueType",
        parse(s) => parseInt(s),
        format(i) => i.toString()
    }
});
*/

/*
////////////////////////////////////////////////////////////////////////////////
const Dept = new EntityType({
  name: "Department",
  properties: {
    id: property("id")
            .unique()
            .autoIncr({startWith: 0}),
    name: property("name"), 
            .unique()
            .type(
                string
                    .withLength({min:3, max:32})
                    .withRegex(/^[A-Z][A-Za-z_0-9]*$/)
            )
  },
});
////////////////////////////////////////////////////////////////////////////////
const newRepo = () => {
    const repo = new Map();
    return {
      findAll() {
        return repo.values();
      },
      findById(id) {
        return repo.get(id);
      }
      find(predicate) {
        return repo.values().filter(v => predicate(v))
      }
    };
};
*/
