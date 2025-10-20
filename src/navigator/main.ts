/**
 * Navigator - Memory Image Explorer
 * Main application entry point with multi-memory-image support
 */

// Import CSS for Vite processing
import '../app/assets/css/navigator.css';

import {
  deserializeMemoryImageFromJson,
} from "../memimg/memimg.js";
import { serializeMemoryImage } from "../memimg/serialize.js";
import {
  createIndexedDBEventLog,
} from "../memimg/event-log.js";
import type { EventLog } from "../memimg/types.js";
import {
  createTransaction,
  type Transaction,
} from "../memimg/transaction.js";
import { NavigationManager } from "./navigation.js";
import { renderTree } from "./ui/tree.js";
import { renderInspectorWithTabs } from "./ui/inspector.js";
import { setupEditor, runCode, setRefreshHistoryCallback, toggleLineNumbers, setEditorContent } from "./ui/editor.js";
import { renderMemImageList, showCreateDialog } from "./ui/memimg-list.js";
import { setUnwrapFunction } from "./value-types.js";
import {
  getMemoryImage,
  getEventStoreName,
  touchMemoryImage
} from "./memimg-manager.js";
import type { MemoryImageMetadata } from "./memimg-manager.js";
import {
  renderScriptHistory,
  setupHistorySearch,
  setupClearHistory,
  setupExportHistory
} from "./ui/script-history-ui.js";
import { ensureScriptHistoryStore } from "./script-history.js";

// Application state
let currentMemimgId: string | null = null;
let currentMetadata: MemoryImageMetadata | null = null;
let txn: Transaction | null = null; // Current transaction
let root: any = null; // Transaction root (user-facing proxy)
let persistentEventLog: EventLog | undefined; // IndexedDB (persistent)
const navigation = new NavigationManager();

/**
 * URL Hash Navigation
 * Makes memory images bookmarkable and enables browser back/forward navigation
 */

/**
 * Update browser URL hash
 */
function updateHash(path: string): void {
  window.location.hash = path;
}

/**
 * Parse current URL hash to determine route
 */
function parseHash(): { view: 'list' | 'edit', memimgId?: string } {
  const hash = window.location.hash.slice(1); // Remove '#'
  if (!hash || hash === '/') {
    return { view: 'list' };
  }
  const match = hash.match(/^\/edit\/(.+)$/);
  if (match) {
    return { view: 'edit', memimgId: match[1] };
  }
  return { view: 'list' };
}

/**
 * Handle browser navigation (back/forward, hash change)
 */
async function handleHashChange(): Promise<void> {
  const route = parseHash();

  if (route.view === 'list') {
    // Only close if we're currently in explorer view
    if (currentMemimgId) {
      await closeMemoryImage();
    }
  } else if (route.view === 'edit' && route.memimgId) {
    // Only open if it's a different memory image
    if (currentMemimgId !== route.memimgId) {
      try {
        await openMemoryImage(route.memimgId);
      } catch (err) {
        console.error(`Failed to open memory image from hash: ${route.memimgId}`, err);
        setStatus(`Memory image not found: ${route.memimgId}`, 'error');
        // Redirect to list view
        updateHash('/');
      }
    } else {
    }
  }
}

// DOM elements
const listView = document.getElementById("list-view") as HTMLElement;
const explorerView = document.getElementById("explorer-view") as HTMLElement;
const listContent = document.getElementById("memimg-list-content") as HTMLElement;

/**
 * Helper function: serialize object with cycle handling
 */
(window as any).viewAsJson = function (obj: any, pretty: boolean = true): any {
  const serialized = JSON.parse(serializeMemoryImage(obj, new WeakMap()));
  const json = pretty
    ? JSON.stringify(serialized, null, 2)
    : JSON.stringify(serialized);
  console.log(json);
  return serialized;
};

/**
 * Set status message
 */
function setStatus(msg: string, type: string = ""): void {
  const status = document.getElementById("status") as HTMLDivElement;
  if (!status) return;

  status.textContent = msg;
  status.className = "status-bar " + type;

  if (msg && type !== "error") {
    setTimeout(() => {
      status.textContent = "";
      status.className = "status-bar";
    }, 3000);
  }
}

/**
 * Update dirty state indicator
 */
function updateDirtyState(): void {
  // Check if transaction has uncommitted changes
  const dirty = txn ? txn.isDirty() : false;

  const indicator = document.getElementById(
    "dirty-indicator",
  ) as HTMLDivElement;
  const discardBtn = document.getElementById(
    "discard-btn",
  ) as HTMLButtonElement;

  if (!indicator || !discardBtn) return;

  if (dirty) {
    indicator.style.display = "flex";
    discardBtn.style.display = "inline-block";
  } else {
    indicator.style.display = "none";
    discardBtn.style.display = "none";
  }
}

/**
 * Render entire UI
 */
