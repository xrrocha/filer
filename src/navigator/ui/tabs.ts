/**
 * Tab Component - Generic tabbed interface for inspector
 *
 * Provides a reusable tab component with:
 * - Tab headers with active state
 * - Tab content panels
 * - Disabled state for empty tabs
 * - Automatic tab switching on click
 */

/**
 * Definition for a single tab
 */
export interface TabDefinition {
  /**
   * Unique identifier for this tab
   */
  id: string;

  /**
   * Display label for the tab header
   */
  label: string;

  /**
   * Content element to display when tab is active
   */
  content: HTMLElement;

  /**
   * Whether this tab is empty (will be disabled)
   */
  isEmpty: boolean;
}

/**
 * Creates a tabbed interface
 *
 * @param tabs - Array of tab definitions
 * @returns Container element with tab headers and content panels
 *
 * @example
 * ```typescript
 * const tabs = createTabs([
 *   {
 *     id: 'properties',
 *     label: 'Properties',
 *     content: createPropertyTable(...),
 *     isEmpty: false,
 *   },
 *   {
 *     id: 'collections',
 *     label: 'Collections',
 *     content: createCollectionsPanel(...),
 *     isEmpty: true,
 *   },
 * ]);
 * container.replaceChildren(tabs);
 * ```
 */
export function createTabs(tabs: TabDefinition[]): HTMLElement {
  // Main container
  const container = document.createElement("div");
  container.className = "inspector-tabs";

  // Tab headers
  const headers = document.createElement("div");
  headers.className = "tab-headers";

  // Tab content area
  const content = document.createElement("div");
  content.className = "tab-content";

  // Find first non-empty tab for default active state
  const firstNonEmptyIndex = tabs.findIndex((tab) => !tab.isEmpty);
  const defaultActiveIndex = firstNonEmptyIndex >= 0 ? firstNonEmptyIndex : 0;

  // Create tab headers and panels
  tabs.forEach((tab, index) => {
    // Create header button
    const header = document.createElement("button");
    header.className = "tab-header";
    header.textContent = tab.label;
    header.disabled = tab.isEmpty;
    header.dataset.tabId = tab.id;

    // Set initial active state
    if (index === defaultActiveIndex) {
      header.classList.add("active");
    }

    // Tab switching handler
    header.addEventListener("click", () => {
      // Deactivate all headers and panels
      headers
        .querySelectorAll(".tab-header")
        .forEach((h) => h.classList.remove("active"));
      content
        .querySelectorAll(".tab-panel")
        .forEach((p) => p.classList.remove("active"));

      // Activate clicked tab
      header.classList.add("active");
      tab.content.classList.add("active");
    });

    headers.appendChild(header);

    // Create content panel
    tab.content.className = "tab-panel";
    tab.content.dataset.tabId = tab.id;

    // Set initial active state
    if (index === defaultActiveIndex) {
      tab.content.classList.add("active");
    }

    content.appendChild(tab.content);
  });

  container.appendChild(headers);
  container.appendChild(content);

  return container;
}
