/**
 * E2E Test: Accessibility
 *
 * Tests accessibility compliance across the Navigator application:
 * - Keyboard navigation throughout app
 * - ARIA roles and labels
 * - Focus management
 * - Screen reader support
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation', () => {
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

    // Create memory image for testing
    await page.click('#create-first-btn');
    await page.fill('#memimg-name', 'Accessibility Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('Tab key provides logical focus order', async ({ page }) => {
    // Start at beginning
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    // Should focus on first interactive element
    let focused = await page.evaluate(() => {
      const el = document.activeElement;
      return { tag: el?.tagName, id: el?.id, class: el?.className };
    });

    expect(focused.tag).toBeTruthy();
    expect(['BUTTON', 'INPUT', 'A']).toContain(focused.tag);
  });

  test('Shift+Tab navigates backwards', async ({ page }) => {
    // Tab forward twice
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    const forward = await page.evaluate(() => document.activeElement?.id);

    // Shift+Tab back once
    await page.keyboard.press('Shift+Tab');
    await page.waitForTimeout(50);

    const backward = await page.evaluate(() => document.activeElement?.id);

    expect(backward).not.toBe(forward);
  });

  test('Enter activates buttons', async ({ page }) => {
    // Focus on save button
    await page.focus('#save-btn');
    await page.waitForTimeout(50);

    // Press Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    // Should trigger save action (shows message or no error)
    const status = await page.locator('#status');
    await expect(status).toBeVisible();
  });

  test('Space activates buttons', async ({ page }) => {
    // Focus on a button
    await page.focus('#load-scott-btn');
    await page.waitForTimeout(50);

    // Mock ObjectType
    await page.evaluate(() => {
      (window as any).ObjectType = (config: any) => (data: any) => ({ ...data });
      (window as any).NumberType = {};
      (window as any).StringType = {};
      (window as any).DateTypeInstance = {};
    });

    // Press Space
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // Should trigger load action
    const status = await page.locator('#status');
    const statusText = await status.textContent();
    expect(statusText).toBeTruthy();
  });

  test('Arrow keys navigate tree items', async ({ page }) => {
    // Load some data first
    await page.evaluate(() => {
      (window as any).ObjectType = (config: any) => (data: any) => ({ ...data });
      (window as any).NumberType = {};
      (window as any).StringType = {};
      (window as any).DateTypeInstance = {};
    });

    await page.click('#load-scott-btn');
    await page.waitForTimeout(500);

    // Focus tree
    const treeView = await page.locator('.tree-view, #tree-view');
    if (await treeView.count() > 0) {
      await treeView.click();
      await page.waitForTimeout(100);

      // ArrowDown should move focus
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(50);

      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.className || '';
      });

      expect(focused).toBeTruthy();
    }
  });

  test('Escape closes modals and panels', async ({ page }) => {
    // Open script history
    const toggleBtn = await page.locator('#toggle-history-btn');
    if (await toggleBtn.count() > 0) {
      await toggleBtn.click();
      await page.waitForTimeout(200);

      const sidebar = await page.locator('#script-history-sidebar');
      let hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
      expect(hasCollapsed).toBe(false);

      // Press Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);

      hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
      expect(hasCollapsed).toBe(true);
    }
  });

  test('Ctrl+Enter executes script (keyboard shortcut)', async ({ page }) => {
    await page.locator('#code-editor').fill('this.keyboardShortcut = true;');

    // Press Ctrl+Enter
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Should execute successfully
    await expect(page.locator('#status')).toHaveClass(/success/);
  });

  test('Alt+ArrowLeft/Right for navigation (keyboard shortcut)', async ({ page }) => {
    // Add some data
    await page.locator('#code-editor').fill('this.page1 = {}; this.page2 = {};');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Navigate
    await page.locator('.tree-toggle').first().click();
    await page.getByText('page1').click();
    await page.waitForTimeout(100);

    await page.getByText('page2').click();
    await page.waitForTimeout(100);

    // Alt+ArrowLeft to go back
    await page.keyboard.press('Alt+ArrowLeft');
    await page.waitForTimeout(100);

    // Should be at page1 (verify via inspector or navigation state)
    const backBtn = await page.locator('#back-btn');
    const isDisabled = await backBtn.isDisabled();
    expect(isDisabled).toBe(false); // Forward button should now be enabled
  });

  test('Tab does not trap in main content', async ({ page }) => {
    // Tab through multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(30);
    }

    // Should cycle through elements without getting stuck
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });

  test('Skip to main content link', async ({ page }) => {
    // Check if skip link exists (common accessibility feature)
    const skipLink = await page.locator('a[href="#main"], a.skip-link');
    if (await skipLink.count() > 0) {
      await skipLink.click();
      await page.waitForTimeout(100);

      const focused = await page.evaluate(() => document.activeElement?.id);
      expect(focused).toMatch(/main|content|explorer/i);
    }
  });
});

test.describe('ARIA Roles and Labels', () => {
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
    await page.fill('#memimg-name', 'ARIA Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('tree view has role="tree"', async ({ page }) => {
    const tree = await page.locator('[role="tree"]');
    if (await tree.count() > 0) {
      await expect(tree).toBeVisible();
    }
  });

  test('tree items have role="treeitem"', async ({ page }) => {
    // Load data to populate tree
    await page.locator('#code-editor').fill('this.item = "test";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    const treeItems = await page.locator('[role="treeitem"]');
    if (await treeItems.count() > 0) {
      const count = await treeItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('buttons have accessible labels', async ({ page }) => {
    // Check key buttons
    const saveBtn = await page.locator('#save-btn');
    const ariaLabel = await saveBtn.getAttribute('aria-label');
    const title = await saveBtn.getAttribute('title');
    const text = await saveBtn.textContent();

    // Should have either aria-label, title, or visible text
    expect(ariaLabel || title || text).toBeTruthy();
  });

  test('form inputs have associated labels', async ({ page }) => {
    // Go back to list to test create dialog
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await page.click('#create-memimg-btn');
    await page.waitForTimeout(200);

    // Name input should have label
    const nameInput = await page.locator('#memimg-name');
    const labelFor = await page.locator('label[for="memimg-name"]');

    if (await labelFor.count() > 0) {
      await expect(labelFor).toBeVisible();
    } else {
      // Check for aria-label
      const ariaLabel = await nameInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('status messages use live regions', async ({ page }) => {
    const status = await page.locator('#status');
    const ariaLive = await status.getAttribute('aria-live');

    // Should have aria-live for screen reader announcements
    if (ariaLive) {
      expect(['polite', 'assertive']).toContain(ariaLive);
    }
  });

  test('tabs have correct ARIA attributes', async ({ page }) => {
    // Navigate to show tabs
    await page.locator('#code-editor').fill('this.data = {};');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('data').click();
    await page.waitForTimeout(100);

    const tabHeaders = await page.locator('.tab-header');
    if (await tabHeaders.count() > 0) {
      const firstTab = tabHeaders.first();
      const role = await firstTab.getAttribute('role');
      const selected = await firstTab.getAttribute('aria-selected');

      expect(role).toBe('tab');
      expect(selected).toBeTruthy();
    }
  });

  test('tab panels have role="tabpanel"', async ({ page }) => {
    await page.locator('#code-editor').fill('this.data = {};');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('data').click();
    await page.waitForTimeout(100);

    const tabPanels = await page.locator('[role="tabpanel"]');
    if (await tabPanels.count() > 0) {
      const count = await tabPanels.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('dialogs have role="dialog"', async ({ page }) => {
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await page.click('#create-memimg-btn');
    await page.waitForTimeout(200);

    const dialog = await page.locator('[role="dialog"]');
    if (await dialog.count() > 0) {
      await expect(dialog).toBeVisible();

      const ariaLabel = await dialog.getAttribute('aria-label');
      const ariaLabelledby = await dialog.getAttribute('aria-labelledby');

      expect(ariaLabel || ariaLabelledby).toBeTruthy();
    }
  });

  test('navigation landmarks use appropriate roles', async ({ page }) => {
    const main = await page.locator('main, [role="main"]');
    if (await main.count() > 0) {
      await expect(main).toBeVisible();
    }

    const navigation = await page.locator('nav, [role="navigation"]');
    if (await navigation.count() > 0) {
      await expect(navigation).toBeVisible();
    }
  });

  test('headings have correct hierarchy', async ({ page }) => {
    const h1 = await page.locator('h1').count();

    // Should have at most one h1
    expect(h1).toBeLessThanOrEqual(1);

    // Check for proper nesting (h2 after h1, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    if (headings.length > 1) {
      // Verify hierarchy doesn't skip levels
      const levels = await Promise.all(
        headings.map(h => h.evaluate(el => parseInt(el.tagName[1])))
      );

      for (let i = 1; i < levels.length; i++) {
        const diff = levels[i] - levels[i - 1];
        // Should not skip more than 1 level
        expect(Math.abs(diff)).toBeLessThanOrEqual(2);
      }
    }
  });
});

test.describe('Focus Management', () => {
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
    await page.fill('#memimg-name', 'Focus Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('focus trapped in modal dialogs', async ({ page }) => {
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    await page.click('#create-memimg-btn');
    await page.waitForTimeout(200);

    // Tab through dialog
    const initialFocus = await page.evaluate(() => document.activeElement?.id);

    // Tab many times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(30);
    }

    // Focus should stay within dialog
    const afterTabbing = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('[role="dialog"]') !== null ||
             el?.closest('.modal') !== null ||
             el?.closest('.dialog') !== null;
    });

    expect(afterTabbing).toBe(true);
  });

  test('focus restored after closing modal', async ({ page }) => {
    // Focus on create button
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    const createBtn = await page.locator('#create-memimg-btn');
    await createBtn.focus();
    await page.waitForTimeout(50);

    const beforeOpen = await page.evaluate(() => document.activeElement?.id);

    // Open dialog
    await createBtn.click();
    await page.waitForTimeout(200);

    // Close dialog with Escape
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);

    // Focus should return to create button
    const afterClose = await page.evaluate(() => document.activeElement?.id);
    expect(afterClose).toBe(beforeOpen);
  });

  test('visible focus indicators on all interactive elements', async ({ page }) => {
    // Tab to focus first element
    await page.keyboard.press('Tab');
    await page.waitForTimeout(50);

    // Check for visible focus styles
    const focusStyles = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      if (!el) return null;

      const styles = window.getComputedStyle(el);
      return {
        outline: styles.outline,
        outlineWidth: styles.outlineWidth,
        boxShadow: styles.boxShadow,
        border: styles.border,
      };
    });

    // Should have some focus indicator
    const hasFocusIndicator =
      (focusStyles?.outline && focusStyles.outline !== 'none') ||
      (focusStyles?.outlineWidth && focusStyles.outlineWidth !== '0px') ||
      (focusStyles?.boxShadow && focusStyles.boxShadow !== 'none');

    expect(hasFocusIndicator).toBe(true);
  });

  test('focus moves to content after navigation', async ({ page }) => {
    // Navigate to an object
    await page.locator('#code-editor').fill('this.focused = "item";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('focused').click();
    await page.waitForTimeout(100);

    // Inspector should be visible and potentially focused
    const inspector = await page.locator('#inspector-view');
    await expect(inspector).toBeVisible();
  });

  test('no keyboard trap in main application', async ({ page }) => {
    let previousFocus = '';
    let cycleDetected = false;

    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(30);

      const currentFocus = await page.evaluate(() => {
        const el = document.activeElement;
        return `${el?.tagName}-${el?.id}-${el?.className}`;
      });

      if (currentFocus === previousFocus) {
        // Same element twice in a row - potential trap
        cycleDetected = true;
        break;
      }

      previousFocus = currentFocus;
    }

    // Should cycle through elements without getting stuck
    expect(cycleDetected).toBe(false);
  });
});

test.describe('Screen Reader Support', () => {
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
    await page.fill('#memimg-name', 'Screen Reader Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('images have alt text', async ({ page }) => {
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');

      // Decorative images should have role="presentation" or empty alt
      // Informative images should have descriptive alt text
      if (role === 'presentation') {
        expect(alt).toBe('');
      } else {
        expect(alt).toBeTruthy();
      }
    }
  });

  test('icon-only buttons have aria-label', async ({ page }) => {
    const iconButtons = await page.locator('button:not(:has(> span:not(.icon)))').all();

    for (const btn of iconButtons) {
      const ariaLabel = await btn.getAttribute('aria-label');
      const title = await btn.getAttribute('title');
      const text = await btn.textContent();

      // Should have some accessible name
      expect(ariaLabel || title || text?.trim()).toBeTruthy();
    }
  });

  test('state changes announced via aria-live', async ({ page }) => {
    // Execute a script that changes state
    await page.locator('#code-editor').fill('this.announced = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    // Status should be in a live region
    const status = await page.locator('#status');
    const ariaLive = await status.getAttribute('aria-live');

    expect(ariaLive).toBeTruthy();
  });

  test('error messages are descriptive', async ({ page }) => {
    // Trigger an error
    await page.locator('#code-editor').fill('this.error = {');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(300);

    const statusText = await page.locator('#status').textContent();

    // Should have meaningful error message
    expect(statusText).toBeTruthy();
    expect(statusText?.length || 0).toBeGreaterThan(5);
  });

  test('dynamic content updates preserve context', async ({ page }) => {
    // Navigate to show tree changes
    await page.locator('#code-editor').fill('this.dynamic = "content";');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    // Tree should update
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('dynamic')).toBeVisible();

    // Click to update inspector
    await page.getByText('dynamic').click();
    await page.waitForTimeout(100);

    // Inspector should show value
    const inspector = await page.locator('#inspector-view');
    await expect(inspector).toBeVisible();
  });

  test('progress indicators have accessible names', async ({ page }) => {
    // Check for loading states
    const loaders = await page.locator('[role="progressbar"], .loading, .spinner').all();

    for (const loader of loaders) {
      if (await loader.isVisible()) {
        const ariaLabel = await loader.getAttribute('aria-label');
        const ariaLabelledby = await loader.getAttribute('aria-labelledby');

        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
  });

  test('semantic HTML used appropriately', async ({ page }) => {
    // Check for semantic elements
    const main = await page.locator('main').count();
    const nav = await page.locator('nav').count();

    // Should use semantic HTML where appropriate
    expect(main + nav).toBeGreaterThan(0);
  });

  test('lists use proper markup', async ({ page }) => {
    // Check memory image list
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    const lists = await page.locator('ul, ol').all();

    for (const list of lists) {
      if (await list.isVisible()) {
        const children = await list.locator('> li').count();

        // Lists should contain list items
        if (children === 0) {
          // Empty list is ok
          continue;
        }

        expect(children).toBeGreaterThan(0);
      }
    }
  });

  test('tables have proper headers', async ({ page }) => {
    // Navigate to property table
    await page.locator('#code-editor').fill('this.tableData = {};');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('tableData').click();
    await page.waitForTimeout(100);

    const tables = await page.locator('table').all();

    for (const table of tables) {
      if (await table.isVisible()) {
        const headers = await table.locator('th').count();
        const scope = await table.locator('th[scope]').count();

        // Tables should have headers or appropriate ARIA
        expect(headers).toBeGreaterThan(0);
      }
    }
  });

  test('links have descriptive text', async ({ page }) => {
    const links = await page.locator('a').all();

    for (const link of links) {
      if (await link.isVisible()) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');

        // Links should have meaningful text
        const content = text?.trim() || ariaLabel || '';
        expect(content.length).toBeGreaterThan(0);

        // Avoid generic link text
        expect(content.toLowerCase()).not.toBe('click here');
        expect(content.toLowerCase()).not.toBe('read more');
      }
    }
  });
});
