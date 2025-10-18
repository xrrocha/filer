/**
 * Inspector - Property inspector for selected objects
 *
 * Decomposed into focused functions for clarity and testability.
 */

import { getObjectPath } from "../memimg-accessor.js";
import type { NavigationManager, PathArray } from "../navigation.js";
import { formatValueWithInfo, inferLabel } from "../formatters.js";
import { getVisibleProperties, partitionProperties } from "../property-access.js";
import { traversePath } from "../path-utils.js";
import { CSS_CLASSES } from "../constants.js";
import { getCollectionAdapter } from "../collections.js";
import { createTabs, type TabDefinition } from "./tabs.js";
import { isLeafLikeObject } from "../value-types.js";

// ============================================================================
// Value Cell Creation
// ============================================================================

/**
 * Create a table cell for a property value
 *
 * Handles formatting, styling, and navigation for the value.
 */
function createValueCell(
  value: unknown,
  propertyKey: string,
  root: any,
  parentPath: PathArray,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = CSS_CLASSES.PROPERTY_VALUE;

  // Format value and get type info
  const [formatted, info] = formatValueWithInfo(value, 'preview');

  // Set text content and tooltip
  td.textContent = formatted;
  td.title = info.typeName;

  // Apply CSS classes for styling
  td.classList.add(info.cssClass);

  // Make navigable values clickable
  if (info.isNavigable) {
    td.classList.add(CSS_CLASSES.VALUE_NAVIGABLE);
    td.addEventListener("click", () => {
      navigateToReference(root, parentPath, propertyKey, navigationManager, onNavigate);
    });
  }

  return td;
}

/**
 * Create inline nested object value cell (Phase 13)
 *
 * Creates an expandable cell for leaf-like objects that can be viewed inline.
 * Single-click toggles expansion, double-click navigates to the object.
 */
function createInlineNestedCell(
  nestedObj: any,
  propertyKey: string,
  parentPath: PathArray,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLTableCellElement {
  const td = document.createElement("td");
  td.className = CSS_CLASSES.PROPERTY_VALUE;

  const nestedPath = `${parentPath.join(".")}.${propertyKey}`;
  const isExpanded = navigationManager.isNestedExpanded(nestedPath);
  const summary = inferLabel(nestedObj);

  // Create expandable wrapper
  const wrapper = document.createElement("div");
  wrapper.className = "value-nested";

  // Toggle arrow
  const toggle = document.createElement("span");
  toggle.className = `value-nested-toggle ${isExpanded ? 'expanded' : 'collapsed'}`;

  // Summary text
  const summarySpan = document.createElement("span");
  summarySpan.className = "value-nested-summary";
  summarySpan.textContent = `{${summary}}`;

  wrapper.appendChild(toggle);
  wrapper.appendChild(summarySpan);

  // Nested properties container
  const propsContainer = document.createElement("div");
  propsContainer.className = `nested-properties ${isExpanded ? 'expanded' : ''}`;

  for (const [propKey, propVal] of Object.entries(nestedObj)) {
    if (propKey.startsWith('__')) continue;

    const propDiv = document.createElement("div");
    propDiv.className = "nested-prop";

    const keySpan = document.createElement("span");
    keySpan.className = "nested-prop-key";
    keySpan.textContent = `${propKey}:`;

    const [formatted, info] = formatValueWithInfo(propVal, 'preview');
    const valSpan = document.createElement("span");
    valSpan.className = `nested-prop-value ${info.cssClass}`;
    valSpan.textContent = formatted;

    propDiv.appendChild(keySpan);
    propDiv.appendChild(valSpan);
    propsContainer.appendChild(propDiv);
  }

  td.appendChild(wrapper);
  td.appendChild(propsContainer);

  // Click handlers
  let clickTimer: NodeJS.Timeout | null = null;

  // Single-click: toggle expansion (with delay to detect double-click)
  wrapper.addEventListener("click", (e) => {
    e.stopPropagation();

    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
      return;
    }

    clickTimer = setTimeout(() => {
      clickTimer = null;
      navigationManager.toggleNestedExpanded(nestedPath);
      if (onNavigate) onNavigate();
    }, 250);
  });

  // Double-click: navigate to nested object
  wrapper.addEventListener("dblclick", (e) => {
    e.stopPropagation();

    if (clickTimer) {
      clearTimeout(clickTimer);
      clickTimer = null;
    }

    const localPath = [...parentPath, propertyKey];
    navigationManager.navigateTo(localPath, true);
    if (onNavigate) onNavigate();
  });

  return td;
}