function render(): void {
  if (!root) return;

  renderTree(
    root,
    navigation,
    document.getElementById("tree-view") as HTMLElement,
    render,
  );
  renderInspectorWithTabs(
    root,
    navigation,
    document.getElementById("inspector-view") as HTMLElement,
    render,
  );
  updateNavigationButtons();
  updateDirtyState();
}

/**
 * Update back/forward button states
 */
function updateNavigationButtons(): void {
  const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
  const forwardBtn = document.getElementById("forward-btn") as HTMLButtonElement;

  if (!backBtn || !forwardBtn) return;

  backBtn.disabled = !navigation.canGoBack();
  forwardBtn.disabled = !navigation.canGoForward();
}

/**
 * Load Scott schema using ObjectType from javascript-types library
 */
async function loadScott(): Promise<void> {
  if (!root) {
    setStatus("No memory image open", "error");
    return;
  }

  try {
    // Access ObjectType from global scope (loaded by javascript-types-eval.js)
    const ObjectType = (window as any).ObjectType;
    const NumberType = (window as any).NumberType;
    const StringType = (window as any).StringType;
    const DateTypeInstance = (window as any).DateTypeInstance;

    if (!ObjectType) {
      throw new Error("ObjectType not found - javascript-types library not loaded");
    }

    // Define Name type (nested object for employee names)
    const Name = ObjectType({
      name: 'Name',
      properties: {
        firstName: { type: StringType },
        middleName: { type: StringType },
        lastName: { type: StringType }
      }
    });

    // Define Dept type with bidirectional relationship
    const Dept = ObjectType({
      name: 'Dept',
      properties: {
        deptno: { type: NumberType },
        dname: { type: StringType },
        loc: { type: StringType },
        emps: { type: null }  // Array of Emp references (populated after creation)
      }
    });

    // Define Emp type with nested name and bidirectional relationships
    const Emp = ObjectType({
      name: 'Emp',
      properties: {
        empno: { type: NumberType },
        ename: { type: Name },  // Nested Name object
        job: { type: StringType },
        mgr: { type: null },  // Reference to another Emp or null
        hiredate: { type: DateTypeInstance },
        sal: { type: NumberType },
        comm: { type: NumberType },
        dept: { type: Dept },  // Reference to Dept
        subordinates: { type: null }  // Array of Emp references (populated after creation)
      }
    });

    // Create department instances
    const accounting = Dept({ deptno: 10, dname: "ACCOUNTING", loc: "NEW YORK" });
    const research = Dept({ deptno: 20, dname: "RESEARCH", loc: "DALLAS" });
    const sales = Dept({ deptno: 30, dname: "SALES", loc: "CHICAGO" });
    const operations = Dept({ deptno: 40, dname: "OPERATIONS", loc: "BOSTON" });

    // Create employee instances with nested Name objects
    const king = Emp({
      empno: 7839,
      ename: Name({ firstName: "Arthur", middleName: "Rex", lastName: "KING" }),
      job: "PRESIDENT",
      mgr: null,
      hiredate: new Date("1981-11-17"),
      sal: 5000,
      comm: null,
      dept: accounting,
      subordinates: []  // Populated after all employees created
    });

    const jones = Emp({
      empno: 7566,
      ename: Name({ firstName: "Indiana", middleName: "Henry", lastName: "JONES" }),
      job: "MANAGER",
      mgr: king,
      hiredate: new Date("1981-04-02"),
      sal: 2975,
      comm: null,
      dept: research,
      subordinates: []  // Populated after all employees created
    });

    const blake = Emp({
      empno: 7698,
      ename: Name({ firstName: "William", middleName: "Arthur", lastName: "BLAKE" }),
      job: "MANAGER",
      mgr: king,
      hiredate: new Date("1981-05-01"),
      sal: 2850,
      comm: null,
      dept: sales,
      subordinates: []  // Populated after all employees created
    });

    const smith = Emp({
      empno: 7369,
      ename: Name({ firstName: "John", middleName: "Paul", lastName: "SMITH" }),
      job: "CLERK",
      mgr: jones,
      hiredate: new Date("1980-12-17"),
      sal: 800,
      comm: null,
      dept: research,
      subordinates: []  // Populated after all employees created
    });

    const allen = Emp({
      empno: 7499,
      ename: Name({ firstName: "Ethan", middleName: "James", lastName: "ALLEN" }),
      job: "SALESMAN",
      mgr: blake,
      hiredate: new Date("1981-02-20"),
      sal: 1600,
      comm: 300,
      dept: sales,
      subordinates: []  // Populated after all employees created
    });

    const ward = Emp({
      empno: 7521,
      ename: Name({ firstName: "Christopher", middleName: "Lee", lastName: "WARD" }),
      job: "SALESMAN",
      mgr: blake,
      hiredate: new Date("1981-02-22"),
      sal: 1250,
      comm: 500,
      dept: sales,
      subordinates: []  // Populated after all employees created
    });

    // Populate bidirectional relationships

    // Populate dept.emps arrays
    accounting.emps = [king];
    research.emps = [jones, smith];
    sales.emps = [blake, allen, ward];
    operations.emps = [];  // No employees in operations

    // Populate emp.subordinates arrays
    king.subordinates = [jones, blake];  // Jones and Blake report to King
    jones.subordinates = [smith];  // Smith reports to Jones
    blake.subordinates = [allen, ward];  // Allen and Ward report to Blake
    smith.subordinates = [];  // No subordinates
    allen.subordinates = [];  // No subordinates
    ward.subordinates = [];  // No subordinates

    // Attach to root
    root.depts = { accounting, research, sales, operations };
    root.emps = { king, jones, blake, smith, allen, ward };

    // Store types in window (not in memory image, since functions can't be serialized)
    (window as any).types = { Dept, Emp, Name };
    console.log('Types available at: window.types = { Dept, Emp, Name }');

    setStatus("Scott schema loaded (with ObjectType)", "success");

    // Update dirty indicator to show unsaved changes
    updateDirtyState();

    await render();
  } catch (err) {
    const error = err as Error;
    setStatus("Error loading Scott: " + error.message, "error");
    console.error(error);
  }
}

