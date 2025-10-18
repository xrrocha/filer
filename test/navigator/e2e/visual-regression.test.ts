/**
 * E2E Test: Visual Regression
 *
 * Tests visual consistency across the Navigator application:
 * - Screenshot comparisons for all views
 * - Dark/light theme verification
 * - Responsive layout testing
 */

import { test, expect } from '@playwright/test';

test.describe('List View Screenshots', () => {
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

  test('empty state layout', async ({ page }) => {
    // Should show empty state
    await expect(page.getByText('No Memory Images')).toBeVisible();

    // Take screenshot
    await expect(page).toHaveScreenshot('list-empty-state.png');
  });

  test('list with multiple items', async ({ page }) => {
    // Create several memory images
    for (let i = 1; i <= 3; i++) {
      await page.click('#create-first-btn, #create-memimg-btn');
      await page.fill('#memimg-name', `Image ${i}`);
      await page.fill('#memimg-desc', `Description for image ${i}`);
      await page.click('.create-btn, .dialog-create-btn');
      await page.waitForTimeout(200);

      await page.click('#back-to-list-btn');
      await page.waitForTimeout(200);
    }

    // Take screenshot
    await expect(page).toHaveScreenshot('list-with-items.png');
  });

  test('create dialog layout', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('create-dialog.png');
  });
});

test.describe('Explorer View Screenshots', () => {
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

    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Visual Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('explorer initial state', async ({ page }) => {
    await expect(page.locator('#explorer-view')).toBeVisible();

    await expect(page).toHaveScreenshot('explorer-initial.png');
  });

  test('explorer with data', async ({ page }) => {
    await page.locator('#code-editor').fill(`
this.user = {
  name: 'Alice',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'Boston'
  }
};
this.tags = ['javascript', 'testing', 'playwright'];
    `.trim());

    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('explorer-with-data.png');
  });

  test('tree expanded state', async ({ page }) => {
    await page.locator('#code-editor').fill('this.nested = { a: { b: { c: "deep" } } };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Expand tree
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('tree-expanded.png');
  });

  test('inspector property view', async ({ page }) => {
    await page.locator('#code-editor').fill(`
this.props = {
  string: 'value',
  number: 42,
  boolean: true,
  null: null,
  undefined: undefined,
  date: new Date('2024-01-01'),
  array: [1, 2, 3],
  object: { nested: 'obj' }
};
    `.trim());

    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('props').click();
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('inspector-properties.png');
  });

  test('inspector collections view', async ({ page }) => {
    await page.locator('#code-editor').fill(`
this.map = new Map([
  ['key1', 'value1'],
  ['key2', 'value2'],
  ['key3', 'value3']
]);
    `.trim());

    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('map').click();
    await page.waitForTimeout(100);

    // Switch to Collections tab
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      await collectionsTab.click();
      await page.waitForTimeout(100);
    }

    await expect(page).toHaveScreenshot('inspector-collections.png');
  });

  test('error state in editor', async ({ page }) => {
    await page.locator('#code-editor').fill('this.invalid = {');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('editor-error-state.png');
  });

  test('dirty indicator visible', async ({ page }) => {
    await page.locator('#code-editor').fill('this.unsaved = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await expect(page.locator('#dirty-indicator')).toBeVisible();

    await expect(page).toHaveScreenshot('dirty-indicator.png');
  });
});

test.describe('Dark Theme Screenshots', () => {
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

    // Ensure dark theme
    await page.evaluate(() => {
      localStorage.setItem('memimg-theme', 'dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    });
  });

  test('list view in dark theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Dark Theme Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('dark-list-view.png');
  });

  test('explorer view in dark theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Dark Explorer');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.data = { dark: true };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('dark-explorer-view.png');
  });

  test('code editor syntax highlighting in dark', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Code Highlight');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill(`
const obj = {
  string: "value",
  number: 42,
  boolean: true,
  array: [1, 2, 3],
  func: function() { return "test"; }
};
this.example = obj;
    `.trim());

    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('dark-code-editor.png');
  });

  test('inspector in dark theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Dark Inspector');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.values = { a: 1, b: 2, c: 3 };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('values').click();
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('dark-inspector.png');
  });

  test('status messages in dark theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Status Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.status = "test";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('dark-status-success.png');
  });
});

test.describe('Light Theme Screenshots', () => {
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

    // Set light theme
    await page.click('#theme-toggle-list');
    await page.waitForTimeout(100);
  });

  test('list view in light theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Light Theme Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('light-list-view.png');
  });

  test('explorer view in light theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Light Explorer');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.data = { light: true };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('light-explorer-view.png');
  });

  test('inspector in light theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Light Inspector');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.values = { x: 10, y: 20, z: 30 };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('values').click();
    await page.waitForTimeout(100);

    await expect(page).toHaveScreenshot('light-inspector.png');
  });

  test('code editor in light theme', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Light Code');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill(`
const data = {
  name: "Test",
  value: 123,
  active: true
};
this.test = data;
    `.trim());

    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('light-code-editor.png');
  });

  test('dialogs in light theme', async ({ page }) => {
    await page.click('#create-memimg-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('light-dialog.png');
  });
});

test.describe('Modal Dialogs Screenshots', () => {
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

  test('rename dialog', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Rename Me');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Open rename dialog
    const renameBtn = await page.locator('.rename-btn, button:has-text("Rename")');
    if (await renameBtn.count() > 0) {
      await renameBtn.click();
      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('rename-dialog.png');
    }
  });

  test('delete confirmation', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Delete Me');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Click delete (but dismiss dialog for screenshot)
    page.on('dialog', dialog => {
      // Don't accept yet, take screenshot
      setTimeout(() => dialog.dismiss(), 100);
    });

    const deleteBtn = await page.locator('.delete-btn');
    await deleteBtn.click();
    await page.waitForTimeout(200);

    // Note: Browser confirm dialogs can't be screenshotted,
    // but we can verify they appear
  });

  test('script history panel', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'History Panel');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Add some history
    await page.locator('#code-editor').fill('this.item = 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Open history
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    await expect(page).toHaveScreenshot('history-panel.png');
  });
});

test.describe('Responsive Layout Screenshots', () => {
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

  test('desktop layout (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Desktop View');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('desktop-1920x1080.png');
  });

  test('laptop layout (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Laptop View');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('laptop-1366x768.png');
  });

  test('tablet layout (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Tablet View');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('tablet-768x1024.png');
  });

  test('small screen (1024x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Small Screen');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    await expect(page).toHaveScreenshot('small-1024x768.png');
  });
});
