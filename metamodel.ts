/**
 * Represents a fundamental concept within the conceptual metaschema.
 * All other metaconcepts extend this base.
 */
interface IMetaconcept {
  readonly id: string; // A unique identifier for the metaconcept, ensuring immutability (like a UUID)
  readonly name: string; // The human-readable name of the concept [1, 2]
  readonly description?: string; // An optional detailed description [1, 2]
  readonly kind: string; // A discriminator property to identify the type of metaconcept
}

/**
 * Defines a Value Type (or Label Type), representing data whose identity
 * is based on its value rather than a unique ID. Value objects are immutable [6].
 */
interface IValueType extends IMetaconcept {
  readonly kind: 'ValueType';
  readonly baseType: 'string' | 'number' | 'boolean' | 'date' | 'bigint' | 'symbol' | 'null' | 'undefined' | 'custom'; // The underlying primitive or custom base type [3, 7]
  readonly isImmutable: true; // Explicitly stating immutability [6]
  
  // Optional patterns for formatting and parsing values, inspired by `value-types.js` [8]
  readonly formatPattern?: string; // E.g., "yyyy-MM-dd" for dates [8]
  readonly parsePattern?: string;
  // Could include declarative validation rules [9, 10]
}

/**
 * Defines an Entity Type (or Domain Class/Interface), representing distinct,
 * identifiable objects in the Universe of Discourse [11, 12].
 */
interface IEntityType extends IMetaconcept {
  readonly kind: 'EntityType';
  readonly isAbstract?: boolean; // Can be an abstract concept or interface [15]
  
  // Attributes (properties) that define the data an entity holds [11].
  // Modeled as references to `IAttribute` definitions.
  readonly attributes: IAttribute[];

  // Relationships this entity *can* participate in (its potential roles) [16].
  // Relationships themselves are defined separately.
  // We specify supertypes and subtypes to model generalization/specialization [5, 17, 18].
  readonly supertypeOf?: IEntityType[]; // E.g., Person is a supertype of Man/Woman [19]
  readonly subtypeOf?: IEntityType[];   // E.g., Man is a subtype of Person [19]
}

/**
 * Defines an Attribute (or Property), describing a characteristic of an Entity Type or Relationship [11].
 */
interface IAttribute extends IMetaconcept {
  readonly kind: 'Attribute';
  readonly type: IValueType | IEntityType; // The data type of the attribute [20]
  readonly isOptional?: boolean; // Can this attribute be null? [21]
  readonly isMandatory?: boolean; // Must this attribute always have a value? [21, 22]
  readonly isUnique?: boolean; // Is this attribute (or part of it) a key? [23-25]
  readonly isMultivalued?: boolean; // Can it hold multiple values (a collection)? [20, 21]
  
  // Declarative constraints often used in Naked Objects [9, 10, 21]
  readonly maxLength?: number; 
  readonly regexValidation?: string;
  
  readonly isDerived?: boolean; // Is its value computed rather than stored? [23, 26, 27]
  readonly derivationRule?: string; // The rule to compute a derived attribute [28]
}

/**
 * Defines a Role, specifying the part an Entity Type plays in a Relationship (Fact Type) [16].
 */
interface IRole extends IMetaconcept {
  readonly kind: 'Role';
  // Role names should be meaningful within the context of a relationship [29].
  // No additional properties here, as roles are primarily about their name and context.
}

/**
 * Defines a Relationship (or Fact Type), representing a connection or assertion between Entity Types [11].
 */
interface IRelationship extends IMetaconcept {
  readonly kind: 'Relationship';
  readonly arity: 'unary' | 'binary' | 'ternary' | 'quaternary' | 'n-ary'; // The number of participating entities [31, 32]
  
  readonly participants: Array<{
    readonly entityType: IEntityType; // The entity participating in the relationship
    readonly role: IRole; // The role the entity plays in this relationship [16]
    readonly cardinality: string; // E.g., "1:1", "1:M", "M:N" [33]
    readonly participation: 'mandatory' | 'optional'; // "must/may" for participation constraints [34, 35]
  }>;
  
  readonly attributes?: IAttribute[]; // Relationships can also have attributes [36]
  
  readonly isObjectified?: boolean; // Can this relationship itself be treated as an object/entity? (Nesting) [37, 38]
  readonly objectifiedAs?: IEntityType; // If objectified, it maps to this specific entity type [38]
  
  readonly constraints?: IConstraint[]; // Constraints specific to this relationship [22, 23]
}

/**
 * Defines an Action (or Behavior/Operation), representing executable logic on an Entity or Repository [40, 41].
 */
interface IAction extends IMetaconcept {
  readonly kind: 'Action';
  readonly parameters: IAttribute[]; // The inputs required for the action [40]
  readonly returns?: IEntityType | IValueType | ICollection<IEntityType | IValueType>; // The output of the action [42]
  
  readonly preconditions?: IConstraint[]; // Rules that must hold true before the action can execute [43, 44]
  readonly postconditions?: IConstraint[]; // Rules that hold true after successful execution
  
  readonly isExplorationOnly?: boolean; // For rapid prototyping/demo purposes only [45]
  readonly isDebuggingOnly?: boolean; // For diagnostics/debugging only [45]
}