/**
 * Save changes to persistent storage
 */
async function saveChanges(): Promise<void> {
  if (!txn) {
    setStatus("Transaction not initialized", "error");
    return;
  }

  if (!txn.isDirty()) {
    setStatus("No changes to save", "success");
    return;
  }

  try {
    console.log("Committing transaction to IndexedDB...");

    // Commit changes to persistent storage
    await txn.save();

    // Touch the metadata to update timestamp
    if (currentMemimgId) {
      await touchMemoryImage(currentMemimgId);
    }

    // Update dirty state
    updateDirtyState();

    setStatus("Changes saved to IndexedDB", "success");
    await render();
  } catch (err) {
    const error = err as Error;
    setStatus("Save error: " + error.message, "error");
    console.error(error);
  }
}

/**
 * Discard unsaved changes
 */
async function discardChanges(): Promise<void> {
  if (!txn) {
    setStatus("Transaction not initialized", "error");
    return;
  }

  if (!txn.isDirty()) {
    return;
  }

  if (!confirm("Discard all unsaved changes?")) {
    return;
  }

  try {
    console.log("Rolling back transaction...");

    // Discard uncommitted changes
    txn.discard();

    // Update dirty state
    updateDirtyState();

    setStatus("Changes discarded", "success");
    await render();
  } catch (err) {
    const error = err as Error;
    setStatus("Discard error: " + error.message, "error");
    console.error(err);
  }
}

/**
 * Clear all data
 */
async function clearAll(): Promise<void> {
  if (!confirm("Clear all data from memory image and IndexedDB?")) return;

  if (!persistentEventLog || !txn) {
    setStatus("Not initialized", "error");
    return;
  }

  try {
    // Clear memory image (delete all properties)
    for (const key in root) {
      delete root[key];
    }

    // Commit the deletions
    await txn.save();

    // Clear persistent event log
    if (persistentEventLog?.clear) await persistentEventLog.clear();

    // Recreate fresh transaction
    txn = await createTransaction(persistentEventLog);
    root = txn.root;
    (window as any).root = root;

    // Wire unwrap function for Date detection
    setUnwrapFunction(txn.unwrap.bind(txn));

    // Reset navigation to initial state
    navigation.reset();

    // Update dirty state
    updateDirtyState();

    setStatus("Cleared all data", "success");
    await render();
  } catch (err) {
    const error = err as Error;
    setStatus("Clear error: " + error.message, "error");
    console.error(error);
  }
}

/**
 * Download helper function
 */
function downloadFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Serialize an event, converting values with cycles to JSON-safe format
 */
// NOTE: serializeEvent() removed - events in the log are already fully serialized.
// Re-serializing them was breaking {__type__: 'ref'} objects for circular references.

/**
 * Export current state as JSON snapshot
 */
