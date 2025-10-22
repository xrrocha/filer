/**
 * Type - Root of the type hierarchy.
 *
 * All types have a name and can check if a value conforms to them.
 * This is the abstract base for both primitive and object types.
 */
export abstract class Type {
  constructor(public readonly typeName: string) {}

  /**
   * Structural type checking (typeof/instanceof, NOT validation).
   * Subclasses implement this to define what values match the type.
   */
  abstract check(value: unknown): boolean;
}
