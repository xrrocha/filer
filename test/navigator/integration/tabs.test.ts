/**
 * Integration tests for tabs component
 * Tests tab rendering, switching, active state, content visibility, and empty state
 */

import { test, expect } from '@playwright/test';

/**
 * Setup: Create DOM container and render tabs
 */
test.beforeEach(async ({ page }) => {
  await page.goto('/test/navigator/integration/fixtures/test-page.html');

  await page.evaluate(async () => {
    const { createTabs } = await import('/dist/navigator/ui/tabs.js');

    // Create container for tabs
    const container = document.getElementById('app')!;
    container.innerHTML = '';

    // Create sample tab definitions
    const propertiesContent = document.createElement('div');
    propertiesContent.textContent = 'Properties content';

    const collectionsContent = document.createElement('div');
    collectionsContent.textContent = 'Collections content';

    const emptyContent = document.createElement('div');
    emptyContent.textContent = 'Empty content';

    const tabs = [
      {
        id: 'properties',
        label: 'Properties',
        content: propertiesContent,
        isEmpty: false,
      },
      {
        id: 'collections',
        label: 'Collections',
        content: collectionsContent,
        isEmpty: false,
      },
      {
        id: 'empty',
        label: 'Empty',
        content: emptyContent,
        isEmpty: true,
      },
    ];

    const tabsElement = createTabs(tabs);
    container.appendChild(tabsElement);

    // Expose for tests
    (window as any).testTabs = tabs;
  });
});

// ============================================================================
// Render Tabs Tests (3 tests)
// ============================================================================

test.describe('Render Tabs', () => {
  test('renders tab container with correct class', async ({ page }) => {
    const container = await page.locator('.inspector-tabs');
    await expect(container).toBeVisible();
  });

  test('renders tab headers section', async ({ page }) => {
    const headers = await page.locator('.tab-headers');
    await expect(headers).toBeVisible();

    const headerButtons = await page.locator('.tab-header').count();
    expect(headerButtons).toBe(3);
  });

  test('renders tab content section', async ({ page }) => {
    const content = await page.locator('.tab-content');
    await expect(content).toBeVisible();

    const panels = await page.locator('.tab-panel').count();
    expect(panels).toBe(3);
  });
});

// ============================================================================
// Switch Tabs Tests (5 tests)
// ============================================================================

test.describe('Switch Tabs', () => {
  test('clicking tab header switches to that tab', async ({ page }) => {
    // Initially Properties tab should be active
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    await expect(propertiesHeader).toHaveClass(/active/);

    // Click Collections tab
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await collectionsHeader.click();

    // Collections should now be active
    await expect(collectionsHeader).toHaveClass(/active/);
  });

  test('only one tab is active at a time', async ({ page }) => {
    // Click Collections tab
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await collectionsHeader.click();

    // Count active headers
    const activeHeaders = await page.locator('.tab-header.active').count();
    expect(activeHeaders).toBe(1);

    // Count active panels
    const activePanels = await page.locator('.tab-panel.active').count();
    expect(activePanels).toBe(1);
  });

  test('switching tabs deactivates previous tab', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });

    // Properties starts active
    await expect(propertiesHeader).toHaveClass(/active/);

    // Switch to Collections
    await collectionsHeader.click();

    // Properties should no longer be active
    await expect(propertiesHeader).not.toHaveClass(/active/);
  });

  test('tab data-tab-id matches definition', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    const tabId = await propertiesHeader.getAttribute('data-tab-id');
    expect(tabId).toBe('properties');

    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    const collectionsTabId = await collectionsHeader.getAttribute('data-tab-id');
    expect(collectionsTabId).toBe('collections');
  });

  test('rapidly switching tabs works correctly', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });

    // Rapid switching
    await collectionsHeader.click();
    await propertiesHeader.click();
    await collectionsHeader.click();
    await propertiesHeader.click();

    // Properties should be active
    await expect(propertiesHeader).toHaveClass(/active/);

    // Only one active
    const activeHeaders = await page.locator('.tab-header.active').count();
    expect(activeHeaders).toBe(1);
  });
});

// ============================================================================
// Active State Styling Tests (3 tests)
// ============================================================================

test.describe('Active State Styling', () => {
  test('active tab header has "active" class', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    await expect(propertiesHeader).toHaveClass(/active/);
  });

  test('inactive tab headers do not have "active" class', async ({ page }) => {
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await expect(collectionsHeader).not.toHaveClass(/active/);

    const emptyHeader = await page.locator('.tab-header').filter({ hasText: 'Empty' });
    await expect(emptyHeader).not.toHaveClass(/active/);
  });

  test('active class transfers when switching tabs', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });

    // Properties starts with active class
    await expect(propertiesHeader).toHaveClass(/active/);
    await expect(collectionsHeader).not.toHaveClass(/active/);

    // Click Collections
    await collectionsHeader.click();

    // Active class transfers
    await expect(propertiesHeader).not.toHaveClass(/active/);
    await expect(collectionsHeader).toHaveClass(/active/);
  });
});