async function exportSnapshot(): Promise<void> {
  if (!root) {
    setStatus("No memory image open", "error");
    return;
  }

  if (!currentMetadata) {
    setStatus("No metadata available", "error");
    return;
  }

  // Warn user that snapshots cannot be re-imported
  const confirmed = confirm(
    "📸 Export Snapshot (External Use Only)\n\n" +
    "⚠️  IMPORTANT: Snapshots CANNOT be re-imported into Filer.\n\n" +
    "Snapshots are for:\n" +
    "• Sharing data with external tools\n" +
    "• Data analysis and reporting\n" +
    "• Human-readable backups\n\n" +
    "To save your work for later:\n" +
    "✅ Use 'Export Event Log' instead (re-importable)\n\n" +
    "Continue with snapshot export?"
  );

  if (!confirmed) {
    setStatus("Snapshot export cancelled", "info");
    return;
  }

  try {
    console.log("Exporting snapshot...");

    // CRITICAL: Deep unwrap transaction proxies before serialization
    // Transaction proxies wrap Date objects, causing toISOString() to fail
    // We need to recursively unwrap everything to get plain JavaScript objects
    const deepUnwrap = (obj: any, seen = new WeakSet()): any => {
      // Primitives
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;

      // Prevent infinite recursion on circular refs
      if (seen.has(obj)) return obj;
      seen.add(obj);

      // Unwrap transaction proxy (one level)
      const unwrapped = txn!.unwrap(obj);

      // If it's a Date, return it (no need to recurse)
      if (unwrapped instanceof Date) return unwrapped;

      // If it's an Array, recursively unwrap elements
      if (Array.isArray(unwrapped)) {
        return unwrapped.map(item => deepUnwrap(item, seen));
      }

      // If it's a Map, recursively unwrap entries
      if (unwrapped instanceof Map) {
        const result = new Map();
        unwrapped.forEach((value, key) => {
          result.set(deepUnwrap(key, seen), deepUnwrap(value, seen));
        });
        return result;
      }

      // If it's a Set, recursively unwrap values
      if (unwrapped instanceof Set) {
        const result = new Set();
        unwrapped.forEach(value => {
          result.add(deepUnwrap(value, seen));
        });
        return result;
      }

      // Plain object - recursively unwrap properties
      const result: any = {};
      for (const key in unwrapped as Record<string, unknown>) {
        if (Object.prototype.hasOwnProperty.call(unwrapped, key)) {
          result[key] = deepUnwrap((unwrapped as any)[key], seen);
        }
      }
      return result;
    };

    // Deep unwrap the entire transaction root to plain JavaScript objects
    const unwrappedRoot = deepUnwrap(root);

    // Serialize the unwrapped state
    const stateJson = serializeMemoryImage(unwrappedRoot, new WeakMap());
    const state = JSON.parse(stateJson);

    // Create snapshot object with metadata
    const snapshot = {
      type: "snapshot",
      version: 1,
      timestamp: Date.now(),
      name: currentMetadata.name,
      description: currentMetadata.description,
      state: state
    };

    // Convert to formatted JSON
    const json = JSON.stringify(snapshot, null, 2);

    // Generate filename with memory image name and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${currentMetadata.name}-snapshot-${timestamp}.json`;

    // Trigger download
    downloadFile(filename, json);

    setStatus(`Exported snapshot to ${filename}`, 'success');
    console.log(`Exported snapshot (${json.length} bytes)`);
  } catch (err) {
    const error = err as Error;
    setStatus("Export error: " + error.message, "error");
    console.error("Export error:", error);
  }
}

/**
 * Export events to NDJSON file
 */
async function exportEvents(): Promise<void> {
  if (!persistentEventLog) {
    setStatus("No memory image open", "error");
    return;
  }

  if (!currentMetadata) {
    setStatus("No metadata available", "error");
    return;
  }

  try {
    console.log("Exporting events...");

    // Get all events from IndexedDB
    const events = await persistentEventLog.getAll();

    if (events.length === 0) {
      setStatus("No events to export", "success");
      return;
    }

    // Events in the log are already fully serialized (with proper {__type__: 'ref'} objects)
    // Just convert directly to NDJSON - DO NOT re-serialize or we'll break circular refs!
    const ndjson = events
      .map(e => JSON.stringify(e))
      .join('\n');

    // Generate filename with memory image name and timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `${currentMetadata.name}-${timestamp}.ndjson`;

    // Trigger download
    downloadFile(filename, ndjson);

    setStatus(`Exported ${events.length} events to ${filename}`, 'success');
    console.log(`Exported ${events.length} events`);
  } catch (err) {
    const error = err as Error;
    setStatus("Export error: " + error.message, "error");
    console.error("Export error:", error);
  }
}

// NOTE: deserializeEvent() removed - events are already fully serialized in the log.
// They are deserialized during replay by deserializeEventValue() which uses the
// correct logic from deserialize.ts (handles __dateValue__ for dates, etc.)

/**
 * Import snapshot or event log file
 */
