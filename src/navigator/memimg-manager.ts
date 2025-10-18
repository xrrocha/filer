/**
 * memimg-manager.ts - Memory Image Metadata Management
 *
 * Manages metadata for multiple memory images stored in IndexedDB.
 * Each memory image has:
 * - Unique UUID
 * - User-provided name and description
 * - Creation and modification timestamps
 * - Associated event log (events-{uuid} object store)
 * - Associated script history (script-history-{uuid} object store)
 */

import { getScriptHistoryStoreName } from './script-history.js';

export interface MemoryImageMetadata {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  eventCount?: number;
}

const DB_NAME = 'memimg-explorer';
const METADATA_STORE = 'memimg-metadata';

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
 * Open the metadata database
 * This function handles version management dynamically since event stores
 * can increment the version at any time.
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // First, open without version to check current state
    const checkRequest = indexedDB.open(DB_NAME);

    checkRequest.onerror = () => {
      reject(checkRequest.error);
    };

    checkRequest.onsuccess = async () => {
      const db = checkRequest.result;
      const currentVersion = db.version;
      const needsMetadataStore = !db.objectStoreNames.contains(METADATA_STORE);

      db.close();
      // Wait for connection to fully close before reopening
      await new Promise(res => setTimeout(res, 50));

      if (needsMetadataStore) {
        // Need to create metadata store - upgrade version
        const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);

        upgradeRequest.onerror = () => {
          reject(upgradeRequest.error);
        };

        upgradeRequest.onblocked = () => {
        };

        upgradeRequest.onsuccess = () => {
          resolve(upgradeRequest.result);
        };

        upgradeRequest.onupgradeneeded = (event) => {
          const database = (event.target as IDBOpenDBRequest).result;
          if (!database.objectStoreNames.contains(METADATA_STORE)) {
            const store = database.createObjectStore(METADATA_STORE, { keyPath: 'id' });
            store.createIndex('createdAt', 'createdAt', { unique: false });
            store.createIndex('updatedAt', 'updatedAt', { unique: false });
          }
        };
      } else {
        // Metadata store exists, just open normally
        const openRequest = indexedDB.open(DB_NAME);

        openRequest.onblocked = () => {
        };

        openRequest.onerror = () => {
          reject(openRequest.error);
        };

        openRequest.onsuccess = () => {
          resolve(openRequest.result);
        };
      }
    };

    checkRequest.onupgradeneeded = (event) => {
      // This is the first time opening this database
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        const store = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
    };
  });
}

/**
 * List all memory images, sorted by most recently updated
 */
export async function listMemoryImages(): Promise<MemoryImageMetadata[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    const index = store.index('updatedAt');
    const request = index.openCursor(null, 'prev'); // Descending order

    const results: MemoryImageMetadata[] = [];

    request.onsuccess = async () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value as MemoryImageMetadata);
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
 * Get a specific memory image by ID
 */
export async function getMemoryImage(id: string): Promise<MemoryImageMetadata | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readonly');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.get(id);

    request.onsuccess = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      resolve(request.result || null);
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
 * Check if a memory image with the given name already exists (case-insensitive)
 */
async function checkNameExists(name: string, excludeId?: string): Promise<boolean> {
  const images = await listMemoryImages();
  const normalizedName = name.trim().toLowerCase();
  const exists = images.some(img =>
    img.id !== excludeId &&
    img.name.toLowerCase() === normalizedName
  );
  return exists;
}

/**
 * Create a new memory image with metadata
 */
export async function createMemoryImage(
  name: string,
  description: string = ''
): Promise<MemoryImageMetadata> {
  if (!name || name.trim().length === 0) {
    throw new Error('Memory image name cannot be empty');
  }

  // Check for duplicate names
  if (await checkNameExists(name)) {
    throw new Error('A memory image with this name already exists');
  }

  const metadata: MemoryImageMetadata = {
    id: generateUUID(),
    name: name.trim(),
    description: description.trim(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    eventCount: 0
  };

  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const request = store.add(metadata);

    request.onsuccess = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      resolve(metadata);
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
 * Rename a memory image
 */
export async function renameMemoryImage(
  id: string,
  newName: string
): Promise<void> {
  if (!newName || newName.trim().length === 0) {
    throw new Error('Memory image name cannot be empty');
  }

  // Check for duplicate names (excluding current image)
  if (await checkNameExists(newName, id)) {
    throw new Error('A memory image with this name already exists');
  }

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = async () => {
      const metadata = getRequest.result as MemoryImageMetadata;
      if (!metadata) {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(new Error(`Memory image not found: ${id}`));
        return;
      }

      metadata.name = newName.trim();
      metadata.updatedAt = Date.now();

      const putRequest = store.put(metadata);
      putRequest.onsuccess = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve();
      };
      putRequest.onerror = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(putRequest.error);
      };
    };

    getRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(getRequest.error);
    };
  });
}

