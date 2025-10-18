/**
 * Navigator Constants - Centralized UI configuration values
 *
 * This module provides UI-specific constants for the navigator,
 * separate from memimg core constants.
 */

// ============================================================================
// Path Constants
// ============================================================================

/**
 * Root path identifier
 */
export const ROOT_PATH = "root" as const;

/**
 * Prefix for internal/private properties that should be hidden
 */
export const INTERNAL_PREFIX = "__";

// ============================================================================
// Storage Constants
// ============================================================================

/**
 * IndexedDB database name for navigator storage
 */
export const DB_NAME = "memimg-explorer";

/**
 * LocalStorage key for theme preference
 */
export const THEME_STORAGE_KEY = "memimg-theme";

/**
 * LocalStorage key for line numbers preference
 */
export const LINE_NUMBERS_STORAGE_KEY = "memimg-line-numbers";

// ============================================================================
// CSS Class Names
// ============================================================================

/**
 * CSS class names used throughout navigator UI
 *
 * Using constants prevents typos and enables IDE autocomplete
 */
export const CSS_CLASSES = {
  PROPERTY_TABLE: 'property-table',
  PROPERTY_NAME: 'property-name',
  PROPERTY_VALUE: 'property-value',
  TREE_NODE: 'tree-node',
  TREE_HEADER: 'tree-header',
  EMPTY_STATE: 'empty-state',
  VALUE_NAVIGABLE: 'value-navigable',
  VALUE_NULL: 'value-null',
  VALUE_UNDEFINED: 'value-undefined',
  VALUE_STRING: 'value-string',
  VALUE_NUMBER: 'value-number',
  VALUE_BOOLEAN: 'value-boolean',
  VALUE_BIGINT: 'value-bigint',
  VALUE_SYMBOL: 'value-symbol',
  VALUE_DATE: 'value-date',
  VALUE_FUNCTION: 'value-function',
  VALUE_ARRAY: 'value-array',
  VALUE_MAP: 'value-map',
  VALUE_SET: 'value-set',
  VALUE_OBJECT: 'value-object',
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * UI behavior configuration
 */
export const UI_CONFIG = {
  /**
   * Maximum length for value previews in inspector
   */
  MAX_PREVIEW_LENGTH: 80,

  /**
   * Maximum number of properties to show in object preview
   */
  MAX_OBJECT_PROPERTIES_PREVIEW: 5,

  /**
   * Maximum number of array items to show in preview
   */
  MAX_ARRAY_ITEMS_PREVIEW: 5,

  /**
   * Maximum number of Map/Set items to show in preview
   */
  MAX_COLLECTION_ITEMS_PREVIEW: 5,
} as const;

// ============================================================================
// Label Inference Configuration
// ============================================================================

/**
 * Regex pattern for inferring object labels from property names
 *
 * Matches properties ending with: name, desc, description (case-insensitive)
 *
 * Examples of matching properties:
 * - name, username, firstName, fullName
 * - desc, description, itemDescription
 *
 * TODO: Make this configurable in user preferences.
 * Currently only theme (dark/light) is user-configurable, but this pattern
 * should eventually be exposed in preferences to allow custom label inference.
 *
 * @see inferLabel() in formatters.ts for usage
 */
export const LABEL_PATTERN = /name|desc(ription)?$/i;

// ============================================================================
// Display Icons
// ============================================================================

/**
 * Icons/symbols for different value types in tree view
 */
export const DISPLAY_ICONS = {
  NULL: '∅',
  UNDEFINED: '∅',
  STRING: '"',
  NUMBER: '#',
  BOOLEAN: '✓',
  BIGINT: '#n',
  SYMBOL: 'Σ',
  DATE: '📅',
  FUNCTION: 'ƒ',
  ARRAY: '[]',
  MAP: 'M{}',
  SET: 'S{}',
  OBJECT: '{}',
} as const;
