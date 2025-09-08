export class Graph {
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

