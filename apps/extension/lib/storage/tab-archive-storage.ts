/**
 * Tab archive (HamHomeTabLifecycle.tabArchive / archiveBatches), local only.
 *
 * Every write bumps local:tabArchiveVersion: IndexedDB has no change events, so
 * extension pages watch that counter to reload the archive.
 */
import { mergeArchiveEntry } from "@/lib/tabs/tab-archive.utils";
import type { TabArchiveBatch, TabArchiveEntry } from "@/types";
import {
  ARCHIVE_BATCH_STORE,
  TAB_ARCHIVE_STORE,
  requestToPromise,
  runTabLifecycleTransaction,
} from "./tab-lifecycle-db";

const archiveVersionItem = storage.defineItem<number>("local:tabArchiveVersion", {
  fallback: 0,
});

class TabArchiveStorage {
  async getAllEntries(): Promise<TabArchiveEntry[]> {
    return runTabLifecycleTransaction(TAB_ARCHIVE_STORE, "readonly", (tx) =>
      requestToPromise(
        tx.objectStore(TAB_ARCHIVE_STORE).getAll() as IDBRequest<TabArchiveEntry[]>,
      ),
    );
  }

  async getEntries(ids: readonly string[]): Promise<TabArchiveEntry[]> {
    if (ids.length === 0) return [];
    return runTabLifecycleTransaction(TAB_ARCHIVE_STORE, "readonly", async (tx) => {
      const store = tx.objectStore(TAB_ARCHIVE_STORE);
      const entries = await Promise.all(
        ids.map(
          (id) => requestToPromise(store.get(id)) as Promise<TabArchiveEntry | undefined>,
        ),
      );
      return entries.filter((entry): entry is TabArchiveEntry => !!entry);
    });
  }

  async getEntriesByBatch(batchId: string): Promise<TabArchiveEntry[]> {
    return runTabLifecycleTransaction(TAB_ARCHIVE_STORE, "readonly", (tx) =>
      requestToPromise(
        tx
          .objectStore(TAB_ARCHIVE_STORE)
          .index("batchId")
          .getAll(batchId) as IDBRequest<TabArchiveEntry[]>,
      ),
    );
  }

  async getAllBatches(): Promise<TabArchiveBatch[]> {
    return runTabLifecycleTransaction(ARCHIVE_BATCH_STORE, "readonly", (tx) =>
      requestToPromise(
        tx.objectStore(ARCHIVE_BATCH_STORE).getAll() as IDBRequest<TabArchiveBatch[]>,
      ),
    );
  }

  async getBatch(id: string): Promise<TabArchiveBatch | undefined> {
    return runTabLifecycleTransaction(ARCHIVE_BATCH_STORE, "readonly", (tx) =>
      requestToPromise(
        tx.objectStore(ARCHIVE_BATCH_STORE).get(id) as IDBRequest<TabArchiveBatch | undefined>,
      ),
    );
  }

  async count(): Promise<number> {
    return runTabLifecycleTransaction(TAB_ARCHIVE_STORE, "readonly", (tx) =>
      requestToPromise(tx.objectStore(TAB_ARCHIVE_STORE).count()),
    );
  }

