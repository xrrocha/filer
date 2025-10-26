/**
 * event-log.ts - Pluggable mutation event logging backends
 *
 * ============================================================================
 * ARCHITECTURE: Pluggable Event Logs
 * ============================================================================
 *
 * memimg is completely agnostic about where/how events are stored. Any object
 * implementing the EventLog interface can be used.
 *
 * This means you can store events:
 * - In-memory (for testing/temporary state)
 * - In local files (Node.js fs module or browser File System Access API)
 * - In IndexedDB (browsers)
 * - In LocalStorage (browsers, for small datasets)
 * - Via REST API to a backend server
 * - In a database via PostgREST or similar
 * - Via WebSocket to a real-time sync server
 * - In cloud storage (S3, Firebase, etc.)
 * - Anywhere you can imagine!
 *
 * This module provides four reference implementations as convenience functions,
 * but you can create your own custom event log by implementing the EventLog interface.
 *
 * ============================================================================
 * BUILT-IN IMPLEMENTATIONS
 * ============================================================================
 *
 * 1. In-Memory - Fast, for testing, lost on process exit
 * 2. File - Persistent, NDJSON format, for Node.js (or Deno/Bun)
 * 3. IndexedDB - Persistent, for browsers
 * 4. LocalStorage - Simple persistent, for browsers
 *
 * Design principle: Simple, pluggable, no dependencies between backends
 */

import type { Event, EventLog } from './types.js';

// ============================================================================
// In-Memory Event Log (for testing)
// ============================================================================

/**
 * In-memory event log with convenience length property.
 * Internal interface for testing purposes.
 */
interface InMemoryEventLog extends EventLog {
  readonly length: number;
}

/**
 * Creates an in-memory event log stored in a JavaScript array.
 *
 * Use case: Testing, development, scenarios where persistence isn't needed.
 *
 * Pros: Fast, simple, no I/O
 * Cons: Lost when process exits, unbounded memory growth
 *
 * @returns Event log with append/getAll/clear methods and length property
 */
export const createInMemoryEventLog = (): InMemoryEventLog => {
  const events: Event[] = [];

  return {
    append: async (event: Event): Promise<void> => {
      events.push(event);
    },

    getAll: async (): Promise<readonly Event[]> => {
      // Return copy to prevent external mutation
      return [...events];
    },

    clear: async (): Promise<void> => {
      events.length = 0;
    },

    // Convenience property for testing
    get length(): number {
      return events.length;
    }
  };
};

// ============================================================================
// Filesystem Event Log (Node.js)
// ============================================================================

/**
 * Creates a file-based event log using NDJSON (Newline Delimited JSON) format.
 *
 * Format: Each event is one line of JSON, lines separated by \n
 * Example file contents:
 *   {"type":"SET","path":["name"],"value":"Alice","timestamp":1234567890}
 *   {"type":"SET","path":["age"],"value":30,"timestamp":1234567891}
 *   {"type":"DELETE","path":["temp"],"timestamp":1234567892}
 *
 * Why NDJSON?
 * - Append-friendly: Just write newline to end, no need to rewrite entire file
 * - Streaming-friendly: Read line-by-line without loading entire file into memory
 * - Resilient: Corrupted line doesn't break entire file
 * - Tool-friendly: Works with standard Unix tools (grep, tail, wc, etc.)
 *
 * Use case: Server-side Node.js apps, CLIs, anywhere filesystem is available
 *
 * Pros: Persistent, streamable, human-readable, tool-friendly
 * Cons: Node.js only, slower than in-memory
 *
 * @param filepath - Path to event log file
 * @returns Event log with append/getAll/stream/clear methods
 */
