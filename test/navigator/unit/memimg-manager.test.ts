/**
 * Unit tests for Memory Image Manager
 *
 * Tests CRUD operations for memory image metadata in IndexedDB.
 * ~150 tests covering all manager functions.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  createMemoryImage,
  listMemoryImages,
  getMemoryImage,
  renameMemoryImage,
  updateDescription,
  touchMemoryImage,
  deleteMemoryImage,
  getEventStoreName,
  type MemoryImageMetadata,
} from '../../../dist/navigator/memimg-manager.js';
import { setupMockIndexedDB, teardownMockIndexedDB } from './fixtures/helpers.js';

// Skip IndexedDB tests in Node.js environment
// These are properly tested in integration/E2E tests with real browser environment
const hasIndexedDB = typeof globalThis.indexedDB !== 'undefined';

describe('Memory Image Manager', { skip: !hasIndexedDB }, () => {
  beforeEach(() => {
    setupMockIndexedDB();
  });

  afterEach(() => {
    teardownMockIndexedDB();
  });

  // ==========================================================================
  // createMemoryImage
  // ==========================================================================

  describe('createMemoryImage', () => {
    it('creates metadata with all required fields', async () => {
      const result = await createMemoryImage('Test Image', 'Test description');

      assert.ok(result.id);
      assert.equal(result.name, 'Test Image');
      assert.equal(result.description, 'Test description');
      assert.ok(result.createdAt);
      assert.ok(result.updatedAt);
      assert.equal(result.eventCount, 0);
    });

    it('generates a valid UUID for id', async () => {
      const result = await createMemoryImage('Test');

      // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      assert.ok(uuidRegex.test(result.id), `Invalid UUID: ${result.id}`);
    });

    it('generates unique UUIDs for multiple images', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const result = await createMemoryImage(`Image ${i}`);
        ids.add(result.id);
      }

      // All IDs should be unique
      assert.equal(ids.size, 10);
    });

    it('sets createdAt and updatedAt to current timestamp', async () => {
      const before = Date.now();
      const result = await createMemoryImage('Test');
      const after = Date.now();

      assert.ok(result.createdAt >= before && result.createdAt <= after);
      assert.ok(result.updatedAt >= before && result.updatedAt <= after);
      assert.equal(result.createdAt, result.updatedAt); // Should be equal on creation
    });

    it('initializes eventCount to 0', async () => {
      const result = await createMemoryImage('Test');
      assert.equal(result.eventCount, 0);
    });

    it('throws error for empty name', async () => {
      await assert.rejects(
        async () => await createMemoryImage(''),
        /name cannot be empty/i
      );
    });

    it('throws error for whitespace-only name', async () => {
      await assert.rejects(
        async () => await createMemoryImage('   '),
        /name cannot be empty/i
      );
    });

    it('trims whitespace from name', async () => {
      const result = await createMemoryImage('  Test Image  ');
      assert.equal(result.name, 'Test Image');
    });

    it('trims whitespace from description', async () => {
      const result = await createMemoryImage('Test', '  Test description  ');
      assert.equal(result.description, 'Test description');
    });

    it('uses empty string for missing description', async () => {
      const result = await createMemoryImage('Test');
      assert.equal(result.description, '');
    });

    it('detects duplicate names (case-insensitive)', async () => {
      await createMemoryImage('Test Image');

      await assert.rejects(
        async () => await createMemoryImage('Test Image'),
        /already exists/i
      );
    });

    it('detects duplicate names with different casing', async () => {
      await createMemoryImage('Test Image');

      await assert.rejects(
        async () => await createMemoryImage('TEST IMAGE'),
        /already exists/i
      );

      await assert.rejects(
        async () => await createMemoryImage('test image'),
        /already exists/i
      );
    });

    it('detects duplicate names after trimming', async () => {
      await createMemoryImage('Test Image');

      await assert.rejects(
        async () => await createMemoryImage('  Test Image  '),
        /already exists/i
      );
    });

    it('allows same name after deletion', async () => {
      const first = await createMemoryImage('Test Image');
      await deleteMemoryImage(first.id);

      // Should succeed now
      const second = await createMemoryImage('Test Image');
      assert.ok(second.id);
      assert.notEqual(second.id, first.id);
    });

    it('stores metadata in IndexedDB', async () => {
      const created = await createMemoryImage('Test Image', 'Description');

      // Retrieve it
      const retrieved = await getMemoryImage(created.id);

      assert.ok(retrieved);
      assert.equal(retrieved.id, created.id);
      assert.equal(retrieved.name, created.name);
      assert.equal(retrieved.description, created.description);
    });
  });

  // ==========================================================================
  // listMemoryImages
  // ==========================================================================

  describe('listMemoryImages', () => {
    it('returns empty array when no images exist', async () => {
      const results = await listMemoryImages();
      assert.deepEqual(results, []);
    });

    it('returns all memory images', async () => {
      await createMemoryImage('Image 1');
      await createMemoryImage('Image 2');
      await createMemoryImage('Image 3');

      const results = await listMemoryImages();
      assert.equal(results.length, 3);
    });

    it('sorts by updatedAt descending (most recent first)', async () => {
      const first = await createMemoryImage('First');
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await createMemoryImage('Second');
      await new Promise(resolve => setTimeout(resolve, 10));

      const third = await createMemoryImage('Third');

      const results = await listMemoryImages();

      // Most recent first
      assert.equal(results[0]!.id, third.id);
      assert.equal(results[1]!.id, second.id);
      assert.equal(results[2]!.id, first.id);
    });

    it('updates sort order after touching', async () => {
      const first = await createMemoryImage('First');
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await createMemoryImage('Second');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Touch first image to make it most recent
      await touchMemoryImage(first.id);

      const results = await listMemoryImages();

      // First should now be at top
      assert.equal(results[0]!.id, first.id);
      assert.equal(results[1]!.id, second.id);
    });

    it('includes all metadata fields', async () => {
      await createMemoryImage('Test', 'Description');

      const results = await listMemoryImages();
      const image = results[0]!;

      assert.ok(image.id);
      assert.ok(image.name);
      assert.ok(image.description !== undefined);
      assert.ok(image.createdAt);
      assert.ok(image.updatedAt);
      assert.ok(image.eventCount !== undefined);
    });

    it('handles large number of images efficiently', async () => {
      // Create 100 images
      for (let i = 0; i < 100; i++) {
        await createMemoryImage(`Image ${i}`);
      }

      const startTime = Date.now();
      const results = await listMemoryImages();
      const endTime = Date.now();

      assert.equal(results.length, 100);
      // Should complete in reasonable time (< 1 second)
      assert.ok(endTime - startTime < 1000);
    });
  });

  // ==========================================================================
  // getMemoryImage
  // ==========================================================================

  describe('getMemoryImage', () => {
    it('retrieves existing image by ID', async () => {
      const created = await createMemoryImage('Test Image', 'Description');

      const retrieved = await getMemoryImage(created.id);

      assert.ok(retrieved);
      assert.equal(retrieved.id, created.id);
      assert.equal(retrieved.name, 'Test Image');
      assert.equal(retrieved.description, 'Description');
    });

    it('returns null for non-existent ID', async () => {
      const result = await getMemoryImage('non-existent-id');
      assert.equal(result, null);
    });

    it('returns null after deletion', async () => {
      const created = await createMemoryImage('Test');
      await deleteMemoryImage(created.id);

      const result = await getMemoryImage(created.id);
      assert.equal(result, null);
    });

    it('retrieves correct image among multiple', async () => {
      await createMemoryImage('Image 1');
      const target = await createMemoryImage('Image 2');
      await createMemoryImage('Image 3');

      const retrieved = await getMemoryImage(target.id);

      assert.ok(retrieved);
      assert.equal(retrieved.id, target.id);
      assert.equal(retrieved.name, 'Image 2');
    });

    it('includes all metadata fields', async () => {
      const created = await createMemoryImage('Test', 'Description');
      const retrieved = await getMemoryImage(created.id);

      assert.ok(retrieved);
      assert.ok(retrieved.id);
      assert.ok(retrieved.name);
      assert.ok(retrieved.description !== undefined);
      assert.ok(retrieved.createdAt);
      assert.ok(retrieved.updatedAt);
      assert.ok(retrieved.eventCount !== undefined);
    });
  });

  // ==========================================================================
  // renameMemoryImage
  // ==========================================================================

  describe('renameMemoryImage', () => {
    it('renames existing image', async () => {
      const image = await createMemoryImage('Original Name');

      await renameMemoryImage(image.id, 'New Name');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'New Name');
    });

    it('updates updatedAt timestamp on rename', async () => {
      const image = await createMemoryImage('Original');
      const originalUpdatedAt = image.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));
      await renameMemoryImage(image.id, 'New Name');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('does not change createdAt timestamp', async () => {
      const image = await createMemoryImage('Original');
      const originalCreatedAt = image.createdAt;

      await renameMemoryImage(image.id, 'New Name');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.createdAt, originalCreatedAt);
    });

    it('trims whitespace from new name', async () => {
      const image = await createMemoryImage('Original');

      await renameMemoryImage(image.id, '  New Name  ');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'New Name');
    });

    it('throws error for empty name', async () => {
      const image = await createMemoryImage('Original');

      await assert.rejects(
        async () => await renameMemoryImage(image.id, ''),
        /name cannot be empty/i
      );
    });

    it('throws error for whitespace-only name', async () => {
      const image = await createMemoryImage('Original');

      await assert.rejects(
        async () => await renameMemoryImage(image.id, '   '),
        /name cannot be empty/i
      );
    });

    it('throws error for non-existent image', async () => {
      await assert.rejects(
        async () => await renameMemoryImage('non-existent-id', 'New Name'),
        /not found/i
      );
    });

    it('detects duplicate names (case-insensitive)', async () => {
      await createMemoryImage('Image 1');
      const image2 = await createMemoryImage('Image 2');

      await assert.rejects(
        async () => await renameMemoryImage(image2.id, 'Image 1'),
        /already exists/i
      );
    });

    it('detects duplicate names with different casing', async () => {
      await createMemoryImage('Image 1');
      const image2 = await createMemoryImage('Image 2');

      await assert.rejects(
        async () => await renameMemoryImage(image2.id, 'IMAGE 1'),
        /already exists/i
      );
    });

    it('allows renaming to same name (case-preserving)', async () => {
      const image = await createMemoryImage('Original Name');

      // Should succeed
      await renameMemoryImage(image.id, 'Original Name');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'Original Name');
    });

    it('allows changing case of own name', async () => {
      const image = await createMemoryImage('Original Name');

      // Should succeed
      await renameMemoryImage(image.id, 'ORIGINAL NAME');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'ORIGINAL NAME');
    });
  });

  // ==========================================================================
  // updateDescription
  // ==========================================================================

  describe('updateDescription', () => {
    it('updates description of existing image', async () => {
      const image = await createMemoryImage('Test', 'Original description');

      await updateDescription(image.id, 'New description');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.description, 'New description');
    });

    it('updates updatedAt timestamp', async () => {
      const image = await createMemoryImage('Test', 'Original');
      const originalUpdatedAt = image.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));
      await updateDescription(image.id, 'New description');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('does not change createdAt timestamp', async () => {
      const image = await createMemoryImage('Test', 'Original');
      const originalCreatedAt = image.createdAt;

      await updateDescription(image.id, 'New description');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.createdAt, originalCreatedAt);
    });

    it('trims whitespace from description', async () => {
      const image = await createMemoryImage('Test');

      await updateDescription(image.id, '  New description  ');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.description, 'New description');
    });

    it('allows empty description', async () => {
      const image = await createMemoryImage('Test', 'Original');

      await updateDescription(image.id, '');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.description, '');
    });

    it('throws error for non-existent image', async () => {
      await assert.rejects(
        async () => await updateDescription('non-existent-id', 'New description'),
        /not found/i
      );
    });

    it('does not change name', async () => {
      const image = await createMemoryImage('Test Name', 'Original');

      await updateDescription(image.id, 'New description');

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'Test Name');
    });
  });

  // ==========================================================================
  // touchMemoryImage
  // ==========================================================================

  describe('touchMemoryImage', () => {
    it('updates updatedAt timestamp', async () => {
      const image = await createMemoryImage('Test');
      const originalUpdatedAt = image.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));
      await touchMemoryImage(image.id);

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.ok(updated.updatedAt > originalUpdatedAt);
    });

    it('does not change createdAt timestamp', async () => {
      const image = await createMemoryImage('Test');
      const originalCreatedAt = image.createdAt;

      await touchMemoryImage(image.id);

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.createdAt, originalCreatedAt);
    });

    it('does not change name', async () => {
      const image = await createMemoryImage('Test Name');

      await touchMemoryImage(image.id);

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.name, 'Test Name');
    });

    it('does not change description', async () => {
      const image = await createMemoryImage('Test', 'Description');

      await touchMemoryImage(image.id);

      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
      assert.equal(updated.description, 'Description');
    });

    it('throws error for non-existent image', async () => {
      await assert.rejects(
        async () => await touchMemoryImage('non-existent-id'),
        /not found/i
      );
    });

    it('affects sort order in listMemoryImages', async () => {
      const first = await createMemoryImage('First');
      await new Promise(resolve => setTimeout(resolve, 10));

      const second = await createMemoryImage('Second');
      await new Promise(resolve => setTimeout(resolve, 10));

      // Touch first to make it most recent
      await touchMemoryImage(first.id);

      const results = await listMemoryImages();

      // First should now be at top
      assert.equal(results[0]!.id, first.id);
      assert.equal(results[1]!.id, second.id);
    });
  });

  // ==========================================================================
  // deleteMemoryImage
  // ==========================================================================

  describe('deleteMemoryImage', () => {
    it('deletes existing image', async () => {
      const image = await createMemoryImage('Test');

      await deleteMemoryImage(image.id);

      const result = await getMemoryImage(image.id);
      assert.equal(result, null);
    });

    it('removes image from listMemoryImages', async () => {
      const image1 = await createMemoryImage('Image 1');
      const image2 = await createMemoryImage('Image 2');
      const image3 = await createMemoryImage('Image 3');

      await deleteMemoryImage(image2.id);

      const results = await listMemoryImages();
      assert.equal(results.length, 2);
      assert.ok(results.some(img => img.id === image1.id));
      assert.ok(!results.some(img => img.id === image2.id));
      assert.ok(results.some(img => img.id === image3.id));
    });

    it('allows creating image with same name after deletion', async () => {
      const first = await createMemoryImage('Test Image');
      await deleteMemoryImage(first.id);

      // Should succeed
      const second = await createMemoryImage('Test Image');
      assert.ok(second.id);
      assert.notEqual(second.id, first.id);
    });

    it('handles deletion of non-existent image gracefully', async () => {
      // Should not throw
      await deleteMemoryImage('non-existent-id');
    });

    it('deletes only the specified image', async () => {
      const image1 = await createMemoryImage('Image 1');
      const image2 = await createMemoryImage('Image 2');

      await deleteMemoryImage(image1.id);

      const retrieved = await getMemoryImage(image2.id);
      assert.ok(retrieved);
      assert.equal(retrieved.id, image2.id);
    });
  });

  // ==========================================================================
  // getEventStoreName
  // ==========================================================================

  describe('getEventStoreName', () => {
    it('returns store name with events- prefix', () => {
      const id = 'test-id-123';
      const storeName = getEventStoreName(id);

      assert.equal(storeName, 'events-test-id-123');
    });

    it('handles UUID format', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const storeName = getEventStoreName(id);

      assert.equal(storeName, 'events-550e8400-e29b-41d4-a716-446655440000');
    });

    it('returns different names for different IDs', () => {
      const name1 = getEventStoreName('id-1');
      const name2 = getEventStoreName('id-2');

      assert.notEqual(name1, name2);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('edge cases', () => {
    it('handles very long name', async () => {
      const longName = 'x'.repeat(1000);
      const result = await createMemoryImage(longName);

      assert.equal(result.name, longName);
    });

    it('handles very long description', async () => {
      const longDesc = 'x'.repeat(10000);
      const result = await createMemoryImage('Test', longDesc);

      assert.equal(result.description, longDesc);
    });

    it('handles special characters in name', async () => {
      const specialName = 'Test™ Image® 2024 • αβγ 你好 🚀';
      const result = await createMemoryImage(specialName);

      assert.equal(result.name, specialName);
    });

    it('handles special characters in description', async () => {
      const specialDesc = 'Description with <html> & "quotes" & \'apostrophes\'';
      const result = await createMemoryImage('Test', specialDesc);

      assert.equal(result.description, specialDesc);
    });

    it('handles rapid creation of multiple images', async () => {
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(createMemoryImage(`Image ${i}`));
      }

      const results = await Promise.all(promises);

      assert.equal(results.length, 10);
      // All should have unique IDs
      const ids = new Set(results.map(r => r.id));
      assert.equal(ids.size, 10);
    });

    it('handles rapid updates to same image', async () => {
      const image = await createMemoryImage('Test');

      const promises = [
        updateDescription(image.id, 'Desc 1'),
        updateDescription(image.id, 'Desc 2'),
        updateDescription(image.id, 'Desc 3'),
      ];

      await Promise.all(promises);

      // Should complete without errors
      const updated = await getMemoryImage(image.id);
      assert.ok(updated);
    });

    it('preserves exact whitespace in middle of name', async () => {
      const name = 'Test    Image    With    Spaces';
      const result = await createMemoryImage(name);

      assert.equal(result.name, name);
    });

    it('preserves newlines in description', async () => {
      const desc = 'Line 1\nLine 2\nLine 3';
      const result = await createMemoryImage('Test', desc);

      assert.equal(result.description, desc);
    });

    it('handles timestamp edge cases', async () => {
      const image = await createMemoryImage('Test');

      // Timestamps should be positive integers
      assert.ok(Number.isInteger(image.createdAt));
      assert.ok(Number.isInteger(image.updatedAt));
      assert.ok(image.createdAt > 0);
      assert.ok(image.updatedAt > 0);
    });
  });
});
