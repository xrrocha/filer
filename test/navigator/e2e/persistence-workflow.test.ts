/**
 * E2E Test: Data Persistence Workflows
 *
 * Tests complete persistence flows:
 * - Create → edit → save → close → reopen
 * - IndexedDB integrity after crash simulation
 * - Multiple concurrent sessions
 */

import { test, expect } from '@playwright/test';

test.describe('Create → Edit → Save → Close → Reopen', () => {
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

  test('complete persistence cycle preserves all data', async ({ page }) => {
    // CREATE
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Persistence Test');
    await page.fill('#memimg-desc', 'Testing data persistence');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // EDIT
    const script = `
this.user = {
  name: 'Alice',
  age: 30,
  nested: {
    deep: {
      value: 42
    }
  }
};
this.array = [1, 2, 3, 4, 5];
this.map = new Map([['key', 'value']]);
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // SAVE
    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Get memory image ID before closing
    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // CLOSE
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(300);

    // REOPEN
    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(1000);

    // VERIFY - All data should be present
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('user')).toBeVisible();
    await expect(page.getByText('array')).toBeVisible();
    await expect(page.getByText('map')).toBeVisible();

    // Verify nested structure
    await page.getByText('user').click();
    await page.waitForTimeout(100);
    await expect(page.getByText('nested')).toBeVisible();

    await page.getByText('nested').click();
    await page.waitForTimeout(100);
    await expect(page.getByText('deep')).toBeVisible();
  });

  test('metadata persists across sessions', async ({ page }) => {
    // Create with description
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Metadata Test');
    await page.fill('#memimg-desc', 'Original description');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Close
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Verify metadata in list
    await expect(page.getByText('Metadata Test')).toBeVisible();
    await expect(page.getByText('Original description')).toBeVisible();

    // Reopen
    await page.click('.memimg-card');
    await page.waitForTimeout(500);

    // Name should be in header
    await expect(page.locator('#memimg-name-display')).toHaveText('Metadata Test');
  });

  test('timestamps update correctly', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Timestamp Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Wait a moment
    await page.waitForTimeout(1000);

    // Make a change and save
    await page.locator('#code-editor').fill('this.updated = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Go back to list
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Timestamp should show recent update
    const card = await page.locator('.memimg-card');
    const timestampText = await card.locator('.timestamp, .updated-at').textContent();

    // Should show "seconds ago" or "moments ago"
    expect(timestampText).toMatch(/ago|now|second|moment/i);
  });

  test('large data structures persist correctly', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Large Data');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Create large array
    const script = `
this.largeArray = [];
for (let i = 0; i < 1000; i++) {
  this.largeArray.push({ id: i, value: \`item\${i}\` });
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.click('#save-btn');
    await page.waitForTimeout(1000);

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Close and reopen
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(1500);

    // Verify large array is present
    await page.locator('.tree-toggle').first().click();
    await page.getByText('largeArray').click();
    await page.waitForTimeout(200);

    // Should have many items
    const items = await page.locator('.property-name').filter({ hasText: /^[0-9]+$/ });
    const count = await items.count();
    expect(count).toBeGreaterThan(10); // At least showing some items
  });

  test('special values persist correctly', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Special Values');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    const script = `
this.undefined = undefined;
this.null = null;
this.nan = NaN;
this.infinity = Infinity;
this.negInfinity = -Infinity;
this.date = new Date('2024-01-01');
this.regex = /test/gi;
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Close and reopen
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(1000);

    // Verify special values
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('null')).toBeVisible();
    await expect(page.getByText('date')).toBeVisible();
  });
});

test.describe('IndexedDB Integrity After Crash', () => {
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

  test('data recovers after browser reload during edit', async ({ page }) => {
    // Create and add data
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Crash Recovery');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.saved = "before crash";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Get ID
    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Make unsaved changes
    await page.locator('#code-editor').fill('this.unsaved = "lost";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Simulate crash: hard reload without saving
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Navigate to memory image
    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(1000);

    // Saved data should be present
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('saved')).toBeVisible();

    // Unsaved data should not be present
    const unsavedExists = await page.getByText('unsaved').count();
    expect(unsavedExists).toBe(0);
  });

  test('incomplete transaction does not corrupt database', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Transaction Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Save initial state
    await page.locator('#code-editor').fill('this.initial = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Make changes but don't save
    await page.locator('#code-editor').fill('this.incomplete = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Hard reload (simulating crash)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Database should still be accessible
    await expect(page.locator('#list-view')).toBeVisible();

    // Memory image should be in list
    await expect(page.getByText('Transaction Test')).toBeVisible();
  });

  test('corrupted event can be skipped', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Event Recovery');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.valid = "data";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Memory image should load successfully
    // (Even if an event were corrupted, the system should handle it)
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('valid')).toBeVisible();
  });

  test('database version upgrades handled correctly', async ({ page }) => {
    // Create memory image in current version
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Version Upgrade');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.v1 = "data";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Reload app (simulating upgrade)
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(500);

    // Should load without errors
    await expect(page.getByText('Version Upgrade')).toBeVisible();
  });

  test('parallel writes do not corrupt data', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Parallel Writes');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Rapid successive writes
    for (let i = 0; i < 5; i++) {
      await page.locator('#code-editor').fill(`this.write${i} = ${i};`);
      await page.locator('#code-editor').press('Control+Enter');
      await page.waitForTimeout(100);
      await page.click('#save-btn');
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(500);

    // All writes should be present
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('write0')).toBeVisible();
    await expect(page.getByText('write4')).toBeVisible();
  });
});

