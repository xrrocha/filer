const ValueTypes = {};

ValueTypes.String = {
    format: s => s,
    parse: s => s
};
ValueTypes.Number = {
    format: n => n.toString(),
    parse: s => parseInt(s) // Use Number(s) or parseFloat(s) for broader numeric parsing if needed
};
ValueTypes.Date = {
    format: (d, formatStr = "yyyy-MM-dd") => system.formatDate(d, formatStr),
    parse: s => new Date(s)
};
ValueTypes.Boolean = {
    format: b => b.toString(),
    parse: s => s.toLowerCase() === 'true'
};
ValueTypes.BigInt = {
    format: b => b.toString(),
    parse: s => BigInt(s)
};
ValueTypes.Symbol = {
    format: s => s.toString(),
    parse: s => Symbol.for(s.substring(7, s.length - 1)) // Assumes format "Symbol(description)"
};
ValueTypes.Null = {
    format: () => 'null',
    parse: s => s === 'null' ? null : null
};
ValueTypes.Undefined = {
    format: () => 'undefined',
    parse: s => s === 'undefined' ? undefined : undefined
};


export {ValueTypes};