async function importEvents(file: File): Promise<void> {
  if (!persistentEventLog || !txn) {
    setStatus("No memory image open", "error");
    return;
  }

  try {
    console.log(`Importing event log from ${file.name}...`);

    // Read file content
    const content = await file.text();

    // Detect if user is trying to import a snapshot (not supported)
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && parsed.type === 'snapshot') {
        setStatus(
          "Snapshot files cannot be imported. Use 'Export Event Log' to create re-importable files.",
          "error"
        );
        alert(
          "⚠️  Snapshot Import Not Supported\n\n" +
          "Snapshot files are for external consumption only and cannot be re-imported.\n\n" +
          "To save and restore your data:\n" +
          "• Use 'Export Event Log' (not 'Export Snapshot')\n" +
          "• Event logs can be imported to restore your work\n\n" +
          "Snapshots are useful for sharing data with other tools,\n" +
          "but only Event Logs preserve the mutation history needed for import."
        );
        return;
      }
    } catch {
      // Not a single JSON object - good, it's probably NDJSON
    }

    // Parse NDJSON event log (one JSON per line)
    const lines = content
      .trim()
      .split('\n')
      .filter(line => line.trim());

    if (lines.length === 0) {
      setStatus("No events found in file", "error");
      return;
    }

    // Parse events from NDJSON
    // Events are already fully serialized - don't deserialize yet!
    // They'll be deserialized during replay by deserializeEventValue()
    const events = lines.map(line => {
      try {
        return JSON.parse(line);
      } catch (err) {
        throw new Error(`Invalid JSON in file: ${line.slice(0, 50)}...`);
      }
    });

    console.log(`Parsed ${events.length} events`);

    // Confirm with user
    if (!confirm(`Import ${events.length} events? This will replace all current data.`)) {
      return;
    }

    // Clear current event log
    if (persistentEventLog?.clear) {
      await persistentEventLog.clear();
      console.log("Cleared existing event log");
    }

    // Replay events
    for (const event of events) {
      await persistentEventLog.append(event);
    }

    console.log(`Replayed ${events.length} events`);

    // Recreate transaction from imported events
    txn = await createTransaction(persistentEventLog);
    root = txn.root;
    (window as any).root = root;

    // Wire unwrap function for Date detection
    setUnwrapFunction(txn.unwrap.bind(txn));

    // Reset navigation to initial state
    navigation.reset();

    // Update dirty state
    updateDirtyState();

    setStatus(`Imported ${events.length} events from ${file.name}`, 'success');
    await render();
  } catch (err) {
    const error = err as Error;
    setStatus("Import error: " + error.message, "error");
    console.error("Import error:", error);
  }
}

/**
 * Setup resizable panel handles
 */
function setupResizeHandles(): void {
  const handles = document.querySelectorAll<HTMLElement>('.resize-handle');

  handles.forEach(handle => {
    let startPos = 0;
    let startSize = 0;
    let startSizeNext = 0;
    let prevPanel: HTMLElement | null = null;
    let nextPanel: HTMLElement | null = null;

    handle.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();

      const direction = handle.dataset.direction;
      prevPanel = handle.previousElementSibling as HTMLElement;
      nextPanel = handle.nextElementSibling as HTMLElement;

      if (!prevPanel || !nextPanel) return;

      startPos = direction === 'vertical' ? e.clientY : e.clientX;
      startSize = direction === 'vertical'
        ? prevPanel.offsetHeight
        : prevPanel.offsetWidth;
      startSizeNext = direction === 'vertical'
        ? nextPanel.offsetHeight
        : nextPanel.offsetWidth;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.body.style.cursor = direction === 'vertical' ? 'ns-resize' : 'ew-resize';
      document.body.style.userSelect = 'none';
    });

    function onMouseMove(e: MouseEvent) {
      if (!prevPanel || !nextPanel || !handle) return;

      const direction = (handle as HTMLElement).dataset.direction;
      const currentPos = direction === 'vertical' ? e.clientY : e.clientX;
      const delta = currentPos - startPos;

      const newSize = startSize + delta;
      const newSizeNext = startSizeNext - delta;

      // Enforce min sizes
      const minSize = 200;
      if (newSize < minSize || newSizeNext < minSize) return;

      if (direction === 'vertical') {
        prevPanel.style.flex = 'none';
        prevPanel.style.height = `${newSize}px`;
        nextPanel.style.flex = 'none';
        nextPanel.style.height = `${newSizeNext}px`;
      } else {
        prevPanel.style.flex = 'none';
        prevPanel.style.width = `${newSize}px`;
        nextPanel.style.flex = 'none';
        nextPanel.style.width = `${newSizeNext}px`;
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });
}

/**
 * Setup script history UI controls
 * Store is pre-created during memimg open, so we can load entries on demand.
 */
