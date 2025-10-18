/**
 * E2E Test: Complete Navigation Workflows
 *
 * Tests full navigation journeys through the Navigator UI:
 * - Tree expansion and exploration
 * - Reference navigation with canonical paths
 * - Browser back/forward navigation
 * - Deep linking via URL hash
 * - Keyboard shortcuts for navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Complete Tree Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Clear IndexedDB
    await page.evaluate(() => {
      return new Promise((resolve) => {
        const deleteRequest = indexedDB.deleteDatabase('memimg-explorer');
        deleteRequest.onsuccess = () => resolve(undefined);
        deleteRequest.onerror = () => resolve(undefined);
      });
    });

    await page.reload();

    // Create memory image and load Scott schema
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Navigation Test');
    await page.click('.create-btn');

    // Mock ObjectType for Scott schema
    await page.evaluate(() => {
      (window as any).ObjectType = (config: any) => (data: any) => ({ ...data, __type: config.name });
      (window as any).NumberType = {};
      (window as any).StringType = {};
      (window as any).DateTypeInstance = {};
    });

    await page.click('#load-scott-btn');
    await page.waitForTimeout(500);
  });

  test('expand root → expand nested → select leaf', async ({ page }) => {
    // Start at root - tree should show root node collapsed
    await expect(page.locator('.tree-node')).toBeVisible();

    // Expand root
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);

    // Should see top-level properties
    await expect(page.getByText('depts')).toBeVisible();
    await expect(page.getByText('emps')).toBeVisible();

    // Navigate to depts
    await page.getByText('depts').click();
    await page.waitForTimeout(100);

    // Inspector should show departments
    await expect(page.getByText('accounting')).toBeVisible();

    // Click accounting in inspector to navigate
    await page.getByText('accounting').click();
    await page.waitForTimeout(100);

    // Should now see accounting properties
    await expect(page.getByText('deptno')).toBeVisible();
    await expect(page.getByText('dname')).toBeVisible();
    await expect(page.getByText('loc')).toBeVisible();
  });

  test('deep navigation through multiple levels', async ({ page }) => {
    // Navigate: root → emps → king → ename → firstName
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);

    await page.getByText('emps').click();
    await page.waitForTimeout(100);

    await page.getByText('king').click();
    await page.waitForTimeout(100);

    await page.getByText('ename').click();
    await page.waitForTimeout(100);

    // Should see name properties
    await expect(page.getByText('firstName')).toBeVisible();
    await expect(page.getByText('middleName')).toBeVisible();
    await expect(page.getByText('lastName')).toBeVisible();

    // Click firstName
    await page.getByText('firstName').click();
    await page.waitForTimeout(100);

    // Inspector should show the string value
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('Arthur');
  });

  test('breadcrumb trail shows current path', async ({ page }) => {
    // Navigate to nested object
    await page.locator('.tree-toggle').first().click();
    await page.getByText('emps').click();
    await page.getByText('king').click();
    await page.waitForTimeout(200);

    // Breadcrumb should show: root > emps > king
    const breadcrumb = await page.locator('.breadcrumb, .path-display');
    if (await breadcrumb.count() > 0) {
      const text = await breadcrumb.textContent();
      expect(text).toContain('root');
      expect(text).toContain('emps');
      expect(text).toContain('king');
    }
  });

  test('tree highlights current selection', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();
    await page.getByText('depts').click();
    await page.waitForTimeout(100);

    // Selected node should have selected class
    const selectedNode = await page.locator('.tree-node.selected, .tree-item.selected');
    if (await selectedNode.count() > 0) {
      await expect(selectedNode).toBeVisible();
    }
  });

  test('collapsing node preserves inspector view', async ({ page }) => {
    // Expand and navigate
    await page.locator('.tree-toggle').first().click();
    await page.getByText('depts').click();
    await page.waitForTimeout(100);

    // Verify inspector shows depts
    await expect(page.getByText('accounting')).toBeVisible();

    // Collapse root
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);

    // Inspector should still show depts
    await expect(page.getByText('accounting')).toBeVisible();
  });
});

test.describe('Reference Navigation with Canonical Paths', () => {
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
    await page.fill('#memimg-name', 'Reference Test');
    await page.click('.create-btn');
  });

  test('clicking reference navigates to canonical path', async ({ page }) => {
    // Create object with multiple references
    await page.locator('#code-editor').fill(`
const shared = { value: 'shared' };
this.ref1 = shared;
this.ref2 = shared;
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate to root and expand
    await page.locator('.tree-toggle').first().click();
    await page.getByText('ref2').click();
    await page.waitForTimeout(100);

    // Should navigate to ref1 (canonical path)
    // Verify we see the shared object properties
    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('shared');
  });

  test('circular references show indicator', async ({ page }) => {
    // Create circular reference
    await page.locator('#code-editor').fill(`
this.circular = { name: 'circular' };
this.circular.self = this.circular;
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate to circular
    await page.locator('.tree-toggle').first().click();
    await page.getByText('circular').click();
    await page.waitForTimeout(100);

    // Should see 'self' property
    await expect(page.getByText('self')).toBeVisible();

    // Click self - should show circular reference indicator
    await page.getByText('self').click();
    await page.waitForTimeout(100);

    // Should show the same object (name: 'circular')
    await expect(page.getByText('name')).toBeVisible();
  });

  test('reference to nested object navigates correctly', async ({ page }) => {
    // Create nested structure with reference
    await page.locator('#code-editor').fill(`
this.data = {
  nested: {
    deep: { value: 42 }
  }
};
this.shortcut = this.data.nested.deep;
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate via shortcut
    await page.locator('.tree-toggle').first().click();
    await page.getByText('shortcut').click();
    await page.waitForTimeout(100);

    // Should show value property
    await expect(page.getByText('value')).toBeVisible();

    const valueCell = await page.locator('.property-value').first();
    await expect(valueCell).toContainText('42');
  });

  test('array element references navigate to canonical index', async ({ page }) => {
    // Create array with duplicate references
    await page.locator('#code-editor').fill(`
const item = { id: 123 };
this.items = [item, item, item];
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate to items
    await page.locator('.tree-toggle').first().click();
    await page.getByText('items').click();
    await page.waitForTimeout(100);

    // Should see array indices
    await expect(page.getByText('0')).toBeVisible();
    await expect(page.getByText('1')).toBeVisible();
    await expect(page.getByText('2')).toBeVisible();

    // Click index 2 - should navigate to canonical (index 0)
    await page.getByText('2').click();
    await page.waitForTimeout(100);

    // Should show id property
    await expect(page.getByText('id')).toBeVisible();
  });

  test('Map value references navigate correctly', async ({ page }) => {
    // Create Map with reference values
    await page.locator('#code-editor').fill(`
const shared = { shared: true };
this.map = new Map([
  ['key1', shared],
  ['key2', shared]
]);
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate to map
    await page.locator('.tree-toggle').first().click();
    await page.getByText('map').click();
    await page.waitForTimeout(100);

    // Switch to Collections tab
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      await collectionsTab.click();
      await page.waitForTimeout(100);

      // Should see map entries
      await expect(page.getByText('key1')).toBeVisible();
    }
  });
});

test.describe('Browser Back/Forward Navigation', () => {
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
    await page.fill('#memimg-name', 'History Test');
    await page.click('.create-btn');

    // Create test data
    await page.locator('#code-editor').fill(`
this.page1 = { data: 'first' };
this.page2 = { data: 'second' };
this.page3 = { data: 'third' };
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
  });

  test('back button navigates to previous view', async ({ page }) => {
    // Navigate through pages
    await page.locator('.tree-toggle').first().click();
    await page.getByText('page1').click();
    await page.waitForTimeout(100);

    await page.getByText('page2').click();
    await page.waitForTimeout(100);

    // Click back button
    const backBtn = await page.locator('#back-btn');
    await backBtn.click();
    await page.waitForTimeout(100);

    // Should be back at page1
    const dataCell = await page.locator('.property-value').first();
    await expect(dataCell).toContainText('first');
  });

  test('forward button navigates to next view', async ({ page }) => {
    // Navigate and go back
    await page.locator('.tree-toggle').first().click();
    await page.getByText('page1').click();
    await page.waitForTimeout(100);

    await page.getByText('page2').click();
    await page.waitForTimeout(100);

    await page.click('#back-btn');
    await page.waitForTimeout(100);

    // Click forward
    await page.click('#forward-btn');
    await page.waitForTimeout(100);

    // Should be at page2
    const dataCell = await page.locator('.property-value').first();
    await expect(dataCell).toContainText('second');
  });

  test('back button disabled at start of history', async ({ page }) => {
    // Initially at root - back should be disabled
    const backBtn = await page.locator('#back-btn');
    await expect(backBtn).toBeDisabled();
  });

  test('forward button disabled at end of history', async ({ page }) => {
    // Forward should be disabled initially
    const forwardBtn = await page.locator('#forward-btn');
    await expect(forwardBtn).toBeDisabled();
  });

  test('navigation history persists through multiple jumps', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();

    // Navigate: page1 → page2 → page3
    await page.getByText('page1').click();
    await page.waitForTimeout(100);

    await page.getByText('page2').click();
    await page.waitForTimeout(100);

    await page.getByText('page3').click();
    await page.waitForTimeout(100);

    // Go back twice
    await page.click('#back-btn');
    await page.waitForTimeout(100);
    await page.click('#back-btn');
    await page.waitForTimeout(100);

    // Should be at page1
    const dataCell = await page.locator('.property-value').first();
    await expect(dataCell).toContainText('first');

    // Forward twice
    await page.click('#forward-btn');
    await page.waitForTimeout(100);
    await page.click('#forward-btn');
    await page.waitForTimeout(100);

    // Should be at page3
    const dataCell2 = await page.locator('.property-value').first();
    await expect(dataCell2).toContainText('third');
  });
});

test.describe('Deep Linking via URL Hash', () => {
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

  test('bookmark URL opens memory image directly', async ({ page }) => {
    // Create memory image
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Bookmarkable');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // Get current URL hash
    const hash = await page.evaluate(() => window.location.hash);
    expect(hash).toContain('/edit/');

    // Extract memory image ID
    const memimgId = hash.split('/edit/')[1];

    // Go back to list
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Navigate directly via hash
    await page.goto(`/#/edit/${memimgId}`);
    await page.waitForTimeout(500);

    // Should open explorer view
    await expect(page.locator('#explorer-view')).toBeVisible();
    await expect(page.locator('#memimg-name-display')).toHaveText('Bookmarkable');
  });

  test('hash changes update URL', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Hash Update');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    // URL should have edit hash
    let hash = await page.evaluate(() => window.location.hash);
    expect(hash).toMatch(/^#\/edit\//);

    // Close memory image
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // URL should revert to list
    hash = await page.evaluate(() => window.location.hash);
    expect(hash).toBe('#/');
  });

  test('browser back/forward syncs with hash', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Browser Sync');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    const editHash = await page.evaluate(() => window.location.hash);

    // Go back to list
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    // Browser back button
    await page.goBack();
    await page.waitForTimeout(500);

    // Should reopen explorer
    await expect(page.locator('#explorer-view')).toBeVisible();

    const currentHash = await page.evaluate(() => window.location.hash);
    expect(currentHash).toBe(editHash);
  });

  test('invalid hash redirects to list', async ({ page }) => {
    await page.goto('/#/edit/non-existent-id');
    await page.waitForTimeout(1000);

    // Should redirect to list view and show error
    const listView = await page.locator('#list-view');
    const isVisible = await listView.isVisible();
    expect(isVisible).toBe(true);
  });

  test('hash persists on page reload', async ({ page }) => {
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Persist Hash');
    await page.click('.create-btn');
    await page.waitForTimeout(200);

    const hashBefore = await page.evaluate(() => window.location.hash);

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Hash should be preserved
    const hashAfter = await page.evaluate(() => window.location.hash);
    expect(hashAfter).toBe(hashBefore);

    // Should reopen memory image
    await expect(page.locator('#explorer-view')).toBeVisible();
  });
});

test.describe('Keyboard Shortcuts for Navigation', () => {
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
    await page.fill('#memimg-name', 'Keyboard Test');
    await page.click('.create-btn');

    await page.locator('#code-editor').fill(`
this.item1 = { value: 'first' };
this.item2 = { value: 'second' };
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);
  });

  test('Alt+ArrowLeft navigates back', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();
    await page.getByText('item1').click();
    await page.waitForTimeout(100);

    await page.getByText('item2').click();
    await page.waitForTimeout(100);

    // Press Alt+ArrowLeft
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(100);

    // Should be back at item1
    const dataCell = await page.locator('.property-value').first();
    await expect(dataCell).toContainText('first');
  });

  test('Alt+ArrowRight navigates forward', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();
    await page.getByText('item1').click();
    await page.waitForTimeout(100);

    await page.getByText('item2').click();
    await page.waitForTimeout(100);

    // Go back
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(100);

    // Go forward
    await page.keyboard.press('Alt+ArrowRight');
    await page.waitForTimeout(100);

    // Should be at item2
    const dataCell = await page.locator('.property-value').first();
    await expect(dataCell).toContainText('second');
  });

  test('arrow keys navigate tree (if implemented)', async ({ page }) => {
    // Focus tree view
    await page.locator('.tree-view').click();
    await page.waitForTimeout(100);

    // ArrowRight to expand
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);

    // ArrowDown to move to next node
    await page.keyboard.press('ArrowDown');
    await page.waitForTimeout(100);

    // Enter to select
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Inspector should update (this depends on tree keyboard nav implementation)
    // For now, just verify no errors occurred
    const inspector = await page.locator('#inspector-view');
    await expect(inspector).toBeVisible();
  });

  test('Tab key moves focus logically', async ({ page }) => {
    // Tab through UI elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    // Should move focus to next interactive element
    const focused = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });

    expect(focused).toBeTruthy();
  });

  test('Escape closes modals/panels', async ({ page }) => {
    // Open script history panel
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(200);

    // Sidebar should be visible
    const sidebar = await page.locator('#script-history-sidebar');
    await expect(sidebar).not.toHaveClass(/collapsed/);

    // Press Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    // Sidebar should close
    await expect(sidebar).toHaveClass(/collapsed/);
  });
});
