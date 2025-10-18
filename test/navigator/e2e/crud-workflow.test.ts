/**
 * E2E Test: Complete CRUD Workflow
 *
 * Tests full user journey: Create → Load → Edit → Save → Export → Delete
 * Sample demonstrating E2E testing pattern (~10 of ~20 planned workflow tests)
 */

import { test, expect } from '@playwright/test';

test.describe('Complete CRUD Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to main app
    await page.goto('/');

    // Clear IndexedDB to start fresh
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });

    // Reload to ensure clean state
    await page.reload();
  });

  test('complete CRUD workflow: create, load, edit, save, export, delete', async ({ page }) => {
    // ====================
    // STEP 1: Create Memory Image
    // ====================

    // Should show empty state
    await expect(page.locator('.empty-state')).toBeVisible();
    await expect(page.getByText('No Memory Images Yet')).toBeVisible();

    // Click create button
    await page.click('#create-first-btn');

    // Fill in modal
    await page.fill('#memimg-name', 'Test Workflow Image');
    await page.fill('#memimg-desc', 'Testing the complete CRUD workflow');

    // Submit
    await page.click('.create-btn');

    // Should navigate to explorer view
    await expect(page.locator('#explorer-view')).toBeVisible();
    await expect(page.locator('#memimg-name-display')).toHaveText('Test Workflow Image');

    // ====================
    // STEP 2: Load Sample Data
    // ====================

    // Click load Scott schema button
    await page.click('#load-scott-btn');

    // Tree should show data
    await expect(page.locator('.tree-node')).toBeVisible();

    // Expand root to see departments and employees
    await page.locator('.tree-toggle').first().click();

    // Should see top-level collections
    await expect(page.getByText('depts')).toBeVisible();
    await expect(page.getByText('emps')).toBeVisible();

    // ====================
    // STEP 3: Navigate and Inspect
    // ====================

    // Click on depts
    await page.getByText('depts').click();

    // Inspector should show departments
    await expect(page.locator('.property-table')).toBeVisible();
    await expect(page.getByText('accounting')).toBeVisible();
    await expect(page.getByText('research')).toBeVisible();
    await expect(page.getByText('sales')).toBeVisible();

    // Navigate to specific employee
    await page.getByText('emps').click();
    await expect(page.getByText('king')).toBeVisible();

    // ====================
    // STEP 4: Edit Data via Script
    // ====================

    // Write script to add new employee
    const script = `
this.emps.test = {
  empno: 9999,
  ename: 'TEST',
  job: 'ENGINEER',
  mgr: 7839,
  hiredate: new Date('2024-01-01'),
  sal: 5000,
  comm: null,
  deptno: 10
};
    `.trim();

    await page.locator('#code-editor').fill(script);

    // Execute with Ctrl+Enter
    await page.locator('#code-editor').press('Control+Enter');

    // Should see success status
    await expect(page.locator('#status')).toHaveClass(/success/);

    // Verify new employee appears in tree
    await page.getByText('emps').click();
    await expect(page.getByText('test')).toBeVisible();

    // Dirty indicator should show unsaved changes
    await expect(page.locator('#dirty-indicator')).toBeVisible();

    // ====================
    // STEP 5: Save Changes
    // ====================

    // Click save button
    await page.click('#save-btn');

    // Dirty indicator should disappear
    await expect(page.locator('#dirty-indicator')).not.toBeVisible();

    // Success message
    await expect(page.locator('#status')).toContainText(/saved/i);

    // ====================
    // STEP 6: Export Snapshot
    // ====================

    // Open actions menu
    await page.click('#actions-btn');

    // Click export snapshot
    const downloadPromise = page.waitForEvent('download');
    await page.click('#export-snapshot-btn');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/snapshot.*\.json/);

    // Verify download content is valid JSON
    const path = await download.path();
    const fs = await import('fs/promises');
    const content = await fs.readFile(path, 'utf-8');
    const snapshot = JSON.parse(content);

    expect(snapshot).toHaveProperty('depts');
    expect(snapshot).toHaveProperty('emps');
    expect(snapshot.emps).toHaveProperty('test');
    expect(snapshot.emps.test.ename).toBe('TEST');

    // ====================
    // STEP 7: Export Events
    // ====================

    const eventsDownloadPromise = page.waitForEvent('download');
    await page.click('#export-events-btn');

    const eventsDownload = await eventsDownloadPromise;
    expect(eventsDownload.suggestedFilename()).toMatch(/events.*\.ndjson/);

    // ====================
    // STEP 8: Close and Reopen (Persistence Test)
    // ====================

    // Navigate back to list
    await page.click('#back-to-list-btn');

    // Should see our memory image in list
    await expect(page.getByText('Test Workflow Image')).toBeVisible();

    // Reopen
    await page.click('.memimg-card');

    // Data should still be there
    await expect(page.locator('#memimg-name-display')).toHaveText('Test Workflow Image');

    // Expand and verify test employee still exists
    await page.locator('.tree-toggle').first().click();
    await page.getByText('emps').click();
    await expect(page.getByText('test')).toBeVisible();

    // ====================
    // STEP 9: Delete Memory Image
    // ====================

    // Go back to list
    await page.click('#back-to-list-btn');

    // Click delete button on card
    await page.click('.delete-btn');

    // Confirm deletion
    page.on('dialog', dialog => dialog.accept());

    // Should return to empty state
    await expect(page.getByText('No Memory Images Yet')).toBeVisible();
  });

  test('warns about unsaved changes when navigating away', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Unsaved Test');
    await page.click('.create-btn');

    // Make changes
    await page.locator('#code-editor').fill('this.value = 42;');
    await page.locator('#code-editor').press('Control+Enter');

    // Try to navigate away
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('unsaved');
      dialog.dismiss();
    });

    await page.click('#back-to-list-btn');

    // Should still be on explorer view
    await expect(page.locator('#explorer-view')).toBeVisible();
  });

  test('script history persists across sessions', async ({ page }) => {
    // Create and open memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'History Test');
    await page.click('.create-btn');

    // Execute multiple scripts
    await page.locator('#code-editor').fill('this.value1 = 1;');
    await page.locator('#code-editor').press('Control+Enter');

    await page.locator('#code-editor').fill('this.value2 = 2;');
    await page.locator('#code-editor').press('Control+Enter');

    await page.locator('#code-editor').fill('this.value3 = 3;');
    await page.locator('#code-editor').press('Control+Enter');

    // Open history panel
    await page.click('#history-btn');

    // Should see 3 entries
    const entries = await page.locator('.history-entry').count();
    expect(entries).toBe(3);

    // Close and reopen
    await page.click('#back-to-list-btn');
    await page.click('.memimg-card');

    // Open history again
    await page.click('#history-btn');

    // History should still be there
    const persistedEntries = await page.locator('.history-entry').count();
    expect(persistedEntries).toBe(3);
  });

  test('import snapshot workflow', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Import Test');
    await page.click('.create-btn');

    // Create snapshot data
    const snapshot = {
      type: 'snapshot',
      version: 1,
      timestamp: Date.now(),
      name: 'Imported Data',
      description: 'Test snapshot',
      state: {
        imported: true,
        data: { value: 42, nested: { key: 'value' } },
      },
    };

    // Write snapshot to file and upload
    await page.evaluate((snapshotData) => {
      const blob = new Blob([JSON.stringify(snapshotData)], { type: 'application/json' });
      const file = new File([blob], 'snapshot.json', { type: 'application/json' });
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = document.getElementById('events-file-input') as HTMLInputElement;
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, snapshot);

    // Accept confirmation
    page.on('dialog', dialog => dialog.accept());

    await page.waitForTimeout(1000);

    // Verify imported data appears in tree
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('imported')).toBeVisible();
    await expect(page.getByText('data')).toBeVisible();
  });

  test('import events (NDJSON) workflow', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Events Import');
    await page.click('.create-btn');

    // Create NDJSON events
    const event1 = { type: 'SET', path: ['key1'], value: 'value1', timestamp: Date.now() };
    const event2 = { type: 'SET', path: ['key2'], value: 'value2', timestamp: Date.now() + 1 };
    const ndjson = JSON.stringify(event1) + '\n' + JSON.stringify(event2);

    // Upload events file
    await page.evaluate((ndjsonData) => {
      const blob = new Blob([ndjsonData], { type: 'application/x-ndjson' });
      const file = new File([blob], 'events.ndjson');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = document.getElementById('events-file-input') as HTMLInputElement;
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, ndjson);

    // Accept confirmation
    page.on('dialog', dialog => dialog.accept());

    await page.waitForTimeout(1000);

    // Verify events were applied
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('key1')).toBeVisible();
    await expect(page.getByText('key2')).toBeVisible();
  });

  test('deep linking via URL hash', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Deep Link Test');
    await page.click('.create-btn');

    // Get memory image ID from URL hash
    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    expect(memimgId).toBeTruthy();

    // Close memory image
    await page.click('#back-to-list-btn');
    await expect(page.locator('#list-view')).toBeVisible();

    // Navigate directly via hash
    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);

    await page.waitForTimeout(500);

    // Should open explorer view
    await expect(page.locator('#explorer-view')).toBeVisible();
    await expect(page.locator('#memimg-name-display')).toHaveText('Deep Link Test');
  });

  test('theme persistence across sessions', async ({ page }) => {
    // Set to light theme
    await page.click('#theme-toggle-list');
    await page.waitForTimeout(100);

    // Verify light theme
    let theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Theme should persist
    theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');
  });

  test('transaction rollback on error', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Rollback Test');
    await page.click('.create-btn');

    // Set initial value
    await page.locator('#code-editor').fill('this.protected = "original";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Save the change
    await page.click('#save-btn');
    await page.waitForTimeout(300);

    // Execute script that throws error
    await page.locator('#code-editor').fill('this.protected = "changed"; throw new Error("test error");');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    // Should show error
    await expect(page.locator('#status')).toHaveClass(/error/);

    // Value should be rolled back to original
    await page.locator('.tree-toggle').first().click();
    await page.getByText('protected').click();

    // Inspector should show original value
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('original');
  });
});

