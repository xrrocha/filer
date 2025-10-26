/**
 * Integration tests for transaction API
 *
 * Tests transaction lifecycle: save, discard, checkpoint, restore.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTransaction } from '../../../src/memimg/transaction.js';
import { createMockEventLog, assertDeepEqual } from '../fixtures/helpers.js';

describe('transaction integration', () => {
  describe('Transaction creation', () => {
    it('creates transaction with empty root', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      assert.ok(txn);
      assert.ok(txn.root);
    });

    it('initializes as not dirty', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      assert.equal(txn.isDirty(), false);
    });

    it('has zero uncommitted count initially', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      assert.equal(txn.getUncommittedCount(), 0);
    });
  });

  describe('isDirty tracking', () => {
    it('becomes dirty after mutation', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.name = 'Alice';
      assert.equal(txn.isDirty(), true);
    });

    it('becomes clean after save', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.value = 42;
      await txn.save();

      assert.equal(txn.isDirty(), false);
    });

    it('becomes clean after discard', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.temp = 'discard-me';
      txn.discard();

      assert.equal(txn.isDirty(), false);
    });
  });

  describe('save() - persisting changes', () => {
    it('applies changes to base and logs events', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.name = 'Alice';
      await txn.save();

      assert.ok(log.events.length > 0);
      assert.equal(txn.isDirty(), false);
    });

    it('persists multiple changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      txn.root.b = 2;
      txn.root.c = 3;
      await txn.save();

      assert.equal(txn.getUncommittedCount(), 0);
    });

    it('persists nested changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.user = { name: 'Bob' };
      await txn.save();

      assert.ok(log.events.length > 0);
    });

    it('allows mutations after save', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.first = 'value';
      await txn.save();

      txn.root.second = 'value2';
      assert.equal(txn.isDirty(), true);
    });
  });

  describe('discard() - rolling back changes', () => {
    it('discards uncommitted changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.temp = 'discard-me';
      txn.discard();

      assert.equal(txn.root.temp, undefined);
      assert.equal(txn.isDirty(), false);
    });

    it('preserves committed changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.keep = 'this';
      await txn.save();

      txn.root.discard = 'this';
      txn.discard();

      assert.equal(txn.root.keep, 'this');
      assert.equal(txn.root.discard, undefined);
    });

    it('discards multiple changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      txn.root.b = 2;
      txn.root.c = 3;
      txn.discard();

      assert.equal(txn.root.a, undefined);
      assert.equal(txn.root.b, undefined);
      assert.equal(txn.root.c, undefined);
    });

    it('does not log discarded changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      const initialCount = log.events.length;
      txn.root.temp = 'discard';
      txn.discard();

      assert.equal(log.events.length, initialCount);
    });
  });

  describe('getUncommittedCount()', () => {
    it('returns zero initially', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      assert.equal(txn.getUncommittedCount(), 0);
    });

    it('increments with changes', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      assert.ok(txn.getUncommittedCount() > 0);

      txn.root.b = 2;
      assert.ok(txn.getUncommittedCount() > 1);
    });

    it('resets to zero after save', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.value = 42;
      await txn.save();

      assert.equal(txn.getUncommittedCount(), 0);
    });

    it('resets to zero after discard', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.value = 42;
      txn.discard();

      assert.equal(txn.getUncommittedCount(), 0);
    });
  });

  describe('Checkpoints', () => {
    it('creates checkpoint of current state', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      const checkpoint = txn.createCheckpoint();

      assert.ok(checkpoint instanceof Map);
    });

    it('restores to checkpoint', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      const checkpoint = txn.createCheckpoint();

      txn.root.b = 2;
      txn.restoreCheckpoint(checkpoint);

      assert.equal(txn.root.a, 1);
      assert.equal(txn.root.b, undefined);
    });

    it('handles multiple checkpoints', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      const cp1 = txn.createCheckpoint();

      txn.root.b = 2;
      const cp2 = txn.createCheckpoint();

      txn.root.c = 3;

      txn.restoreCheckpoint(cp2);
      assert.equal(txn.root.c, undefined);
      assert.equal(txn.root.b, 2);

      txn.restoreCheckpoint(cp1);
      assert.equal(txn.root.b, undefined);
      assert.equal(txn.root.a, 1);
    });

    it('checkpoint before empty transaction', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      const checkpoint = txn.createCheckpoint();

      txn.root.a = 1;
      txn.root.b = 2;

      txn.restoreCheckpoint(checkpoint);

      assert.equal(txn.root.a, undefined);
      assert.equal(txn.isDirty(), false);
    });
  });

  describe('Complex scenarios', () => {
    it('save-modify-discard cycle', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.committed = 'value';
      await txn.save();

      txn.root.uncommitted = 'discard';
      txn.discard();

      assert.equal(txn.root.committed, 'value');
      assert.equal(txn.root.uncommitted, undefined);
    });

    it('checkpoint-modify-restore-save cycle', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.a = 1;
      const cp = txn.createCheckpoint();

      txn.root.b = 2;
      txn.restoreCheckpoint(cp);

      txn.root.c = 3;
      await txn.save();

      assert.equal(txn.root.a, 1);
      assert.equal(txn.root.b, undefined);
      assert.equal(txn.root.c, 3);
    });

    it('nested object modifications', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.user = { profile: { name: 'Alice' } };
      await txn.save();

      txn.root.user.profile.age = 30;
      assert.equal(txn.isDirty(), true);

      await txn.save();
      assert.equal(txn.root.user.profile.age, 30);
    });

    it('array mutations in transaction', async () => {
      const log = createMockEventLog();
      const txn = await createTransaction(log);

      txn.root.items = [];
      await txn.save();

      txn.root.items.push(1, 2, 3);
      assertDeepEqual(txn.root.items, [1, 2, 3]);

      txn.discard();
      assertDeepEqual(txn.root.items, []);
    });
  });
});