export const createFileEventLog = async (filepath: string): Promise<EventLog> => {
  // Lazy-load fs and readline
  // Will fail gracefully in browsers (which don't have these modules)
  let fs: typeof import('fs');
  let readline: typeof import('readline');

  try {
    fs = await import('fs');
    readline = await import('readline');
  } catch (e) {
    throw new Error(
      'FileEventLog requires Node.js fs and readline modules. ' +
      'In browsers, consider using createIndexedDBEventLog() or ' +
      'implementing a custom event log using the File System Access API.'
    );
  }

  // Initialize file if it doesn't exist
  // Empty file is valid NDJSON (zero events)
  if (!fs.existsSync(filepath)) {
    fs.writeFileSync(filepath, '');
  }

  return {
    /**
     * Appends an event to the log file.
     * Each event becomes one line (JSON + newline).
     */
    append: async (event: Event): Promise<void> => {
      const line = JSON.stringify(event) + '\n';
      fs.appendFileSync(filepath, line, 'utf8');
    },

    /**
     * Loads ALL events into memory and returns them as an array.
     *
     * WARNING: For large logs (millions of events), this can consume lots of memory.
     * Use stream() instead for memory-efficient replay.
     */
    getAll: async (): Promise<readonly Event[]> => {
      const content = fs.readFileSync(filepath, 'utf8');
      if (!content.trim()) {
        return [];
      }
      return content
        .trim()
        .split('\n')
        .map((line: string) => JSON.parse(line) as Event);
    },

    /**
     * Streams events one at a time as an async generator.
     *
     * This is the memory-efficient way to replay large event logs.
     * Uses Node.js readline to read file line-by-line without loading it all into memory.
     *
     * Usage:
     *   for await (const event of eventLog.stream()) {
     *     // Process event
     *   }
     */
    stream: async function* (): AsyncIterable<Event> {
      const fileStream = fs.createReadStream(filepath, { encoding: 'utf8' });
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity  // Treat \r\n as single line break
      });

      for await (const line of rl) {
        if (line.trim()) {
          yield JSON.parse(line) as Event;
        }
      }
    },

    /**
     * Clears all events by truncating the file.
     */
    clear: async (): Promise<void> => {
      fs.writeFileSync(filepath, '');
    }
  };
};

// ============================================================================
// IndexedDB Event Log (Browser)
// ============================================================================

/**
 * Creates an IndexedDB-based event log for browser persistence.
 *
 * IndexedDB is the standard browser database API - it's asynchronous, persistent,
 * and can store large amounts of data (typically 50MB+, varies by browser).
 *
 * Design: We create an object store with auto-incrementing keys.
 * Each event is stored as a JavaScript object (no JSON serialization needed).
 * Events are retrieved in insertion order (key order).
 *
 * MULTI-STORE SUPPORT: This implementation now supports dynamic store creation.
 * The database version is incremented each time a new store needs to be created,
 * which allows multiple memory images to coexist with isolated event logs.
 *
 * Use case: Web apps that need offline persistence, Progressive Web Apps (PWAs)
 *
 * Pros: Persistent across browser sessions, larger storage than localStorage,
 *       stores objects directly (no JSON parsing), async
 * Cons: Browser only, more complex API than localStorage, quota limits
 *
 * Note: IndexedDB API is callback-based, we wrap it in Promises for cleaner async/await usage.
 *
 * @param dbName - Name of IndexedDB database (default: 'memimg')
 * @param storeName - Name of object store (default: 'events')
 * @returns Event log with append/getAll/clear methods
 */