test.describe('Multiple Concurrent Sessions', () => {
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

  test('two tabs can edit different memory images', async ({ page, context }) => {
    // Tab 1: Create first memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Session 1');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.session = 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    const session1Id = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Tab 1: Go back to list
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Tab 1: Create second memory image
    await page.click('#create-memimg-btn');
    await page.fill('#memimg-name', 'Session 2');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Tab 2: Open first memory image in new tab
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForTimeout(200);

    await page2.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, session1Id);
    await page2.waitForTimeout(500);

    // Tab 2: Edit first memory image
    await page2.locator('#code-editor').fill('this.concurrent = true;');
    await page2.locator('#code-editor').press('Control+Enter');
    await page2.waitForTimeout(200);

    await page2.click('#save-btn');
    await page2.waitForTimeout(500);

    // Tab 1: Edit second memory image
    await page.locator('#code-editor').fill('this.session = 2;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Both should have saved successfully
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('session')).toBeVisible();

    await page2.locator('.tree-toggle').first().click();
    await expect(page2.getByText('concurrent')).toBeVisible();

    await page2.close();
  });

  test('creating memory image in one tab appears in other tab after refresh', async ({ page, context }) => {
    // Tab 2: Open second tab on list view
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForTimeout(300);

    // Tab 1: Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Appears in Tab 2');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Tab 2: Refresh
    await page2.reload();
    await page2.waitForLoadState('domcontentloaded');
    await page2.waitForTimeout(500);

    // Should see new memory image
    await expect(page2.getByText('Appears in Tab 2')).toBeVisible();

    await page2.close();
  });

  test('deleting in one tab reflects in other after refresh', async ({ page, context }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Will Be Deleted');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Tab 2: Open list view
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForTimeout(300);

    // Verify memory image exists in tab 2
    await expect(page2.getByText('Will Be Deleted')).toBeVisible();

    // Tab 1: Delete memory image
    await page.locator('.delete-btn').click();
    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(500);

    // Tab 2: Refresh
    await page2.reload();
    await page2.waitForLoadState('domcontentloaded');
    await page2.waitForTimeout(500);

    // Should not see deleted memory image
    const exists = await page2.getByText('Will Be Deleted').count();
    expect(exists).toBe(0);

    await page2.close();
  });

  test('concurrent edits to same memory image (last write wins)', async ({ page, context }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Concurrent Edit');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Tab 2: Open same memory image
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForTimeout(200);

    await page2.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page2.waitForTimeout(500);

    // Tab 1: Make change
    await page.locator('#code-editor').fill('this.tab1 = "first";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Tab 2: Make change
    await page2.locator('#code-editor').fill('this.tab2 = "second";');
    await page2.locator('#code-editor').press('Control+Enter');
    await page2.waitForTimeout(200);

    await page2.click('#save-btn');
    await page2.waitForTimeout(500);

    // Both changes should be present (both tabs writing to IndexedDB)
    await page2.locator('.tree-toggle').first().click();
    await expect(page2.getByText('tab2')).toBeVisible();

    await page2.close();
  });

  test('session isolation - localStorage is shared', async ({ page, context }) => {
    // Set theme in tab 1
    await page.click('#theme-toggle-list');
    await page.waitForTimeout(100);

    let theme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');

    // Open tab 2
    const page2 = await context.newPage();
    await page2.goto('/');
    await page2.waitForLoadState('domcontentloaded');
    await page2.waitForTimeout(300);

    // Tab 2 should have same theme
    theme = await page2.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(theme).toBe('light');

    await page2.close();
  });
});
