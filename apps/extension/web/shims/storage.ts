/**
 * Browser replacement for WXT's `storage` global.
 *
 * Every storage module in `lib/storage` goes through `storage.defineItem` and only uses
 * `getValue` / `setValue` / `watch` plus `storage.removeItem`, so the web build can run the
 * unmodified modules on top of IndexedDB. The surface is intentionally limited to what the app
 * calls; anything else fails loudly instead of silently diverging from WXT.
 *
 * Semantics mirrored from `chrome.storage`:
 * - values are JSON round-tripped, so every read returns a fresh copy and `undefined` is stripped;
 * - operations are applied in call order (`set` followed by `get` sees the new value);
 * - `watch` fires in the writing tab as well as in other tabs, and only when the value changed.
 *
 * IndexedDB is the only copy of the data. There is deliberately no in-memory cache: a cache would
 * go stale whenever another tab's broadcast is missed (frozen or discarded tab, no BroadcastChannel),
 * and the next read-modify-write from that tab would overwrite the other tab's data. Reads always
 * hit the database, and each write compares and replaces inside one transaction. BroadcastChannel
 * is only used to wake the `watch` callbacks of other tabs.
 */

type Watcher = (newJson: string | null, oldJson: string | null) => void;

interface BroadcastMessage {
  key: string;
  newJson: string | null;
  oldJson: string | null;
}

export interface WebStorageOptions {
  dbName?: string;
  channelName?: string;
}

export interface WebStorageItemOptions<T> {
  fallback?: T;
  /** Not supported: the app never uses them, fail early if that changes. */
  version?: number;
  migrations?: unknown;
  init?: unknown;
}

export interface WebStorageItem<T> {
  key: string;
  getValue(): Promise<T>;
  setValue(value: T): Promise<void>;
  removeValue(): Promise<void>;
  watch(callback: (newValue: T, oldValue: T) => void): () => void;
}

const STORE_NAME = "kv";

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
  });
}

function parse(json: string | null): unknown {
  return json === null ? undefined : JSON.parse(json);
}

export function createWebStorage(options: WebStorageOptions = {}) {
  const dbName = options.dbName ?? "hamhome-web-kv";
  const channelName = options.channelName ?? "hamhome-web-kv";

  const watchers = new Map<string, Set<Watcher>>();
  let dbPromise: Promise<IDBDatabase> | null = null;
  // All operations run on one chain so they are applied in call order, like chrome.storage.
  let chain: Promise<unknown> = Promise.resolve();

  const channel =
    typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(channelName);

  function openDb(): Promise<IDBDatabase> {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => {
          dbPromise = null;
          reject(request.error);
        };
      });
    }
    return dbPromise;
  }

  function notify(key: string, newJson: string | null, oldJson: string | null): void {
    watchers.get(key)?.forEach((watcher) => {
      try {
        watcher(newJson, oldJson);
      } catch (error) {
        console.error(`[web-storage] watcher for "${key}" threw`, error);
      }
    });
  }

  if (channel) {
    channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const { key, newJson, oldJson } = event.data;
      notify(key, newJson, oldJson);
    };
  }

  function enqueue<R>(task: () => Promise<R>): Promise<R> {
    const run = chain.then(task);
    chain = run.catch(() => undefined);
    return run;
  }

  async function readJson(key: string): Promise<string | null> {
    const db = await openDb();
    const stored = await requestToPromise(
      db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(key),
    );
    return typeof stored === "string" ? stored : null;
  }

  async function writeJson(key: string, json: string | null): Promise<void> {
    const db = await openDb();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Read the old value and replace it inside the same readwrite transaction, so the value
    // handed to watchers is what the database really held even if another tab wrote meanwhile.
    const outcome = { changed: false, previous: null as string | null };
    const read = store.get(key);
    read.onsuccess = () => {
      outcome.previous = typeof read.result === "string" ? read.result : null;
      if (outcome.previous === json) return;
      outcome.changed = true;
      if (json === null) store.delete(key);
      else store.put(json, key);
    };
    await transactionDone(tx);

    if (!outcome.changed) return;
    channel?.postMessage({ key, newJson: json, oldJson: outcome.previous } satisfies BroadcastMessage);
    notify(key, json, outcome.previous);
  }

  function defineItem<T>(key: string, itemOptions: WebStorageItemOptions<T> = {}): WebStorageItem<T> {
    if (itemOptions.version !== undefined || itemOptions.migrations || itemOptions.init) {
      throw new Error(`[web-storage] "${key}": version/migrations/init are not supported`);
    }
    const fallback = itemOptions.fallback;
    const withFallback = (value: unknown): T => {
      if (value !== undefined && value !== null) return value as T;
      // Never hand out the shared fallback object: callers are free to mutate what they read.
      return typeof fallback === "object" && fallback !== null ? structuredClone(fallback) : (fallback as T);
    };

    return {
      key,
      getValue: () => enqueue(async () => withFallback(parse(await readJson(key)))),
      setValue: (value) =>
        enqueue(() => writeJson(key, value === undefined || value === null ? null : JSON.stringify(value))),
      removeValue: () => enqueue(() => writeJson(key, null)),
      watch(callback) {
        const watcher: Watcher = (newJson, oldJson) =>
          callback(withFallback(parse(newJson)), withFallback(parse(oldJson)));
        let set = watchers.get(key);
        if (!set) {
          set = new Set();
          watchers.set(key, set);
        }
        set.add(watcher);
        return () => {
          set.delete(watcher);
        };
      },
    };
  }

  function removeItem(key: string): Promise<void> {
    return enqueue(() => writeJson(key, null));
  }

  async function close(): Promise<void> {
    channel?.close();
    if (dbPromise) (await dbPromise).close();
  }

  return { defineItem, removeItem, close };
}

export type WebStorage = ReturnType<typeof createWebStorage>;
