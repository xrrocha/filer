// explore filer
const assert = console.assert

const Type = {};
Type.names = new Set();
function type({name, description}) {
    if (Type.names.has(name)) {
        throw "Name taken: " + name;
    } else {
        Type.names.add(name);
    }
    return {name, description};
}

const ValueType = {};
function simpleSerializer(parse, format = o => o.toString()) {
    return { parse, format };
};
function valueType(options = {name, description, serializer}) {
    const instance = {
        kind: "ValueType",
        ...type({
            name: options.name,
            description: options.description
        }),
        serializer: options.serializer,
        format(v) { return options.serializer.format(v); },
        parse(v) { return options.serializer.parse(v); },
    };
    return instance;
}

const int = valueType({
    name: "int",
    description: "Integer value type",
    serializer: simpleSerializer(s => parseInt(s)),
});

assert(Type.names.has("int"), `Int name not registered`)
try {
  valueType({name: "int"});
  throw "Dup 'int' name allowed";
} catch(err) { }
assert(int.parse("123.456") === 123, `Bad integer parsing`);
assert( int.format(654 === "654"), "Bad integer formatting");
assert(123 == int.parse(int.format(123)));
assert("123" == int.format(int.parse("123")));

const ObjectType = {};
const EntityType = {};