function setupScriptHistoryControls(): void {
  if (!currentMemimgId || !currentMetadata) return;

  const historyList = document.getElementById('history-list') as HTMLElement;
  const historySearch = document.getElementById('history-search') as HTMLInputElement;
  const clearHistoryBtn = document.getElementById('clear-history-btn') as HTMLButtonElement;
  const exportHistoryBtn = document.getElementById('export-history-btn') as HTMLButtonElement;
  const toggleHistoryBtn = document.getElementById('toggle-history-btn') as HTMLButtonElement;
  const closeHistoryBtn = document.getElementById('close-history-btn') as HTMLButtonElement;
  const sidebar = document.getElementById('script-history-sidebar') as HTMLElement;

  if (!historyList || !historySearch || !clearHistoryBtn || !exportHistoryBtn) return;

  // Track if history has been loaded
  let historyLoaded = false;

  // Load script from history into editor and close sidebar
  const loadScript = (code: string) => {
    setEditorContent(code);
    const editor = document.getElementById('code-editor') as HTMLElement;
    if (editor) {
      editor.focus();
    }
    // Close sidebar to reveal loaded code
    if (sidebar) {
      sidebar.classList.add('collapsed');
    }
  };

  // Lazy load history when sidebar is opened
  const loadHistoryIfNeeded = async () => {
    if (!historyLoaded && currentMemimgId) {
      try {
        await renderScriptHistory(historyList, currentMemimgId, loadScript);
        historyLoaded = true;
      } catch (err) {
        console.error('Failed to load script history:', err);
        historyList.innerHTML = '<div class="history-error">Failed to load history</div>';
      }
    }
  };

  // Setup search
  setupHistorySearch(historySearch, historyList, currentMemimgId, loadScript);

  // Setup clear
  setupClearHistory(clearHistoryBtn, currentMemimgId, async () => {
    if (currentMemimgId) {
      await renderScriptHistory(historyList, currentMemimgId, loadScript);
      historyLoaded = true;
    }
  });

  // Setup export
  setupExportHistory(exportHistoryBtn, currentMemimgId, currentMetadata.name);

  // Setup toggle button (with lazy loading)
  if (toggleHistoryBtn && sidebar) {
    toggleHistoryBtn.onclick = async () => {
      const wasCollapsed = sidebar.classList.contains('collapsed');
      sidebar.classList.toggle('collapsed');

      // Load history when opening sidebar for the first time
      if (wasCollapsed) {
        await loadHistoryIfNeeded();
      }
    };
  }

  // Setup close button
  if (closeHistoryBtn && sidebar) {
    closeHistoryBtn.onclick = () => {
      sidebar.classList.add('collapsed');
    };
  }

  // Show placeholder in history list
  historyList.innerHTML = '<div class="history-empty">Open history panel to view scripts</div>';
}

/**
 * Refresh script history display (only if sidebar is open)
 */
async function refreshScriptHistory(): Promise<void> {
  if (!currentMemimgId) return;

  const sidebar = document.getElementById('script-history-sidebar') as HTMLElement;
  const historyList = document.getElementById('history-list') as HTMLElement;

  // Only refresh if sidebar is open (not collapsed)
  if (!sidebar || !historyList || sidebar.classList.contains('collapsed')) {
    return;
  }

  const loadScript = (code: string) => {
    setEditorContent(code);
    const editor = document.getElementById('code-editor') as HTMLElement;
    if (editor) {
      editor.focus();
    }
    // Close sidebar to reveal loaded code
    if (sidebar) {
      sidebar.classList.add('collapsed');
    }
  };

  await renderScriptHistory(historyList, currentMemimgId, loadScript);
}

/**
 * Show list view
 */
async function showListView(): Promise<void> {
  // Hide explorer, show list
  explorerView.style.display = "none";
  listView.style.display = "flex";

  // Render list
  await renderMemImageList(listContent, openMemoryImage);

  // Reset document title to default
  document.title = "Navigator - Memory Image Explorer";

  // Update URL hash to list view
  updateHash('/');

  console.log("Showing list view");
}

/**
 * Open a memory image
 */
async function openMemoryImage(id: string): Promise<void> {
  const startTime = Date.now();

  // Set currentMemimgId IMMEDIATELY to prevent race condition with hash change
  // When updateHash() is called at the end, it triggers handleHashChange()
  // which checks if currentMemimgId !== route.memimgId
  // If we don't set this early, handleHashChange() will call openMemoryImage() again!
  currentMemimgId = id;

  try {
    console.log(`Opening memory image: ${id}`);

    // Load metadata
    const metadata = await getMemoryImage(id);
    if (!metadata) {
      throw new Error(`Memory image not found: ${id}`);
    }

    currentMetadata = metadata;

    // Pre-create script history store FIRST (before opening event log connection)
    // This ensures the database is upgraded to the latest version before any connections are opened
    await ensureScriptHistoryStore(id);
    console.log("Script history store ensured");

    // Now create persistent event log for this memory image
    // The event log will open the already-upgraded database
    const storeName = getEventStoreName(id);
    persistentEventLog = createIndexedDBEventLog(
      "memimg-explorer",
      storeName,
    ) as EventLog;

    // Create transaction (automatically loads from persistent log if exists)
    txn = await createTransaction(persistentEventLog);
    root = txn.root;

    // Expose root globally for user scripts
    (window as any).root = root;

    // Wire unwrap function for Date detection
    setUnwrapFunction(txn.unwrap.bind(txn));

    // Set up navigation callback
    navigation.onNavigate = render;

    // Monitor for changes by wrapping event log append
    const originalAppend = persistentEventLog.append.bind(persistentEventLog);
    persistentEventLog.append = async function (event: any): Promise<void> {
      await originalAppend(event);
      // After commit, update dirty indicator
      updateDirtyState();
    };

    // Show explorer view
    listView.style.display = "none";
    explorerView.style.display = "flex";

    // Update header with memory image name
    const nameEl = document.getElementById("current-memimg-name") as HTMLHeadingElement;
    if (nameEl) {
      nameEl.textContent = metadata.name;
    }

    // Update document title for better bookmarking
    document.title = `${metadata.name} - Navigator`;

    // Clear editor (override browser auto-restore)
    const editor = document.getElementById('code-editor') as HTMLTextAreaElement;
    if (editor) {
      editor.value = '';
    }

    // Setup script history UI controls (but don't load entries yet - lazy load on first access)
    setupScriptHistoryControls();

    // Setup editor keyboard shortcuts (Ctrl+Enter to run)
    setupEditor(root, txn, currentMemimgId, render);

    // Set up history refresh callback
    setRefreshHistoryCallback(refreshScriptHistory);

    setStatus("Ready", "success");
    await render();

    // Update URL hash for bookmarkability
    updateHash(`/edit/${id}`);

    console.log("Memory image opened successfully");
  } catch (err) {
    const error = err as Error;
    setStatus("Error opening memory image: " + error.message, "error");
    console.error("Open error:", error);
  }
}