/**
 * Update memory image description
 */
export async function updateDescription(
  id: string,
  newDescription: string
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = async () => {
      const metadata = getRequest.result as MemoryImageMetadata;
      if (!metadata) {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(new Error(`Memory image not found: ${id}`));
        return;
      }

      metadata.description = newDescription.trim();
      metadata.updatedAt = Date.now();

      const putRequest = store.put(metadata);
      putRequest.onsuccess = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve();
      };
      putRequest.onerror = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(putRequest.error);
      };
    };

    getRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(getRequest.error);
    };
  });
}

/**
 * Update the updatedAt timestamp (called after operations on the memory image)
 */
export async function touchMemoryImage(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = async () => {
      const metadata = getRequest.result as MemoryImageMetadata;
      if (!metadata) {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(new Error(`Memory image not found: ${id}`));
        return;
      }

      metadata.updatedAt = Date.now();

      const putRequest = store.put(metadata);
      putRequest.onsuccess = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        resolve();
      };
      putRequest.onerror = async () => {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(putRequest.error);
      };
    };

    getRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(getRequest.error);
    };
  });
}

/**
 * Delete a memory image and its associated stores (event log, script history)
 */
export async function deleteMemoryImage(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    // Delete metadata
    const transaction = db.transaction([METADATA_STORE], 'readwrite');
    const store = transaction.objectStore(METADATA_STORE);
    const deleteMetadataRequest = store.delete(id);

    deleteMetadataRequest.onsuccess = async () => {
      // Also delete the associated event store and script history store
      const eventStoreName = `events-${id}`;
      const scriptHistoryStoreName = getScriptHistoryStoreName(id);

      // Check if stores exist and delete them
      try {
        const hasEventStore = db.objectStoreNames.contains(eventStoreName);
        const hasScriptHistoryStore = db.objectStoreNames.contains(scriptHistoryStoreName);

        if (hasEventStore || hasScriptHistoryStore) {
          // We need to close and reopen at higher version to delete object stores
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));

          // Get current version and increment
          const currentVersion = db.version;
          const deleteRequest = indexedDB.open(DB_NAME, currentVersion + 1);

          deleteRequest.onupgradeneeded = (event) => {
            const database = (event.target as IDBOpenDBRequest).result;

            // Delete event store if it exists
            if (database.objectStoreNames.contains(eventStoreName)) {
              database.deleteObjectStore(eventStoreName);
            }

            // Delete script history store if it exists
            if (database.objectStoreNames.contains(scriptHistoryStoreName)) {
              database.deleteObjectStore(scriptHistoryStoreName);
            }
          };

          deleteRequest.onsuccess = async () => {
            deleteRequest.result.close();
            // Wait for connection to fully close
            await new Promise(res => setTimeout(res, 50));
            resolve();
          };

          deleteRequest.onerror = () => {
            reject(deleteRequest.error);
          };
        } else {
          db.close();
          // Wait for connection to fully close
          await new Promise(res => setTimeout(res, 50));
          resolve();
        }
      } catch (err) {
        db.close();
        // Wait for connection to fully close
        await new Promise(res => setTimeout(res, 50));
        reject(err);
      }
    };

    deleteMetadataRequest.onerror = async () => {
      db.close();
      // Wait for connection to fully close
      await new Promise(res => setTimeout(res, 50));
      reject(deleteMetadataRequest.error);
    };
  });
}

/**
 * Get event store name for a memory image
 */
export function getEventStoreName(id: string): string {
  return `events-${id}`;
}
