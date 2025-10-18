/**
 * Tree View - Renders the navigational object graph structure
 *
 * Decomposed into focused functions for clarity and testability.
 */

import { getObjectPath } from "../memimg-accessor.js";
import type { NavigationManager, PathArray } from "../navigation.js";
import { isCollection, getCollectionAdapter } from "../collections.js";

// ============================================================================
// Type Guards and Helpers
// ============================================================================

/**
 * Check if value should appear in tree (navigational items only)
 */
function shouldShowInTree(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  // Date, though an object, is treated as a primitive - don't show in tree
  if (value instanceof Date) return false;
  const type = typeof value;
  return type === "object" || type === "function";
}

/**
 * Get icon for a value
 */
function getIcon(value: unknown): string {
  if (value === null || value === undefined) return "○";
  if (Array.isArray(value)) return "[]";
  if (typeof value === "object") return "{}";
  if (typeof value === "function") return "ƒ";
  return "•";
}

// ============================================================================
// Children Extraction
// ============================================================================

/**
 * Get actual children for a value (filtering out references for objects)
 *
 * This is the core logic that determines what appears in the tree:
 * - Collections always show their elements (using adapter pattern)
 * - Objects/functions only show nested properties (not references)
 */
function getActualChildren(
  value: any,
  path: PathArray,
  root: any,
): Array<[string, any]> {
  if (!shouldShowInTree(value)) return [];

  // Collections always show their elements (unified via adapter)
  const adapter = getCollectionAdapter(value);
  if (adapter) {
    return adapter.getChildren(value);
  }

  // For objects/functions, filter out references
  const entries = Object.entries(value);
  const filtered = entries.filter(([k, v]) => {
    // Filter out internal properties
    if (k.startsWith("__")) return false;

    // Filter out non-navigable values
    if (!shouldShowInTree(v)) return false;

    // Check if this is a reference (object exists elsewhere)
    if (typeof v === "object" && v !== null) {
      const canonicalPath = getObjectPath(root, v);
      if (canonicalPath) {
        const currentPath = path.join(".");
        const objPath = canonicalPath.join(".");
        // Only show if nested, not if it's a reference
        if (
          !objPath.startsWith(currentPath + ".") &&
          objPath !== currentPath
        ) {
          return false;
        }
      }
    }

    return true;
  });

  return filtered;
}

// ============================================================================
// Tree Node Header Creation
// ============================================================================

/**
 * Create the tree node header
 *
 * Contains toggle arrow, icon, and label.
 */
function createTreeHeader(
  key: string,
  value: any,
  path: PathArray,
  isExpandable: boolean,
  isExpanded: boolean,
  isSelected: boolean,
): HTMLDivElement {
  const header = document.createElement("div");
  header.className = "tree-node-header";

  if (isSelected) {
    header.classList.add("selected");
  }

  // Toggle arrow
  const toggle = document.createElement("span");
  toggle.className = isExpandable
    ? isExpanded
      ? "tree-toggle expanded"
      : "tree-toggle collapsed"
    : "tree-toggle leaf";

  // Icon
  const icon = document.createElement("span");
  icon.className = "tree-icon";
  icon.textContent = getIcon(value);

  // Label
  const label = document.createElement("span");
  label.className = "tree-label";
  label.textContent = key;

  header.appendChild(toggle);
  header.appendChild(icon);
  header.appendChild(label);

  return header;
}

/**
 * Attach click handlers to tree node header
 */