/**
 * Defines a Constraint (or Rule), restricting the states or behavior within the model [22, 23].
 */
interface IConstraint extends IMetaconcept {
  readonly kind: 'Constraint';
  readonly type: 'uniqueness' | 'mandatory_role' | 'equality' | 'exclusion' | 'subset' | 'domain_rule' | 'custom'; // Various types of constraints [47-49]
  readonly ruleExpression: string; // A natural language or formal logic expression of the rule [2]
  readonly appliesTo: IEntityType | IValueType | IAttribute | IRelationship | IRole | IAction; // The specific metaconcept(s) this constraint applies to
}

/**
 * Defines a Repository, managing the lifecycle and collections of specific Entity Types [50, 51].
 */
interface IRepository extends IMetaconcept {
  readonly kind: 'Repository';
  readonly manages: IEntityType; // The Entity Type this repository is responsible for
  readonly actions: IAction[]; // Actions for creating and retrieving entities (e.g., `newTransientInstance`, `allMatches`) [53, 54]
}

/**
 * A generic interface for defining collections of other metaconcepts.
 */
interface ICollection<T extends IMetaconcept | IValueType> {
  readonly kind: 'Collection';
  readonly elementType: T; // The type of elements held within the collection
  readonly minCardinality?: number;
  readonly maxCardinality?: number; // E.g., 1..* [55]
}

/**
 * Represents the complete Conceptual Metaschema, the collection of all defined
 * metaconcepts that describe a domain's structure and behavior [22, 56].
 */
interface IConceptualMetaschema extends IMetaconcept {
  readonly kind: 'ConceptualMetaschema';
  readonly entityTypes: IEntityType[];
  readonly valueTypes: IValueType[];
  readonly relationships: IRelationship[];
  readonly actions: IAction[];
  readonly constraints: IConstraint[];
  readonly repositories: IRepository[];
  readonly roles: IRole[];
  // Other global configurations or metadata can reside here
}

// Define how a specific runtime ValueType handler is structured
// This corresponds to `ValueTypes.String` or `ValueTypes.Number` in `value-types.js` [8]
interface IRuntimeValueTypeHandler {
  readonly format: (value: any, formatStr?: string) => string;
  readonly parse: (value: string) => any;
}

// The collection of all runtime ValueType handlers within `system.metaschema.ValueTypes`
// This is what the `ValueTypes` object itself from `value-types.js` contains [8]
interface IRuntimeGlobalValueTypeHandlers {
  readonly String: IRuntimeValueTypeHandler;
  readonly Number: IRuntimeValueTypeHandler;
  readonly Date: IRuntimeValueTypeHandler;
  readonly Boolean: IRuntimeValueTypeHandler;
  readonly BigInt: IRuntimeValueTypeHandler;
  readonly Symbol: IRuntimeValueTypeHandler;
  readonly Null: IRuntimeValueTypeHandler;
  readonly Undefined: IRuntimeValueTypeHandler;
  // ... any other custom runtime value type handlers
}

// The structure of the `system` object, using 'const' for immutability as requested [57]
const systemRuntime: {
  readonly metaschema: {
    readonly ValueTypes: IRuntimeGlobalValueTypeHandlers; // A collection of runtime handlers for value types [8, 57]
    // Other parts of the metaschema (e.g., dynamically loaded entity definitions)
    // could be added here at runtime if they were to provide concrete implementations/factories.
  };
  // Functions and modules loaded by `setupPrelude` are also part of this immutable runtime object [58, 59]
  readonly formatDate: (d: Date, formatStr?: string) => string; // Example of a prelude function [8, 58]
  readonly path: any; // Simplified, represents path module
  readonly fs: any;   // Simplified, represents fs module
  readonly [key: string]: any; // Allows for other dynamic properties in the system object
} = {
  metaschema: {
    ValueTypes: { // This object contains concrete implementations conforming to IRuntimeValueTypeHandler
      String: {
        format: s => s,
        parse: s => s
      },
      Number: {
        format: n => n.toString(),
        parse: s => parseInt(s) // As per source [8]
      },
      Date: {
        format: (d, formatStr = "yyyy-MM-dd") => systemRuntime.formatDate(d, formatStr), // References itself for formatDate
        parse: s => new Date(s)
      },
      Boolean: {
        format: b => b.toString(),
        parse: s => s.toLowerCase() === 'true'
      },
      BigInt: {
        format: b => b.toString(),
        parse: s => BigInt(s)
      },
      Symbol: {
        format: s => s.toString(),
        parse: s => Symbol.for(s.substring(7, s.length - 1))
      },
      Null: {
        format: () => 'null',
        parse: s => s === 'null' ? null : null
      },
      Undefined: {
        format: () => 'undefined',
        parse: s => s === 'undefined' ? undefined : undefined
      },
    }
  },
  // Placeholder for the actual `formatDate` implementation from `prelude.js` [58]
  // In a real application, `setupPrelude(systemRuntime)` would populate this.
  formatDate: (d, formatStr?) => `(formatted date: ${d.toISOString()})`, 
  path: {}, // Placeholder
  fs: {},   // Placeholder
};

