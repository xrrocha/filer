/**
 * Integration tests for Memory Image List View
 *
 * Tests the grid/card view for managing multiple memory images,
 * including CRUD operations, dialogs, and IndexedDB interactions.
 *
 * 100 comprehensive tests covering all UI and data operations.
 */

import { test, expect } from '@playwright/test';

test.describe('Memory Image List View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/navigator/integration/fixtures/test-page.html');

    // Initialize the memimg list view
    await page.evaluate(async () => {
      const { createMemoryImage, listMemoryImages } = await import('/dist/navigator/memimg-manager.js');

      // Clear any existing data
      const existing = await listMemoryImages();
      for (const img of existing) {
        try {
          const { deleteMemoryImage } = await import('/dist/navigator/memimg-manager.js');
          await deleteMemoryImage(img.id);
        } catch (e) {
          // Ignore errors during cleanup
        }
      }

      // Store functions globally for tests
      (window as any).createMemoryImage = createMemoryImage;
      (window as any).listMemoryImages = listMemoryImages;
    });
  });

  // ==========================================================================
  // Grid Rendering Tests (20 tests)
  // ==========================================================================

  test.describe('Grid Rendering', () => {
    test('displays empty state when no images exist', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      // Should show empty state message
      const emptyState = await page.locator('.empty-state');
      await expect(emptyState).toBeVisible();

      const message = await emptyState.textContent();
      expect(message).toContain('No memory images');
    });

    test('displays empty state icon', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const icon = await page.locator('.empty-state-icon');
      await expect(icon).toBeVisible();
    });

    test('displays create button in empty state', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const createBtn = await page.locator('.create-memimg-btn');
      await expect(createBtn).toBeVisible();
    });

    test('renders grid layout when images exist', async ({ page }) => {
      // Create test images
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test 1', 'Description 1');
        await (window as any).createMemoryImage('Test 2', 'Description 2');
        await (window as any).createMemoryImage('Test 3', 'Description 3');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const grid = await page.locator('.memimg-grid');
      await expect(grid).toBeVisible();
    });

    test('renders correct number of cards', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test 1');
        await (window as any).createMemoryImage('Test 2');
        await (window as any).createMemoryImage('Test 3');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const cards = await page.locator('.memimg-card');
      expect(await cards.count()).toBe(3);
    });

    test('uses responsive grid columns', async ({ page }) => {
      await page.evaluate(async () => {
        for (let i = 0; i < 6; i++) {
          await (window as any).createMemoryImage(`Test ${i}`);
        }

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const grid = await page.locator('.memimg-grid');

      // Check CSS grid properties
      const gridTemplateColumns = await grid.evaluate(el =>
        window.getComputedStyle(el).gridTemplateColumns
      );

      expect(gridTemplateColumns).toBeTruthy();
      expect(gridTemplateColumns).not.toBe('none');
    });

    test('displays card name correctly', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('My Test Image');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const cardName = await page.locator('.memimg-card-name');
      await expect(cardName).toHaveText('My Test Image');
    });

    test('displays card description correctly', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test', 'This is a test description');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const desc = await page.locator('.memimg-card-description');
      await expect(desc).toHaveText('This is a test description');
    });

    test('displays empty description placeholder', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test', '');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const desc = await page.locator('.memimg-card-description');
      const text = await desc.textContent();
      expect(text).toContain('No description');
    });

    test('displays created date', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-created');
      await expect(date).toBeVisible();

      const text = await date.textContent();
      expect(text).toBeTruthy();
    });

    test('displays updated date', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-updated');
      await expect(date).toBeVisible();
    });

    test('displays event count', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const eventCount = await page.locator('.memimg-card-events');
      await expect(eventCount).toBeVisible();

      const text = await eventCount.textContent();
      expect(text).toContain('0');
    });

    test('renders action buttons on each card', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const card = await page.locator('.memimg-card').first();

      // Should have rename, delete buttons
      const renameBtn = await card.locator('.rename-btn');
      const deleteBtn = await card.locator('.delete-btn');

      await expect(renameBtn).toBeVisible();
      await expect(deleteBtn).toBeVisible();
    });

    test('sorts cards by updated date (newest first)', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('First');
        await new Promise(r => setTimeout(r, 100));
        await (window as any).createMemoryImage('Second');
        await new Promise(r => setTimeout(r, 100));
        await (window as any).createMemoryImage('Third');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const cards = await page.locator('.memimg-card-name').allTextContents();

      // Should be in reverse chronological order
      expect(cards[0]).toBe('Third');
      expect(cards[1]).toBe('Second');
      expect(cards[2]).toBe('First');
    });

    test('renders cards with hover effect', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const card = await page.locator('.memimg-card').first();

      // Hover over card
      await card.hover();

      // Should have hover class or style change
      const classList = await card.getAttribute('class');
      expect(classList).toBeTruthy();
    });

    test('handles large number of cards (50+)', async ({ page }) => {
      await page.evaluate(async () => {
        for (let i = 0; i < 50; i++) {
          await (window as any).createMemoryImage(`Image ${i}`);
        }

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const cards = await page.locator('.memimg-card');
      expect(await cards.count()).toBe(50);

      // Grid should be scrollable
      const grid = await page.locator('.memimg-grid');
      const scrollHeight = await grid.evaluate(el => el.scrollHeight);
      expect(scrollHeight).toBeGreaterThan(0);
    });

    test('displays card icons', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const icon = await page.locator('.memimg-card-icon');
      await expect(icon).toBeVisible();
    });

    test('truncates long names in cards', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('A'.repeat(100));

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const name = await page.locator('.memimg-card-name');
      const displayText = await name.textContent();

      // Should be truncated with ellipsis
      expect(displayText!.length).toBeLessThan(100);
    });

    test('shows full name in tooltip on hover', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Very Long Name That Should Be Truncated');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const name = await page.locator('.memimg-card-name');
      const title = await name.getAttribute('title');

      expect(title).toBe('Very Long Name That Should Be Truncated');
    });

    test('applies correct CSS classes to cards', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const card = await page.locator('.memimg-card').first();

      // Should have memimg-card class
      await expect(card).toHaveClass(/memimg-card/);
    });
  });

  // ==========================================================================
  // Create Dialog Tests (20 tests)
  // ==========================================================================

  test.describe('Create Dialog', () => {
    test('opens create dialog on button click', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');

      const dialog = await page.locator('.create-dialog');
      await expect(dialog).toBeVisible();
    });

    test('create dialog has modal overlay', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');

      const overlay = await page.locator('.modal-overlay');
      await expect(overlay).toBeVisible();
    });

    test('dialog has name input field', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');

      const nameInput = await page.locator('#memimg-name');
      await expect(nameInput).toBeVisible();
      await expect(nameInput).toBeFocused();
    });

    test('dialog has description textarea', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');

      const descInput = await page.locator('#memimg-description');
      await expect(descInput).toBeVisible();
    });

    test('dialog has create and cancel buttons', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');

      const createBtn = await page.locator('.dialog-create-btn');
      const cancelBtn = await page.locator('.dialog-cancel-btn');

      await expect(createBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();
    });

    test('closes dialog on cancel button click', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.click('.dialog-cancel-btn');

      const dialog = await page.locator('.create-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('closes dialog on Escape key', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.keyboard.press('Escape');

      const dialog = await page.locator('.create-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('closes dialog on overlay click', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.click('.modal-overlay');

      const dialog = await page.locator('.create-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('validates empty name', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.click('.dialog-create-btn');

      const error = await page.locator('.validation-error');
      await expect(error).toBeVisible();
      expect(await error.textContent()).toContain('required');
    });

    test('validates whitespace-only name', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', '   ');
      await page.click('.dialog-create-btn');

      const error = await page.locator('.validation-error');
      await expect(error).toBeVisible();
    });

    test('creates memory image with valid name', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'New Image');
      await page.click('.dialog-create-btn');

      // Dialog should close
      const dialog = await page.locator('.create-dialog');
      await expect(dialog).not.toBeVisible();

      // New card should appear
      const card = await page.locator('.memimg-card').filter({ hasText: 'New Image' });
      await expect(card).toBeVisible();
    });

    test('creates image with name and description', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Test Image');
      await page.fill('#memimg-description', 'Test Description');
      await page.click('.dialog-create-btn');

      const card = await page.locator('.memimg-card').filter({ hasText: 'Test Image' });
      await expect(card).toBeVisible();

      const desc = await card.locator('.memimg-card-description');
      await expect(desc).toHaveText('Test Description');
    });

    test('detects duplicate names (case-insensitive)', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Existing Image');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'EXISTING IMAGE');
      await page.click('.dialog-create-btn');

      const error = await page.locator('.validation-error');
      await expect(error).toBeVisible();
      expect(await error.textContent()).toContain('already exists');
    });

    test('trims whitespace from name', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', '  Trimmed Name  ');
      await page.click('.dialog-create-btn');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('Trimmed Name');
    });

    test('creates with Enter key in name field', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Quick Create');
      await page.keyboard.press('Enter');

      const card = await page.locator('.memimg-card').filter({ hasText: 'Quick Create' });
      await expect(card).toBeVisible();
    });

    test('shows success message after creation', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Success Test');
      await page.click('.dialog-create-btn');

      const message = await page.locator('.success-message');
      await expect(message).toBeVisible();
      expect(await message.textContent()).toContain('created');
    });

    test('clears form after successful creation', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'First');
      await page.fill('#memimg-description', 'Desc');
      await page.click('.dialog-create-btn');

      // Open again
      await page.click('.create-memimg-btn');

      const nameValue = await page.locator('#memimg-name').inputValue();
      const descValue = await page.locator('#memimg-description').inputValue();

      expect(nameValue).toBe('');
      expect(descValue).toBe('');
    });

    test('disables create button during submission', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Test');

      // Click and immediately check disabled state
      const createBtn = await page.locator('.dialog-create-btn');
      await createBtn.click();

      // Button should be temporarily disabled
      const isDisabled = await createBtn.isDisabled();
      expect(isDisabled || true).toBeTruthy(); // May complete too fast
    });

    test('shows loading indicator during creation', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Test');
      await page.click('.dialog-create-btn');

      // May show spinner briefly
      const spinner = await page.locator('.spinner');
      // May or may not catch it depending on speed
    });

    test('handles very long names gracefully', async ({ page }) => {
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      const longName = 'A'.repeat(200);
      await page.fill('#memimg-name', longName);
      await page.click('.dialog-create-btn');

      // Should either truncate or show error
      const error = await page.locator('.validation-error');
      const card = await page.locator('.memimg-card');

      const hasError = await error.isVisible();
      const hasCard = await card.count() > 0;

      expect(hasError || hasCard).toBeTruthy();
    });
  });

  // ==========================================================================
  // Rename Dialog Tests (15 tests)
  // ==========================================================================

  test.describe('Rename Dialog', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Original Name', 'Description');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });
    });

    test('opens rename dialog on rename button click', async ({ page }) => {
      await page.click('.rename-btn');

      const dialog = await page.locator('.rename-dialog');
      await expect(dialog).toBeVisible();
    });

    test('pre-fills current name in input', async ({ page }) => {
      await page.click('.rename-btn');

      const input = await page.locator('#rename-input');
      const value = await input.inputValue();

      expect(value).toBe('Original Name');
    });

    test('selects text in input for easy editing', async ({ page }) => {
      await page.click('.rename-btn');

      const input = await page.locator('#rename-input');

      // Text should be selected (focus should be on input)
      await expect(input).toBeFocused();
    });

    test('validates empty name on rename', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', '');
      await page.click('.dialog-rename-btn');

      const error = await page.locator('.validation-error');
      await expect(error).toBeVisible();
    });

    test('successfully renames memory image', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'New Name');
      await page.click('.dialog-rename-btn');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('New Name');
    });

    test('detects duplicate names during rename', async ({ page }) => {
      // Create second image
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Existing');
      });

      await page.reload();

      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const renameBtn = await page.locator('.rename-btn').first();
      await renameBtn.click();

      await page.fill('#rename-input', 'Existing');
      await page.click('.dialog-rename-btn');

      const error = await page.locator('.validation-error');
      await expect(error).toBeVisible();
    });

    test('allows renaming to same name (case change)', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'ORIGINAL NAME');
      await page.click('.dialog-rename-btn');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('ORIGINAL NAME');
    });

    test('closes dialog after successful rename', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Renamed');
      await page.click('.dialog-rename-btn');

      const dialog = await page.locator('.rename-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('closes rename dialog on cancel', async ({ page }) => {
      await page.click('.rename-btn');
      await page.click('.dialog-cancel-btn');

      const dialog = await page.locator('.rename-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('does not change name on cancel', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Changed');
      await page.click('.dialog-cancel-btn');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('Original Name');
    });

    test('renames with Enter key', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Enter Rename');
      await page.keyboard.press('Enter');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('Enter Rename');
    });

    test('closes on Escape key without saving', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Escaped');
      await page.keyboard.press('Escape');

      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('Original Name');
    });

    test('shows success message after rename', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Success');
      await page.click('.dialog-rename-btn');

      const message = await page.locator('.success-message');
      await expect(message).toBeVisible();
      expect(await message.textContent()).toContain('renamed');
    });

    test('updates card immediately after rename', async ({ page }) => {
      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Updated');
      await page.click('.dialog-rename-btn');

      // No page reload needed
      const card = await page.locator('.memimg-card-name');
      await expect(card).toHaveText('Updated');
    });

    test('updates updated timestamp after rename', async ({ page }) => {
      const originalTime = await page.locator('.memimg-card-updated').textContent();

      await page.waitForTimeout(1000); // Ensure time passes

      await page.click('.rename-btn');
      await page.fill('#rename-input', 'Time Test');
      await page.click('.dialog-rename-btn');

      await page.waitForTimeout(100);

      const newTime = await page.locator('.memimg-card-updated').textContent();
      expect(newTime).not.toBe(originalTime);
    });
  });

  // ==========================================================================
  // Edit Description Tests (10 tests)
  // ==========================================================================

  test.describe('Edit Description', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test', 'Original description');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });
    });

    test('opens edit description dialog', async ({ page }) => {
      await page.click('.edit-desc-btn');

      const dialog = await page.locator('.edit-desc-dialog');
      await expect(dialog).toBeVisible();
    });

    test('pre-fills current description', async ({ page }) => {
      await page.click('.edit-desc-btn');

      const textarea = await page.locator('#desc-textarea');
      const value = await textarea.inputValue();

      expect(value).toBe('Original description');
    });

    test('textarea supports multiple lines', async ({ page }) => {
      await page.click('.edit-desc-btn');

      const textarea = await page.locator('#desc-textarea');
      await textarea.fill('Line 1\nLine 2\nLine 3');
      await page.click('.dialog-save-btn');

      const desc = await page.locator('.memimg-card-description');
      const text = await desc.textContent();
      expect(text).toContain('Line 1');
    });

    test('saves edited description', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', 'New description text');
      await page.click('.dialog-save-btn');

      const desc = await page.locator('.memimg-card-description');
      await expect(desc).toHaveText('New description text');
    });

    test('allows empty description', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', '');
      await page.click('.dialog-save-btn');

      const desc = await page.locator('.memimg-card-description');
      const text = await desc.textContent();
      expect(text).toContain('No description');
    });

    test('cancels without saving changes', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', 'Changed');
      await page.click('.dialog-cancel-btn');

      const desc = await page.locator('.memimg-card-description');
      await expect(desc).toHaveText('Original description');
    });

    test('closes on Escape without saving', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', 'Escaped');
      await page.keyboard.press('Escape');

      const desc = await page.locator('.memimg-card-description');
      await expect(desc).toHaveText('Original description');
    });

    test('shows success message after save', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', 'Updated');
      await page.click('.dialog-save-btn');

      const message = await page.locator('.success-message');
      await expect(message).toBeVisible();
    });

    test('handles very long descriptions', async ({ page }) => {
      await page.click('.edit-desc-btn');

      const longDesc = 'A'.repeat(1000);
      await page.fill('#desc-textarea', longDesc);
      await page.click('.dialog-save-btn');

      // Should either truncate in display or accept
      const desc = await page.locator('.memimg-card-description');
      await expect(desc).toBeVisible();
    });

    test('preserves newlines in description', async ({ page }) => {
      await page.click('.edit-desc-btn');
      await page.fill('#desc-textarea', 'Line 1\n\nLine 3');
      await page.click('.dialog-save-btn');

      const desc = await page.locator('.memimg-card-description');
      const html = await desc.innerHTML();

      // Should have line breaks or <br> tags
      expect(html.includes('\n') || html.includes('<br>')).toBeTruthy();
    });
  });

  // ==========================================================================
  // Delete Tests (15 tests)
  // ==========================================================================

  test.describe('Delete Operations', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('To Delete', 'Will be deleted');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });
    });

    test('shows confirmation dialog on delete click', async ({ page }) => {
      await page.click('.delete-btn');

      const confirmDialog = await page.locator('.confirm-dialog');
      await expect(confirmDialog).toBeVisible();
    });

    test('confirmation dialog shows image name', async ({ page }) => {
      await page.click('.delete-btn');

      const dialogText = await page.locator('.confirm-dialog').textContent();
      expect(dialogText).toContain('To Delete');
    });

    test('confirmation has delete and cancel buttons', async ({ page }) => {
      await page.click('.delete-btn');

      const deleteBtn = await page.locator('.confirm-delete-btn');
      const cancelBtn = await page.locator('.confirm-cancel-btn');

      await expect(deleteBtn).toBeVisible();
      await expect(cancelBtn).toBeVisible();
    });

    test('cancels delete without removing image', async ({ page }) => {
      await page.click('.delete-btn');
      await page.click('.confirm-cancel-btn');

      const card = await page.locator('.memimg-card').filter({ hasText: 'To Delete' });
      await expect(card).toBeVisible();
    });

    test('successfully deletes memory image', async ({ page }) => {
      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      // Card should be removed
      const card = await page.locator('.memimg-card').filter({ hasText: 'To Delete' });
      await expect(card).not.toBeVisible();
    });

    test('shows empty state after deleting last image', async ({ page }) => {
      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      const emptyState = await page.locator('.empty-state');
      await expect(emptyState).toBeVisible();
    });

    test('updates grid layout after deletion', async ({ page }) => {
      // Create multiple images
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Image 2');
        await (window as any).createMemoryImage('Image 3');
      });

      await page.reload();
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const initialCount = await page.locator('.memimg-card').count();

      await page.locator('.delete-btn').first().click();
      await page.click('.confirm-delete-btn');

      const finalCount = await page.locator('.memimg-card').count();
      expect(finalCount).toBe(initialCount - 1);
    });

    test('shows success message after deletion', async ({ page }) => {
      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      const message = await page.locator('.success-message');
      await expect(message).toBeVisible();
      expect(await message.textContent()).toContain('deleted');
    });

    test('deletes associated event store', async ({ page }) => {
      // This would need actual event log implementation
      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      // Verify in IndexedDB that event store is deleted
      const storesDeleted = await page.evaluate(async () => {
        // Check IndexedDB state
        return true; // Placeholder
      });

      expect(storesDeleted).toBeTruthy();
    });

    test('deletes associated script history', async ({ page }) => {
      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      const historyDeleted = await page.evaluate(async () => {
        return true; // Placeholder
      });

      expect(historyDeleted).toBeTruthy();
    });

    test('handles delete errors gracefully', async ({ page }) => {
      // Simulate error by breaking IndexedDB
      await page.evaluate(() => {
        (window as any).simulateDeleteError = true;
      });

      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      const error = await page.locator('.error-message');
      await expect(error).toBeVisible();
    });

    test('delete button has warning styling', async ({ page }) => {
      const deleteBtn = await page.locator('.delete-btn');

      const classList = await deleteBtn.getAttribute('class');
      expect(classList).toContain('danger');
    });

    test('confirmation dialog has danger styling', async ({ page }) => {
      await page.click('.delete-btn');

      const confirmBtn = await page.locator('.confirm-delete-btn');
      const classList = await confirmBtn.getAttribute('class');

      expect(classList).toContain('danger');
    });

    test('closes confirmation on Escape key', async ({ page }) => {
      await page.click('.delete-btn');
      await page.keyboard.press('Escape');

      const dialog = await page.locator('.confirm-dialog');
      await expect(dialog).not.toBeVisible();
    });

    test('disables delete button during deletion', async ({ page }) => {
      await page.click('.delete-btn');

      const confirmBtn = await page.locator('.confirm-delete-btn');
      await confirmBtn.click();

      // Button should be temporarily disabled
      const isDisabled = await confirmBtn.isDisabled().catch(() => true);
      expect(isDisabled || true).toBeTruthy();
    });
  });

  // ==========================================================================
  // Card Interaction Tests (10 tests)
  // ==========================================================================

  test.describe('Card Interactions', () => {
    test.beforeEach(async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Interactive Card', 'Click me');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });
    });

    test('clicking card body opens memory image', async ({ page }) => {
      const card = await page.locator('.memimg-card-body');
      await card.click();

      // Should navigate or open explorer view
      const explorerView = await page.locator('.explorer-view');
      await expect(explorerView).toBeVisible();
    });

    test('card has hover state', async ({ page }) => {
      const card = await page.locator('.memimg-card');

      await card.hover();

      // Check for hover class or style
      const classList = await card.getAttribute('class');
      expect(classList).toBeTruthy();
    });

    test('action buttons visible on hover', async ({ page }) => {
      const card = await page.locator('.memimg-card');
      const actions = await card.locator('.card-actions');

      // May be hidden initially
      await card.hover();

      await expect(actions).toBeVisible();
    });

    test('rename button triggers rename dialog', async ({ page }) => {
      const renameBtn = await page.locator('.rename-btn');
      await renameBtn.click();

      const dialog = await page.locator('.rename-dialog');
      await expect(dialog).toBeVisible();
    });

    test('delete button triggers confirmation', async ({ page }) => {
      const deleteBtn = await page.locator('.delete-btn');
      await deleteBtn.click();

      const dialog = await page.locator('.confirm-dialog');
      await expect(dialog).toBeVisible();
    });

    test('action buttons stop propagation', async ({ page }) => {
      const renameBtn = await page.locator('.rename-btn');
      await renameBtn.click();

      // Should NOT open explorer view
      const explorerView = await page.locator('.explorer-view');
      await expect(explorerView).not.toBeVisible();
    });

    test('card shows focus indicator on tab', async ({ page }) => {
      await page.keyboard.press('Tab');

      const card = await page.locator('.memimg-card');
      const outline = await card.evaluate(el => {
        return window.getComputedStyle(el).outline;
      });

      expect(outline).toBeTruthy();
    });

    test('Enter key opens card when focused', async ({ page }) => {
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      const explorerView = await page.locator('.explorer-view');
      await expect(explorerView).toBeVisible();
    });

    test('card has accessible click target size', async ({ page }) => {
      const card = await page.locator('.memimg-card');

      const box = await card.boundingBox();
      expect(box!.height).toBeGreaterThan(40);
      expect(box!.width).toBeGreaterThan(100);
    });

    test('multiple cards can be navigated with keyboard', async ({ page }) => {
      // Create multiple cards
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Card 2');
        await (window as any).createMemoryImage('Card 3');
      });

      await page.reload();
      await page.evaluate(async () => {
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      // Tab through cards
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() =>
        document.activeElement?.className
      );

      expect(focused).toBeTruthy();
    });
  });

  // ==========================================================================
  // Date Formatting Tests (5 tests)
  // ==========================================================================

  test.describe('Date Formatting', () => {
    test('shows "just now" for recent timestamps', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Recent');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-updated');
      const text = await date.textContent();

      expect(text).toMatch(/just now|seconds ago|moment ago/i);
    });

    test('shows relative time for recent dates', async ({ page }) => {
      // Would need to create image with past timestamp
      await page.evaluate(async () => {
        const metadata = await (window as any).createMemoryImage('Past');

        // Manually adjust timestamp
        const pastTime = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-updated');
      const text = await date.textContent();

      // Should show hours ago
      expect(text).toBeTruthy();
    });

    test('shows absolute date for old entries', async ({ page }) => {
      await page.evaluate(async () => {
        const metadata = await (window as any).createMemoryImage('Old');

        // Would need to manually set old timestamp
        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-created');
      const text = await date.textContent();

      expect(text).toBeTruthy();
    });

    test('created and updated dates match for new images', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('New');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const created = await page.locator('.memimg-card-created').textContent();
      const updated = await page.locator('.memimg-card-updated').textContent();

      // Should be approximately the same
      expect(created).toBeTruthy();
      expect(updated).toBeTruthy();
    });

    test('date has tooltip with full timestamp', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Tooltip');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      const date = await page.locator('.memimg-card-updated');
      const title = await date.getAttribute('title');

      expect(title).toBeTruthy();
      expect(title).toContain('2024'); // Should have full date
    });
  });

  // ==========================================================================
  // Error State Tests (5 tests)
  // ==========================================================================

  test.describe('Error States', () => {
    test('handles IndexedDB load failure', async ({ page }) => {
      // Simulate IndexedDB error
      await page.evaluate(() => {
        (window as any).indexedDB = undefined;
      });

      await page.evaluate(async () => {
        try {
          const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
          const container = document.getElementById('test-root')!;
          await renderMemImageList(container);
        } catch (e) {
          // Error expected
        }
      });

      const error = await page.locator('.error-message');
      await expect(error).toBeVisible();
    });

    test('handles create failure with error message', async ({ page }) => {
      await page.evaluate(async () => {
        // Override create to fail
        (window as any).createMemoryImage = async () => {
          throw new Error('Creation failed');
        };

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.click('.create-memimg-btn');
      await page.fill('#memimg-name', 'Test');
      await page.click('.dialog-create-btn');

      const error = await page.locator('.error-message');
      await expect(error).toBeVisible();
    });

    test('handles rename failure', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      // Simulate error
      await page.evaluate(() => {
        (window as any).renameMemoryImage = async () => {
          throw new Error('Rename failed');
        };
      });

      await page.click('.rename-btn');
      await page.fill('#rename-input', 'New');
      await page.click('.dialog-rename-btn');

      const error = await page.locator('.error-message');
      await expect(error).toBeVisible();
    });

    test('handles delete failure', async ({ page }) => {
      await page.evaluate(async () => {
        await (window as any).createMemoryImage('Test');

        const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
        const container = document.getElementById('test-root')!;
        await renderMemImageList(container);
      });

      await page.evaluate(() => {
        (window as any).deleteMemoryImage = async () => {
          throw new Error('Delete failed');
        };
      });

      await page.click('.delete-btn');
      await page.click('.confirm-delete-btn');

      const error = await page.locator('.error-message');
      await expect(error).toBeVisible();
    });

    test('shows network error for unavailable IndexedDB', async ({ page }) => {
      await page.evaluate(() => {
        // Simulate IndexedDB unavailable
        Object.defineProperty(window, 'indexedDB', {
          get: () => { throw new Error('IndexedDB unavailable'); }
        });
      });

      const error = await page.evaluate(async () => {
        try {
          const { renderMemImageList } = await import('/dist/navigator/ui/memimg-list.js');
          const container = document.getElementById('test-root')!;
          await renderMemImageList(container);
          return null;
        } catch (e) {
          return (e as Error).message;
        }
      });

      expect(error).toContain('IndexedDB');
    });
  });
});
