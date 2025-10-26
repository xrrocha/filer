/**
 * Editor - Code editor and execution environment
 */

import type { Transaction } from 'ireneo';
import { addScriptEntry } from '../script-history.js';
import { CodeJar } from 'codejar';
import Prism from 'prismjs';
import 'prismjs/themes/prism-okaidia.css';

// CodeJar instance
let jar: ReturnType<typeof CodeJar> | null = null;

// Line numbers preference
const LINE_NUMBERS_STORAGE_KEY = 'memimg-line-numbers';

// Callback to refresh script history panel (set by main.ts)
let refreshHistoryCallback: (() => Promise<void>) | null = null;

export function setRefreshHistoryCallback(callback: () => Promise<void>): void {
  refreshHistoryCallback = callback;
}

/**
 * Update editor content programmatically
 */
export function setEditorContent(code: string): void {
  if (jar) {
    jar.updateCode(code);
  }
}

/**
 * Get line numbers preference from localStorage
 */
function getLineNumbersPreference(): boolean {
  const stored = localStorage.getItem(LINE_NUMBERS_STORAGE_KEY);
  return stored === null ? true : stored === 'true'; // Default: enabled
}

/**
 * Set line numbers preference in localStorage
 */
function setLineNumbersPreference(enabled: boolean): void {
  localStorage.setItem(LINE_NUMBERS_STORAGE_KEY, enabled.toString());
}

/**
 * Update line numbers display
 */
function updateLineNumbers(): void {
  const lineNumbersDiv = document.getElementById('line-numbers') as HTMLDivElement;
  const editorDiv = document.getElementById('code-editor') as HTMLDivElement;

  if (!jar || !lineNumbersDiv) return;

  const code = jar.toString();
  const lines = code.split('\n');
  const lineCount = lines.length;

  // Generate line numbers
  const numbers = Array.from({ length: lineCount }, (_, i) => i + 1).join('\n');
  lineNumbersDiv.textContent = numbers;

  // Sync scroll
  editorDiv.addEventListener('scroll', () => {
    lineNumbersDiv.scrollTop = editorDiv.scrollTop;
  });
}

/**
 * Toggle line numbers visibility
 */
export function toggleLineNumbers(): void {
  const lineNumbersDiv = document.getElementById('line-numbers') as HTMLDivElement;
  const currentPref = getLineNumbersPreference();
  const newPref = !currentPref;

  setLineNumbersPreference(newPref);

  if (lineNumbersDiv) {
    lineNumbersDiv.style.display = newPref ? 'block' : 'none';
  }

  if (newPref) {
    updateLineNumbers();
  }
}

/**
 * Initialize line numbers display based on preference
 */
function initializeLineNumbers(): void {
  const lineNumbersDiv = document.getElementById('line-numbers') as HTMLDivElement;
  const enabled = getLineNumbersPreference();

  if (lineNumbersDiv) {
    lineNumbersDiv.style.display = enabled ? 'block' : 'none';
  }

  if (enabled) {
    updateLineNumbers();
  }
}

/**
 * Set status message
 */
function setStatus(msg: string, type: string = ''): void {
  const status = document.getElementById('status') as HTMLDivElement;
  status.textContent = msg;
  status.className = type;

  // Don't auto-clear errors - user needs to see them
  if (msg && type !== 'error') {
    setTimeout(() => {
      status.textContent = '';
      status.className = '';
    }, 3000);
  }
}

/**
 * Execute user code in the context of the memory image
 *
 * Creates a checkpoint before execution. If runtime error occurs,
 * restores delta to checkpoint (discarding partial mutations from failed script).
 * Syntax errors don't execute any code, so no checkpoint is needed.
 *
 * On success: clears editor and saves script to history.
 * On failure: keeps editor unchanged for fixing.
 */