export const createIndexedDBEventLog = (
  dbName = 'memimg',
  storeName = 'events'
): EventLog => {
  let db: IDBDatabase;
  let closed = false;

  // Initialize database on first use
  // This will create the store if it doesn't exist, incrementing version as needed
  const initPromise = new Promise<void>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available (browser only)'));
      return;
    }

    // First, open with any version to check if store exists
    const checkRequest = indexedDB.open(dbName);

    checkRequest.onerror = () => reject(checkRequest.error);

    checkRequest.onsuccess = () => {
      const checkDb = checkRequest.result;
      const storeExists = checkDb.objectStoreNames.contains(storeName);
      const currentVersion = checkDb.version;
      checkDb.close();

      if (storeExists) {
        // Store exists, open normally
        const openRequest = indexedDB.open(dbName, currentVersion);
        openRequest.onerror = () => reject(openRequest.error);
        openRequest.onsuccess = () => {
          db = openRequest.result;
          resolve();
        };
      } else {
        // Store doesn't exist, need to upgrade version
        const upgradeRequest = indexedDB.open(dbName, currentVersion + 1);

        upgradeRequest.onerror = () => reject(upgradeRequest.error);
        upgradeRequest.onsuccess = () => {
          db = upgradeRequest.result;
          resolve();
        };

        upgradeRequest.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(storeName)) {
            // Create object store with auto-incrementing keys
            database.createObjectStore(storeName, { autoIncrement: true });
          }
        };
      }
    };

    checkRequest.onupgradeneeded = (event) => {
      // This is the first time opening this database
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { autoIncrement: true });
      }
    };
  });

  /**
   * Throws if the event log has been closed.
   * Prevents use-after-close bugs with clear error messages.
   */
  const assertNotClosed = () => {
    if (closed) {
      throw new Error(
        `EventLog (${storeName}) has been closed and cannot be used. ` +
        `This usually happens when switching between memory images.`
      );
    }
  };

  return {
    /**
     * Appends an event to the IndexedDB store.
     * Event is stored as JavaScript object (no serialization needed).
     * @throws {Error} if the event log has been closed
     */
    append: async (event: Event): Promise<void> => {
      assertNotClosed();
      await initPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(event);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    /**
     * Retrieves all events from the store.
     * Returns them in key order (insertion order due to auto-increment).
     * @throws {Error} if the event log has been closed
     */
    getAll: async (): Promise<readonly Event[]> => {
      assertNotClosed();
      await initPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result as Event[]);
        request.onerror = () => reject(request.error);
      });
    },

    /**
     * Clears all events from the store.
     * @throws {Error} if the event log has been closed
     */
    clear: async (): Promise<void> => {
      assertNotClosed();
      await initPromise;
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    },

    /**
     * Closes the IndexedDB connection and marks this event log as unusable.
     * Safe to call multiple times (idempotent).
     *
     * CRITICAL: Must be called when switching between memory images to prevent
     * blocking database version upgrades. An open connection will cause subsequent
     * indexedDB.open() calls to hang indefinitely with onblocked event.
     *
     * After calling close(), any subsequent calls to append/getAll/clear will throw.
     * This is intentional - prevents subtle bugs from using a closed event log.
     */
    close: async (): Promise<void> => {
      // Idempotent: safe to call multiple times
      if (closed) {
        return;
      }

      closed = true;

      // Handle case where initialization failed
      // Don't throw - we still want to mark as closed
      try {
        await initPromise;
        if (db) {
          db.close();
          // Wait for connection to fully close
          // IDBDatabase.close() is synchronous but connection stays open until
          // all pending transactions complete. 50ms delay ensures cleanup completes
          // before subsequent database operations.
          await new Promise(res => setTimeout(res, 50));
        }
      } catch (err) {
        // Database never initialized successfully, nothing to close
        // This is not an error - just means close() was called on a failed initialization
        console.warn(`EventLog close(): Database was never initialized (${storeName})`, err);
      }
    }
  };
};

// ============================================================================
// LocalStorage Event Log (for browsers - simple, synchronous)
// ============================================================================

/**
 * Creates an event log backed by browser LocalStorage.
 *
 * Use case: Simple browser apps that need persistence without IndexedDB complexity.
 *
 * Pros: Simple, synchronous, widely supported, no database setup
 * Cons:
 *   - Limited to ~5-10MB depending on browser
 *   - Stores all events as single JSON string (not efficient for large logs)
 *   - Synchronous operations may block UI on large datasets
 *   - No streaming support
 *
 * Recommendation: Use IndexedDB for larger datasets or apps with many events.
 *
 * @param key - LocalStorage key to store events under (default: 'memimg-events')
 * @returns Event log with append/getAll/clear methods
 */
export const createLocalStorageEventLog = (key = 'memimg-events'): EventLog => {
  if (typeof localStorage === 'undefined') {
    throw new Error('LocalStorage not available (browser only)');
  }

  return {
    /**
     * Appends an event to LocalStorage.
     * Reads entire array, adds event, writes back (inefficient for large logs).
     */
    append: async (event: Event): Promise<void> => {
      const stored = localStorage.getItem(key);
      const events = stored ? (JSON.parse(stored) as Event[]) : [];
      events.push(event);
      localStorage.setItem(key, JSON.stringify(events));
    },

    /**
     * Returns all events from LocalStorage.
     */
    getAll: async (): Promise<readonly Event[]> => {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as Event[]) : [];
    },

    /**
     * Clears all events from LocalStorage.
     */
    clear: async (): Promise<void> => {
      localStorage.removeItem(key);
    }
  };
};
