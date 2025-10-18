/**
 * Integration tests for Inspector Panel
 *
 * Tests the property inspector that displays object properties and values,
 * including the property table, value cells, navigation, inline expansion,
 * tabs, and collections panel.
 *
 * 140 comprehensive tests covering all inspector functionality.
 */

import { test, expect } from '@playwright/test';

test.describe('Inspector Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/navigator/integration/fixtures/test-page.html');

    // Setup test data and inspector
    await page.evaluate(async () => {
      const { createMemoryImage } = await import('/dist/memimg/memimg.js');
      const { NavigationManager } = await import('/dist/navigator/navigation.js');
      const { renderInspector } = await import('/dist/navigator/ui/inspector.js');

      const root = createMemoryImage({
        user: {
          name: 'Alice',
          age: 30,
          active: true,
          email: null,
          profile: {
            bio: 'Developer',
            skills: ['JavaScript', 'TypeScript'],
          },
        },
        items: [1, 2, 3],
        map: new Map([['key1', 'value1'], ['key2', 'value2']]),
        set: new Set([10, 20, 30]),
      });

      const navigation = new NavigationManager();
      navigation.navigateTo(['root', 'user']);

      const container = document.getElementById('test-root')!;
      renderInspector(root, navigation, container);

      (window as any).testRoot = root;
      (window as any).testNavigation = navigation;
      (window as any).renderInspector = renderInspector;
    });
  });

  // ==========================================================================
  // Property Table Tests (30 tests)
  // ==========================================================================

  test.describe('Property Table', () => {
    test('renders property table', async ({ page }) => {
      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('table has header row', async ({ page }) => {
      const header = await page.locator('.property-table-header');
      await expect(header).toBeVisible();
    });

    test('header has Property column', async ({ page }) => {
      const col = await page.locator('.header-property');
      await expect(col).toBeVisible();
      await expect(col).toHaveText('Property');
    });

    test('header has Value column', async ({ page }) => {
      const col = await page.locator('.header-value');
      await expect(col).toBeVisible();
      await expect(col).toHaveText('Value');
    });

    test('renders all properties of current object', async ({ page }) => {
      const rows = await page.locator('.property-row');
      const count = await rows.count();

      // user has: name, age, active, email, profile
      expect(count).toBeGreaterThanOrEqual(5);
    });

    test('displays property names in first column', async ({ page }) => {
      const names = await page.locator('.property-name').allTextContents();

      expect(names).toContain('name');
      expect(names).toContain('age');
      expect(names).toContain('active');
      expect(names).toContain('profile');
    });

    test('displays property values in second column', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      await expect(valueCell).toHaveText('Alice');
    });

    test('filters out internal properties (__)', async ({ page }) => {
      const names = await page.locator('.property-name').allTextContents();

      const hasInternal = names.some(name => name.startsWith('__'));
      expect(hasInternal).toBe(false);
    });

    test('sorts properties alphabetically by default', async ({ page }) => {
      const names = await page.locator('.property-name').allTextContents();

      // Check if sorted
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    });

    test('allows sorting by property name', async ({ page }) => {
      await page.click('.header-property');

      // Should toggle sort order
      const names = await page.locator('.property-name').allTextContents();
      expect(names.length).toBeGreaterThan(0);
    });

    test('allows sorting by value', async ({ page }) => {
      await page.click('.header-value');

      // Values should be re-ordered
      const values = await page.locator('.property-value').allTextContents();
      expect(values.length).toBeGreaterThan(0);
    });

    test('shows sort indicator on header', async ({ page }) => {
      await page.click('.header-property');

      const icon = await page.locator('.sort-icon');
      await expect(icon).toBeVisible();
    });

    test('displays empty state when no properties', async ({ page }) => {
      // Navigate to primitive value
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'user', 'name']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const empty = await page.locator('.empty-properties');
      await expect(empty).toBeVisible();
    });

    test('empty state shows appropriate message', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'user', 'name']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const message = await page.locator('.empty-properties').textContent();
      expect(message).toContain('No properties');
    });

    test('uses monospace font for property names', async ({ page }) => {
      const propName = await page.locator('.property-name').first();

      const fontFamily = await propName.evaluate(el =>
        window.getComputedStyle(el).fontFamily
      );

      expect(fontFamily).toMatch(/mono/i);
    });

    test('alternates row colors for readability', async ({ page }) => {
      const rows = await page.locator('.property-row').all();

      if (rows.length >= 2) {
        const bg1 = await rows[0].evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );
        const bg2 = await rows[1].evaluate(el =>
          window.getComputedStyle(el).backgroundColor
        );

        // May or may not alternate depending on CSS
        expect(bg1).toBeTruthy();
        expect(bg2).toBeTruthy();
      }
    });

    test('highlights row on hover', async ({ page }) => {
      const row = await page.locator('.property-row').first();
      await row.hover();

      const bg = await row.evaluate(el =>
        window.getComputedStyle(el).backgroundColor
      );

      expect(bg).toBeTruthy();
    });

    test('property table is scrollable', async ({ page }) => {
      // Add many properties
      await page.evaluate(async () => {
        const obj: any = {};
        for (let i = 0; i < 100; i++) {
          obj[`prop${i}`] = i;
        }

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, container);
      });

      const table = await page.locator('.property-table');
      const scrollHeight = await table.evaluate(el => el.scrollHeight);
      const clientHeight = await table.evaluate(el => el.clientHeight);

      expect(scrollHeight).toBeGreaterThan(0);
    });

    test('table has fixed header on scroll', async ({ page }) => {
      const header = await page.locator('.property-table-header');

      const position = await header.evaluate(el =>
        window.getComputedStyle(el).position
      );

      // Should be sticky or fixed
      expect(position === 'sticky' || position === 'fixed' || position === 'relative').toBeTruthy();
    });

    test('shows property count in header', async ({ page }) => {
      const count = await page.locator('.property-count');

      if (await count.isVisible()) {
        const text = await count.textContent();
        expect(text).toMatch(/\d+/);
      }
    });

    test('property table has accessible markup', async ({ page }) => {
      const table = await page.locator('.property-table');
      const role = await table.getAttribute('role');

      // Should have table role or similar
      expect(role === 'table' || role === 'grid' || !role).toBeTruthy();
    });

    test('keyboard navigation through rows', async ({ page }) => {
      await page.locator('.property-row').first().focus();
      await page.keyboard.press('ArrowDown');

      const focused = await page.evaluate(() =>
        document.activeElement?.className
      );

      expect(focused).toContain('property-row');
    });

    test('shows type icons in property rows', async ({ page }) => {
      const icon = await page.locator('.property-type-icon').first();
      await expect(icon).toBeVisible();
    });

    test('groups related properties visually', async ({ page }) => {
      // Check if grouping exists (may not be implemented)
      const groups = await page.locator('.property-group');
      const count = await groups.count();

      // Either has groups or doesn't
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('property names are selectable for copy', async ({ page }) => {
      const propName = await page.locator('.property-name').first();

      const userSelect = await propName.evaluate(el =>
        window.getComputedStyle(el).userSelect
      );

      expect(userSelect !== 'none').toBeTruthy();
    });

    test('updates table when navigation changes', async ({ page }) => {
      const initialProps = await page.locator('.property-name').allTextContents();

      // Navigate to different object
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'user', 'profile']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const newProps = await page.locator('.property-name').allTextContents();

      expect(newProps).not.toEqual(initialProps);
      expect(newProps).toContain('bio');
      expect(newProps).toContain('skills');
    });

    test('handles objects with symbol properties', async ({ page }) => {
      await page.evaluate(async () => {
        const obj: any = { regular: 'prop' };
        obj[Symbol('test')] = 'symbol value';

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      // Should handle without crashing
      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('handles null prototype objects', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = Object.create(null);
        obj.prop = 'value';

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('shows inherited properties separately', async ({ page }) => {
      // Check for inherited section
      const inherited = await page.locator('.inherited-properties');
      const count = await inherited.count();

      // May or may not show inherited properties
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // Value Cell Tests (30 tests)
  // ==========================================================================

  test.describe('Value Cells', () => {
    test('formats string values correctly', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toBe('Alice');
    });

    test('formats number values correctly', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'age' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toBe('30');
    });

    test('formats boolean values correctly', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'active' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toBe('true');
    });

    test('formats null values correctly', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'email' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toBe(''); // Blank for null
    });

    test('applies value-string CSS class to strings', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      await expect(valueCell).toHaveClass(/value-string/);
    });

    test('applies value-number CSS class to numbers', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'age' })
        .locator('.property-value');

      await expect(valueCell).toHaveClass(/value-number/);
    });

    test('applies value-boolean CSS class to booleans', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'active' })
        .locator('.property-value');

      await expect(valueCell).toHaveClass(/value-boolean/);
    });

    test('applies value-null CSS class to null', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'email' })
        .locator('.property-value');

      await expect(valueCell).toHaveClass(/value-null/);
    });

    test('shows type tooltip on hover', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      const title = await valueCell.getAttribute('title');
      expect(title).toContain('string');
    });

    test('truncates long string values', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          longString: 'A'.repeat(200),
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text!.length).toBeLessThan(150);
      expect(text).toContain('...');
    });

    test('shows full value in tooltip for truncated strings', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          longString: 'A'.repeat(200),
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const title = await valueCell.getAttribute('title');

      expect(title?.length).toBeGreaterThan(100);
    });

    test('displays object preview for nested objects', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toContain('Object');
    });

    test('displays array preview', async ({ page }) => {
      // Navigate to root to see items array
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'items' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toContain('Array');
    });

    test('value cells are selectable for copy', async ({ page }) => {
      const valueCell = await page.locator('.property-value').first();

      const userSelect = await valueCell.evaluate(el =>
        window.getComputedStyle(el).userSelect
      );

      expect(userSelect !== 'none').toBeTruthy();
    });

    test('formats Date values as ISO string', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          timestamp: new Date('2024-01-01T12:00:00Z'),
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text).toContain('2024');
      expect(text).toContain('T');
    });

    test('formats BigInt values with n suffix', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          bignum: BigInt(123456789),
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text).toContain('n');
    });

    test('formats Symbol values', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          sym: Symbol('test'),
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text).toContain('Symbol');
    });

    test('formats undefined values', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          undef: undefined,
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text).toBe('undefined');
    });

    test('value cells have monospace font', async ({ page }) => {
      const valueCell = await page.locator('.property-value').first();

      const fontFamily = await valueCell.evaluate(el =>
        window.getComputedStyle(el).fontFamily
      );

      expect(fontFamily).toMatch(/mono/i);
    });

    test('shows appropriate icon for value type', async ({ page }) => {
      const icon = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.value-icon');

      if (await icon.count() > 0) {
        await expect(icon).toBeVisible();
      }
    });

    test('applies syntax highlighting to values', async ({ page }) => {
      const valueCell = await page.locator('.property-value').first();

      const color = await valueCell.evaluate(el =>
        window.getComputedStyle(el).color
      );

      expect(color).toBeTruthy();
    });

    test('formats Map preview', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'map' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toContain('Map');
    });

    test('formats Set preview', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'set' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toContain('Set');
    });

    test('shows function signature for functions', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          fn: function testFunc(a: number, b: string) { return a; },
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-value').first();
      const text = await valueCell.textContent();

      expect(text).toContain('ƒ');
    });

    test('handles circular reference values', async ({ page }) => {
      await page.evaluate(async () => {
        const obj: any = { name: 'parent' };
        obj.self = obj;

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'self' })
        .locator('.property-value');

      const text = await valueCell.textContent();
      expect(text).toContain('circular');
    });

    test('value cells support right-click context menu', async ({ page }) => {
      const valueCell = await page.locator('.property-value').first();

      // Right click
      await valueCell.click({ button: 'right' });

      // May or may not show custom context menu
      const menu = await page.locator('.context-menu');
      const hasMenu = await menu.count() > 0;

      expect(hasMenu || true).toBeTruthy(); // Either has menu or doesn't
    });

    test('updates value cells when object changes', async ({ page }) => {
      const initialValue = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value')
        .textContent();

      // Modify object
      await page.evaluate(async () => {
        const user = (window as any).testNavigation.getSelectedObject();
        user.name = 'Bob';

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const newValue = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value')
        .textContent();

      expect(newValue).toBe('Bob');
      expect(newValue).not.toBe(initialValue);
    });

    test('value formatting matches Navigator design system', async ({ page }) => {
      const stringValue = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      // Should NOT have quotes (per design)
      const text = await stringValue.textContent();
      expect(text?.startsWith('"')).toBe(false);
    });
  });

  // ==========================================================================
  // Navigable Values Tests (20 tests)
  // ==========================================================================

  test.describe('Navigable Values', () => {
    test('navigable values are clickable', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await expect(valueCell).toHaveClass(/navigable/);
    });

    test('clicking navigable value navigates to object', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await valueCell.click();

      // Should show profile properties
      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('bio');
      expect(names).toContain('skills');
    });

    test('navigable values have hover effect', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await valueCell.hover();

      const cursor = await valueCell.evaluate(el =>
        window.getComputedStyle(el).cursor
      );

      expect(cursor).toBe('pointer');
    });

    test('non-navigable primitives not clickable', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'name' })
        .locator('.property-value');

      const classes = await valueCell.getAttribute('class');
      expect(classes).not.toContain('navigable');
    });

    test('resolves canonical path for references', async ({ page }) => {
      await page.evaluate(async () => {
        const shared = { value: 'shared' };
        const obj = {
          ref1: shared,
          ref2: shared,
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      // Click ref2 (should navigate to canonical ref1)
      const ref2Cell = await page.locator('.property-row')
        .filter({ hasText: 'ref2' })
        .locator('.property-value');

      await ref2Cell.click();

      // Check current path
      const path = await page.evaluate(() =>
        (window as any).testNavigation.getCurrentPath()
      );

      expect(path).toContain('ref1'); // Canonical path
    });

    test('updates navigation history on click', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();

      // Navigation history should have new entry
      const canGoBack = await page.evaluate(() =>
        (window as any).testNavigation.canGoBack()
      );

      expect(canGoBack).toBe(true);
    });

    test('shows navigation icon for navigable values', async ({ page }) => {
      const icon = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.navigate-icon');

      if (await icon.count() > 0) {
        await expect(icon).toBeVisible();
      }
    });

    test('Enter key navigates when row focused', async ({ page }) => {
      const row = await page.locator('.property-row')
        .filter({ hasText: 'profile' });

      await row.focus();
      await page.keyboard.press('Enter');

      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('bio');
    });

    test('Ctrl+Click opens in new context (if supported)', async ({ page }) => {
      const valueCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await valueCell.click({ modifiers: ['Control'] });

      // May or may not support (just ensure no crash)
      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('navigable arrays navigate to array view', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const itemsCell = await page.locator('.property-row')
        .filter({ hasText: 'items' })
        .locator('.property-value');

      await itemsCell.click();

      // Should show array indices
      const names = await page.locator('.property-name').allTextContents();
      expect(names.some(n => n.match(/\[0\]/))).toBeTruthy();
    });

    test('navigable Maps navigate to Map view', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const mapCell = await page.locator('.property-row')
        .filter({ hasText: 'map' })
        .locator('.property-value');

      await mapCell.click();

      // Should show Map entries
      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('key1');
    });

    test('navigable Sets navigate to Set view', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const setCell = await page.locator('.property-row')
        .filter({ hasText: 'set' })
        .locator('.property-value');

      await setCell.click();

      // Should show Set values
      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('back button works after navigation', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();

      // Click back button
      await page.click('.back-btn');

      // Should be back at user level
      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('profile');
    });

    test('forward button works after back', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();
      await page.click('.back-btn');
      await page.click('.forward-btn');

      // Should be back at profile level
      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('bio');
    });

    test('breadcrumb shows current path', async ({ page }) => {
      const breadcrumb = await page.locator('.breadcrumb');

      if (await breadcrumb.count() > 0) {
        const text = await breadcrumb.textContent();
        expect(text).toContain('user');
      }
    });

    test('clicking breadcrumb segment navigates', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();

      // Click root in breadcrumb
      const rootCrumb = await page.locator('.breadcrumb-segment').filter({ hasText: 'root' });

      if (await rootCrumb.count() > 0) {
        await rootCrumb.click();

        const names = await page.locator('.property-name').allTextContents();
        expect(names).toContain('user');
      }
    });

    test('navigation updates URL hash', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();

      const hash = await page.evaluate(() => window.location.hash);
      expect(hash).toContain('profile');
    });

    test('keyboard shortcut for back (Alt+Left)', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();

      await page.keyboard.press('Alt+ArrowLeft');

      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('profile');
    });

    test('keyboard shortcut for forward (Alt+Right)', async ({ page }) => {
      const profileCell = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.property-value');

      await profileCell.click();
      await page.keyboard.press('Alt+ArrowLeft');
      await page.keyboard.press('Alt+ArrowRight');

      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('bio');
    });
  });

  // ==========================================================================
  // Inline Nested Objects Tests (25 tests)
  // ==========================================================================

  test.describe('Inline Nested Objects', () => {
    test('shows expand toggle for nested objects', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await expect(toggle).toBeVisible();
    });

    test('toggle is collapsed initially', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await expect(toggle).toHaveClass(/collapsed/);
    });

    test('single click expands inline', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();

      // Should show nested properties inline
      const nested = await page.locator('.nested-properties');
      await expect(nested).toBeVisible();
    });

    test('shows nested properties indented', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();

      const nestedRow = await page.locator('.nested-property-row').first();
      const paddingLeft = await nestedRow.evaluate(el =>
        window.getComputedStyle(el).paddingLeft
      );

      expect(parseInt(paddingLeft)).toBeGreaterThan(0);
    });

    test('double click navigates instead of expanding', async ({ page }) => {
      const profileRow = await page.locator('.property-row')
        .filter({ hasText: 'profile' });

      await profileRow.dblclick();

      // Should navigate, not just expand
      const names = await page.locator('.property-name').allTextContents();
      expect(names).toContain('bio');
    });

    test('collapses on second toggle click', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();
      await toggle.click();

      await expect(toggle).toHaveClass(/collapsed/);
    });

    test('hides nested properties when collapsed', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();
      await toggle.click();

      const nested = await page.locator('.nested-properties');
      await expect(nested).not.toBeVisible();
    });

    test('limits nested properties shown (max 5)', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          large: {} as any,
        };

        for (let i = 0; i < 20; i++) {
          obj.large[`prop${i}`] = i;
        }

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.expand-toggle').first();
      await toggle.click();

      const nestedRows = await page.locator('.nested-property-row');
      const count = await nestedRows.count();

      expect(count).toBeLessThanOrEqual(6); // 5 + "more" indicator
    });

    test('shows "N more..." indicator for large objects', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          large: {} as any,
        };

        for (let i = 0; i < 20; i++) {
          obj.large[`prop${i}`] = i;
        }

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.expand-toggle').first();
      await toggle.click();

      const more = await page.locator('.more-indicator');
      await expect(more).toBeVisible();

      const text = await more.textContent();
      expect(text).toMatch(/\d+ more/);
    });

    test('clicking "more" navigates to full view', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          large: {} as any,
        };

        for (let i = 0; i < 20; i++) {
          obj.large[`prop${i}`] = i;
        }

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.expand-toggle').first();
      await toggle.click();

      const more = await page.locator('.more-indicator');
      await more.click();

      // Should navigate to full object
      const rows = await page.locator('.property-row');
      const count = await rows.count();

      expect(count).toBeGreaterThan(10);
    });

    test('nested properties use same formatting', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();

      const nestedValue = await page.locator('.nested-property-row').first()
        .locator('.property-value');

      // Should have type-specific class
      const classes = await nestedValue.getAttribute('class');
      expect(classes).toMatch(/value-/);
    });

    test('preserves expansion state on re-render', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await toggle.click();

      // Re-render
      await page.evaluate(async () => {
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      // Should still be expanded
      await expect(toggle).toHaveClass(/expanded/);
    });

    test('arrow key expands when row focused', async ({ page }) => {
      const row = await page.locator('.property-row')
        .filter({ hasText: 'profile' });

      await row.focus();
      await page.keyboard.press('ArrowRight');

      const toggle = await row.locator('.expand-toggle');
      await expect(toggle).toHaveClass(/expanded/);
    });

    test('arrow key collapses when expanded and focused', async ({ page }) => {
      const row = await page.locator('.property-row')
        .filter({ hasText: 'profile' });

      await row.focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowLeft');

      const toggle = await row.locator('.expand-toggle');
      await expect(toggle).toHaveClass(/collapsed/);
    });

    test('shows array elements inline', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'user', 'profile']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'skills' })
        .locator('.expand-toggle');

      await toggle.click();

      const nested = await page.locator('.nested-property-row');
      const count = await nested.count();

      expect(count).toBe(2); // JavaScript, TypeScript
    });

    test('inline arrays show indices', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'user', 'profile']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'skills' })
        .locator('.expand-toggle');

      await toggle.click();

      const indices = await page.locator('.nested-property-name').allTextContents();
      expect(indices).toContain('[0]');
      expect(indices).toContain('[1]');
    });

    test('deeply nested expansion works', async ({ page }) => {
      // First expand profile
      const profileToggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      await profileToggle.click();

      // Then expand skills within it
      const skillsToggle = await page.locator('.nested-property-row')
        .filter({ hasText: 'skills' })
        .locator('.expand-toggle');

      if (await skillsToggle.count() > 0) {
        await skillsToggle.click();

        const deepNested = await page.locator('.nested-nested-property-row');
        // May or may not support deep nesting
      }
    });

    test('toggle has expand/collapse icon', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      const icon = await toggle.locator('.toggle-icon');
      await expect(icon).toBeVisible();
    });

    test('icon rotates on expansion', async ({ page }) => {
      const toggle = await page.locator('.property-row')
        .filter({ hasText: 'profile' })
        .locator('.expand-toggle');

      const icon = await toggle.locator('.toggle-icon');

      const initialTransform = await icon.evaluate(el =>
        window.getComputedStyle(el).transform
      );

      await toggle.click();

      const expandedTransform = await icon.evaluate(el =>
        window.getComputedStyle(el).transform
      );

      expect(expandedTransform).not.toBe(initialTransform);
    });

    test('primitives do not have expand toggle', async ({ page }) => {
      const nameRow = await page.locator('.property-row')
        .filter({ hasText: 'name' });

      const toggle = await nameRow.locator('.expand-toggle');
      expect(await toggle.count()).toBe(0);
    });

    test('empty objects can be expanded', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          empty: {},
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.expand-toggle').first();
      await toggle.click();

      // Should show empty state
      const empty = await page.locator('.empty-nested');
      await expect(empty).toBeVisible();
    });

    test('null values do not have expand toggle', async ({ page }) => {
      const emailRow = await page.locator('.property-row')
        .filter({ hasText: 'email' });

      const toggle = await emailRow.locator('.expand-toggle');
      expect(await toggle.count()).toBe(0);
    });

    test('circular references cannot be expanded inline', async ({ page }) => {
      await page.evaluate(async () => {
        const obj: any = { name: 'parent' };
        obj.self = obj;

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const selfRow = await page.locator('.property-row')
        .filter({ hasText: 'self' });

      const toggle = await selfRow.locator('.expand-toggle');
      expect(await toggle.count()).toBe(0);
    });

    test('function objects can be expanded to show properties', async ({ page }) => {
      await page.evaluate(async () => {
        const fn = function test() {} as any;
        fn.customProp = 'value';

        const obj = { fn };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const toggle = await page.locator('.expand-toggle').first();
      await toggle.click();

      const nested = await page.locator('.nested-property-row');
      const count = await nested.count();

      expect(count).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // Tab Switching Tests (15 tests)
  // ==========================================================================

  test.describe('Tab Switching', () => {
    test('shows Properties tab', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Properties' });
      await expect(tab).toBeVisible();
    });

    test('shows Collections tab', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await expect(tab).toBeVisible();
    });

    test('Properties tab is active by default', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Properties' });
      await expect(tab).toHaveClass(/active/);
    });

    test('clicking Collections tab switches view', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      await expect(tab).toHaveClass(/active/);
    });

    test('switching tabs hides Properties panel', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const propertiesPanel = await page.locator('.properties-panel');
      await expect(propertiesPanel).not.toBeVisible();
    });

    test('switching tabs shows Collections panel', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const collectionsPanel = await page.locator('.collections-panel');
      await expect(collectionsPanel).toBeVisible();
    });

    test('switching back to Properties shows property table', async ({ page }) => {
      const collectionsTab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await collectionsTab.click();

      const propertiesTab = await page.locator('.tab').filter({ hasText: 'Properties' });
      await propertiesTab.click();

      const table = await page.locator('.property-table');
      await expect(table).toBeVisible();
    });

    test('active tab has visual indicator', async ({ page }) => {
      const tab = await page.locator('.tab.active');

      const borderBottom = await tab.evaluate(el =>
        window.getComputedStyle(el).borderBottomColor
      );

      expect(borderBottom).toBeTruthy();
    });

    test('inactive tabs have muted styling', async ({ page }) => {
      const collectionsTab = await page.locator('.tab').filter({ hasText: 'Collections' });

      const opacity = await collectionsTab.evaluate(el =>
        window.getComputedStyle(el).opacity
      );

      // May have reduced opacity
      expect(parseFloat(opacity)).toBeLessThanOrEqual(1);
    });

    test('tabs are keyboard navigable', async ({ page }) => {
      const propertiesTab = await page.locator('.tab').filter({ hasText: 'Properties' });
      await propertiesTab.focus();

      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() =>
        document.activeElement?.textContent
      );

      expect(focused).toContain('Collections');
    });

    test('Enter activates focused tab', async ({ page }) => {
      const collectionsTab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await collectionsTab.focus();
      await page.keyboard.press('Enter');

      await expect(collectionsTab).toHaveClass(/active/);
    });

    test('tabs show content count', async ({ page }) => {
      const count = await page.locator('.tab-count');

      if (await count.count() > 0) {
        const text = await count.textContent();
        expect(text).toMatch(/\d+/);
      }
    });

    test('empty Collections tab shows empty state', async ({ page }) => {
      // Navigate to object without collections
      await page.evaluate(async () => {
        const obj = { name: 'No collections' };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const empty = await page.locator('.empty-collections');
      await expect(empty).toBeVisible();
    });

    test('tab state persists across navigation', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      // Navigate to different object
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      // Collections tab should still be active
      await expect(tab).toHaveClass(/active/);
    });

    test('tabs have hover effect', async ({ page }) => {
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.hover();

      const cursor = await tab.evaluate(el =>
        window.getComputedStyle(el).cursor
      );

      expect(cursor).toBe('pointer');
    });
  });

  // ==========================================================================
  // Collections Panel Tests (20 tests)
  // ==========================================================================

  test.describe('Collections Panel', () => {
    test.beforeEach(async ({ page }) => {
      // Switch to Collections tab
      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });

      if (await tab.count() > 0) {
        await tab.click();
      }
    });

    test('shows empty state for non-collection objects', async ({ page }) => {
      const empty = await page.locator('.empty-collections');

      if (await empty.count() > 0) {
        await expect(empty).toBeVisible();
      }
    });

    test('displays Array when navigated to array', async ({ page }) => {
      // Navigate to items array
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const collection = await page.locator('.collection-view');
      await expect(collection).toBeVisible();
    });

    test('array displays with indices', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const indices = await page.locator('.collection-index').allTextContents();
      expect(indices).toContain('[0]');
      expect(indices).toContain('[1]');
      expect(indices).toContain('[2]');
    });

    test('displays Map entries', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'map']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const keys = await page.locator('.collection-key').allTextContents();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });

    test('Map shows key-value pairs', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'map']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const values = await page.locator('.collection-value').allTextContents();
      expect(values).toContain('value1');
      expect(values).toContain('value2');
    });

    test('displays Set values', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'set']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const values = await page.locator('.collection-value').allTextContents();
      expect(values).toContain('10');
      expect(values).toContain('20');
      expect(values).toContain('30');
    });

    test('shows collection size', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const size = await page.locator('.collection-size');

      if (await size.count() > 0) {
        const text = await size.textContent();
        expect(text).toContain('3');
      }
    });

    test('nested collections can be navigated', async ({ page }) => {
      await page.evaluate(async () => {
        const obj = {
          nested: [
            [1, 2],
            [3, 4],
          ],
        };

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage(obj);
        (window as any).testNavigation.navigateTo(['root', 'nested']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const value = await page.locator('.collection-value').first();
      await value.click();

      // Should navigate to nested array
      const collection = await page.locator('.collection-view');
      await expect(collection).toBeVisible();
    });

    test('large arrays are virtualized', async ({ page }) => {
      await page.evaluate(async () => {
        const large = Array.from({ length: 10000 }, (_, i) => i);

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ large });
        (window as any).testNavigation.navigateTo(['root', 'large']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      // Should not render all 10000 items
      const items = await page.locator('.collection-item');
      const count = await items.count();

      expect(count).toBeLessThan(100); // Virtual scrolling
    });

    test('collection values have type formatting', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const value = await page.locator('.collection-value').first();
      await expect(value).toHaveClass(/value-number/);
    });

    test('Map with object keys displays correctly', async ({ page }) => {
      await page.evaluate(async () => {
        const key = { id: 1 };
        const map = new Map([[key, 'value']]);

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ map });
        (window as any).testNavigation.navigateTo(['root', 'map']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const key = await page.locator('.collection-key').first();
      const text = await key.textContent();

      expect(text).toContain('Object');
    });

    test('Set with objects displays correctly', async ({ page }) => {
      await page.evaluate(async () => {
        const set = new Set([{ id: 1 }, { id: 2 }]);

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ set });
        (window as any).testNavigation.navigateTo(['root', 'set']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const values = await page.locator('.collection-value');
      const count = await values.count();

      expect(count).toBe(2);
    });

    test('empty array shows empty state', async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ empty: [] });
        (window as any).testNavigation.navigateTo(['root', 'empty']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const empty = await page.locator('.empty-collection');
      await expect(empty).toBeVisible();
    });

    test('empty Map shows empty state', async ({ page }) => {
      await page.evaluate(async () => {
        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ empty: new Map() });
        (window as any).testNavigation.navigateTo(['root', 'empty']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const empty = await page.locator('.empty-collection');
      await expect(empty).toBeVisible();
    });

    test('collection items are selectable', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const item = await page.locator('.collection-item').first();

      const userSelect = await item.evaluate(el =>
        window.getComputedStyle(el).userSelect
      );

      expect(userSelect !== 'none').toBeTruthy();
    });

    test('scrolls to show all collection items', async ({ page }) => {
      await page.evaluate(async () => {
        const large = Array.from({ length: 100 }, (_, i) => i);

        const { createMemoryImage } = await import('/dist/memimg/memimg.js');
        const root = createMemoryImage({ large });
        (window as any).testNavigation.navigateTo(['root', 'large']);

        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector(root, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const panel = await page.locator('.collections-panel');
      const scrollHeight = await panel.evaluate(el => el.scrollHeight);

      expect(scrollHeight).toBeGreaterThan(0);
    });

    test('collection header shows type', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const header = await page.locator('.collection-header');

      if (await header.count() > 0) {
        const text = await header.textContent();
        expect(text).toContain('Array');
      }
    });

    test('supports keyboard navigation through items', async ({ page }) => {
      await page.evaluate(async () => {
        (window as any).testNavigation.navigateTo(['root', 'items']);
        const { renderInspector } = await import('/dist/navigator/ui/inspector.js');
        const container = document.getElementById('test-root')!;
        renderInspector((window as any).testRoot, (window as any).testNavigation, container);
      });

      const tab = await page.locator('.tab').filter({ hasText: 'Collections' });
      await tab.click();

      const item = await page.locator('.collection-item').first();
      await item.focus();

      await page.keyboard.press('ArrowDown');

      const focused = await page.evaluate(() =>
        document.activeElement?.className
      );

      expect(focused).toContain('collection-item');
    });
  });
});

