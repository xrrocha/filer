// explore filer
const assert = console.assert

const Type = {};
Type.names = new Set();
function isIterable(obj) {
    return obj != null && typeof obj[Symbol.iterator] === 'function';
}
function isType(obj) {
    return obj != null && typeof obj[kind] === 'string';
}
function type({name, description, supertypes}) {
    if (!name) {
        throw "Missing name";
    }
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
        throw "Invalid name: " + name;
    }
    if (!description) {
        throw "Missing description";
    }
    if (Type.names.has(name)) {
        throw "Name taken: " + name;
    } else {
        Type.names.add(name);
    }
    const ancestors = supertypes || [];
    if (!isIterable(ancestors)) {
        throw "No iterable supertypes";
    }
    if (!ancestors.every(s => isType(s))) {
        throw "Supertype not a type";
    }
    ancestors.forEach(ancestor => ancestor.supertypes.push(ancestor));
    return {name, description, supertypes: ancestors, subtypes: []};
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
try {
  valueType({name: null});
  throw "Null name allowed";
} catch(err) { }
try {
  valueType({name: undefined});
  throw "Undefined name allowed";
} catch(err) { }
try {
  valueType({name: '1234'});
  throw "Non-symbolic name allowed";
} catch(err) { }
assert(int.parse("123.456") === 123, `Bad integer parsing`);
assert( int.format(654 === "654"), "Bad integer formatting");
assert(123 == int.parse(int.format(123)));
assert("321" == int.format(int.parse("321")));

const ObjectType = {};
const EntityType = {};