function attachHeaderHandlers(
  header: HTMLDivElement,
  value: any,
  path: PathArray,
  root: any,
  isExpandable: boolean,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): void {
  const pathKey = path.join(".");
  const toggle = header.querySelector(".tree-toggle") as HTMLElement;

  // Click handler for toggle (separate from selection)
  toggle.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();
    if (isExpandable) {
      navigationManager.toggleExpanded(pathKey);
      if (onNavigate) onNavigate();
    }
  });

  // Click handler for header (selection/navigation)
  header.addEventListener("click", (e: MouseEvent) => {
    e.stopPropagation();

    // Navigate to this node
    // For objects, navigate to canonical path (handles references in arrays)
    let targetPath: PathArray = path;
    if (
      value !== null &&
      value !== undefined &&
      (typeof value === "object" || typeof value === "function")
    ) {
      const canonicalPath = getObjectPath(root, value);
      if (canonicalPath) {
        targetPath = [...canonicalPath];
      }
    }

    navigationManager.navigateTo(targetPath, true);
    if (onNavigate) onNavigate();
  });
}

// ============================================================================
// Children Rendering
// ============================================================================

/**
 * Render children container with child nodes
 *
 * Uses collection adapter for unified rendering of Array/Map/Set.
 */
function renderChildren(
  value: any,
  path: PathArray,
  actualChildren: Array<[string, any]>,
  root: any,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLDivElement {
  const children = document.createElement("div");
  children.className = "tree-children expanded";

  // Use adapter for collections, or object rendering for plain objects
  const adapter = getCollectionAdapter(value);
  if (adapter) {
    renderCollectionChildren(children, actualChildren, path, adapter, root, navigationManager, onNavigate);
  } else {
    renderObjectChildren(children, actualChildren, path, root, navigationManager, onNavigate);
  }

  return children;
}

/**
 * Render collection children (Array/Map/Set) using adapter pattern
 *
 * Replaces three separate functions (renderArrayChildren, renderMapChildren,
 * renderSetChildren) with single unified implementation.
 */
function renderCollectionChildren(
  container: HTMLDivElement,
  actualChildren: Array<[string, any]>,
  path: PathArray,
  adapter: ReturnType<typeof getCollectionAdapter>,
  root: any,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): void {
  if (!adapter) return;

  let index = 0;
  for (const [label, childValue] of actualChildren) {
    const childPath = adapter.createChildPath(path, index);
    container.appendChild(
      createTreeNode(label, childValue, childPath, root, navigationManager, onNavigate),
    );
    index++;
  }
}

/**
 * Render object/function children
 */
function renderObjectChildren(
  container: HTMLDivElement,
  actualChildren: Array<[string, any]>,
  path: PathArray,
  root: any,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): void {
  for (const [k, v] of actualChildren) {
    const childPath = [...path, k];
    container.appendChild(
      createTreeNode(k, v, childPath, root, navigationManager, onNavigate),
    );
  }
}

// ============================================================================
// Tree Node Creation
// ============================================================================

/**
 * Create a tree node element
 *
 * Main entry point for creating a node - delegates to helper functions.
 */
function createTreeNode(
  key: string,
  value: any,
  path: PathArray,
  root: any,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLDivElement {
  const node = document.createElement("div");
  node.className = "tree-node";

  const pathKey = path.join(".");
  const isSelected = pathKey === navigationManager.selectedPath.join(".");

  // Determine if expandable based on actual visible children
  const actualChildren = getActualChildren(value, path, root);
  const isExpandable = actualChildren.length > 0;
  const isExpanded = navigationManager.isExpanded(pathKey);

  // Create header
  const header = createTreeHeader(key, value, path, isExpandable, isExpanded, isSelected);
  attachHeaderHandlers(header, value, path, root, isExpandable, navigationManager, onNavigate);
  node.appendChild(header);

  // Create children container if expanded
  if (isExpandable && isExpanded) {
    const childrenContainer = renderChildren(
      value,
      path,
      actualChildren,
      root,
      navigationManager,
      onNavigate,
    );
    node.appendChild(childrenContainer);
  }

  return node;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Render the complete tree view
 */
export function renderTree(
  root: any,
  navigationManager: NavigationManager,
  containerElement: HTMLElement,
  onNavigate: (() => void) | null,
): void {
  containerElement.innerHTML = "";
  const rootNode = createTreeNode(
    "this",
    root,
    ["root"],
    root,
    navigationManager,
    onNavigate,
  );
  containerElement.appendChild(rootNode);
}
