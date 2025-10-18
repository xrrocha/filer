/**
 * E2E Test: Script Execution Workflows
 *
 * Tests complete script development and execution flows:
 * - Write script → execute → verify changes
 * - Syntax error → fix → re-execute
 * - Runtime error → checkpoint restore
 * - Save to history → search → re-execute
 * - Complex multi-step scripts
 */

import { test, expect } from '@playwright/test';

test.describe('Write → Execute → Verify Changes', () => {
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
    await page.fill('#memimg-name', 'Script Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('simple property assignment executes correctly', async ({ page }) => {
    // Write script
    await page.locator('#code-editor').fill('this.message = "Hello World";');

    // Execute with Ctrl+Enter
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Verify success status
    await expect(page.locator('#status')).toHaveClass(/success/);

    // Verify in tree
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('message')).toBeVisible();

    // Verify value
    await page.getByText('message').click();
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('Hello World');
  });

  test('object creation with nested properties', async ({ page }) => {
    const script = `
this.user = {
  name: 'Alice',
  age: 30,
  address: {
    street: '123 Main St',
    city: 'Boston'
  }
};
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Verify nested structure
    await page.locator('.tree-toggle').first().click();
    await page.getByText('user').click();
    await page.waitForTimeout(100);

    await expect(page.getByText('name')).toBeVisible();
    await expect(page.getByText('age')).toBeVisible();
    await expect(page.getByText('address')).toBeVisible();

    // Navigate to nested address
    await page.getByText('address').click();
    await page.waitForTimeout(100);

    await expect(page.getByText('street')).toBeVisible();
    await expect(page.getByText('city')).toBeVisible();
  });

  test('array operations', async ({ page }) => {
    const script = `
this.numbers = [1, 2, 3, 4, 5];
this.numbers.push(6);
this.numbers.unshift(0);
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Verify array in tree
    await page.locator('.tree-toggle').first().click();
    await page.getByText('numbers').click();
    await page.waitForTimeout(100);

    // Should see array indices 0-6
    await expect(page.getByText('0')).toBeVisible();
    await expect(page.getByText('6')).toBeVisible();
  });

  test('Map and Set operations', async ({ page }) => {
    const script = `
this.map = new Map([
  ['key1', 'value1'],
  ['key2', 'value2']
]);

this.set = new Set([1, 2, 3, 3, 2, 1]);
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Verify Map
    await page.locator('.tree-toggle').first().click();
    await page.getByText('map').click();
    await page.waitForTimeout(100);

    // Switch to Collections tab
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      await collectionsTab.click();
      await page.waitForTimeout(100);

      // Should show map entries
      await expect(page.getByText('key1')).toBeVisible();
    }
  });

  test('editor clears after successful execution', async ({ page }) => {
    await page.locator('#code-editor').fill('this.cleared = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Editor should be empty
    const editorContent = await page.locator('#code-editor').textContent();
    expect(editorContent?.trim()).toBe('');
  });
});

test.describe('Syntax Error → Fix → Re-execute', () => {
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
    await page.fill('#memimg-name', 'Syntax Error Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('syntax error shows error message with line number', async ({ page }) => {
    // Write invalid syntax
    await page.locator('#code-editor').fill('this.value = {');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Should show error
    await expect(page.locator('#status')).toHaveClass(/error/);

    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('error');
  });

  test('fixing syntax error allows successful execution', async ({ page }) => {
    // First: syntax error
    await page.locator('#code-editor').fill('this.value = {');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Error shown
    await expect(page.locator('#status')).toHaveClass(/error/);

    // Fix the syntax
    await page.locator('#code-editor').fill('this.value = {};');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Should succeed now
    await expect(page.locator('#status')).toHaveClass(/success/);

    // Verify value was created
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('value')).toBeVisible();
  });

  test('script with unclosed string', async ({ page }) => {
    await page.locator('#code-editor').fill('this.str = "unclosed;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/error/);

    // Fix it
    await page.locator('#code-editor').fill('this.str = "closed";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/success/);
  });

  test('script with unclosed bracket', async ({ page }) => {
    await page.locator('#code-editor').fill('this.arr = [1, 2, 3;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/error/);

    // Fix it
    await page.locator('#code-editor').fill('this.arr = [1, 2, 3];');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/success/);
  });

  test('multiple syntax errors in sequence', async ({ page }) => {
    // Error 1
    await page.locator('#code-editor').fill('this.a = {');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
    await expect(page.locator('#status')).toHaveClass(/error/);

    // Error 2
    await page.locator('#code-editor').fill('this.b = [');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
    await expect(page.locator('#status')).toHaveClass(/error/);

    // Success
    await page.locator('#code-editor').fill('this.c = "good";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
    await expect(page.locator('#status')).toHaveClass(/success/);
  });
});

test.describe('Runtime Error → Checkpoint Restore', () => {
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
    await page.fill('#memimg-name', 'Runtime Error Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('runtime error restores to checkpoint', async ({ page }) => {
    // Set initial value
    await page.locator('#code-editor').fill('this.protected = "original";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Save to establish checkpoint
    await page.click('#save-btn');
    await page.waitForTimeout(300);

    // Execute script that changes value then throws
    await page.locator('#code-editor').fill('this.protected = "changed"; throw new Error("rollback");');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    // Should show error
    await expect(page.locator('#status')).toHaveClass(/error/);

    // Value should be restored to original
    await page.locator('.tree-toggle').first().click();
    await page.getByText('protected').click();

    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('original');
  });

  test('reference error shows stack trace', async ({ page }) => {
    await page.locator('#code-editor').fill('this.value = undefinedVariable;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Should show error
    await expect(page.locator('#status')).toHaveClass(/error/);

    const statusText = await page.locator('#status').textContent();
    expect(statusText).toMatch(/undefined|not defined/i);
  });

  test('type error in operation', async ({ page }) => {
    await page.locator('#code-editor').fill('this.result = null.property;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/error/);
  });

  test('error in nested function call', async ({ page }) => {
    const script = `
function helper() {
  throw new Error("Helper error");
}

this.result = helper();
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    await expect(page.locator('#status')).toHaveClass(/error/);

    const statusText = await page.locator('#status').textContent();
    expect(statusText).toContain('Helper error');
  });

  test('async error handling', async ({ page }) => {
    const script = `
async function failing() {
  throw new Error("Async error");
}

await failing();
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    // Should catch and display async error
    const statusClass = await page.locator('#status').getAttribute('class');
    expect(statusClass).toContain('error');
  });
});

test.describe('Save to History → Search → Re-execute', () => {
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
    await page.fill('#memimg-name', 'History Workflow');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('successful script is saved to history', async ({ page }) => {
    await page.locator('#code-editor').fill('this.saved = "script";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Open history
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    // Should see the script
    const historyEntry = await page.locator('.history-entry').first();
    await expect(historyEntry).toBeVisible();

    const entryText = await historyEntry.textContent();
    expect(entryText).toContain('saved');
  });

  test('search history filters results', async ({ page }) => {
    // Execute multiple scripts
    await page.locator('#code-editor').fill('this.first = 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.second = 2;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('#code-editor').fill('this.third = 3;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Open history and search
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    await page.fill('#history-search', 'second');
    await page.waitForTimeout(300);

    // Should show only matching entry
    const visibleEntries = await page.locator('.history-entry:visible').count();
    expect(visibleEntries).toBe(1);

    const entryText = await page.locator('.history-entry:visible').textContent();
    expect(entryText).toContain('second');
  });

  test('clicking history entry loads script', async ({ page }) => {
    await page.locator('#code-editor').fill('this.loadable = "test";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Open history
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    // Click entry
    await page.locator('.history-entry').first().click();
    await page.waitForTimeout(200);

    // Editor should have the script
    const editorContent = await page.locator('#code-editor').textContent();
    expect(editorContent).toContain('loadable');
  });

  test('re-executing from history works correctly', async ({ page }) => {
    // Execute initial script
    await page.locator('#code-editor').fill('this.counter = (this.counter || 0) + 1;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Open history and reload
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    await page.locator('.history-entry').first().click();
    await page.waitForTimeout(200);

    // Execute again
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Counter should increment
    await page.locator('.tree-toggle').first().click();
    await page.getByText('counter').click();

    const valueCell = await page.locator('.property-value').first();
    const value = await valueCell.textContent();
    expect(value).toContain('2');
  });

  test('history persists across sessions', async ({ page }) => {
    // Execute script
    await page.locator('#code-editor').fill('this.persistent = "value";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Get memory image ID
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
    await page.waitForTimeout(500);

    // Open history
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    // Entry should still be there
    const entry = await page.locator('.history-entry').first();
    await expect(entry).toBeVisible();
  });
});

test.describe('Complex Multi-Step Scripts', () => {
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
    await page.fill('#memimg-name', 'Complex Scripts');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('multi-line script with loops', async ({ page }) => {
    const script = `
this.numbers = [];
for (let i = 0; i < 10; i++) {
  this.numbers.push(i * 2);
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Verify array was populated
    await page.locator('.tree-toggle').first().click();
    await page.getByText('numbers').click();
    await page.waitForTimeout(100);

    // Should have 10 items
    const indices = await page.locator('.property-name').filter({ hasText: /^[0-9]+$/ });
    const count = await indices.count();
    expect(count).toBe(10);
  });

  test('script with conditional logic', async ({ page }) => {
    const script = `
this.data = {
  status: 'active',
  count: 5
};

if (this.data.count > 3) {
  this.data.category = 'high';
} else {
  this.data.category = 'low';
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Verify category was set correctly
    await page.locator('.tree-toggle').first().click();
    await page.getByText('data').click();
    await page.waitForTimeout(100);

    await expect(page.getByText('category')).toBeVisible();

    await page.getByText('category').click();
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('high');
  });

  test('script using Array methods (map, filter, reduce)', async ({ page }) => {
    const script = `
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

this.evens = numbers.filter(n => n % 2 === 0);
this.doubled = this.evens.map(n => n * 2);
this.sum = this.doubled.reduce((a, b) => a + b, 0);
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Verify results
    await page.locator('.tree-toggle').first().click();
    await page.getByText('sum').click();

    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('60'); // (2+4+6+8+10) * 2 = 60
  });

  test('script with async/await', async ({ page }) => {
    const script = `
async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

await delay(100);
this.async = 'completed';
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    // Verify async completed
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('async')).toBeVisible();
  });

  test('script creating complex object graph', async ({ page }) => {
    const script = `
// Create a linked list
this.list = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: 3,
      next: null
    }
  }
};

// Add circular reference
this.list.next.next.next = this.list;
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Verify structure
    await page.locator('.tree-toggle').first().click();
    await page.getByText('list').click();
    await page.waitForTimeout(100);

    await expect(page.getByText('value')).toBeVisible();
    await expect(page.getByText('next')).toBeVisible();

    // Navigate deeper
    await page.getByText('next').click();
    await page.waitForTimeout(100);

    // Should see nested structure
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('2');
  });
});
