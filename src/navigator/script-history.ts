/**
 * script-history.ts - Script History Management
 *
 * Manages script execution history per memory image in IndexedDB.
 * - Only stores successful script executions
 * - FIFO ring buffer (max 1000 entries per memimg)
 * - Size limit: 100 KB per script
 * - Per-memimg isolation (store per memory image)
 */

export interface ScriptHistoryEntry {
  id: string;              // UUID
  timestamp: number;       // Date.now()
  code: string;            // Script text
  status: 'success';       // Only successful scripts stored
  characterCount: number;  // For size tracking
}

const DB_NAME = 'memimg-explorer';
const MAX_ENTRIES_PER_MEMIMG = 1000;
const MAX_SCRIPT_SIZE_BYTES = 100 * 1024; // 100 KB

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get store name for a memory image's script history
 */
export function getScriptHistoryStoreName(memimgId: string): string {
  return `script-history-${memimgId}`;
}

/**
 * Ensure script history store exists for a memory image
 * This should be called when opening a memimg to pre-create the store,
 * preventing version upgrade conflicts later.
 */
export async function ensureScriptHistoryStore(memimgId: string): Promise<void> {
  const storeName = getScriptHistoryStoreName(memimgId);

  return new Promise((resolve, reject) => {
    const checkRequest = indexedDB.open(DB_NAME);

    checkRequest.onerror = () => {
      reject(checkRequest.error);
    };

    checkRequest.onsuccess = async () => {
      const db = checkRequest.result;
      const storeExists = db.objectStoreNames.contains(storeName);
      const currentVersion = db.version;
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));

      if (storeExists) {
        // Store already exists, nothing to do
        resolve();
        return;
      }

      // Need to create store - upgrade version
      const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);

      upgradeRequest.onerror = () => {
        reject(upgradeRequest.error);
      };

      upgradeRequest.onblocked = () => {
      };

      upgradeRequest.onsuccess = async () => {
        upgradeRequest.result.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve();
      };

      upgradeRequest.onupgradeneeded = (event) => {
        const database = (event.target as IDBOpenDBRequest).result;

        if (!database.objectStoreNames.contains(storeName)) {
          const store = database.createObjectStore(storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('characterCount', 'characterCount', { unique: false });
        }
      };
    };

    checkRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('characterCount', 'characterCount', { unique: false });
      }
    };
  });
}

/**
 * Open database and ensure script history store exists for given memimg
 */
async function openScriptHistoryStore(
  memimgId: string,
  mode: IDBTransactionMode = 'readonly'
): Promise<{ db: IDBDatabase; store: IDBObjectStore }> {
  const storeName = getScriptHistoryStoreName(memimgId);

  return new Promise((resolve, reject) => {
    // First, open without version to check current state
    const checkRequest = indexedDB.open(DB_NAME);

    checkRequest.onerror = () => reject(checkRequest.error);

    checkRequest.onsuccess = async () => {
      const db = checkRequest.result;
      const needsStore = !db.objectStoreNames.contains(storeName);
      const currentVersion = db.version;
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));

      if (needsStore) {
        // Need to create store - upgrade version
        const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);

        upgradeRequest.onerror = () => reject(upgradeRequest.error);

        upgradeRequest.onsuccess = () => {
          const database = upgradeRequest.result;

          try {
            const transaction = database.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);
            resolve({ db: database, store });
          } catch (err) {
            database.close();
            reject(err);
          }
        };

        upgradeRequest.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          const transaction = (event.target as IDBOpenDBRequest).transaction!;

          if (!database.objectStoreNames.contains(storeName)) {
            const store = database.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('characterCount', 'characterCount', { unique: false });
          }

          // Wait for upgrade transaction to complete before resolving
          transaction.oncomplete = () => {
            console.log(`Script history store created: ${storeName}`);
          };
        };
      } else {
        // Store exists, just open normally
        const openRequest = indexedDB.open(DB_NAME);

        openRequest.onerror = () => reject(openRequest.error);

        openRequest.onsuccess = () => {
          const database = openRequest.result;
          const transaction = database.transaction([storeName], mode);
          const store = transaction.objectStore(storeName);
          resolve({ db: database, store });
        };
      }
    };

    checkRequest.onupgradeneeded = (event) => {
      // This is the first time opening this database
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('characterCount', 'characterCount', { unique: false });
      }
    };
  });
}

/**
 * Add a successful script execution to history
 * Handles overflow (FIFO - removes oldest if > MAX_ENTRIES)
 * Rejects scripts > 100 KB
 */