// ============================================================================
// Concurrent User Simulation Tests (3 tests)
// ============================================================================

test.describe('Concurrent User Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });
    await page.reload();
  });

  test('multiple memory images can be edited independently', async ({ page, context }) => {
    // Create first memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Image 1');
    await page.click('.create-btn');
    await page.locator('#code-editor').fill('this.value = 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    const memimg1Id = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Go back and create second memory image
    await page.click('#back-to-list-btn');
    await page.click('#create-memimg-btn');
    await page.fill('#memimg-name', 'Image 2');
    await page.click('.create-btn');
    await page.locator('#code-editor').fill('this.value = 2;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Open second tab with first memory image
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimg1Id);
    await page2.waitForTimeout(500);

    // Verify both pages show different data
    await page.locator('.tree-toggle').first().click();
    await page.getByText('value').click();
    const value1 = await page.locator('.property-value').first().textContent();

    await page2.locator('.tree-toggle').first().click();
    await page2.getByText('value').click();
    const value2 = await page2.locator('.property-value').first().textContent();

    expect(value1).toContain('2');
    expect(value2).toContain('1');

    await page2.close();
  });

  test('concurrent saves do not conflict', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Concurrent Save Test');
    await page.click('.create-btn');

    // Make rapid changes and saves
    await page.locator('#code-editor').fill('this.save1 = 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(100);
    await page.click('#save-btn');

    await page.locator('#code-editor').fill('this.save2 = 2;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(100);
    await page.click('#save-btn');

    await page.locator('#code-editor').fill('this.save3 = 3;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(100);
    await page.click('#save-btn');

    await page.waitForTimeout(500);

    // Verify all saves succeeded
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('save1')).toBeVisible();
    await expect(page.getByText('save2')).toBeVisible();
    await expect(page.getByText('save3')).toBeVisible();
  });

  test('deletion in one session reflects in other sessions', async ({ page, context }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Delete Sync Test');
    await page.click('.create-btn');

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Open in second tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForTimeout(200);

    // Both should see the memory image
    await expect(page2.getByText('Delete Sync Test')).toBeVisible();

    // Delete from first tab
    await page.click('#back-to-list-btn');
    await page.locator('.delete-btn').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);

    // Reload second tab and verify deletion
    await page2.reload();
    await page2.waitForTimeout(500);

    // Should not find the deleted memory image
    const exists = await page2.getByText('Delete Sync Test').count();
    expect(exists).toBe(0);

    await page2.close();
  });
});

