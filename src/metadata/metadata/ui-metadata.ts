/**
 * UI Metadata - Layer 2
 *
 * Everything related to display and presentation.
 * Used by Navigator, form generators, table views, etc.
 */
export interface UIMetadata {
  /**
   * Human-readable label for UI display.
   *
   * @example
   * label: "Department Number"
   * label: "Employee Name"
   */
  label?: string;

  /**
   * Format a value for display.
   * Converts internal representation to user-friendly string.
   *
   * @example
   * formatter: (v) => `$${v.toFixed(2)}`  // Money
   * formatter: (v) => new Date(v).toLocaleDateString()  // Date
   */
  formatter?: (value: unknown) => string;

  /**
   * UI widget/control type for forms.
   * Hints to UI generators which input control to use.
   *
   * @example
   * widget: 'number'    // <input type="number">
   * widget: 'select'    // <select> dropdown
   */
  widget?: 'text' | 'number' | 'date' | 'datetime' | 'time' | 'email' | 'url' |
           'select' | 'radio' | 'checkbox' | 'textarea' | 'password';

  /**
   * Placeholder text for empty inputs.
   *
   * @example
   * placeholder: "Enter department name..."
   */
  placeholder?: string;

  /**
   * Help text / description shown near the input.
   *
   * @example
   * helpText: "Department number must be between 10 and 9999"
   */
  helpText?: string;

  /**
   * CSS class(es) to apply to the input/display element.
   *
   * @example
   * cssClass: "currency-input highlighted"
   */
  cssClass?: string;

  /**
   * Whether this field should be hidden in default views.
   */
  hidden?: boolean;

  /**
   * Display order/priority (lower numbers appear first).
   *
   * @example
   * order: 1  // Show first
   */
  order?: number;
}
