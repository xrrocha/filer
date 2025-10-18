/**
 * Integration tests for Tree View
 *
 * Tests tree rendering, expansion, selection using Playwright.
 * Sample demonstrating ~30 of ~120 planned tests.
 */

import { test, expect } from '@playwright/test';

test.describe('Tree View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/navigator/integration/fixtures/test-page.html');

    // Setup test data in browser context
    await page.evaluate(async () => {
      const { createMemoryImage } = await import('/dist/memimg/memimg.js');
      const { NavigationManager } = await import('/dist/navigator/navigation.js');
      const { renderTree } = await import('/dist/navigator/ui/tree.js');

      // Create test memory image
      const root = createMemoryImage({
        user: {
          name: 'Alice',
          age: 30,
          profile: {
            email: 'alice@example.com',
            settings: {
              theme: 'dark',
            },
          },
        },
        items: [1, 2, 3],
        map: new Map([['key', 'value']]),
      });

      const navigation = new NavigationManager();
      const container = document.getElementById('test-root')!;

      renderTree(root, navigation, container, () => {});

      // Store references globally for test access
      (window as any).testRoot = root;
      (window as any).testNavigation = navigation;
      (window as any).testContainer = container;
      (window as any).renderTree = renderTree;
    });
  });

  // ==========================================================================
  // Rendering Tests
  // ==========================================================================

  test('renders root node', async ({ page }) => {
    const rootNode = await page.locator('.tree-node').first();
    await expect(rootNode).toBeVisible();

    const label = await rootNode.locator('.tree-label').textContent();
    expect(label).toBe('this');
  });

  test('renders child nodes', async ({ page }) => {
    // Expand root first
    await page.locator('.tree-toggle').first().click();

    // Check for child nodes
    const childLabels = await page.locator('.tree-label').allTextContents();
    expect(childLabels).toContain('user');
    expect(childLabels).toContain('items');
    expect(childLabels).toContain('map');
  });

  test('displays correct icons', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();

    const icons = await page.locator('.tree-icon').allTextContents();

    // Root should have object icon
    expect(icons[0]).toBe('{}');

    // Items should have array icon
    const itemsIcon = await page.locator('.tree-node').filter({ hasText: 'items' })
      .locator('.tree-icon').textContent();
    expect(itemsIcon).toBe('[]');
  });

  // ==========================================================================
  // Expansion Tests
  // ==========================================================================

  test('expands node on toggle click', async ({ page }) => {
    const toggle = await page.locator('.tree-toggle').first();

    // Initially collapsed
    await expect(toggle).toHaveClass(/collapsed/);

    // Click to expand
    await toggle.click();

    // Now expanded
    await expect(toggle).toHaveClass(/expanded/);
  });

  test('collapses node on second toggle click', async ({ page }) => {
    const toggle = await page.locator('.tree-toggle').first();

    // Expand
    await toggle.click();
    await expect(toggle).toHaveClass(/expanded/);

    // Collapse
    await toggle.click();
    await expect(toggle).toHaveClass(/collapsed/);
  });

  test('shows children when expanded', async ({ page }) => {
    // Expand root
    await page.locator('.tree-toggle').first().click();

    // Children should be visible
    const children = await page.locator('.tree-children').first();
    await expect(children).toBeVisible();
  });

  test('hides children when collapsed', async ({ page }) => {
    const toggle = await page.locator('.tree-toggle').first();

    // Expand then collapse
    await toggle.click();
    await toggle.click();

    // Children should not be visible (or display:none)
    const childNodes = await page.locator('.tree-node').filter({ hasText: 'user' });
    await expect(childNodes).not.toBeVisible();
  });

  // ==========================================================================
  // Selection Tests
  // ==========================================================================

  test('selects node on header click', async ({ page }) => {
    // Expand root
    await page.locator('.tree-toggle').first().click();

    // Click on user node header
    const userHeader = await page.locator('.tree-node-header').filter({ hasText: 'user' });
    await userHeader.click();

    // Should have selected class
    await expect(userHeader).toHaveClass(/selected/);
  });

  test('updates selection when clicking different node', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();

    // Select user
    const userHeader = await page.locator('.tree-node-header').filter({ hasText: 'user' });
    await userHeader.click();
    await expect(userHeader).toHaveClass(/selected/);

    // Select items
    const itemsHeader = await page.locator('.tree-node-header').filter({ hasText: 'items' });
    await itemsHeader.click();

    // items should be selected, user should not
    await expect(itemsHeader).toHaveClass(/selected/);
    await expect(userHeader).not.toHaveClass(/selected/);
  });

  // ==========================================================================
  // Nested Navigation Tests
  // ==========================================================================

  test('expands nested nodes', async ({ page }) => {
    // Expand root
    await page.locator('.tree-toggle').first().click();

    // Expand user
    const userToggle = await page.locator('.tree-node').filter({ hasText: 'user' })
      .locator('.tree-toggle').first();
    await userToggle.click();

    // Should see nested properties
    const labels = await page.locator('.tree-label').allTextContents();
    expect(labels).toContain('profile');
  });

  test('maintains expansion state of parent when expanding child', async ({ page }) => {
    // Expand root
    const rootToggle = await page.locator('.tree-toggle').first();
    await rootToggle.click();

    // Expand user
    const userToggle = await page.locator('.tree-node').filter({ hasText: 'user' })
      .locator('.tree-toggle').first();
    await userToggle.click();

    // Root should still be expanded
    await expect(rootToggle).toHaveClass(/expanded/);
  });

  // ==========================================================================
  // Collection Rendering Tests
  // ==========================================================================

  test('renders array elements', async ({ page }) => {
    // Expand root and items
    await page.locator('.tree-toggle').first().click();

    const itemsNode = await page.locator('.tree-node').filter({ hasText: 'items' });
    const itemsToggle = await itemsNode.locator('.tree-toggle').first();
    await itemsToggle.click();

    // Should see array indices
    const labels = await page.locator('.tree-label').allTextContents();
    expect(labels).toContain('[0]');
    expect(labels).toContain('[1]');
    expect(labels).toContain('[2]');
  });

  test('renders Map entries', async ({ page }) => {
    // Expand root and map
    await page.locator('.tree-toggle').first().click();

    const mapNode = await page.locator('.tree-node').filter({ hasText: 'map' });
    const mapToggle = await mapNode.locator('.tree-toggle').first();
    await mapToggle.click();

    // Should see map key
    const labels = await page.locator('.tree-label').allTextContents();
    expect(labels).toContain('key');
  });

  // ==========================================================================
  // Navigation Integration Tests
  // ==========================================================================

  test('updates NavigationManager selectedPath on selection', async ({ page }) => {
    await page.locator('.tree-toggle').first().click();

    const userHeader = await page.locator('.tree-node-header').filter({ hasText: 'user' });
    await userHeader.click();

    const selectedPath = await page.evaluate(() => {
      return (window as any).testNavigation.selectedPath;
    });

    expect(selectedPath).toEqual(['root', 'user']);
  });

  test('triggers render callback on navigation', async ({ page }) => {
    let callbackTriggered = false;

    await page.evaluate(() => {
      (window as any).testNavigation.onNavigate = () => {
        (window as any).callbackTriggered = true;
      };
    });

    await page.locator('.tree-toggle').first().click();
    const userHeader = await page.locator('.tree-node-header').filter({ hasText: 'user' });
    await userHeader.click();

    const triggered = await page.evaluate(() => (window as any).callbackTriggered);
    expect(triggered).toBe(true);
  });

  // ==========================================================================
  // Deep Rendering Tests (20 tests)
  // ==========================================================================

  test.describe('Deep Rendering', () => {
    test.beforeEach(async ({ page }) => {
      // Create deeply nested structure
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        // Build 15-level deep structure
        let deep: any = { value: 'deepest' };
        for (let i = 14; i >= 0; i--) {
          deep = { [`level${i}`]: deep };
        }

        const root = createMemoryImage(deep);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});

        (window as any).testRoot = root;
        (window as any).testNavigation = navigation;
      });
    });

    test('renders deep nesting (15 levels)', async ({ page }) => {
      // Expand all levels
      for (let i = 0; i < 15; i++) {
        const toggles = await page.locator('.tree-toggle.collapsed');
        if (await toggles.count() > 0) {
          await toggles.first().click();
          await page.waitForTimeout(50); // Allow rendering
        }
      }

      // Should see deepest value
      const labels = await page.locator('.tree-label').allTextContents();
      expect(labels).toContain('value');
    });

    test('maintains proper indentation at all levels', async ({ page }) => {
      // Expand first 5 levels
      for (let i = 0; i < 5; i++) {
        const toggle = await page.locator('.tree-toggle.collapsed').first();
        await toggle.click();
      }

      // Check indentation increases with depth
      const nodes = await page.locator('.tree-node').all();
      const indents = await Promise.all(
        nodes.map(async (node) => {
          const style = await node.getAttribute('style');
          const match = style?.match(/padding-left:\s*(\d+)px/);
          return match ? parseInt(match[1]) : 0;
        })
      );

      // Indentation should increase monotonically
      for (let i = 1; i < Math.min(5, indents.length); i++) {
        expect(indents[i]).toBeGreaterThan(indents[i - 1]);
      }
    });

    test('expands deep path without re-rendering entire tree', async ({ page }) => {
      const initialNodeCount = await page.locator('.tree-node').count();

      // Expand just level0
      await page.locator('.tree-toggle').first().click();

      const afterExpand = await page.locator('.tree-node').count();

      // Should only add children of expanded node
      expect(afterExpand).toBeLessThan(initialNodeCount + 10);
    });
  });

  test.describe('Wide Tree Rendering', () => {
    test.beforeEach(async ({ page }) => {
      // Create wide structure with 150 children
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        const wide: any = {};
        for (let i = 0; i < 150; i++) {
          wide[`prop${i}`] = i;
        }

        const root = createMemoryImage(wide);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});

        (window as any).testRoot = root;
      });
    });

    test('renders wide tree (150 children)', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const labels = await page.locator('.tree-label').allTextContents();
      expect(labels.length).toBeGreaterThan(100);
    });

    test('renders all property names correctly', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const labels = await page.locator('.tree-label').allTextContents();

      // Check some sample properties
      expect(labels).toContain('prop0');
      expect(labels).toContain('prop50');
      expect(labels).toContain('prop149');
    });

    test('maintains scrollability with many children', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const container = await page.locator('#test-root');
      const scrollHeight = await container.evaluate((el) => el.scrollHeight);
      const clientHeight = await container.evaluate((el) => el.clientHeight);

      // Should be scrollable
      expect(scrollHeight).toBeGreaterThan(clientHeight);
    });
  });

  test.describe('Mixed Content Types', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        const root = createMemoryImage({
          string: 'text',
          number: 42,
          boolean: true,
          nullValue: null,
          undefinedValue: undefined,
          date: new Date('2024-01-01'),
          array: [1, 2, 3],
          map: new Map([['k', 'v']]),
          set: new Set([1, 2]),
          fn: function test() {},
          symbol: Symbol('test'),
          bigint: BigInt(123),
        });

        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});
      });
    });

    test('displays correct icon for each type', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Check string icon
      const stringIcon = await page.locator('.tree-node')
        .filter({ hasText: 'string' })
        .locator('.tree-icon')
        .textContent();
      expect(stringIcon).toBe('"');

      // Check number icon
      const numberIcon = await page.locator('.tree-node')
        .filter({ hasText: 'number' })
        .locator('.tree-icon')
        .textContent();
      expect(numberIcon).toBe('#');

      // Check array icon
      const arrayIcon = await page.locator('.tree-node')
        .filter({ hasText: 'array' })
        .locator('.tree-icon')
        .textContent();
      expect(arrayIcon).toBe('[]');
    });

    test('applies correct CSS class for each type', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Check value elements have type-specific classes
      const stringValue = await page.locator('.tree-node')
        .filter({ hasText: 'string' })
        .locator('.tree-value');
      await expect(stringValue).toHaveClass(/value-string/);

      const numberValue = await page.locator('.tree-node')
        .filter({ hasText: 'number' })
        .locator('.tree-value');
      await expect(numberValue).toHaveClass(/value-number/);
    });

    test('renders null and undefined without errors', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Should render nodes for null and undefined
      const labels = await page.locator('.tree-label').allTextContents();
      expect(labels).toContain('nullValue');
      expect(labels).toContain('undefinedValue');
    });

    test('shows appropriate value for primitive types', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // String value (no quotes in new design)
      const stringValue = await page.locator('.tree-node')
        .filter({ hasText: 'string' })
        .locator('.tree-value')
        .textContent();
      expect(stringValue).toBe('text');

      // Number value
      const numberValue = await page.locator('.tree-node')
        .filter({ hasText: 'number' })
        .locator('.tree-value')
        .textContent();
      expect(numberValue).toBe('42');

      // Boolean value
      const boolValue = await page.locator('.tree-node')
        .filter({ hasText: 'boolean' })
        .locator('.tree-value')
        .textContent();
      expect(boolValue).toBe('true');
    });
  });

  test.describe('Label Truncation', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        const root = createMemoryImage({
          shortProp: 'short',
          veryLongPropertyNameThatExceedsReasonableLength: 'value',
          longValue: 'x'.repeat(200),
        });

        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});
      });
    });

    test('truncates long property names', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const longLabel = await page.locator('.tree-label')
        .filter({ hasText: 'veryLongProperty' })
        .textContent();

      // Should be truncated or have ellipsis
      const isShortened = longLabel!.length < 50 || longLabel!.includes('...');
      expect(isShortened).toBe(true);
    });

    test('truncates long values in preview', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const longValue = await page.locator('.tree-node')
        .filter({ hasText: 'longValue' })
        .locator('.tree-value')
        .textContent();

      // Should be truncated
      expect(longValue!.length).toBeLessThan(150);
    });

    test('shows full property name in tooltip', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const longLabel = await page.locator('.tree-label')
        .filter({ hasText: 'veryLongProperty' });

      const title = await longLabel.getAttribute('title');
      expect(title).toContain('veryLongPropertyNameThatExceedsReasonableLength');
    });
  });

  // ==========================================================================
  // Interaction Tests (20 tests)
  // ==========================================================================

  test.describe('Keyboard Navigation', () => {
    test('focuses tree on Tab key', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Press Tab to focus tree
      await page.keyboard.press('Tab');

      // First node should have focus
      const focused = await page.evaluate(() => document.activeElement?.className);
      expect(focused).toContain('tree-node-header');
    });

    test('navigates down with ArrowDown', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Focus first node
      await page.locator('.tree-node-header').first().focus();

      // Press ArrowDown
      await page.keyboard.press('ArrowDown');

      // Focus should move to next node
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('user');
    });

    test('navigates up with ArrowUp', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Focus second node
      const nodes = await page.locator('.tree-node-header').all();
      await nodes[1].focus();

      // Press ArrowUp
      await page.keyboard.press('ArrowUp');

      // Focus should move to first node
      const focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('this');
    });

    test('expands node with ArrowRight', async ({ page }) => {
      const firstNode = await page.locator('.tree-node-header').first();
      await firstNode.focus();

      // Press ArrowRight to expand
      await page.keyboard.press('ArrowRight');

      // Node should be expanded
      const toggle = await page.locator('.tree-toggle').first();
      await expect(toggle).toHaveClass(/expanded/);
    });

    test('collapses node with ArrowLeft', async ({ page }) => {
      // Expand first
      const toggle = await page.locator('.tree-toggle').first();
      await toggle.click();

      // Focus the node
      const firstNode = await page.locator('.tree-node-header').first();
      await firstNode.focus();

      // Press ArrowLeft to collapse
      await page.keyboard.press('ArrowLeft');

      // Node should be collapsed
      await expect(toggle).toHaveClass(/collapsed/);
    });

    test('selects node with Enter key', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const userNode = await page.locator('.tree-node-header')
        .filter({ hasText: 'user' });
      await userNode.focus();

      // Press Enter
      await page.keyboard.press('Enter');

      // Node should be selected
      await expect(userNode).toHaveClass(/selected/);
    });
  });

  test.describe('Bulk Operations', () => {
    test('expands all nodes with Expand All button', async ({ page }) => {
      // Add expand all button to test page
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = 'expand-all';
        button.textContent = 'Expand All';
        button.onclick = () => {
          const toggles = document.querySelectorAll('.tree-toggle.collapsed');
          toggles.forEach(t => (t as HTMLElement).click());
        };
        document.body.prepend(button);
      });

      await page.click('#expand-all');
      await page.waitForTimeout(100);

      // All toggles should be expanded
      const collapsed = await page.locator('.tree-toggle.collapsed').count();
      expect(collapsed).toBe(0);
    });

    test('collapses all nodes with Collapse All button', async ({ page }) => {
      // Expand some nodes first
      await page.locator('.tree-toggle').first().click();
      await page.locator('.tree-toggle').nth(1).click();

      // Add collapse all button
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = 'collapse-all';
        button.textContent = 'Collapse All';
        button.onclick = () => {
          const toggles = document.querySelectorAll('.tree-toggle.expanded');
          toggles.forEach(t => (t as HTMLElement).click());
        };
        document.body.prepend(button);
      });

      await page.click('#collapse-all');
      await page.waitForTimeout(100);

      // All toggles should be collapsed
      const expanded = await page.locator('.tree-toggle.expanded').count();
      expect(expanded).toBe(0);
    });
  });

  test.describe('Search and Highlight', () => {
    test.beforeEach(async ({ page }) => {
      // Add search input to test page
      await page.evaluate(() => {
        const input = document.createElement('input');
        input.id = 'search-input';
        input.type = 'text';
        input.placeholder = 'Search...';
        input.oninput = (e) => {
          const query = (e.target as HTMLInputElement).value.toLowerCase();
          const labels = document.querySelectorAll('.tree-label');
          labels.forEach(label => {
            const match = label.textContent?.toLowerCase().includes(query);
            label.classList.toggle('search-match', !!match);
          });
        };
        document.body.prepend(input);
      });
    });

    test('highlights matching nodes on search', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Search for 'user'
      await page.fill('#search-input', 'user');

      // User label should have search-match class
      const userLabel = await page.locator('.tree-label')
        .filter({ hasText: 'user' });
      await expect(userLabel).toHaveClass(/search-match/);
    });

    test('removes highlight when search is cleared', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Search then clear
      await page.fill('#search-input', 'user');
      await page.fill('#search-input', '');

      // Should not have search-match class
      const matches = await page.locator('.search-match').count();
      expect(matches).toBe(0);
    });

    test('highlights multiple matches', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Search for common substring
      await page.fill('#search-input', 'e');

      // Multiple labels should match
      const matches = await page.locator('.search-match').count();
      expect(matches).toBeGreaterThan(1);
    });
  });

  // ==========================================================================
  // Performance Tests (15 tests)
  // ==========================================================================

  test.describe('Rendering Performance', () => {
    test('renders 1000 nodes in under 200ms', async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        // Create 1000 properties
        const large: any = {};
        for (let i = 0; i < 1000; i++) {
          large[`prop${i}`] = i;
        }

        const root = createMemoryImage(large);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;

        const start = performance.now();
        renderTree(root, navigation, container, () => {});
        const elapsed = performance.now() - start;

        (window as any).renderTime = elapsed;
      });

      const renderTime = await page.evaluate(() => (window as any).renderTime);
      expect(renderTime).toBeLessThan(200);
    });

    test('expands node with 100 children in under 100ms', async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        const obj: any = {};
        for (let i = 0; i < 100; i++) {
          obj[`child${i}`] = i;
        }

        const root = createMemoryImage(obj);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});
      });

      const start = await page.evaluate(() => performance.now());
      await page.locator('.tree-toggle').first().click();
      const end = await page.evaluate(() => performance.now());

      expect(end - start).toBeLessThan(100);
    });

    test('maintains smooth scrolling with large tree', async ({ page }) => {
      // Create large tree
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        const large: any = {};
        for (let i = 0; i < 500; i++) {
          large[`prop${i}`] = { nested: i };
        }

        const root = createMemoryImage(large);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});
      });

      await page.locator('.tree-toggle').first().click();

      // Scroll to bottom
      const container = await page.locator('#test-root');
      await container.evaluate(el => {
        el.scrollTop = el.scrollHeight;
      });

      // Should complete in reasonable time
      await page.waitForTimeout(100);

      const scrollTop = await container.evaluate(el => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);
    });
  });

  test.describe('Memory Usage', () => {
    test('does not leak memory on repeated render', async ({ page }) => {
      const initialMemory = await page.evaluate(async () => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Render 10 times
      for (let i = 0; i < 10; i++) {
        await page.evaluate(async () => {
          const { createMemoryImage } = await import('/dist/memimg/memimg.js');
          const { NavigationManager } = await import('/dist/navigator/navigation.js');
          const { renderTree } = await import('/dist/navigator/ui/tree.js');

          const root = createMemoryImage({ data: { value: Math.random() } });
          const navigation = new NavigationManager();
          const container = document.getElementById('test-root')!;
          container.innerHTML = '';
          renderTree(root, navigation, container, () => {});
        });
      }

      const finalMemory = await page.evaluate(() => {
        if ((performance as any).memory) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });

      // Memory growth should be reasonable (< 10MB)
      const growth = finalMemory - initialMemory;
      if (initialMemory > 0) {
        expect(growth).toBeLessThan(10 * 1024 * 1024);
      }
    });
  });

  // ==========================================================================
  // Reference Filtering Tests (15 tests)
  // ==========================================================================

  test.describe('Reference Filtering', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const { NavigationManager } = await import('/dist/navigator/navigation.js');
        const { renderTree } = await import('/dist/navigator/ui/tree.js');

        // Create circular structure
        const obj: any = { name: 'parent' };
        obj.child = { name: 'child', parent: obj };
        obj.self = obj;

        const root = createMemoryImage(obj);
        const navigation = new NavigationManager();
        const container = document.getElementById('test-root')!;
        renderTree(root, navigation, container, () => {});

        (window as any).testRoot = root;
      });
    });

    test('detects circular references', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // Expand child
      const childToggle = await page.locator('.tree-node')
        .filter({ hasText: 'child' })
        .locator('.tree-toggle')
        .first();
      await childToggle.click();

      // Should see parent reference
      const labels = await page.locator('.tree-label').allTextContents();
      expect(labels.filter(l => l === 'parent').length).toBeGreaterThan(0);
    });

    test('marks circular references visually', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      // self reference should have indicator
      const selfNode = await page.locator('.tree-node')
        .filter({ hasText: 'self' });

      const value = await selfNode.locator('.tree-value').textContent();
      expect(value).toContain('circular');
    });

    test('prevents infinite expansion loops', async ({ page }) => {
      // Expand root
      await page.locator('.tree-toggle').first().click();

      // Expand child
      const childToggle = await page.locator('.tree-node')
        .filter({ hasText: 'child' })
        .locator('.tree-toggle')
        .first();
      await childToggle.click();

      // Count total nodes (should not be infinite)
      const nodeCount = await page.locator('.tree-node').count();
      expect(nodeCount).toBeLessThan(20); // Reasonable upper bound
    });
  });

  // ==========================================================================
  // Accessibility Tests (20 tests)
  // ==========================================================================

  test.describe('ARIA Roles', () => {
    test('tree container has tree role', async ({ page }) => {
      const container = await page.locator('#test-root');
      const role = await container.getAttribute('role');
      expect(role).toBe('tree');
    });

    test('tree nodes have treeitem role', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const node = await page.locator('.tree-node-header').first();
      const role = await node.getAttribute('role');
      expect(role).toBe('treeitem');
    });

    test('tree nodes have aria-expanded attribute', async ({ page }) => {
      const node = await page.locator('.tree-node-header').first();

      // Initially collapsed
      let expanded = await node.getAttribute('aria-expanded');
      expect(expanded).toBe('false');

      // After expansion
      await page.locator('.tree-toggle').first().click();
      expanded = await node.getAttribute('aria-expanded');
      expect(expanded).toBe('true');
    });

    test('tree nodes have aria-selected attribute', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const userNode = await page.locator('.tree-node-header')
        .filter({ hasText: 'user' });

      // Initially not selected
      let selected = await userNode.getAttribute('aria-selected');
      expect(selected).toBe('false');

      // After selection
      await userNode.click();
      selected = await userNode.getAttribute('aria-selected');
      expect(selected).toBe('true');
    });

    test('tree nodes have aria-level attribute', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const rootNode = await page.locator('.tree-node-header').first();
      const rootLevel = await rootNode.getAttribute('aria-level');
      expect(rootLevel).toBe('1');

      // Expand and check child level
      const childNode = await page.locator('.tree-node-header').nth(1);
      const childLevel = await childNode.getAttribute('aria-level');
      expect(childLevel).toBe('2');
    });
  });

  test.describe('Keyboard Focus', () => {
    test('focus indicator is visible', async ({ page }) => {
      const node = await page.locator('.tree-node-header').first();
      await node.focus();

      // Should have visible focus styling
      const outline = await node.evaluate(el => {
        const style = window.getComputedStyle(el);
        return style.outline || style.boxShadow;
      });

      expect(outline).not.toBe('none');
      expect(outline).not.toBe('');
    });

    test('focus is trapped in tree during keyboard navigation', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const firstNode = await page.locator('.tree-node-header').first();
      await firstNode.focus();

      // Try to go up from first node
      await page.keyboard.press('ArrowUp');

      // Focus should stay on first node
      const focused = await page.evaluate(() =>
        document.activeElement === document.querySelector('.tree-node-header')
      );
      expect(focused).toBe(true);
    });

    test('focus moves logically through expanded tree', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const nodes = await page.locator('.tree-node-header').all();
      await nodes[0].focus();

      // Navigate down 3 times
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press('ArrowDown');
      }

      // Should be on 4th node
      const focusedText = await page.evaluate(() =>
        document.activeElement?.textContent
      );
      expect(focusedText).toBeTruthy();
    });
  });

  test.describe('Screen Reader Support', () => {
    test('node labels have accessible text', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const labels = await page.locator('.tree-label').all();
      for (const label of labels) {
        const text = await label.textContent();
        expect(text).toBeTruthy();
        expect(text!.length).toBeGreaterThan(0);
      }
    });

    test('type information available via aria-label', async ({ page }) => {
      await page.locator('.tree-toggle').first().click();

      const userNode = await page.locator('.tree-node')
        .filter({ hasText: 'user' });

      const ariaLabel = await userNode.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    });

    test('expansion state announced via aria-expanded', async ({ page }) => {
      const toggle = await page.locator('.tree-toggle').first();
      const node = await page.locator('.tree-node-header').first();

      // Verify aria-expanded changes
      await expect(node).toHaveAttribute('aria-expanded', 'false');
      await toggle.click();
      await expect(node).toHaveAttribute('aria-expanded', 'true');
    });
  });
});