// ============================================================================
// Content Show/Hide Tests (5 tests)
// ============================================================================

test.describe('Content Show/Hide', () => {
  test('active tab content has "active" class', async ({ page }) => {
    const propertiesPanel = await page.locator('.tab-panel[data-tab-id="properties"]');
    await expect(propertiesPanel).toHaveClass(/active/);
  });

  test('inactive tab content does not have "active" class', async ({ page }) => {
    const collectionsPanel = await page.locator('.tab-panel[data-tab-id="collections"]');
    await expect(collectionsPanel).not.toHaveClass(/active/);
  });

  test('switching tabs shows correct content', async ({ page }) => {
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await collectionsHeader.click();

    const collectionsPanel = await page.locator('.tab-panel[data-tab-id="collections"]');
    await expect(collectionsPanel).toHaveClass(/active/);

    // Check content is correct
    const content = await collectionsPanel.textContent();
    expect(content).toContain('Collections content');
  });

  test('switching tabs hides previous content', async ({ page }) => {
    const propertiesPanel = await page.locator('.tab-panel[data-tab-id="properties"]');
    await expect(propertiesPanel).toHaveClass(/active/);

    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await collectionsHeader.click();

    // Properties panel should no longer be active
    await expect(propertiesPanel).not.toHaveClass(/active/);
  });

  test('only one content panel is active at a time', async ({ page }) => {
    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await collectionsHeader.click();

    const activePanels = await page.locator('.tab-panel.active').count();
    expect(activePanels).toBe(1);

    // Verify it's the correct panel
    const collectionsPanel = await page.locator('.tab-panel[data-tab-id="collections"]');
    await expect(collectionsPanel).toHaveClass(/active/);
  });
});

// ============================================================================
// Empty State Per Tab Tests (4 tests)
// ============================================================================

test.describe('Empty State Per Tab', () => {
  test('empty tab header is disabled', async ({ page }) => {
    const emptyHeader = await page.locator('.tab-header').filter({ hasText: 'Empty' });
    await expect(emptyHeader).toBeDisabled();
  });

  test('non-empty tab headers are enabled', async ({ page }) => {
    const propertiesHeader = await page.locator('.tab-header').filter({ hasText: 'Properties' });
    await expect(propertiesHeader).toBeEnabled();

    const collectionsHeader = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    await expect(collectionsHeader).toBeEnabled();
  });

  test('first non-empty tab is active by default', async ({ page }) => {
    await page.evaluate(async () => {
      const { createTabs } = await import('/dist/navigator/ui/tabs.js');

      const container = document.getElementById('app')!;
      container.innerHTML = '';

      // Create tabs where first tab is empty
      const emptyContent = document.createElement('div');
      emptyContent.textContent = 'Empty';

      const validContent = document.createElement('div');
      validContent.textContent = 'Valid';

      const tabs = [
        { id: 'empty1', label: 'Empty 1', content: emptyContent, isEmpty: true },
        { id: 'valid', label: 'Valid', content: validContent, isEmpty: false },
      ];

      const tabsElement = createTabs(tabs);
      container.appendChild(tabsElement);
    });

    // Valid tab should be active, not empty tab
    const validHeader = await page.locator('.tab-header').filter({ hasText: 'Valid' });
    await expect(validHeader).toHaveClass(/active/);

    const emptyHeader = await page.locator('.tab-header').filter({ hasText: 'Empty 1' });
    await expect(emptyHeader).not.toHaveClass(/active/);
  });

  test('if all tabs are empty, first tab is active by default', async ({ page }) => {
    await page.evaluate(async () => {
      const { createTabs } = await import('/dist/navigator/ui/tabs.js');

      const container = document.getElementById('app')!;
      container.innerHTML = '';

      // Create tabs where all are empty
      const empty1Content = document.createElement('div');
      const empty2Content = document.createElement('div');

      const tabs = [
        { id: 'empty1', label: 'Empty 1', content: empty1Content, isEmpty: true },
        { id: 'empty2', label: 'Empty 2', content: empty2Content, isEmpty: true },
      ];

      const tabsElement = createTabs(tabs);
      container.appendChild(tabsElement);
    });

    // First tab should be active even though it's empty
    const empty1Header = await page.locator('.tab-header').filter({ hasText: 'Empty 1' });
    await expect(empty1Header).toHaveClass(/active/);
  });
});
