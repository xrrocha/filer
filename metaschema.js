// metaschema.js

interface WithMixins {
    function getMixins(); // [WithMixins]
};

/**
 * Composes an object from a list of mixin functions and additional properties.
 * Mixin functions are expected to return plain objects.
 * @param {object} options
 * @param {Array<function(): object>} [options.mixins=[]] - An array of functions that return objects to be mixed in.
 * @param {object} [options.properties] - Additional properties to assign.
 * @returns {object} The composed object.
 */
function ObjectGraph({mixins = [], properties}) {
    // Ensure mixins array is iterable, even if a single function is passed.
    const actualMixins = Array.isArray(mixins) ? mixins : [mixins];

    const result = actualMixins.reduce(
        (obj, mixinFn) => Object.assign(obj, mixinFn()),
        {}
    );
    if (properties) {
        Object.assign(result, properties);
    }
    return result;
}

/**
 * Creates a sequence generator for unique numeric IDs.
 * @param {object} options
 * @param {number} [options.startWith=0] - The initial value of the sequence.
 * @param {number} [options.incrementBy=1] - The amount to increment by each call.
 */
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

/**
 * A factory function that returns a prototype object for meta-objects.
 * It includes a system-generated ID and common meta-properties.
 * @param {object} [proto={}] - An optional object to extend (though currently not used by ObjectGraph for this mixin).
 * @returns {object} A meta-object prototype fragment.
 */
const metaObjectPrototype = (proto = {}) => ({
    id: metaObjectSeq.nextVal(),
    name: undefined,
    description: undefined,
    kind: undefined
});

/**
 * Defines the 'int' value type as a meta-object.
 */
const intType = new ObjectGraph({
    mixins: [metaObjectPrototype],
    properties: {
        name: "int",
        description: "Integer value type", // Corrected syntax: added comma
        kind: "valueType",
        parse: (s) => parseInt(s), // Corrected syntax: using key: value for functions
        format: (i) => i.toString()
    }
});

// Export all components for testing
export { ObjectGraph, SeqGenerator, metaObjectPrototype, intType, metaObjectSeq };
