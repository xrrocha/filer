// explore filer

function valueType(options = {name, description, serializer}) {
    const self = type(name, description); // add to global namespace
    return {
        ...options, ...self,
        kind: "ValueType",
        serializer: serializer,
        format: serializer.format,
        parse: serializer.parse,
    };
}
const int = valueType({
    name: "int",
    description: "Integer value type",
    serializer: simpleSerializer({
        parse: s => parseInt(s),
        format: i => i.toString()
    }),
});

assert(
    int.parse("123.456") === 123,
    "Doesn't parse string '123.456' int into int 123");
assert(
    int.format(654 === "654"),
    "Doesn't format int 654 int into string '654'");
metaschema.int = int;