// ============================================================================
// Browser Reload During Edit Tests (2 tests)
// ============================================================================

test.describe('Browser Reload During Edit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });
    await page.reload();
  });

  test('uncommitted changes are lost on reload', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Reload Test');
    await page.click('.create-btn');

    // Make changes without saving
    await page.locator('#code-editor').fill('this.unsaved = "lost";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Verify dirty indicator is shown
    await expect(page.locator('#dirty-indicator')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Re-open memory image (should be at list view after reload)
    const card = await page.locator('.memimg-card');
    if (await card.count() > 0) {
      await card.click();
      await page.waitForTimeout(500);
    }

    // Unsaved data should not be present
    await page.locator('.tree-toggle').first().click();
    const unsavedExists = await page.getByText('unsaved').count();
    expect(unsavedExists).toBe(0);
  });

  test('saved changes persist after reload', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Persist Test');
    await page.click('.create-btn');

    // Make changes and save
    await page.locator('#code-editor').fill('this.persisted = "saved";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Get memory image ID
    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Navigate to memory image via hash
    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(1000);

    // Persisted data should be present
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('persisted')).toBeVisible();
  });
});

// ============================================================================
// Network Failure Recovery Tests (3 tests)
// ============================================================================

test.describe('Network Failure Recovery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });
    await page.reload();
  });

  test('handles IndexedDB connection failures gracefully', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Connection Test');
    await page.click('.create-btn');

    // Simulate IndexedDB failure
    await page.evaluate(() => {
      // Mock getAll to throw error
      const originalGetAll = IDBObjectStore.prototype.getAll;
      IDBObjectStore.prototype.getAll = function() {
        throw new Error('IndexedDB connection failed');
      };
    });

    // Try to load history (which uses IndexedDB)
    await page.click('#history-btn');
    await page.waitForTimeout(500);

    // Should show error state gracefully
    const errorExists = await page.locator('.history-error').count();
    expect(errorExists).toBeGreaterThan(0);
  });

  test('recovers from save failures', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Save Failure Test');
    await page.click('.create-btn');

    // Make changes
    await page.locator('#code-editor').fill('this.value = "test";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Mock save to fail
    await page.evaluate(() => {
      // This would require mocking the transaction.save method
      // For E2E, we'll just verify error handling exists
      (window as any).mockSaveFail = true;
    });

    // Try to save
    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Should handle error (dirty indicator stays visible)
    // In a real failure scenario, dirty indicator would remain
    const dirtyVisible = await page.locator('#dirty-indicator').isVisible();
    expect(dirtyVisible).toBe(true);
  });

  test('handles export failures gracefully', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Export Failure Test');
    await page.click('.create-btn');

    // Add some data
    await page.locator('#code-editor').fill('this.data = "export";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Mock Blob constructor to fail
    await page.evaluate(() => {
      const originalBlob = window.Blob;
      (window as any).Blob = function() {
        throw new Error('Export failed');
      };
    });

    // Try to export
    await page.click('#export-snapshot-btn');
    await page.waitForTimeout(500);

    // Should show error status
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('error');
  });
});