/**
 * Close current memory image and return to list
 */
async function closeMemoryImage(): Promise<void> {

  // Check for unsaved changes
  if (txn && txn.isDirty()) {
    if (!confirm("You have unsaved changes. Close anyway?")) {
      return;
    }
  }

  // Clear editor (don't leave script in browser cache)
  const editor = document.getElementById('code-editor') as HTMLTextAreaElement;
  if (editor) {
    editor.value = '';
  }

  // Close script history sidebar
  const sidebar = document.getElementById('script-history-sidebar') as HTMLElement;
  if (sidebar) {
    sidebar.classList.add('collapsed');
  }

  // Close persistent event log connection before cleanup
  if (persistentEventLog?.close) {
    try {
      await persistentEventLog.close();
    } catch (err) {
      // Don't let close() errors prevent cleanup - log and continue
      // This ensures we can always return to list view even if event log close fails
    }
  } else {
  }

  // Cleanup
  currentMemimgId = null;
  currentMetadata = null;
  txn = null;
  root = null;
  persistentEventLog = undefined;
  (window as any).root = undefined;

  // Reset navigation to initial state
  navigation.reset();

  // Return to list view
  await showListView();

  console.log("Memory image closed");
}

/**
 * Theme management
 *
 * TODO: Refactor into unified preferences system
 *
 * Current approach: Individual localStorage keys per preference
 * - Simple but doesn't scale well
 *
 * Future approach: Single 'memimg-preferences' key storing JSON object
 * Example structure:
 * {
 *   theme: 'dark' | 'light',
 *   editor: {
 *     fontSize: 14,
 *     tabSize: 2,
 *     showLineNumbers: true
 *   },
 *   autoSave: true,
 *   historyLimit: 100,
 *   // ... additional preferences
 * }
 *
 * Planned preferences to add:
 * - Editor: font size, tab size, line numbers visibility
 * - Auto-save: enabled/disabled, interval
 * - Script history: max entries limit
 * - UI layout: panel sizes, collapsed state
 */
const THEME_STORAGE_KEY = 'memimg-theme';

function getTheme(): 'dark' | 'light' {
  return (localStorage.getItem(THEME_STORAGE_KEY) as 'dark' | 'light') || 'dark';
}

function setTheme(theme: 'dark' | 'light'): void {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeIcons(theme);
}

function updateThemeIcons(theme: 'dark' | 'light'): void {
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const themeToggleList = document.getElementById("theme-toggle-list") as HTMLButtonElement;
  const themeToggleExplorer = document.getElementById("theme-toggle-explorer") as HTMLButtonElement;

  if (themeToggleList) themeToggleList.textContent = icon;
  if (themeToggleExplorer) themeToggleExplorer.textContent = icon;
}

function toggleTheme(): void {
  const currentTheme = getTheme();
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}

function initializeTheme(): void {
  const savedTheme = getTheme();
  setTheme(savedTheme);
}

/**
 * Setup event listeners
 */