export async function runCode(root: any, txn: Transaction, memimgId: string | null, onComplete: () => void): Promise<void> {
  if (!jar) return;

  const code = jar.toString().trim();
  if (!code) return;

  let fn: Function;
  try {
    // Try to compile the function first (catches syntax errors)
    fn = new Function(code);
  } catch (err) {
    // Syntax error during compilation
    const error = err as Error;
    let errorMsg = error.message;
    const chromeMatch = errorMsg.match(/\((\d+):(\d+)\)/);
    const firefoxMatch = errorMsg.match(/line (\d+)/);

    let line: number | undefined;
    let col: number | undefined;
    if (chromeMatch) {
      line = parseInt(chromeMatch[1]!);
      col = parseInt(chromeMatch[2]!);
      errorMsg = `Line ${line}, Col ${col}: ${error.message}`;
    } else if (firefoxMatch) {
      line = parseInt(firefoxMatch[1]!);
      errorMsg = `Line ${line}: ${error.message}`;
    }

    // Position cursor at error location if we found it
    if (line !== undefined) {
      const lines = code.split('\n');
      const lineIdx = line - 1;

      if (lineIdx >= 0 && lineIdx < lines.length) {
        // Show context in error display
        errorMsg += '\n\n' + lines[lineIdx];
      }
    }

    // Display error in dedicated error panel
    const errorDisplay = document.getElementById('error-panel') as HTMLDivElement;
    errorDisplay.textContent = errorMsg;
    errorDisplay.style.display = 'block';

    setStatus('Syntax error - see below editor', 'error');
    console.error('Syntax error:', error);
    console.error('Message:', error.message);
    return;
  }

  // Create checkpoint before execution
  // If runtime error occurs, we'll restore to this state
  const checkpoint = txn.createCheckpoint();

  try {
    // Execute the compiled function with 'this' bound to root
    const result = fn.call(root);

    if (result !== undefined) {
      console.log('Result:', result);
    }

    // Clear any previous errors
    const errorDisplay = document.getElementById('error-panel') as HTMLDivElement;
    errorDisplay.textContent = '';
    errorDisplay.style.display = 'none';

    // SUCCESS: Save to history and clear editor
    if (memimgId) {
      try {
        await addScriptEntry(memimgId, code);

        // Refresh history panel if it's open
        // Small delay to ensure IndexedDB transaction completes
        if (refreshHistoryCallback) {
          await new Promise(resolve => setTimeout(resolve, 50));
          await refreshHistoryCallback();
        }
      } catch (err) {
        console.error('Failed to save script to history:', err);
        // Don't fail the execution if history save fails
      }
    }

    // Clear editor on success (ready for next script)
    jar.updateCode('');

    setStatus('Code executed', 'success');

    // Refresh UI to show changes
    if (onComplete) {
      onComplete();
    }
  } catch (err) {
    // Runtime error - restore checkpoint to discard partial mutations
    txn.restoreCheckpoint(checkpoint);

    const error = err as Error;
    let errorMsg = error.message;

    // Try to parse line number from error stack
    const chromeMatch = error.stack?.match(/<anonymous>:(\d+):(\d+)/);
    const firefoxMatch = error.stack?.match(/Function:(\d+):(\d+)/);

    const lineMatch = chromeMatch || firefoxMatch;

    if (lineMatch) {
      // Function() creates implicit wrapper that adds 2 lines offset
      const reportedLine = parseInt(lineMatch[1]!);
      const col = parseInt(lineMatch[2]!);
      const line = reportedLine - 2;
      errorMsg = `Line ${line}, Col ${col}: ${error.message}`;

      // Show the offending line
      const lines = code.split('\n');
      const lineIdx = line - 1;

      if (lineIdx >= 0 && lineIdx < lines.length) {
        console.error('Error at line', line, ':', lines[lineIdx]);

        // Show context in error display
        errorMsg += '\n\n' + lines[lineIdx];
      }
    }

    // Display error in dedicated error panel
    const errorDisplay = document.getElementById('error-panel') as HTMLDivElement;
    errorDisplay.textContent = errorMsg;
    errorDisplay.style.display = 'block';

    setStatus('Runtime error - changes rolled back', 'error');
    console.error('Runtime error:', error);
    console.error('Stack:', error.stack);
    console.log('Delta restored to checkpoint (partial mutations discarded)');
  }
}

// Store current editor context (updated each time a memimg is opened)
let editorContext: {
  root: any;
  txn: Transaction;
  memimgId: string | null;
  onExecute: () => void;
} | null = null;

/**
 * Setup code editor with CodeJar and Prism highlighting
 * This should be called ONCE during app initialization.
 * Use updateEditorContext() to update the context when opening a new memimg.
 */
export function setupEditor(root: any, txn: Transaction, memimgId: string | null, onExecute: () => void): void {
  const editor = document.getElementById('code-editor') as HTMLDivElement;

  // Update context
  editorContext = { root, txn, memimgId, onExecute };

  // Only initialize CodeJar once
  if (!jar) {
    // Create highlight function for Prism
    const highlight = (editor: HTMLElement) => {
      const code = editor.textContent || '';
      if (Prism.languages.javascript) {
        editor.innerHTML = Prism.highlight(code, Prism.languages.javascript, 'javascript');
      }
      // Update line numbers after highlighting
      updateLineNumbers();
    };

    // Initialize CodeJar
    jar = CodeJar(editor, highlight, {
      tab: '  ', // 2 spaces for tab
      indentOn: /[(\[{]$/, // Auto-indent after opening brackets
    });

    // Initialize line numbers display
    initializeLineNumbers();

    // Add keyboard shortcuts
    editor.addEventListener('keydown', async (e: KeyboardEvent) => {
      // Ctrl+Enter to run code
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();

        // Use current context (not captured closure values)
        if (editorContext) {
          await runCode(
            editorContext.root,
            editorContext.txn,
            editorContext.memimgId,
            editorContext.onExecute
          );
        }
      }
    });
  }
}
