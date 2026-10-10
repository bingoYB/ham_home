/**
 * IndexedDB for tab lifecycle data (HamHomeTabLifecycle), one database for the domain
 * like HamHomeVectors / hamhome-assets, accessed through the native API.
 *
 * - tabActivity:    one record per open tab, keyed by tabId (written one at a time)
 * - tabArchive:     tabs closed by HamHome
 * - archiveBatches: one batch per archive operation, used for undo
 *
 * Extension pages share the origin with the background, so the tab center and the
 * popup read the same database directly; content scripts must not touch it.
 */

export const TAB_LIFECYCLE_DB_NAME = "HamHomeTabLifecycle";
const TAB_LIFECYCLE_DB_VERSION = 1;

export const TAB_ACTIVITY_STORE = "tabActivity";
export const TAB_ARCHIVE_STORE = "tabArchive";
export const ARCHIVE_BATCH_STORE = "archiveBatches";

let dbPromise: Promise<IDBDatabase> | null = null;

export function openTabLifecycleDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(TAB_LIFECYCLE_DB_NAME, TAB_LIFECYCLE_DB_VERSION);
    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(TAB_ACTIVITY_STORE)) {
        db.createObjectStore(TAB_ACTIVITY_STORE, { keyPath: "tabId" });
      }
      if (!db.objectStoreNames.contains(TAB_ARCHIVE_STORE)) {
        const archive = db.createObjectStore(TAB_ARCHIVE_STORE, { keyPath: "id" });
        archive.createIndex("closedAt", "closedAt", { unique: false });
        archive.createIndex("batchId", "batchId", { unique: false });
        archive.createIndex("normalizedUrl", "normalizedUrl", { unique: false });
      }
      if (!db.objectStoreNames.contains(ARCHIVE_BATCH_STORE)) {
        const batches = db.createObjectStore(ARCHIVE_BATCH_STORE, { keyPath: "id" });
        batches.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      db.onclose = () => {
        dbPromise = null;
      };
      resolve(db);
    };
  });

  return dbPromise;
}

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Run `work` inside one transaction and resolve with its result once the
 * transaction committed (so a resolved write is durable).
 */
export async function runTabLifecycleTransaction<T>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => T | Promise<T>,
): Promise<T> {
  const db = await openTabLifecycleDB();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeNames, mode);
    let result: T;
    let failed = false;
    tx.oncomplete = () => {
      if (!failed) resolve(result);
    };
    tx.onerror = () => {
      failed = true;
      reject(tx.error);
    };
    tx.onabort = () => {
      failed = true;
      reject(tx.error ?? new Error("Transaction aborted"));
    };
    Promise.resolve()
      .then(() => work(tx))
      .then((value) => {
        result = value;
      })
      .catch((error) => {
        failed = true;
        try {
          tx.abort();
        } catch {
          // already finished
        }
        reject(error);
      });
  });
}
