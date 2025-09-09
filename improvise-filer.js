
const system = {};

// niam level 3
const metaschema = {};
system.metaschema = metaschema;

const numisma = {};
system.numisma = numisma;

// niam level 2
numisma.schema = {};
// niam level 1
numisma.data = {};

metaschema.english = { code: "en", name: 'english', emoji: '🇺🇸' };
metaschema.spanish = { code: "es", name: 'spanish', emoji: '🇪🇸' };
metaschema.Languages = {
    [metaschema.english.name]: metaschema.english,
    [metaschema.spanish.name]: metaschema.spanish,
    values: [metaschema.english, metaschema.spanish]
}

metaschema.int = { name: 'int', parse: s => parseInt(s), format: i => i.toString() };
metaschema.string = { name: 'string', parse: s => s, format: s => s };

numisma.schema.PaymentCardNetwork = {
    id: 1,
    name: 'PaymentCardNetwork',
    // supertypes: [EntityType, ...],
    properties: {
        id: {
            name: 'id',
            type: metaschema.int,
            constraint: {
                expression: id => id > 0,
                errorMessage: {
                    [metaschema.english.name]: "Id's gotta be positive",
                    [metaschema.spanish.name]: "El id tiene que ser es pero positivo",
                },
                validate(value, language = metaschema.english.name) {
                    if (!this.expression(metaschema.int.parse(value))) {
                        throw this.errorMessage[language.name]
                            || 'Oops: id: ' + value;
                    }
                }
            },
        }
    },
    // Runtime properties:
    // - next id
    // - map id/instance
};

console.log(metaschema.Languages);
console.log(numisma.schema.PaymentCardNetwork);
console.log(numisma.schema.PaymentCardNetwork.properties.id.constraint.expression(1));
// console.log(numisma.schema.PaymentCardNetwork.properties.id.constraint.validate(0, metaschema.spanish));

numisma.data.PaymentCardNetwork = {
    id: 1,
    __metadata__: numisma.schema.PaymentCardNetwork,
    name: Mastercard,
    // . . .
};