  /**
   * Write a batch with its entries in one transaction; either all of them are stored
   * or none. A URL that is already archived is merged into the existing entry.
   */
  async addBatch(
    batch: Omit<TabArchiveBatch, "entryIds">,
    entries: readonly TabArchiveEntry[],
  ): Promise<{ batch: TabArchiveBatch; entries: TabArchiveEntry[] }> {
    const result = await runTabLifecycleTransaction(
      [TAB_ARCHIVE_STORE, ARCHIVE_BATCH_STORE],
      "readwrite",
      async (tx) => {
        const archive = tx.objectStore(TAB_ARCHIVE_STORE);
        const batches = tx.objectStore(ARCHIVE_BATCH_STORE);
        const byUrl = archive.index("normalizedUrl");
        const written = new Map<string, TabArchiveEntry>();
        const movedFrom = new Map<string, Set<string>>();

        for (const incoming of entries) {
          const sameBatch = Array.from(written.values()).find(
            (entry) => entry.normalizedUrl === incoming.normalizedUrl,
          );
          const existing =
            sameBatch ??
            ((await requestToPromise(byUrl.get(incoming.normalizedUrl))) as
              | TabArchiveEntry
              | undefined);
          const merged = mergeArchiveEntry(existing, { ...incoming, batchId: batch.id });
          if (existing && !sameBatch && existing.batchId !== batch.id) {
            const ids = movedFrom.get(existing.batchId) ?? new Set<string>();
            ids.add(existing.id);
            movedFrom.set(existing.batchId, ids);
          }
          archive.put(merged);
          written.set(merged.id, merged);
        }

        // Entries merged into this batch no longer belong to their old batches
        for (const [batchId, ids] of movedFrom) {
          const previous = (await requestToPromise(batches.get(batchId))) as
            | TabArchiveBatch
            | undefined;
          if (!previous) continue;
          const remaining = previous.entryIds.filter((id) => !ids.has(id));
          if (remaining.length === 0) batches.delete(batchId);
          else batches.put({ ...previous, entryIds: remaining });
        }

        const stored: TabArchiveBatch = { ...batch, entryIds: Array.from(written.keys()) };
        batches.put(stored);
        return { batch: stored, entries: Array.from(written.values()) };
      },
    );
    await this.bumpVersion();
    return result;
  }

  /** Remove entries (restored, moved elsewhere or deleted); empty batches go too */
  async deleteEntries(ids: readonly string[]): Promise<void> {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    await runTabLifecycleTransaction(
      [TAB_ARCHIVE_STORE, ARCHIVE_BATCH_STORE],
      "readwrite",
      async (tx) => {
        const archive = tx.objectStore(TAB_ARCHIVE_STORE);
        const batches = tx.objectStore(ARCHIVE_BATCH_STORE);
        const touched = new Set<string>();
        for (const id of idSet) {
          const entry = (await requestToPromise(archive.get(id))) as
            | TabArchiveEntry
            | undefined;
          if (!entry) continue;
          touched.add(entry.batchId);
          archive.delete(id);
        }
        for (const batchId of touched) {
          const batch = (await requestToPromise(batches.get(batchId))) as
            | TabArchiveBatch
            | undefined;
          if (!batch) continue;
          const remaining = batch.entryIds.filter((id) => !idSet.has(id));
          if (remaining.length === 0) batches.delete(batchId);
          else batches.put({ ...batch, entryIds: remaining });
        }
      },
    );
    await this.bumpVersion();
  }

  /** Drop batches that have no entries left and are older than the given time */
  async pruneEmptyBatches(olderThan: number): Promise<number> {
    const removed = await runTabLifecycleTransaction(
      [TAB_ARCHIVE_STORE, ARCHIVE_BATCH_STORE],
      "readwrite",
      async (tx) => {
        const archive = tx.objectStore(TAB_ARCHIVE_STORE).index("batchId");
        const batches = tx.objectStore(ARCHIVE_BATCH_STORE);
        const all = (await requestToPromise(batches.getAll())) as TabArchiveBatch[];
        let count = 0;
        for (const batch of all) {
          if (batch.createdAt >= olderThan) continue;
          const remaining = await requestToPromise(archive.count(batch.id));
          if (remaining === 0) {
            batches.delete(batch.id);
            count += 1;
          }
        }
        return count;
      },
    );
    if (removed > 0) await this.bumpVersion();
    return removed;
  }

  async clear(): Promise<void> {
    await runTabLifecycleTransaction(
      [TAB_ARCHIVE_STORE, ARCHIVE_BATCH_STORE],
      "readwrite",
      (tx) => {
        tx.objectStore(TAB_ARCHIVE_STORE).clear();
        tx.objectStore(ARCHIVE_BATCH_STORE).clear();
      },
    );
    await this.bumpVersion();
  }

  async bumpVersion(): Promise<void> {
    await archiveVersionItem.setValue(Date.now());
  }

  watchVersion(callback: () => void): () => void {
    return archiveVersionItem.watch(() => callback());
  }
}

export const tabArchiveStorage = new TabArchiveStorage();
