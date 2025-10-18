/**
 * memimg-list.ts - Memory Image List View
 *
 * UI for managing multiple memory images: create, open, rename, edit, delete
 */

import type { MemoryImageMetadata } from '../memimg-manager.js';
import {
  listMemoryImages,
  createMemoryImage,
  renameMemoryImage,
  updateDescription,
  deleteMemoryImage,
} from '../memimg-manager.js';

/**
 * Format timestamp as human-readable date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}

/**
 * Render the list of memory images
 */
export async function renderMemImageList(
  container: HTMLElement,
  onOpen: (id: string) => void
): Promise<void> {
  try {
    const images = await listMemoryImages();

    if (images.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h2>No Memory Images Yet</h2>
          <p>Create your first memory image to get started</p>
          <button id="create-first-btn" class="primary-button">+ New Memory Image</button>
        </div>
      `;

      const createBtn = container.querySelector('#create-first-btn') as HTMLButtonElement;
      createBtn.addEventListener('click', () => showCreateDialog(container, onOpen));
      return;
    }

    // Render grid of memory images
    const html = `
      <div class="memimg-grid">
        ${images.map(img => renderMemImageCard(img, onOpen)).join('')}
      </div>
    `;

    container.innerHTML = html;

    // Attach event listeners
    images.forEach(img => {
      const card = container.querySelector(`[data-id="${img.id}"]`) as HTMLElement;

      // Open button
      const openBtn = card.querySelector('.open-btn') as HTMLButtonElement;
      openBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onOpen(img.id);
      });

      // Rename button
      const renameBtn = card.querySelector('.rename-btn') as HTMLButtonElement;
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showRenameDialog(img, container, onOpen);
      });

      // Edit description button
      const editDescBtn = card.querySelector('.edit-desc-btn') as HTMLButtonElement;
      editDescBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showEditDescriptionDialog(img, container, onOpen);
      });

      // Delete button
      const deleteBtn = card.querySelector('.delete-btn') as HTMLButtonElement;
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`Delete "${img.name}"? This cannot be undone.`)) {
          try {
            await deleteMemoryImage(img.id);
            // Small delay to ensure IndexedDB transaction is fully committed
            await new Promise(resolve => setTimeout(resolve, 50));
            await renderMemImageList(container, onOpen);
          } catch (err) {
            alert(`Error deleting memory image: ${(err as Error).message}`);
          }
        }
      });

      // Click on card to open
      card.addEventListener('click', () => onOpen(img.id));
    });
  } catch (err) {
    container.innerHTML = `
      <div class="error-state">
        <h2>Error Loading Memory Images</h2>
        <p>${(err as Error).message}</p>
      </div>
    `;
  }
}

/**
 * Render a single memory image card
 */
function renderMemImageCard(
  img: MemoryImageMetadata,
  onOpen: (id: string) => void
): string {
  const eventCountText = img.eventCount !== undefined
    ? `${img.eventCount} events`
    : 'Unknown size';

  return `
    <div class="memimg-card" data-id="${img.id}">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(img.name)}</h3>
        <div class="card-actions">
          <button class="icon-btn rename-btn" title="Rename">✏️</button>
          <button class="icon-btn edit-desc-btn" title="Edit description">📝</button>
          <button class="icon-btn delete-btn" title="Delete">🗑️</button>
        </div>
      </div>
      <div class="card-body">
        <p class="card-description">${escapeHtml(img.description) || '<em>No description</em>'}</p>
        <div class="card-meta">
          <span class="meta-item">📅 Created ${formatDate(img.createdAt)}</span>
          <span class="meta-item">🕒 Updated ${formatDate(img.updatedAt)}</span>
          <span class="meta-item">📊 ${eventCountText}</span>
        </div>
      </div>
      <div class="card-footer">
        <button class="open-btn">Open →</button>
      </div>
    </div>
  `;
}

/**
 * Show create memory image dialog
 */
export function showCreateDialog(
  container: HTMLElement,
  onOpen: (id: string) => void
): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>New Memory Image</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="memimg-name">Name *</label>
          <input type="text" id="memimg-name" class="form-input" placeholder="My Memory Image" required autofocus>
        </div>
        <div class="form-group">
          <label for="memimg-desc">Description</label>
          <textarea id="memimg-desc" class="form-textarea" placeholder="Optional description" rows="3"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="create-btn primary-button">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const nameInput = modal.querySelector('#memimg-name') as HTMLInputElement;
  const descInput = modal.querySelector('#memimg-desc') as HTMLTextAreaElement;
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
  const createBtn = modal.querySelector('.create-btn') as HTMLButtonElement;

  const close = () => {
    modal.remove();
  };

  const create = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a name');
      nameInput.focus();
      return;
    }

    // Disable button and show loading state
    createBtn.disabled = true;
    const originalText = createBtn.textContent;
    createBtn.textContent = 'Creating...';

    try {
      console.log('Creating memory image:', name);
      const metadata = await createMemoryImage(name, descInput.value.trim());
      console.log('Memory image created:', metadata);
      close();
      onOpen(metadata.id);
    } catch (err) {
      console.error('Error creating memory image:', err);
      alert(`Error creating memory image: ${(err as Error).message}`);
      // Re-enable button on error
      createBtn.disabled = false;
      createBtn.textContent = originalText;
      nameInput.focus();
    }
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  createBtn.addEventListener('click', create);

  // Enter to create
  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      create();
    }
  });

  // Escape to close
  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    }
  });

  // Click outside to close
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });

  nameInput.focus();
}

/**
 * Show rename dialog
 */
function showRenameDialog(
  img: MemoryImageMetadata,
  container: HTMLElement,
  onOpen: (id: string) => void
): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>Rename Memory Image</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="memimg-name">Name *</label>
          <input type="text" id="memimg-name" class="form-input" value="${escapeHtml(img.name)}" required autofocus>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn primary-button">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const nameInput = modal.querySelector('#memimg-name') as HTMLInputElement;
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
  const saveBtn = modal.querySelector('.save-btn') as HTMLButtonElement;

  const close = () => {
    modal.remove();
  };

  const save = async () => {
    const name = nameInput.value.trim();
    if (!name) {
      alert('Please enter a name');
      nameInput.focus();
      return;
    }

    try {
      await renameMemoryImage(img.id, name);
      close();
      await renderMemImageList(container, onOpen);
    } catch (err) {
      alert(`Error renaming: ${(err as Error).message}`);
    }
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  saveBtn.addEventListener('click', save);

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    }
  });

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });

  // Select all text for easy replacement
  nameInput.select();
}

/**
 * Show edit description dialog
 */
function showEditDescriptionDialog(
  img: MemoryImageMetadata,
  container: HTMLElement,
  onOpen: (id: string) => void
): void {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-header">
        <h2>Edit Description</h2>
        <button class="modal-close">&times;</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="memimg-desc">Description</label>
          <textarea id="memimg-desc" class="form-textarea" rows="4" autofocus>${escapeHtml(img.description)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="cancel-btn">Cancel</button>
        <button class="save-btn primary-button">Save</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const descInput = modal.querySelector('#memimg-desc') as HTMLTextAreaElement;
  const closeBtn = modal.querySelector('.modal-close') as HTMLButtonElement;
  const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
  const saveBtn = modal.querySelector('.save-btn') as HTMLButtonElement;

  const close = () => {
    modal.remove();
  };

  const save = async () => {
    try {
      await updateDescription(img.id, descInput.value.trim());
      close();
      await renderMemImageList(container, onOpen);
    } catch (err) {
      alert(`Error updating description: ${(err as Error).message}`);
    }
  };

  closeBtn.addEventListener('click', close);
  cancelBtn.addEventListener('click', close);
  saveBtn.addEventListener('click', save);

  modal.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
    }
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      close();
    }
  });

  descInput.focus();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
