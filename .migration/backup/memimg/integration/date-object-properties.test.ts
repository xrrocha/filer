/**
 * Date Object Properties Test Suite
 *
 * This test suite exposes the critical bug where Date objects with
 * custom properties lose those properties during serialization.
 *
 * ALL TESTS IN THIS FILE SHOULD FAIL INITIALLY (before the fix).
 * After the refactoring, all tests should PASS.
 */

import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { serializeMemoryImage } from '../../../src/memimg/serialize.js';
import { deserializeMemoryImage } from '../../../src/memimg/deserialize.js';
import { createMemoryImage } from '../../../src/memimg/memimg.js';

describe('Date Objects with Properties - Critical Bug Tests', () => {

  it('FAILS: should preserve simple properties on Date objects', () => {
    // This test SHOULD FAIL before the fix
    const date = new Date('2024-01-15T10:00:00.000Z');
    (date as any).location = "Conference Room A";
    (date as any).capacity = 10;

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    assert.ok(result instanceof Date);
    assert.equal(result.toISOString(), '2024-01-15T10:00:00.000Z');

    // These assertions WILL FAIL before the fix:
    assert.equal((result as any).location, "Conference Room A");
    assert.equal((result as any).capacity, 10);
  });

  it('FAILS: should preserve array properties on Date', () => {
    const date = new Date('2024-01-15');
    (date as any).attendees = ["Alice", "Bob", "Charlie"];

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    // This WILL FAIL before the fix:
    assert.deepEqual((result as any).attendees, ["Alice", "Bob", "Charlie"]);
  });

  it('FAILS: should preserve nested object properties on Date', () => {
    const date = new Date('2024-01-15');
    (date as any).metadata = {
      organizer: "Alice",
      participants: ["Bob", "Charlie"],
      room: { number: 101, floor: 1 }
    };

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    // This WILL FAIL before the fix:
    assert.deepEqual((result as any).metadata, {
      organizer: "Alice",
      participants: ["Bob", "Charlie"],
      room: { number: 101, floor: 1 }
    });
  });

  it('FAILS: should track Date property mutations through proxy', () => {
    const root = createMemoryImage({ meetings: [] });
    const meeting = new Date('2024-01-15');
    (meeting as any).location = "Room A";

    root.meetings.push(meeting);

    // Get the proxied date back
    const proxiedDate = root.meetings[0];

    // Change property - this should generate a SET event
    (proxiedDate as any).location = "Room B";

    // Verify the change persisted
    assert.equal((proxiedDate as any).location, "Room B");

    // TODO: Add event log verification once infrastructure is in place
  });

  it('FAILS: should handle circular references involving Date objects', () => {
    const root = { created: new Date('2024-01-15') };
    (root.created as any).owner = root;  // Circular reference!

    const json = serializeMemoryImage(root, new WeakMap());
    const result = deserializeMemoryImage(json) as any;

    assert.ok(result.created instanceof Date);
    assert.equal(result.created.owner, result);  // Circular ref preserved
  });

  it('FAILS: should preserve Date methods after serialization', () => {
    const date = new Date('2024-01-15T10:00:00.000Z');
    (date as any).location = "Room A";

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    // All Date methods should still work
    assert.ok(typeof result.getTime === 'function');
    assert.equal(result.getFullYear(), 2024);
    assert.equal(result.getMonth(), 0);  // January
    assert.equal(result.getDate(), 15);
    assert.equal(result.toISOString(), '2024-01-15T10:00:00.000Z');

    // AND properties should be preserved
    assert.equal((result as any).location, "Room A");
  });

  it('FAILS: should handle Date with Map property', () => {
    const date = new Date('2024-01-15');
    (date as any).metadata = new Map([
      ['organizer', 'Alice'],
      ['status', 'confirmed']
    ]);

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    assert.ok((result as any).metadata instanceof Map);
    assert.equal((result as any).metadata.get('organizer'), 'Alice');
    assert.equal((result as any).metadata.get('status'), 'confirmed');
  });

  it('FAILS: should handle Date with Set property', () => {
    const date = new Date('2024-01-15');
    (date as any).tags = new Set(['meeting', 'important', 'quarterly']);

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    assert.ok((result as any).tags instanceof Set);
    assert.equal((result as any).tags.size, 3);
    assert.ok((result as any).tags.has('meeting'));
  });

  it('FAILS: should handle invalid Date with properties', () => {
    const date = new Date('invalid-date-string');
    (date as any).note = "This date is intentionally invalid";
    (date as any).reason = "Testing edge case";

    const json = serializeMemoryImage(date, new WeakMap());
    const result = deserializeMemoryImage(json);

    assert.ok(result instanceof Date);
    assert.ok(isNaN(result.getTime()));  // Invalid date
    assert.equal((result as any).note, "This date is intentionally invalid");
    assert.equal((result as any).reason, "Testing edge case");
  });

  it('FAILS: should handle Date properties in complex object graph', () => {
    const root = createMemoryImage({
      events: [
        {
          name: "Q1 Review",
          scheduled: Object.assign(new Date('2024-01-15'), {
            location: "Room A",
            attendees: ["Alice", "Bob"]
          }),
          created: Object.assign(new Date('2024-01-01'), {
            by: "System"
          })
        }
      ]
    });

    const json = serializeMemoryImage(root, new WeakMap());
    const result = deserializeMemoryImage(json) as any;

    assert.equal(result.events[0].name, "Q1 Review");
    assert.ok(result.events[0].scheduled instanceof Date);
    assert.equal(result.events[0].scheduled.location, "Room A");
    assert.deepEqual(result.events[0].scheduled.attendees, ["Alice", "Bob"]);
    assert.equal(result.events[0].created.by, "System");
  });
});