export async function addScriptEntry(
  memimgId: string,
  code: string
): Promise<void> {
  // Size check
  const sizeBytes = new Blob([code]).size;
  if (sizeBytes > MAX_SCRIPT_SIZE_BYTES) {
    throw new Error(
      `Script too large: ${(sizeBytes / 1024).toFixed(1)} KB (max 100 KB)`
    );
  }

  const entry: ScriptHistoryEntry = {
    id: generateUUID(),
    timestamp: Date.now(),
    code: code,
    status: 'success',
    characterCount: code.length,
  };

  const { db, store } = await openScriptHistoryStore(memimgId, 'readwrite');

  return new Promise((resolve, reject) => {
    // First, check count and delete oldest if needed
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;

      if (count >= MAX_ENTRIES_PER_MEMIMG) {
        // Need to delete oldest entries (make room for 1)
        const entriesToDelete = count - MAX_ENTRIES_PER_MEMIMG + 1;

        // Get oldest entries by timestamp
        const index = store.index('timestamp');
        const cursorRequest = index.openCursor(null, 'next'); // Ascending order

        let deleted = 0;
        const idsToDelete: string[] = [];

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;

          if (cursor && deleted < entriesToDelete) {
            idsToDelete.push((cursor.value as ScriptHistoryEntry).id);
            deleted++;
            cursor.continue();
          } else {
            // Done collecting IDs to delete
            // Delete them
            for (const id of idsToDelete) {
              store.delete(id);
            }

            // Now add new entry
            const addRequest = store.add(entry);

            addRequest.onsuccess = async () => {
              db.close();
              // Wait for connection to fully close
              await new Promise(res => setTimeout(res, 50));
              resolve();
            };

            addRequest.onerror = async () => {
              db.close();
              // Wait for connection to fully close
              await new Promise(res => setTimeout(res, 50));
              reject(addRequest.error);
            };
          }
        };

        cursorRequest.onerror = async () => {
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));
          reject(cursorRequest.error);
        };
      } else {
        // No overflow, just add
        const addRequest = store.add(entry);

        addRequest.onsuccess = async () => {
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));
          resolve();
        };

        addRequest.onerror = async () => {
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));
          reject(addRequest.error);
        };
      }
    };

    countRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(countRequest.error);
    };
  });
}

/**
 * Get recent script entries (most recent first)
 */
export async function getRecentScripts(
  memimgId: string,
  limit: number = 100
): Promise<ScriptHistoryEntry[]> {
  const { db, store } = await openScriptHistoryStore(memimgId, 'readonly');

  return new Promise((resolve, reject) => {
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Descending order (newest first)

    const results: ScriptHistoryEntry[] = [];

    request.onsuccess = async () => {
      const cursor = request.result;

      if (cursor && results.length < limit) {
        results.push(cursor.value as ScriptHistoryEntry);
        cursor.continue();
      } else {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve(results);
      }
    };

    request.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(request.error);
    };
  });
}

/**
 * Search script entries by content (case-insensitive)
 */
export async function searchScripts(
  memimgId: string,
  query: string
): Promise<ScriptHistoryEntry[]> {
  if (!query || query.trim().length === 0) {
    return getRecentScripts(memimgId, 100);
  }

  const { db, store } = await openScriptHistoryStore(memimgId, 'readonly');
  const normalizedQuery = query.toLowerCase();

  return new Promise((resolve, reject) => {
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // Descending order

    const results: ScriptHistoryEntry[] = [];

    request.onsuccess = async () => {
      const cursor = request.result;

      if (cursor) {
        const entry = cursor.value as ScriptHistoryEntry;
        if (entry.code.toLowerCase().includes(normalizedQuery)) {
          results.push(entry);
        }
        cursor.continue();
      } else {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve(results);
      }
    };

    request.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(request.error);
    };
  });
}

/**
 * Clear all script history for a memory image
 */
export async function clearHistory(memimgId: string): Promise<void> {
  const { db, store } = await openScriptHistoryStore(memimgId, 'readwrite');

  return new Promise((resolve, reject) => {
    const request = store.clear();

    request.onsuccess = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      resolve();
    };

    request.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(request.error);
    };
  });
}

/**
 * Export script history as JSON
 */
export async function exportHistory(memimgId: string): Promise<string> {
  const entries = await getRecentScripts(memimgId, MAX_ENTRIES_PER_MEMIMG);

  const exportData = {
    memimgId,
    exportedAt: new Date().toISOString(),
    entryCount: entries.length,
    entries: entries.map(e => ({
      timestamp: e.timestamp,
      timestampISO: new Date(e.timestamp).toISOString(),
      code: e.code,
      characterCount: e.characterCount,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Get history statistics
 */
export async function getHistoryStats(
  memimgId: string
): Promise<{ count: number; totalSize: number }> {
  const { db, store } = await openScriptHistoryStore(memimgId, 'readonly');

  return new Promise((resolve, reject) => {
    const countRequest = store.count();

    countRequest.onsuccess = () => {
      const count = countRequest.result;

      // Calculate total size
      const cursorRequest = store.openCursor();
      let totalSize = 0;

      cursorRequest.onsuccess = async () => {
        const cursor = cursorRequest.result;

        if (cursor) {
          const entry = cursor.value as ScriptHistoryEntry;
          totalSize += entry.characterCount;
          cursor.continue();
        } else {
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));
          resolve({ count, totalSize });
        }
      };

      cursorRequest.onerror = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(cursorRequest.error);
      };
    };

    countRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(countRequest.error);
    };
  });
}