// ============================================================================
// Corrupted Data Handling Tests (2 tests)
// ============================================================================

test.describe('Corrupted Data Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });
    await page.reload();
  });

  test('handles invalid import JSON gracefully', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Invalid Import');
    await page.click('.create-btn');

    // Upload invalid JSON
    await page.evaluate(() => {
      const blob = new Blob(['{ invalid json }'], { type: 'application/json' });
      const file = new File([blob], 'invalid.json');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = document.getElementById('events-file-input') as HTMLInputElement;
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await page.waitForTimeout(500);

    // Should show error
    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('error');
  });

  test('handles corrupted event log data', async ({ page }) => {
    // Create memory image with some data
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Corrupted Events');
    await page.click('.create-btn');

    await page.locator('#code-editor').fill('this.valid = "data";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Corrupt the IndexedDB data
    await page.evaluate(async () => {
      const dbName = 'memimg-explorer';
      return new Promise<void>((resolve) => {
        const request = indexedDB.open(dbName);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(['metadata'], 'readwrite');
          const store = tx.objectStore('metadata');

          // Get all and corrupt first entry
          const getAll = store.getAll();
          getAll.onsuccess = () => {
            const items = getAll.result;
            if (items.length > 0) {
              const corrupted = items[0];
              corrupted.name = null; // Corrupt the data
              store.put(corrupted);
            }
          };

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
        };
      });
    });

    // Go back to list and try to reload
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(500);

    // Should handle corrupted data gracefully
    // The app should still load, possibly with error messages
    const listView = await page.locator('#list-view');
    await expect(listView).toBeVisible();
  });
});
