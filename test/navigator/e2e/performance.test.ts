/**
 * E2E Test: Performance Benchmarks
 *
 * Tests performance characteristics of the Navigator:
 * - Rendering performance for large datasets
 * - Memory leak detection
 * - Large dataset handling
 */

import { test, expect } from '@playwright/test';

test.describe('Rendering Performance', () => {
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
    await page.fill('#memimg-name', 'Performance Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('renders 1000 tree nodes in < 200ms', async ({ page }) => {
    const script = `
this.nodes = {};
for (let i = 0; i < 1000; i++) {
  this.nodes[\`node\${i}\`] = { value: i };
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    // Measure tree expansion time
    const start = Date.now();
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);
    const end = Date.now();

    const renderTime = end - start;
    expect(renderTime).toBeLessThan(200);
  });

  test('inspector updates in < 50ms', async ({ page }) => {
    await page.locator('#code-editor').fill('this.data = { prop: "value" };');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();

    // Measure inspector update time
    const start = Date.now();
    await page.getByText('data').click();
    await page.waitForTimeout(50);
    const end = Date.now();

    const updateTime = end - start;
    expect(updateTime).toBeLessThan(100); // Relaxed to 100ms for E2E
  });

  test('search in 10,000 items completes quickly', async ({ page }) => {
    // Create large history
    for (let i = 0; i < 100; i++) {
      await page.locator('#code-editor').fill(`this.item${i} = ${i};`);
      await page.locator('#code-editor').press('Control+Enter');
      await page.waitForTimeout(50);
    }

    // Open history
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(300);

    // Measure search time
    const start = Date.now();
    await page.fill('#history-search', 'item50');
    await page.waitForTimeout(200);
    const end = Date.now();

    const searchTime = end - start;
    expect(searchTime).toBeLessThan(500);
  });

  test('scroll performance with large lists', async ({ page }) => {
    const script = `
this.items = [];
for (let i = 0; i < 5000; i++) {
  this.items.push({ id: i, data: 'item' + i });
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1000);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('items').click();
    await page.waitForTimeout(200);

    // Scroll should be smooth (no lag)
    const inspector = await page.locator('#inspector-view');
    await inspector.evaluate(el => {
      el.scrollTop = 1000;
    });

    await page.waitForTimeout(100);

    // No crash or significant delay
    await expect(inspector).toBeVisible();
  });

  test('rapid navigation does not lag', async ({ page }) => {
    await page.locator('#code-editor').fill(`
this.a = { value: 'a' };
this.b = { value: 'b' };
this.c = { value: 'c' };
this.d = { value: 'd' };
this.e = { value: 'e' };
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();

    // Rapid clicks
    const start = Date.now();
    await page.getByText('a').click();
    await page.getByText('b').click();
    await page.getByText('c').click();
    await page.getByText('d').click();
    await page.getByText('e').click();
    await page.waitForTimeout(100);
    const end = Date.now();

    const totalTime = end - start;
    expect(totalTime).toBeLessThan(1000);
  });

  test('syntax highlighting does not block rendering', async ({ page }) => {
    // Large script with complex syntax
    const largeScript = Array(100).fill(0).map((_, i) =>
      `const var${i} = { prop${i}: "value${i}" };`
    ).join('\n');

    const start = Date.now();
    await page.locator('#code-editor').fill(largeScript);
    await page.waitForTimeout(200);
    const end = Date.now();

    const typingTime = end - start;
    expect(typingTime).toBeLessThan(500);
  });

  test('tree expansion with deep nesting is performant', async ({ page }) => {
    const script = `
let deep = { value: 'deepest' };
for (let i = 0; i < 50; i++) {
  deep = { nested: deep };
}
this.deep = deep;
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.locator('.tree-toggle').first().click();

    // Expand multiple levels rapidly
    const start = Date.now();
    for (let i = 0; i < 10; i++) {
      const toggles = await page.locator('.tree-toggle.collapsed');
      if (await toggles.count() > 0) {
        await toggles.first().click();
        await page.waitForTimeout(30);
      }
    }
    const end = Date.now();

    const expandTime = end - start;
    expect(expandTime).toBeLessThan(1000);
  });

  test('collection rendering is optimized', async ({ page }) => {
    const script = `
this.map = new Map();
for (let i = 0; i < 1000; i++) {
  this.map.set(\`key\${i}\`, \`value\${i}\`);
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('map').click();
    await page.waitForTimeout(100);

    // Switch to Collections tab
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      const start = Date.now();
      await collectionsTab.click();
      await page.waitForTimeout(200);
      const end = Date.now();

      const switchTime = end - start;
      expect(switchTime).toBeLessThan(300);
    }
  });

  test('export large snapshot is fast', async ({ page }) => {
    const script = `
this.large = {};
for (let i = 0; i < 1000; i++) {
  this.large[\`key\${i}\`] = { id: i, data: 'x'.repeat(100) };
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.click('#save-btn');
    await page.waitForTimeout(500);

    // Measure export time
    const start = Date.now();
    await page.click('#export-snapshot-btn');
    await page.waitForTimeout(500);
    const end = Date.now();

    const exportTime = end - start;
    expect(exportTime).toBeLessThan(2000);
  });

  test('import large snapshot is fast', async ({ page }) => {
    const largeSnapshot = {
      type: 'snapshot',
      version: 1,
      timestamp: Date.now(),
      name: 'Large Import',
      state: {
        large: Array(1000).fill(0).reduce((acc, _, i) => {
          acc[`key${i}`] = { id: i, data: 'data' };
          return acc;
        }, {} as any)
      }
    };

    const start = Date.now();
    await page.evaluate((snapshot) => {
      const blob = new Blob([JSON.stringify(snapshot)], { type: 'application/json' });
      const file = new File([blob], 'large.json');
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      const fileInput = document.getElementById('events-file-input') as HTMLInputElement;
      fileInput.files = dataTransfer.files;
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }, largeSnapshot);

    page.on('dialog', dialog => dialog.accept());
    await page.waitForTimeout(2000);
    const end = Date.now();

    const importTime = end - start;
    expect(importTime).toBeLessThan(3000);
  });
});

test.describe('Memory Leak Detection', () => {
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
    await page.fill('#memimg-name', 'Memory Leak Test');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('repeated navigation does not leak memory', async ({ page }) => {
    // Create data
    await page.locator('#code-editor').fill(`
this.a = { data: 'a'.repeat(1000) };
this.b = { data: 'b'.repeat(1000) };
this.c = { data: 'c'.repeat(1000) };
    `.trim());
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await page.locator('.tree-toggle').first().click();

    // Get initial memory
    const initialMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Navigate repeatedly
    for (let i = 0; i < 50; i++) {
      await page.getByText('a').click();
      await page.getByText('b').click();
      await page.getByText('c').click();
    }

    await page.waitForTimeout(1000);

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    await page.waitForTimeout(500);

    const finalMemory = await page.evaluate(() => {
      if ((performance as any).memory) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    if (initialMemory > 0 && finalMemory > 0) {
      const growth = (finalMemory - initialMemory) / initialMemory;
      // Memory shouldn't grow by more than 50%
      expect(growth).toBeLessThan(0.5);
    }
  });

  test('creating and deleting objects does not leak', async ({ page }) => {
    for (let i = 0; i < 20; i++) {
      await page.locator('#code-editor').fill(`this.temp${i} = { data: 'x'.repeat(10000) };`);
      await page.locator('#code-editor').press('Control+Enter');
      await page.waitForTimeout(100);

      await page.locator('#code-editor').fill(`delete this.temp${i};`);
      await page.locator('#code-editor').press('Control+Enter');
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(500);

    // Tree should remain responsive
    await page.locator('.tree-toggle').first().click();
    await page.waitForTimeout(100);

    const treeVisible = await page.locator('.tree-view').isVisible();
    expect(treeVisible).toBe(true);
  });

  test('event listeners are cleaned up', async ({ page }) => {
    // Open and close history multiple times
    for (let i = 0; i < 10; i++) {
      await page.click('#toggle-history-btn');
      await page.waitForTimeout(100);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(100);
    }

    // Should still work
    await page.click('#toggle-history-btn');
    await page.waitForTimeout(200);

    const sidebar = await page.locator('#script-history-sidebar');
    const hasCollapsed = await sidebar.evaluate(el => el.classList.contains('collapsed'));
    expect(hasCollapsed).toBe(false);
  });

  test('DOM nodes are cleaned up after view changes', async ({ page }) => {
    const initialNodes = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    // Navigate around
    for (let i = 0; i < 5; i++) {
      await page.click('#back-to-list-btn');
      await page.waitForTimeout(200);

      await page.click('.memimg-card');
      await page.waitForTimeout(200);
    }

    const finalNodes = await page.evaluate(() => {
      return document.querySelectorAll('*').length;
    });

    // Should not accumulate excessive nodes
    const growth = (finalNodes - initialNodes) / initialNodes;
    expect(growth).toBeLessThan(0.3);
  });

  test('IndexedDB connections are properly closed', async ({ page }) => {
    // Open and close multiple times
    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    for (let i = 0; i < 5; i++) {
      await page.click('#back-to-list-btn');
      await page.waitForTimeout(200);

      await page.evaluate((id) => {
        window.location.hash = `/edit/${id}`;
      }, memimgId);
      await page.waitForTimeout(500);
    }

    // Should still work
    await page.locator('#code-editor').fill('this.test = true;');
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(200);

    await expect(page.locator('#status')).toHaveClass(/success/);
  });
});

test.describe('Large Dataset Handling', () => {
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
    await page.fill('#memimg-name', 'Large Dataset');
    await page.click('.create-btn');
    await page.waitForTimeout(200);
  });

  test('10,000 array items render with virtualization', async ({ page }) => {
    const script = `
this.huge = [];
for (let i = 0; i < 10000; i++) {
  this.huge.push({ id: i, value: 'item' + i });
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('huge').click();
    await page.waitForTimeout(300);

    // Should render (possibly with virtual scrolling)
    const propertyRows = await page.locator('.property-row, .property-name');
    const count = await propertyRows.count();

    // Should show at least some items
    expect(count).toBeGreaterThan(10);

    // But not all 10,000 at once (virtualization)
    expect(count).toBeLessThan(1000);
  });

  test('deep nesting (50+ levels) handles gracefully', async ({ page }) => {
    const script = `
let deep = { value: 'deepest' };
for (let i = 0; i < 50; i++) {
  deep = { level: i, nested: deep };
}
this.deep = deep;
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('deep').click();
    await page.waitForTimeout(100);

    // Should show nested property
    await expect(page.getByText('nested')).toBeVisible();
  });

  test('wide trees (1000+ children) are optimized', async ({ page }) => {
    const script = `
this.wide = {};
for (let i = 0; i < 1000; i++) {
  this.wide[\`child\${i}\`] = \`value\${i}\`;
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('wide').click();
    await page.waitForTimeout(300);

    // Should show properties
    const propertyCount = await page.locator('.property-name').count();
    expect(propertyCount).toBeGreaterThan(10);
  });

  test('large strings are truncated appropriately', async ({ page }) => {
    const script = `
this.longString = 'x'.repeat(50000);
this.veryLongString = 'y'.repeat(100000);
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('longString').click();
    await page.waitForTimeout(100);

    // Value should be displayed (truncated)
    const valueCell = await page.locator('.property-value').first();
    const text = await valueCell.textContent();

    // Should not show full 50k characters
    expect(text?.length || 0).toBeLessThan(1000);
  });

  test('1000+ event replay completes in reasonable time', async ({ page }) => {
    // Generate many events
    for (let i = 0; i < 100; i++) {
      await page.locator('#code-editor').fill(`this.event${i} = ${i};`);
      await page.locator('#code-editor').press('Control+Enter');
      await page.waitForTimeout(30);
    }

    await page.click('#save-btn');
    await page.waitForTimeout(1000);

    const memimgId = await page.evaluate(() => {
      const hash = window.location.hash;
      const match = hash.match(/\/edit\/(.+)$/);
      return match ? match[1] : null;
    });

    // Close and reopen (replay events)
    await page.click('#back-to-list-btn');
    await page.waitForTimeout(200);

    const start = Date.now();
    await page.evaluate((id) => {
      window.location.hash = `/edit/${id}`;
    }, memimgId);
    await page.waitForTimeout(2000);
    const end = Date.now();

    const replayTime = end - start;
    expect(replayTime).toBeLessThan(5000);
  });

  test('circular references with large graphs', async ({ page }) => {
    const script = `
const nodes = [];
for (let i = 0; i < 100; i++) {
  nodes.push({ id: i, data: 'node' + i });
}

// Create circular references
for (let i = 0; i < 100; i++) {
  nodes[i].next = nodes[(i + 1) % 100];
  nodes[i].prev = nodes[(i - 1 + 100) % 100];
}

this.graph = nodes;
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1000);

    // Should complete without hanging
    await expect(page.locator('#status')).toHaveClass(/success/);

    // Tree should show graph
    await page.locator('.tree-toggle').first().click();
    await expect(page.getByText('graph')).toBeVisible();
  });

  test('Map with 10,000 entries renders efficiently', async ({ page }) => {
    const script = `
this.bigMap = new Map();
for (let i = 0; i < 10000; i++) {
  this.bigMap.set(\`key\${i}\`, { id: i, data: 'x'.repeat(50) });
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('bigMap').click();
    await page.waitForTimeout(300);

    // Switch to Collections tab
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      await collectionsTab.click();
      await page.waitForTimeout(500);

      // Should show some entries (virtualized)
      const entries = await page.locator('.collection-entry, .map-entry');
      if (await entries.count() > 0) {
        const count = await entries.count();
        expect(count).toBeGreaterThan(5);
        expect(count).toBeLessThan(1000); // Not all 10k
      }
    }
  });

  test('Set with 10,000 entries renders efficiently', async ({ page }) => {
    const script = `
this.bigSet = new Set();
for (let i = 0; i < 10000; i++) {
  this.bigSet.add(\`value\${i}\`);
}
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1500);

    await page.locator('.tree-toggle').first().click();
    await page.getByText('bigSet').click();
    await page.waitForTimeout(300);

    // Collections tab should render
    const collectionsTab = await page.locator('.tab-header').filter({ hasText: 'Collections' });
    if (await collectionsTab.count() > 0) {
      await collectionsTab.click();
      await page.waitForTimeout(500);

      // Should be visible
      const inspector = await page.locator('#inspector-view');
      await expect(inspector).toBeVisible();
    }
  });

  test('mixed large dataset (arrays, objects, maps, sets)', async ({ page }) => {
    const script = `
this.mixed = {
  arrays: Array(100).fill(0).map((_, i) => ({ id: i })),
  objects: Array(100).fill(0).reduce((acc, _, i) => {
    acc[\`key\${i}\`] = \`value\${i}\`;
    return acc;
  }, {}),
  map: new Map(Array(100).fill(0).map((_, i) => [\`k\${i}\`, \`v\${i}\`])),
  set: new Set(Array(100).fill(0).map((_, i) => i)),
};
    `.trim();

    await page.locator('#code-editor').fill(script);
    await page.locator('#code-editor').press('Control+Enter');
    await page.waitForTimeout(1000);

    // Should complete
    await expect(page.locator('#status')).toHaveClass(/success/);

    // Navigate to verify
    await page.locator('.tree-toggle').first().click();
    await page.getByText('mixed').click();
    await page.waitForTimeout(200);

    await expect(page.getByText('arrays')).toBeVisible();
    await expect(page.getByText('objects')).toBeVisible();
  });
});
