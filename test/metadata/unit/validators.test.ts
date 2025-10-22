import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  // Numeric validators
  isInteger,
  minInclusive,
  maxExclusive,
  minExclusive,
  maxInclusive,
  range,
  rangeExclusive,
  rangeInclusive,
  // String validators
  pattern,
  minLength,
  maxLength,
  lengthRange,
  uppercase,
  lowercase,
  notBlank,
  // Enum validators
  oneOf,
  // Date validators
  isValidDate,
  notFuture,
  notPast,
  afterDate,
  beforeDate,
  // Object validators
  instanceOf,
  // Logical combinators
  and,
  or,
  not,
} from '../../../dist/metadata/validators.js';
import { ObjectType, StringType } from '../../../dist/metadata/javascript-types.js';

describe('Validators Library', () => {
  describe('Numeric Validators', () => {
    describe('isInteger()', () => {
      it('accepts integer values', () => {
        const validator = isInteger();
        assert.strictEqual(validator.validate(0), true);
        assert.strictEqual(validator.validate(42), true);
        assert.strictEqual(validator.validate(-100), true);
      });

      it('rejects decimal values', () => {
        const validator = isInteger();
        assert.strictEqual(validator.validate(3.14), false);
        assert.strictEqual(validator.validate(0.1), false);
        assert.strictEqual(validator.validate(-2.5), false);
      });

      it('provides error message for non-integer', () => {
        const validator = isInteger();
        const msg = validator.errorMessage(3.14);
        assert.ok(msg.includes('integer'));
        assert.ok(msg.includes('3.14'));
      });
    });

    describe('minInclusive()', () => {
      it('accepts values >= min', () => {
        const validator = minInclusive(10);
        assert.strictEqual(validator.validate(10), true);
        assert.strictEqual(validator.validate(11), true);
        assert.strictEqual(validator.validate(100), true);
      });

      it('rejects values < min', () => {
        const validator = minInclusive(10);
        assert.strictEqual(validator.validate(9), false);
        assert.strictEqual(validator.validate(0), false);
        assert.strictEqual(validator.validate(-100), false);
      });

      it('stores min value in validator', () => {
        const validator = minInclusive(42);
        assert.strictEqual((validator as any).min, 42);
      });

      it('provides error message with min value', () => {
        const validator = minInclusive(10);
        const msg = validator.errorMessage(5);
        assert.ok(msg.includes('10'));
        assert.ok(msg.includes('5'));
      });
    });

    describe('maxExclusive()', () => {
      it('accepts values < max', () => {
        const validator = maxExclusive(100);
        assert.strictEqual(validator.validate(99), true);
        assert.strictEqual(validator.validate(0), true);
        assert.strictEqual(validator.validate(-100), true);
      });

      it('rejects values >= max', () => {
        const validator = maxExclusive(100);
        assert.strictEqual(validator.validate(100), false);
        assert.strictEqual(validator.validate(101), false);
      });

      it('stores max value in validator', () => {
        const validator = maxExclusive(100);
        assert.strictEqual((validator as any).max, 100);
      });
    });

    describe('minExclusive()', () => {
      it('accepts values > min', () => {
        const validator = minExclusive(0);
        assert.strictEqual(validator.validate(1), true);
        assert.strictEqual(validator.validate(0.1), true);
        assert.strictEqual(validator.validate(100), true);
      });

      it('rejects values <= min', () => {
        const validator = minExclusive(0);
        assert.strictEqual(validator.validate(0), false);
        assert.strictEqual(validator.validate(-1), false);
      });
    });

    describe('maxInclusive()', () => {
      it('accepts values <= max', () => {
        const validator = maxInclusive(100);
        assert.strictEqual(validator.validate(100), true);
        assert.strictEqual(validator.validate(99), true);
        assert.strictEqual(validator.validate(0), true);
      });

      it('rejects values > max', () => {
        const validator = maxInclusive(100);
        assert.strictEqual(validator.validate(101), false);
        assert.strictEqual(validator.validate(200), false);
      });
    });

    describe('range()', () => {
      it('returns array of two validators', () => {
        const validators = range(10, 100);
        assert.strictEqual(validators.length, 2);
      });

      it('accepts values in range [min, max)', () => {
        const validators = range(10, 100);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        // 10 <= n < 100
        assert.strictEqual(minValidator.validate(10) && maxValidator.validate(10), true);
        assert.strictEqual(minValidator.validate(50) && maxValidator.validate(50), true);
        assert.strictEqual(minValidator.validate(99) && maxValidator.validate(99), true);
      });

      it('rejects values outside range', () => {
        const validators = range(10, 100);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        assert.strictEqual(minValidator.validate(9), false);
        assert.strictEqual(maxValidator.validate(100), false);
        assert.strictEqual(maxValidator.validate(101), false);
      });
    });

    describe('rangeExclusive()', () => {
      it('returns array of two validators', () => {
        const validators = rangeExclusive(0, 100);
        assert.strictEqual(validators.length, 2);
      });

      it('accepts values in range (min, max)', () => {
        const validators = rangeExclusive(0, 100);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        assert.strictEqual(minValidator.validate(1) && maxValidator.validate(1), true);
        assert.strictEqual(minValidator.validate(50) && maxValidator.validate(50), true);
        assert.strictEqual(minValidator.validate(99) && maxValidator.validate(99), true);
      });

      it('rejects boundary values', () => {
        const validators = rangeExclusive(0, 100);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        assert.strictEqual(minValidator.validate(0), false);
        assert.strictEqual(maxValidator.validate(100), false);
      });
    });

    describe('rangeInclusive()', () => {
      it('returns array of two validators', () => {
        const validators = rangeInclusive(1, 10);
        assert.strictEqual(validators.length, 2);
      });

      it('accepts values in range [min, max]', () => {
        const validators = rangeInclusive(1, 10);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        assert.strictEqual(minValidator.validate(1) && maxValidator.validate(1), true);
        assert.strictEqual(minValidator.validate(5) && maxValidator.validate(5), true);
        assert.strictEqual(minValidator.validate(10) && maxValidator.validate(10), true);
      });

      it('rejects values outside range', () => {
        const validators = rangeInclusive(1, 10);
        const minValidator = validators[0];
        const maxValidator = validators[1];

        assert.strictEqual(minValidator.validate(0), false);
        assert.strictEqual(maxValidator.validate(11), false);
      });
    });
  });

  describe('String Validators', () => {
    describe('pattern()', () => {
      it('accepts strings matching regex', () => {
        const validator = pattern(/^[A-Z]+$/);
        assert.strictEqual(validator.validate('HELLO'), true);
        assert.strictEqual(validator.validate('ABC'), true);
      });

      it('rejects strings not matching regex', () => {
        const validator = pattern(/^[A-Z]+$/);
        assert.strictEqual(validator.validate('hello'), false);
        assert.strictEqual(validator.validate('Hello'), false);
        assert.strictEqual(validator.validate('123'), false);
      });

      it('stores regex in validator', () => {
        const regex = /^test$/;
        const validator = pattern(regex);
        assert.strictEqual((validator as any).regex, regex);
      });

      it('provides error message with regex and value', () => {
        const validator = pattern(/^[A-Z]+$/);
        const msg = validator.errorMessage('hello');
        assert.ok(msg.includes('hello'));
      });

      it('works with complex patterns', () => {
        const ssnPattern = pattern(/^\d{3}-\d{2}-\d{4}$/);
        assert.strictEqual(ssnPattern.validate('123-45-6789'), true);
        assert.strictEqual(ssnPattern.validate('12-345-6789'), false);
        assert.strictEqual(ssnPattern.validate('123456789'), false);
      });
    });

    describe('minLength()', () => {
      it('accepts strings with length >= min', () => {
        const validator = minLength(3);
        assert.strictEqual(validator.validate('abc'), true);
        assert.strictEqual(validator.validate('abcd'), true);
        assert.strictEqual(validator.validate('hello world'), true);
      });

      it('rejects strings with length < min', () => {
        const validator = minLength(3);
        assert.strictEqual(validator.validate('ab'), false);
        assert.strictEqual(validator.validate('a'), false);
        assert.strictEqual(validator.validate(''), false);
      });

      it('provides error message with lengths', () => {
        const validator = minLength(5);
        const msg = validator.errorMessage('hi');
        assert.ok(msg.includes('5'));
        assert.ok(msg.includes('2'));
      });
    });

    describe('maxLength()', () => {
      it('accepts strings with length <= max', () => {
        const validator = maxLength(5);
        assert.strictEqual(validator.validate('hello'), true);
        assert.strictEqual(validator.validate('hi'), true);
        assert.strictEqual(validator.validate(''), true);
      });

      it('rejects strings with length > max', () => {
        const validator = maxLength(5);
        assert.strictEqual(validator.validate('hello world'), false);
        assert.strictEqual(validator.validate('123456'), false);
      });
    });

    describe('lengthRange()', () => {
      it('accepts strings with length in range [min, max]', () => {
        const validator = lengthRange(3, 10);
        assert.strictEqual(validator.validate('abc'), true);
        assert.strictEqual(validator.validate('hello'), true);
        assert.strictEqual(validator.validate('1234567890'), true);
      });

      it('rejects strings outside length range', () => {
        const validator = lengthRange(3, 10);
        assert.strictEqual(validator.validate('ab'), false);
        assert.strictEqual(validator.validate('12345678901'), false);
      });

      it('provides error message with range and actual length', () => {
        const validator = lengthRange(3, 10);
        const msg = validator.errorMessage('ab');
        assert.ok(msg.includes('3'));
        assert.ok(msg.includes('10'));
        assert.ok(msg.includes('2'));
      });
    });

    describe('uppercase()', () => {
      it('accepts all uppercase strings', () => {
        const validator = uppercase();
        assert.strictEqual(validator.validate('HELLO'), true);
        assert.strictEqual(validator.validate('ABC123'), true);
        assert.strictEqual(validator.validate(''), true);
      });

      it('rejects strings with lowercase characters', () => {
        const validator = uppercase();
        assert.strictEqual(validator.validate('hello'), false);
        assert.strictEqual(validator.validate('Hello'), false);
        assert.strictEqual(validator.validate('HELLO world'), false);
      });
    });

    describe('lowercase()', () => {
      it('accepts all lowercase strings', () => {
        const validator = lowercase();
        assert.strictEqual(validator.validate('hello'), true);
        assert.strictEqual(validator.validate('abc123'), true);
        assert.strictEqual(validator.validate(''), true);
      });

      it('rejects strings with uppercase characters', () => {
        const validator = lowercase();
        assert.strictEqual(validator.validate('HELLO'), false);
        assert.strictEqual(validator.validate('Hello'), false);
        assert.strictEqual(validator.validate('hello WORLD'), false);
      });
    });

    describe('notBlank()', () => {
      it('accepts non-blank strings', () => {
        const validator = notBlank();
        assert.strictEqual(validator.validate('hello'), true);
        assert.strictEqual(validator.validate('  hello  '), true);
        assert.strictEqual(validator.validate('a'), true);
      });

      it('rejects blank strings', () => {
        const validator = notBlank();
        assert.strictEqual(validator.validate(''), false);
        assert.strictEqual(validator.validate('   '), false);
        assert.strictEqual(validator.validate('\t\n'), false);
      });
    });
  });

  describe('Enum Validators', () => {
    describe('oneOf()', () => {
      it('accepts values in the allowed set', () => {
        const validator = oneOf(['CLERK', 'MANAGER', 'ANALYST']);
        assert.strictEqual(validator.validate('CLERK'), true);
        assert.strictEqual(validator.validate('MANAGER'), true);
        assert.strictEqual(validator.validate('ANALYST'), true);
      });

      it('rejects values not in the allowed set', () => {
        const validator = oneOf(['CLERK', 'MANAGER', 'ANALYST']);
        assert.strictEqual(validator.validate('SALESMAN'), false);
        assert.strictEqual(validator.validate('clerk'), false);
        assert.strictEqual(validator.validate(''), false);
      });

      it('works with numeric enums', () => {
        const validator = oneOf([10, 20, 30, 40]);
        assert.strictEqual(validator.validate(10), true);
        assert.strictEqual(validator.validate(20), true);
        assert.strictEqual(validator.validate(15), false);
        assert.strictEqual(validator.validate(50), false);
      });

      it('stores values in validator', () => {
        const values = ['A', 'B', 'C'];
        const validator = oneOf(values);
        assert.strictEqual((validator as any).values, values);
      });

      it('provides error message with allowed values', () => {
        const validator = oneOf(['A', 'B', 'C']);
        const msg = validator.errorMessage('Z');
        assert.ok(msg.includes('A'));
        assert.ok(msg.includes('B'));
        assert.ok(msg.includes('C'));
        assert.ok(msg.includes('Z'));
      });
    });
  });

  describe('Date Validators', () => {
    describe('isValidDate()', () => {
      it('accepts valid Date objects', () => {
        const validator = isValidDate();
        assert.strictEqual(validator.validate(new Date()), true);
        assert.strictEqual(validator.validate(new Date('2020-01-01')), true);
        assert.strictEqual(validator.validate(new Date(0)), true);
      });

      it('rejects invalid Date objects', () => {
        const validator = isValidDate();
        assert.strictEqual(validator.validate(new Date('invalid')), false);
      });

      it('rejects non-Date values', () => {
        const validator = isValidDate();
        assert.strictEqual(validator.validate('2020-01-01'), false);
        assert.strictEqual(validator.validate(123456789), false);
        assert.strictEqual(validator.validate(null), false);
      });
    });

    describe('notFuture()', () => {
      it('accepts dates in the past', () => {
        const validator = notFuture();
        const pastDate = new Date('2020-01-01');
        assert.strictEqual(validator.validate(pastDate), true);
      });

      it('accepts current date/time', () => {
        const validator = notFuture();
        const now = new Date();
        assert.strictEqual(validator.validate(now), true);
      });

      it('rejects future dates', () => {
        const validator = notFuture();
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365); // 1 year ahead
        assert.strictEqual(validator.validate(futureDate), false);
      });
    });

    describe('notPast()', () => {
      it('accepts current date/time', () => {
        const validator = notPast();
        const now = new Date();
        assert.strictEqual(validator.validate(now), true);
      });

      it('accepts future dates', () => {
        const validator = notPast();
        const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 1 day ahead
        assert.strictEqual(validator.validate(futureDate), true);
      });

      it('rejects past dates', () => {
        const validator = notPast();
        const pastDate = new Date('2020-01-01');
        assert.strictEqual(validator.validate(pastDate), false);
      });
    });

    describe('afterDate()', () => {
      it('accepts dates after the threshold', () => {
        const threshold = new Date('2020-01-01');
        const validator = afterDate(threshold);
        assert.strictEqual(validator.validate(new Date('2020-01-02')), true);
        assert.strictEqual(validator.validate(new Date('2025-01-01')), true);
      });

      it('rejects dates before or equal to threshold', () => {
        const threshold = new Date('2020-01-01');
        const validator = afterDate(threshold);
        assert.strictEqual(validator.validate(new Date('2020-01-01')), false);
        assert.strictEqual(validator.validate(new Date('2019-12-31')), false);
      });

      it('stores threshold date in validator', () => {
        const threshold = new Date('2020-01-01');
        const validator = afterDate(threshold);
        assert.strictEqual((validator as any).minDate, threshold);
      });
    });

    describe('beforeDate()', () => {
      it('accepts dates before the threshold', () => {
        const threshold = new Date('2025-01-01');
        const validator = beforeDate(threshold);
        assert.strictEqual(validator.validate(new Date('2024-12-31')), true);
        assert.strictEqual(validator.validate(new Date('2020-01-01')), true);
      });

      it('rejects dates after or equal to threshold', () => {
        const threshold = new Date('2025-01-01');
        const validator = beforeDate(threshold);
        assert.strictEqual(validator.validate(new Date('2025-01-01')), false);
        assert.strictEqual(validator.validate(new Date('2025-01-02')), false);
      });
    });
  });

  describe('Object Validators', () => {
    describe('instanceOf()', () => {
      it('accepts instances of the specified type', () => {
        const Person = ObjectType({
          name: 'Person',
          properties: {
            name: { name: 'name', type: StringType, validation: { required: true } },
          },
        });

        const validator = instanceOf(Person);
        const person = Person({ name: 'Alice' });
        assert.strictEqual(validator.validate(person), true);
      });

      it('rejects instances of different types', () => {
        const Person = ObjectType({
          name: 'Person',
          properties: {
            name: { name: 'name', type: StringType, validation: { required: true } },
          },
        });

        const Dept = ObjectType({
          name: 'Dept',
          properties: {
            name: { name: 'name', type: StringType, validation: { required: true } },
          },
        });

        const validator = instanceOf(Person);
        const dept = Dept({ name: 'Engineering' });
        assert.strictEqual(validator.validate(dept), false);
      });

      it('rejects non-object values', () => {
        const Person = ObjectType({
          name: 'Person',
          properties: {
            name: { name: 'name', type: StringType, validation: { required: true } },
          },
        });

        const validator = instanceOf(Person);
        assert.strictEqual(validator.validate('not an object'), false);
        assert.strictEqual(validator.validate(123), false);
        assert.strictEqual(validator.validate(null), false);
      });

      it('stores type factory in validator', () => {
        const Person = ObjectType({
          name: 'Person',
          properties: {
            name: { name: 'name', type: StringType, validation: { required: true } },
          },
        });

        const validator = instanceOf(Person);
        assert.strictEqual((validator as any).typeFactory, Person);
      });
    });
  });

  describe('Logical Combinators', () => {
    describe('and()', () => {
      it('passes when all validators pass', () => {
        const validator = and(minInclusive(0), maxInclusive(100), isInteger());
        assert.strictEqual(validator.validate(0), true);
        assert.strictEqual(validator.validate(50), true);
        assert.strictEqual(validator.validate(100), true);
      });

      it('fails when any validator fails', () => {
        const validator = and(minInclusive(0), maxInclusive(100), isInteger());
        assert.strictEqual(validator.validate(-1), false); // Fails minInclusive
        assert.strictEqual(validator.validate(101), false); // Fails maxInclusive
        assert.strictEqual(validator.validate(50.5), false); // Fails isInteger
      });

      it('provides error message from first failing validator', () => {
        const validator = and(minInclusive(0), isInteger());
        const msg = validator.errorMessage(-1);
        assert.ok(msg.includes('>=') || msg.includes('0'));
      });

      it('stores validators in combinator', () => {
        const v1 = minInclusive(0);
        const v2 = maxInclusive(100);
        const validator = and(v1, v2);
        assert.strictEqual((validator as any).validators.length, 2);
      });
    });

    describe('or()', () => {
      it('passes when at least one validator passes', () => {
        const validator = or(pattern(/^[A-Z]+$/), pattern(/^[a-z]+$/));
        assert.strictEqual(validator.validate('HELLO'), true);
        assert.strictEqual(validator.validate('hello'), true);
      });

      it('fails when all validators fail', () => {
        const validator = or(pattern(/^[A-Z]+$/), pattern(/^[a-z]+$/));
        assert.strictEqual(validator.validate('Hello'), false);
        assert.strictEqual(validator.validate('123'), false);
      });

      it('works with numeric validators', () => {
        const validator = or(minInclusive(100), maxInclusive(0));
        assert.strictEqual(validator.validate(-10), true); // Passes maxInclusive(0)
        assert.strictEqual(validator.validate(0), true); // Passes maxInclusive(0)
        assert.strictEqual(validator.validate(100), true); // Passes minInclusive(100)
        assert.strictEqual(validator.validate(50), false); // Fails both
      });
    });

    describe('not()', () => {
      it('passes when inner validator fails', () => {
        const validator = not(oneOf(['admin', 'root']));
        assert.strictEqual(validator.validate('user'), true);
        assert.strictEqual(validator.validate('guest'), true);
      });

      it('fails when inner validator passes', () => {
        const validator = not(oneOf(['admin', 'root']));
        assert.strictEqual(validator.validate('admin'), false);
        assert.strictEqual(validator.validate('root'), false);
      });

      it('works with numeric validators', () => {
        const validator = not(isInteger());
        assert.strictEqual(validator.validate(3.14), true);
        assert.strictEqual(validator.validate(0.5), true);
        assert.strictEqual(validator.validate(42), false);
      });

      it('provides error message indicating negation', () => {
        const validator = not(isInteger());
        const msg = validator.errorMessage(42);
        assert.ok(msg.includes('NOT') || msg.includes('not'));
      });
    });
  });

  describe('Validator Composition in ObjectType', () => {
    it('integrates numeric validators with property validation', () => {
      const Product = ObjectType({
        name: 'Product',
        properties: {
          price: {
            name: 'price',
            type: { typeName: 'number', check: (v: any) => typeof v === 'number' },
            validation: {
              required: true,
              validations: [
                isInteger(),
                ...range(1, 10000),
              ],
            },
          },
        },
      });

      const validProduct = Product({ price: 100 });
      assert.strictEqual(validProduct.price, 100);

      assert.throws(() => Product({ price: 0 })); // Below range
      assert.throws(() => Product({ price: 10000 })); // At/above max
      assert.throws(() => Product({ price: 99.99 })); // Not integer
    });

    it('integrates string validators with property validation', () => {
      const User = ObjectType({
        name: 'User',
        properties: {
          username: {
            name: 'username',
            type: StringType,
            validation: {
              required: true,
              validations: [
                lengthRange(3, 20),
                pattern(/^[a-z][a-z0-9_]*$/),
              ],
            },
          },
        },
      });

      const validUser = User({ username: 'alice_99' });
      assert.strictEqual(validUser.username, 'alice_99');

      assert.throws(() => User({ username: 'ab' })); // Too short
      assert.throws(() => User({ username: '123abc' })); // Must start with letter
      assert.throws(() => User({ username: 'Alice' })); // Must be lowercase
    });

    it('integrates enum validators with property validation', () => {
      const Employee = ObjectType({
        name: 'Employee',
        properties: {
          role: {
            name: 'role',
            type: StringType,
            validation: {
              required: true,
              validations: [oneOf(['CLERK', 'MANAGER', 'ANALYST'])],
            },
          },
        },
      });

      const emp = Employee({ role: 'CLERK' });
      assert.strictEqual(emp.role, 'CLERK');

      assert.throws(() => Employee({ role: 'INVALID' }));
    });
  });
});
