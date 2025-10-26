/**
 * Integration tests for circular reference handling
 *
 * Tests serialization, deserialization, and event sourcing with circular references.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createMemoryImage,
  serializeMemoryImageToJson,
  deserializeMemoryImageFromJson,
} from '../../../src/memimg/memimg.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';
import { replayFromEventLog } from '../../../src/memimg/replay.js';

describe('circular-references integration', () => {
  describe('Simple circular references', () => {
    it('handles self-reference', () => {
      const root: any = createMemoryImage({});
      root.self = root;

      // Should not crash
      assert.ok(root.self);
      assert.equal(root.self, root);
    });

    it('serializes self-reference', () => {
      const root: any = createMemoryImage({ name: 'test' });
      root.self = root;

      const json = serializeMemoryImageToJson(root);

      // Should contain reference marker
      assert.ok(json.includes('ref'));
    });

    it('deserializes self-reference', () => {
      const root: any = createMemoryImage({ name: 'test' });
      root.self = root;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.name, 'test');
      assert.equal(restored.self, restored);
    });

    it('roundtrip preserves self-reference', () => {
      const root: any = createMemoryImage({ name: 'test' });
      root.self = root;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.self.self.self, restored);
    });
  });

  describe('Parent-child circular references', () => {
    it('handles parent-child cycle', () => {
      const root: any = createMemoryImage({});
      root.parent = { name: 'parent' };
      root.child = { name: 'child', parent: root.parent };
      root.parent.child = root.child;

      assert.equal(root.child.parent, root.parent);
      assert.equal(root.parent.child, root.child);
    });

    it('serializes parent-child cycle', () => {
      const root: any = createMemoryImage({});
      root.parent = { name: 'parent' };
      root.child = { name: 'child', parent: root.parent };
      root.parent.child = root.child;

      const json = serializeMemoryImageToJson(root);

      assert.ok(json.includes('parent'));
      assert.ok(json.includes('child'));
    });

    it('deserializes parent-child cycle', () => {
      const root: any = createMemoryImage({});
      root.parent = { name: 'parent' };
      root.child = { name: 'child', parent: root.parent };
      root.parent.child = root.child;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.parent.name, 'parent');
      assert.equal(restored.child.name, 'child');
      assert.equal(restored.child.parent, restored.parent);
      assert.equal(restored.parent.child, restored.child);
    });
  });

  describe('Array circular references', () => {
    it('handles array containing itself', () => {
      const root: any = createMemoryImage({});
      root.arr = [1, 2];
      root.arr.push(root.arr);

      assert.ok(Array.isArray(root.arr[2]));
    });

    it('serializes circular array', () => {
      const root: any = createMemoryImage({});
      root.arr = [1, 2];
      root.arr.push(root.arr);

      const json = serializeMemoryImageToJson(root);

      assert.ok(json.includes('arr'));
    });

    it('handles array elements referencing parent', () => {
      const root: any = createMemoryImage({});
      root.container = { name: 'container' };
      root.items = [root.container, root.container];

      assert.equal(root.items[0], root.items[1]);
    });

    it('roundtrip preserves array circular reference', () => {
      const root: any = createMemoryImage({});
      const obj = { value: 'shared' };
      root.arr = [obj, obj];

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.arr[0], restored.arr[1]);
    });
  });

  describe('Complex circular graphs', () => {
    it('handles bidirectional references', () => {
      const root: any = createMemoryImage({});
      root.a = { name: 'a' };
      root.b = { name: 'b' };
      root.a.ref = root.b;
      root.b.ref = root.a;

      assert.equal(root.a.ref.ref, root.a);
      assert.equal(root.b.ref.ref, root.b);
    });

    it('handles triangle of references', () => {
      const root: any = createMemoryImage({});
      root.a = { name: 'a' };
      root.b = { name: 'b' };
      root.c = { name: 'c' };
      root.a.next = root.b;
      root.b.next = root.c;
      root.c.next = root.a;

      assert.equal(root.a.next.next.next, root.a);
    });

    it('serializes complex graph', () => {
      const root: any = createMemoryImage({});
      root.a = { name: 'a' };
      root.b = { name: 'b' };
      root.c = { name: 'c' };
      root.a.next = root.b;
      root.b.next = root.c;
      root.c.next = root.a;

      const json = serializeMemoryImageToJson(root);

      assert.ok(json.length > 0);
    });

    it('deserializes complex graph', () => {
      const root: any = createMemoryImage({});
      root.a = { name: 'a' };
      root.b = { name: 'b' };
      root.c = { name: 'c' };
      root.a.next = root.b;
      root.b.next = root.c;
      root.c.next = root.a;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.a.next.next.next.name, 'a');
      assert.equal(restored.b.next.next.next.name, 'b');
    });
  });

  describe('Event sourcing with circular references', () => {
    it('logs events with circular references', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.node = { name: 'node' };
      root.node.self = root.node;

      assert.ok(eventLog.events.length > 0);
    });

    it('replays events with circular references', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.node = { name: 'node', value: 42 };
      root.node.self = root.node;

      // Replay from log
      const replayed: any = {};
      await replayFromEventLog(replayed, eventLog, { isReplaying: true });

      assert.ok(replayed.node);
      assert.equal(replayed.node.name, 'node');
    });

    it('handles mutations on circular structures', async () => {
      const eventLog = createMockEventLog();
      const root: any = createMemoryImage({}, { eventLog });

      root.node = { name: 'original' };
      root.node.self = root.node;
      root.node.name = 'modified';

      assert.equal(root.node.self.name, 'modified');
      assert.ok(eventLog.events.length >= 2);
    });
  });

  describe('Shared references (not circular)', () => {
    it('handles shared object references', () => {
      const root: any = createMemoryImage({});
      const shared = { value: 'shared' };
      root.a = shared;
      root.b = shared;

      assert.equal(root.a, root.b);
      root.a.value = 'modified';
      assert.equal(root.b.value, 'modified');
    });

    it('serializes shared references', () => {
      const root: any = createMemoryImage({});
      const shared = { value: 'shared' };
      root.a = shared;
      root.b = shared;

      const json = serializeMemoryImageToJson(root);

      // Should use references for second occurrence
      assert.ok(json.includes('ref') || json.includes('shared'));
    });

    it('deserializes shared references correctly', () => {
      const root: any = createMemoryImage({});
      const shared = { value: 'shared' };
      root.a = shared;
      root.b = shared;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.a, restored.b);
      restored.a.value = 'modified';
      assert.equal(restored.b.value, 'modified');
    });
  });

  describe('Mixed circular and acyclic structures', () => {
    it('handles mix of circular and non-circular refs', () => {
      const root: any = createMemoryImage({});
      root.circular = { name: 'circular' };
      root.circular.self = root.circular;
      root.normal = { name: 'normal' };

      assert.equal(root.circular.self, root.circular);
      assert.notEqual(root.normal, root.circular);
    });

    it('serializes mixed structures', () => {
      const root: any = createMemoryImage({});
      root.circular = { name: 'circular' };
      root.circular.self = root.circular;
      root.normal = { name: 'normal', value: 42 };

      const json = serializeMemoryImageToJson(root);

      assert.ok(json.includes('circular'));
      assert.ok(json.includes('normal'));
    });

    it('deserializes mixed structures', () => {
      const root: any = createMemoryImage({});
      root.circular = { name: 'circular' };
      root.circular.self = root.circular;
      root.normal = { name: 'normal', value: 42 };

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.circular.self, restored.circular);
      assert.equal(restored.normal.value, 42);
    });
  });

  describe('Deep circular references', () => {
    it('handles deeply nested circular reference', () => {
      const root: any = createMemoryImage({});
      root.a = { b: { c: { d: {} } } };
      root.a.b.c.d.back = root.a;

      assert.equal(root.a.b.c.d.back, root.a);
    });

    it('roundtrip preserves deep circular reference', () => {
      const root: any = createMemoryImage({});
      root.a = { b: { c: { d: {} } } };
      root.a.b.c.d.back = root.a;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.a.b.c.d.back, restored.a);
      assert.equal(restored.a.b.c.d.back.b.c.d.back, restored.a);
    });
  });

  describe('Collections with circular references', () => {
    it('handles Map with circular value', () => {
      const root: any = createMemoryImage({});
      root.map = new Map();
      const obj = { value: 'test' };
      obj.self = obj;
      root.map.set('key', obj);

      const retrieved = root.map.get('key');
      assert.equal(retrieved.self, retrieved);
    });

    it('handles Set with circular value', () => {
      const root: any = createMemoryImage({});
      root.set = new Set();
      const obj = { value: 'test' };
      obj.self = obj;
      root.set.add(obj);

      assert.ok(root.set.has(obj));
    });

    it('serializes Map with circular values', () => {
      const root: any = createMemoryImage({});
      root.map = new Map();
      const obj = { value: 'test' };
      obj.self = obj;
      root.map.set('key', obj);

      const json = serializeMemoryImageToJson(root);

      assert.ok(json.includes('map'));
    });
  });

  describe('Edge cases', () => {
    it('handles long circular chain', () => {
      const root: any = createMemoryImage({});
      let current = root;

      // Create chain of 10 objects
      for (let i = 0; i < 10; i++) {
        current.next = { index: i };
        current = current.next;
      }

      // Close the loop
      current.next = root;

      // Verify loop
      let count = 0;
      let node = root;
      while (count < 20) {
        node = node.next;
        count++;
      }

      assert.ok(node.next);
    });

    it('handles empty circular object', () => {
      const root: any = createMemoryImage({});
      root.empty = {};
      root.empty.self = root.empty;

      const json = serializeMemoryImageToJson(root);
      const restored: any = deserializeMemoryImageFromJson(json);

      assert.equal(restored.empty.self, restored.empty);
    });

    it('handles multiple paths to same circular object', () => {
      const root: any = createMemoryImage({});
      const circular = { name: 'circular' };
      circular.self = circular;
      root.path1 = circular;
      root.path2 = circular;

      assert.equal(root.path1, root.path2);
      assert.equal(root.path1.self, root.path2.self);
    });
  });
});
