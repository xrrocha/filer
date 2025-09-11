// explore filer

const Type = {};
const ValueType = {};
const ObjectType = {};
const EntityType = {};

const assert = console.assert

const names = new Set();
function type({name, description}) {
    if (names.has(name)) {
        throw "Name taken: " + name;
    } else {
        names.add(name);
    }
    return {name, description};
}

function simpleSerializer(parse, format = o => o.toString()) {
    return { parse, format };
};

function valueType(options = {name, description, serializer}) {
    return {
        ...type({
            name: options.name,
            description: options.description
        }),
        ...options,
        kind: "ValueType",
        serializer: options.serializer,
        format: options.serializer.format,
        parse: options.serializer.parse,
    };
}
const int = valueType({
    name: "int",
    description: "Integer value type",
    serializer: simpleSerializer(s => parseInt(s)),
});

assert(int.parse("123.456") === 123, "Bad integer parsing");
assert( int.format(654 === "654"), "Bad integer formatting");
