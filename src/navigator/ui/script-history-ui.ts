/**
 * script-history-ui.ts - Script History UI Rendering and Interactions
 *
 * Renders script history panel and handles user interactions:
 * - Display history entries (compact view with expand)
 * - Load script into editor
 * - Run script directly
 * - Copy to clipboard
 * - Search/filter
 * - Clear history
 * - Export history
 */

import type { ScriptHistoryEntry } from '../script-history.js';
import {
  getRecentScripts,
  searchScripts,
  clearHistory,
  exportHistory,
  getHistoryStats,
} from '../script-history.js';

const MAX_PREVIEW_CHARS = 50;

/**
 * Format timestamp as relative time (e.g., "2 mins ago")
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

/**
 * Format timestamp as absolute time
 */
function formatAbsoluteTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Truncate code for preview
 */
function truncateCode(code: string, maxChars: number = MAX_PREVIEW_CHARS): string {
  if (code.length <= maxChars) {
    return code;
  }
  return code.substring(0, maxChars) + '...';
}

/**
 * Escape HTML
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render a single history entry
 */
function renderHistoryEntry(
  entry: ScriptHistoryEntry,
  onLoad: (code: string) => void,
  onCopy: (code: string) => void
): HTMLElement {
  const entryDiv = document.createElement('div');
  entryDiv.className = 'history-entry';
  entryDiv.dataset.entryId = entry.id;

  const isLong = entry.code.length > MAX_PREVIEW_CHARS;
  const preview = truncateCode(entry.code);

  entryDiv.innerHTML = `
    <div class="history-entry-header">
      <span class="history-status">●</span>
      <span class="history-timestamp" title="${escapeHtml(formatAbsoluteTime(entry.timestamp))}">
        ${escapeHtml(formatRelativeTime(entry.timestamp))}
      </span>
      <span class="history-size">${entry.characterCount} chars</span>
    </div>
    <div class="history-code ${isLong ? 'expandable' : ''}" data-expanded="false">
      <pre>${escapeHtml(preview)}</pre>
    </div>
    <div class="history-actions">
      <button class="history-btn load-btn" title="Load into editor">⬆ Load</button>
      <button class="history-btn copy-btn" title="Copy to clipboard">📋 Copy</button>
      ${isLong ? '<button class="history-btn expand-btn" title="Expand/collapse">▼ Expand</button>' : ''}
    </div>
  `;

  // Event listeners
  const loadBtn = entryDiv.querySelector('.load-btn') as HTMLButtonElement;
  const copyBtn = entryDiv.querySelector('.copy-btn') as HTMLButtonElement;
  const expandBtn = entryDiv.querySelector('.expand-btn') as HTMLButtonElement | null;
  const codeDiv = entryDiv.querySelector('.history-code') as HTMLElement;

  loadBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    onLoad(entry.code);
  });

  copyBtn?.addEventListener('click', async (e) => {
    e.stopPropagation();
    onCopy(entry.code);
  });

  if (expandBtn && isLong) {
    expandBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = codeDiv.dataset.expanded === 'true';

      if (isExpanded) {
        codeDiv.querySelector('pre')!.textContent = truncateCode(entry.code);
        codeDiv.dataset.expanded = 'false';
        expandBtn.textContent = '▼ Expand';
      } else {
        codeDiv.querySelector('pre')!.textContent = entry.code;
        codeDiv.dataset.expanded = 'true';
        expandBtn.textContent = '▲ Collapse';
      }
    });
  }

  return entryDiv;
}

/**
 * Render script history list
 */
export async function renderScriptHistory(
  container: HTMLElement,
  memimgId: string,
  onLoad: (code: string) => void
): Promise<void> {
  try {
    // Get recent scripts
    const entries = await getRecentScripts(memimgId, 100);

    // Clear container
    container.innerHTML = '';

    if (entries.length === 0) {
      container.innerHTML = '<div class="history-empty">No script history yet. Run a script to get started.</div>';
      return;
    }

    // Render entries
    for (const entry of entries) {
      const entryEl = renderHistoryEntry(
        entry,
        onLoad,
        async (code) => {
          // Copy to clipboard
          try {
            await navigator.clipboard.writeText(code);
            // Show brief feedback
            const copyBtn = container.querySelector(`[data-entry-id="${entry.id}"] .copy-btn`) as HTMLButtonElement;
            if (copyBtn) {
              const originalText = copyBtn.textContent;
              copyBtn.textContent = '✓ Copied';
              setTimeout(() => {
                copyBtn.textContent = originalText;
              }, 1000);
            }
          } catch (err) {
            console.error('Failed to copy:', err);
            alert('Failed to copy to clipboard');
          }
        }
      );
      container.appendChild(entryEl);
    }

    // Update stats in sidebar header (if present)
    const stats = await getHistoryStats(memimgId);
    const statsEl = document.querySelector('.history-stats');
    if (statsEl) {
      const sizeMB = (stats.totalSize / (1024 * 1024)).toFixed(2);
      statsEl.textContent = `${stats.count} entries, ${sizeMB} MB`;
    }
  } catch (err) {
    console.error('Failed to render script history:', err);
    container.innerHTML = '<div class="history-error">Failed to load script history</div>';
  }
}

/**
 * Setup search functionality
 */
export function setupHistorySearch(
  searchInput: HTMLInputElement,
  container: HTMLElement,
  memimgId: string,
  onLoad: (code: string) => void
): void {
  let searchTimeout: number | null = null;

  searchInput.addEventListener('input', () => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    searchTimeout = window.setTimeout(async () => {
      const query = searchInput.value.trim();

      try {
        const entries = query
          ? await searchScripts(memimgId, query)
          : await getRecentScripts(memimgId, 100);

        // Clear and re-render
        container.innerHTML = '';

        if (entries.length === 0) {
          container.innerHTML = '<div class="history-empty">No matching scripts found.</div>';
          return;
        }

        for (const entry of entries) {
          const entryEl = renderHistoryEntry(
            entry,
            onLoad,
            async (code) => {
              try {
                await navigator.clipboard.writeText(code);
                const copyBtn = container.querySelector(`[data-entry-id="${entry.id}"] .copy-btn`) as HTMLButtonElement;
                if (copyBtn) {
                  const originalText = copyBtn.textContent;
                  copyBtn.textContent = '✓ Copied';
                  setTimeout(() => {
                    copyBtn.textContent = originalText;
                  }, 1000);
                }
              } catch (err) {
                console.error('Failed to copy:', err);
                alert('Failed to copy to clipboard');
              }
            }
          );
          container.appendChild(entryEl);
        }
      } catch (err) {
        console.error('Search failed:', err);
        container.innerHTML = '<div class="history-error">Search failed</div>';
      }
    }, 300); // Debounce
  });
}

/**
 * Setup clear history functionality
 */
export function setupClearHistory(
  clearBtn: HTMLButtonElement,
  memimgId: string,
  onCleared: () => void
): void {
  clearBtn.addEventListener('click', async () => {
    if (!confirm('Clear all script history? This cannot be undone.')) {
      return;
    }

    try {
      await clearHistory(memimgId);
      onCleared();
    } catch (err) {
      console.error('Failed to clear history:', err);
      alert('Failed to clear history');
    }
  });
}

/**
 * Setup export history functionality
 */
export function setupExportHistory(
  exportBtn: HTMLButtonElement,
  memimgId: string,
  memimgName: string
): void {
  exportBtn.addEventListener('click', async () => {
    try {
      const json = await exportHistory(memimgId);

      // Download file
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      a.download = `${memimgName}-script-history-${timestamp}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export history:', err);
      alert('Failed to export history');
    }
  });
}