function setupEventListeners(): void {
  // List view - create button
  const createBtn = document.getElementById("create-memimg-btn") as HTMLButtonElement;
  if (createBtn) {
    createBtn.addEventListener("click", () => {
      showCreateDialog(listContent, openMemoryImage);
    });
  }

  // Explorer view - back button
  const backToListBtn = document.getElementById("back-to-list-btn") as HTMLButtonElement;
  if (backToListBtn) {
    backToListBtn.addEventListener("click", closeMemoryImage);
  }

  // Navigation buttons
  const backBtn = document.getElementById("back-btn") as HTMLButtonElement;
  const forwardBtn = document.getElementById("forward-btn") as HTMLButtonElement;

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      navigation.goBack();
    });
  }

  if (forwardBtn) {
    forwardBtn.addEventListener("click", () => {
      navigation.goForward();
    });
  }

  // Keyboard shortcuts for navigation
  document.addEventListener("keydown", (e: KeyboardEvent) => {
    if (e.altKey && e.key === "ArrowLeft") {
      e.preventDefault();
      navigation.goBack();
    }
    if (e.altKey && e.key === "ArrowRight") {
      e.preventDefault();
      navigation.goForward();
    }
  });

  // Action buttons
  const loadScottBtn = document.getElementById("load-scott-btn") as HTMLButtonElement;
  const exportSnapshotBtn = document.getElementById("export-snapshot-btn") as HTMLButtonElement;
  const exportBtn = document.getElementById("export-events-btn") as HTMLButtonElement;
  const importBtn = document.getElementById("import-events-btn") as HTMLButtonElement;
  const saveBtn = document.getElementById("save-btn") as HTMLButtonElement;
  const discardBtn = document.getElementById("discard-btn") as HTMLButtonElement;
  const clearBtn = document.getElementById("clear-btn") as HTMLButtonElement;

  if (loadScottBtn) loadScottBtn.addEventListener("click", loadScott);
  if (exportSnapshotBtn) exportSnapshotBtn.addEventListener("click", exportSnapshot);
  if (exportBtn) exportBtn.addEventListener("click", exportEvents);
  if (importBtn) {
    importBtn.addEventListener("click", () => {
      const fileInput = document.getElementById("events-file-input") as HTMLInputElement;
      if (fileInput) fileInput.click();
    });
  }
  if (saveBtn) saveBtn.addEventListener("click", saveChanges);
  if (discardBtn) discardBtn.addEventListener("click", discardChanges);
  if (clearBtn) clearBtn.addEventListener("click", clearAll);

  // File input for import
  const fileInput = document.getElementById("events-file-input") as HTMLInputElement;
  if (fileInput) {
    fileInput.addEventListener("change", async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file) {
        await importEvents(file);
        // Reset input so same file can be imported again
        target.value = "";
      }
    });
  }

  // Run code button
  const runBtn = document.getElementById("run-btn") as HTMLButtonElement;
  if (runBtn) {
    runBtn.addEventListener("click", async () => {
      if (root && txn && currentMemimgId) {
        await runCode(root, txn, currentMemimgId, render);
      }
    });
  }

  // Line numbers toggle button
  const toggleLineNumbersBtn = document.getElementById("toggle-line-numbers-btn") as HTMLButtonElement;
  if (toggleLineNumbersBtn) {
    toggleLineNumbersBtn.addEventListener("click", toggleLineNumbers);
  }

  // NOTE: Editor keyboard shortcuts are set up per-memimg in openMemoryImage()
  // (not here, because root/txn/memimgId are not available at initial setup)

  // Browser navigation (back/forward, hash change)
  window.addEventListener("hashchange", handleHashChange);

  // Setup resizable panel handles
  setupResizeHandles();

  // Theme toggle buttons
  const themeToggleList = document.getElementById("theme-toggle-list") as HTMLButtonElement;
  const themeToggleExplorer = document.getElementById("theme-toggle-explorer") as HTMLButtonElement;

  if (themeToggleList) {
    themeToggleList.addEventListener("click", toggleTheme);
  }
  if (themeToggleExplorer) {
    themeToggleExplorer.addEventListener("click", toggleTheme);
  }

  console.log("Event listeners attached");
}

/**
 * Main entry point
 */
(async () => {
  try {
    console.log("Initializing Navigator...");

    // Handle browser back/forward cache restoration
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was restored from bfcache - clear editor
        const editor = document.getElementById('code-editor') as HTMLTextAreaElement;
        if (editor) {
          editor.value = '';
        }
      }
    });

    // Clear editor on initial load (override browser auto-restore)
    const editor = document.getElementById('code-editor') as HTMLTextAreaElement;
    if (editor) {
      editor.value = '';
    }

    // Initialize theme from localStorage
    initializeTheme();

    // Setup event listeners
    setupEventListeners();

    // Check URL hash on load for deep linking
    const route = parseHash();
    if (route.view === 'edit' && route.memimgId) {
      console.log(`Loading memory image from hash: ${route.memimgId}`);
      try {
        await openMemoryImage(route.memimgId);
      } catch (err) {
        console.error(`Failed to load memory image from hash: ${route.memimgId}`, err);
        setStatus(`Could not load memory image: ${route.memimgId}`, 'error');
        await showListView();
      }
    } else {
      // Show list view by default
      await showListView();
    }

    console.log("Navigator initialization complete");
  } catch (err) {
    console.error("Failed to initialize:", err);
    setStatus("Initialization error: " + (err as Error).message, "error");
  }
})();
