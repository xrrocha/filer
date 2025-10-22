/**
 * Validation Error - Custom error type for validation failures
 */

/**
 * Validation error thrown when constraints are violated
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