/**
 * Navigate to a referenced object
 *
 * Finds the canonical path of the referenced object and navigates to it.
 */
function navigateToReference(
  root: any,
  parentPath: PathArray,
  propertyKey: string,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): void {
  // Get the actual object at parent path
  const obj = traversePath(root, parentPath);
  const refObj = obj?.[propertyKey];

  if (!refObj) {
    console.error("Could not find referenced object");
    return;
  }

  // Get the canonical path
  const canonicalPath = getObjectPath(root, refObj);

  if (!canonicalPath) {
    console.error("Could not find canonical path for object");
    return;
  }

  navigationManager.navigateTo([...canonicalPath], true);
  if (onNavigate) onNavigate();
}

// ============================================================================
// Property Row Creation
// ============================================================================

/**
 * Create a table row for a property
 *
 * Contains property name and value cells.
 * Phase 13: Uses inline nested cell for leaf-like objects.
 */
function createPropertyRow(
  key: string,
  value: unknown,
  root: any,
  parentPath: PathArray,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLTableRowElement {
  const tr = document.createElement("tr");

  // Property name cell
  const tdName = document.createElement("td");
  tdName.className = CSS_CLASSES.PROPERTY_NAME;
  tdName.textContent = key;

  // Property value cell
  // Phase 13: Check if value is a leaf-like object for inline expansion
  const tdValue = isLeafLikeObject(value)
    ? createInlineNestedCell(value, key, parentPath, navigationManager, onNavigate)
    : createValueCell(value, key, root, parentPath, navigationManager, onNavigate);

  tr.appendChild(tdName);
  tr.appendChild(tdValue);

  return tr;
}

// ============================================================================
// Property Table Creation
// ============================================================================

/**
 * Create the property table
 *
 * Builds a table with property/value columns for all visible properties.
 */
function createPropertyTable(
  props: Array<[string, any]>,
  root: any,
  parentPath: PathArray,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLTableElement {
  const table = document.createElement("table");
  table.className = CSS_CLASSES.PROPERTY_TABLE;

  // Table header
  const thead = document.createElement("thead");
  thead.innerHTML = "<tr><th>Property</th><th>Value</th></tr>";
  table.appendChild(thead);

  // Table body with property rows
  const tbody = document.createElement("tbody");
  for (const [key, value] of props) {
    tbody.appendChild(createPropertyRow(key, value, root, parentPath, navigationManager, onNavigate));
  }
  table.appendChild(tbody);

  return table;
}

// ============================================================================
// Main Inspector Rendering
// ============================================================================

/**
 * Render the property inspector for the selected object
 *
 * Main entry point - handles validation and delegates to helper functions.
 */
export function renderInspector(
  root: any,
  navigationManager: NavigationManager,
  containerElement: HTMLElement,
  onNavigate: (() => void) | null,
): void {
  const selectedPath = navigationManager.selectedPath;

  // Validation: no selection
  if (selectedPath.length === 0) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Select a node in the tree</div>`;
    return;
  }

  // Navigate to selected object
  const obj = traversePath(root, selectedPath);

  // Validation: null or undefined
  if (obj === null || obj === undefined) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Value is ${obj === null ? "null" : "undefined"}</div>`;
    return;
  }

  // Validation: primitives (shouldn't happen with new tree, but handle gracefully)
  if (typeof obj !== "object" && typeof obj !== "function") {
    const [formatted] = formatValueWithInfo(obj, 'preview');
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Primitive value: ${formatted}</div>`;
    return;
  }

  // Get visible properties
  const props = getVisibleProperties(obj);

  // Validation: no properties
  if (props.length === 0) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">No properties</div>`;
    return;
  }

  // Create and render property table
  const table = createPropertyTable(props, root, selectedPath, navigationManager, onNavigate);
  containerElement.innerHTML = "";
  containerElement.appendChild(table);
}

// ============================================================================
// Tabbed Inspector Rendering
// ============================================================================

/**
 * Create collections panel for tabbed inspector
 *
 * Displays all collection properties (arrays, maps, sets) with their contents.
 */
function createCollectionsPanel(
  collections: Array<[string, any]>,
  root: any,
  parentPath: PathArray,
  navigationManager: NavigationManager,
  onNavigate: (() => void) | null,
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "collections-panel";

  // Empty state
  if (collections.length === 0) {
    panel.innerHTML = `<div class="${CSS_CLASSES.EMPTY_STATE}">No collections</div>`;
    return panel;
  }

  // Render each collection
  for (const [key, collection] of collections) {
    const section = document.createElement("div");
    section.className = "collection-section";

    // Collection header
    const header = document.createElement("h3");
    header.textContent = key;
    header.className = "collection-header";
    section.appendChild(header);

    // Get adapter for this collection type
    const adapter = getCollectionAdapter(collection);
    if (!adapter) {
      const error = document.createElement("div");
      error.className = CSS_CLASSES.EMPTY_STATE;
      error.textContent = "Unknown collection type";
      section.appendChild(error);
      panel.appendChild(section);
      continue;
    }

    // Get children from collection using adapter
    const children = adapter.getChildren(collection);

    if (children.length === 0) {
      const empty = document.createElement("div");
      empty.className = CSS_CLASSES.EMPTY_STATE;
      empty.textContent = "Empty collection";
      section.appendChild(empty);
    } else {
      // Create list of collection items
      const list = document.createElement("ul");
      list.className = "collection-items";

      for (const [label, value] of children) {
        const li = document.createElement("li");
        li.className = "collection-item";

        // Format the value
        const [formatted, info] = formatValueWithInfo(value, 'preview');

        // Create label and value text
        const labelSpan = document.createElement("span");
        labelSpan.className = "item-label";
        labelSpan.textContent = `${label}: `;

        const valueSpan = document.createElement("span");
        valueSpan.className = `item-value ${info.cssClass}`;
        valueSpan.textContent = formatted;
        valueSpan.title = info.typeName;

        li.appendChild(labelSpan);
        li.appendChild(valueSpan);

        // Make navigable values clickable
        if (info.isNavigable) {
          valueSpan.classList.add(CSS_CLASSES.VALUE_NAVIGABLE);
          valueSpan.addEventListener("click", () => {
            // Navigate to the collection item
            const collectionPath = [...parentPath, key];
            navigateToReference(root, collectionPath, label, navigationManager, onNavigate);
          });
        }

        list.appendChild(li);
      }

      section.appendChild(list);
    }

    panel.appendChild(section);
  }

  return panel;
}

/**
 * Render the property inspector with tabs (Properties vs Collections)
 *
 * Main entry point for tabbed inspector - separates scalars from collections.
 */
export function renderInspectorWithTabs(
  root: any,
  navigationManager: NavigationManager,
  containerElement: HTMLElement,
  onNavigate: (() => void) | null,
): void {
  const selectedPath = navigationManager.selectedPath;

  // Validation: no selection
  if (selectedPath.length === 0) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Select a node in the tree</div>`;
    return;
  }

  // Navigate to selected object
  const obj = traversePath(root, selectedPath);

  // Validation: null or undefined
  if (obj === null || obj === undefined) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Value is ${obj === null ? "null" : "undefined"}</div>`;
    return;
  }

  // Validation: primitives
  if (typeof obj !== "object" && typeof obj !== "function") {
    const [formatted] = formatValueWithInfo(obj, 'preview');
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">Primitive value: ${formatted}</div>`;
    return;
  }

  // Partition properties into scalars and collections
  const { scalars, collections } = partitionProperties(obj);

  // Validation: no properties at all
  if (scalars.length === 0 && collections.length === 0) {
    containerElement.innerHTML =
      `<div class="${CSS_CLASSES.EMPTY_STATE}">No properties</div>`;
    return;
  }

  // Create tabs
  const tabs: TabDefinition[] = [
    {
      id: "properties",
      label: "Properties",
      content: createPropertyTable(scalars, root, selectedPath, navigationManager, onNavigate),
      isEmpty: scalars.length === 0,
    },
    {
      id: "collections",
      label: "Collections",
      content: createCollectionsPanel(collections, root, selectedPath, navigationManager, onNavigate),
      isEmpty: collections.length === 0,
    },
  ];

  // Render tabs
  const tabContainer = createTabs(tabs);
  containerElement.innerHTML = "";
  containerElement.appendChild(tabContainer);
}
