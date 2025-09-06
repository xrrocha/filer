/**
 * prelude.js
 *
 * This file defines a curated set of modules and helper functions
 * to be pre-loaded into the REPL's 'system' object.
 *
 * Customize this file to create the perfect environment for your needs.
 */
import * as path from "https://deno.land/std@0.208.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.208.0/fs/mod.ts";
import { format as formatDate } from "https://deno.land/std@0.208.0/datetime/mod.ts";

/**
 * Attaches the prelude modules and functions to the provided system object.
 * @param {object} system The global state object for the REPL.
 */
export function setupPrelude(system) {
  // --- Standard Library Modules ---
  system.path = path;
  system.fs = fs;

  // --- Helper Functions ---

  /**
   * A convenient logging function with a timestamp.
   * @param {any} message The message to log.
   */
  system.log = (message) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}]`, message);
  };

  /**
   * Formats a date object into a string.
   * @param {Date} date The date to format.
   * @param {string} formatString The format string (e.g., "yyyy-MM-dd HH:mm:ss").
   * @returns {string} The formatted date string.
   */
  system.formatDate = formatDate;

  // Add any other modules or custom functions you need here!
  // For example:
  // system.fetchJSON = async (url) => (await fetch(url)).json();
}

