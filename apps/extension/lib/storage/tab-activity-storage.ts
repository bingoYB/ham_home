/**
 * Tab activity records (HamHomeTabLifecycle.tabActivity), local only.
 *
 * Event handlers persist one record per write inside a single readwrite transaction,
 * so concurrent events for the same tab cannot overwrite each other and nothing
 * relies on service worker memory.
 */
import type { TabActivityRecord } from "@/types";
import {
  TAB_ACTIVITY_STORE,
  requestToPromise,
  runTabLifecycleTransaction,
} from "./tab-lifecycle-db";

type RecordUpdater = (
  current: TabActivityRecord | undefined,
) => TabActivityRecord | null | undefined;

class TabActivityStorage {
  async getAll(): Promise<TabActivityRecord[]> {
    return runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readonly", (tx) =>
      requestToPromise(
        tx.objectStore(TAB_ACTIVITY_STORE).getAll() as IDBRequest<TabActivityRecord[]>,
      ),
    );
  }

  async getMap(): Promise<Map<number, TabActivityRecord>> {
    const records = await this.getAll();
    return new Map(records.map((record) => [record.tabId, record]));
  }

  async get(tabId: number): Promise<TabActivityRecord | undefined> {
    return runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readonly", (tx) =>
      requestToPromise(
        tx.objectStore(TAB_ACTIVITY_STORE).get(tabId) as IDBRequest<
          TabActivityRecord | undefined
        >,
      ),
    );
  }

  /**
   * Read-modify-write one record atomically.
   * Return null from the updater to delete the record, undefined to leave it untouched.
   */
  async update(tabId: number, updater: RecordUpdater): Promise<TabActivityRecord | undefined> {
    return runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", async (tx) => {
      const store = tx.objectStore(TAB_ACTIVITY_STORE);
      const current = (await requestToPromise(store.get(tabId))) as
        | TabActivityRecord
        | undefined;
      const next = updater(current);
      if (next === null) {
        store.delete(tabId);
        return undefined;
      }
      if (next !== undefined) store.put(next);
      return next ?? current;
    });
  }

  /** Apply the updater to several records in one transaction */
  async updateMany(tabIds: readonly number[], updater: RecordUpdater): Promise<void> {
    if (tabIds.length === 0) return;
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", async (tx) => {
      const store = tx.objectStore(TAB_ACTIVITY_STORE);
      for (const tabId of tabIds) {
        const current = (await requestToPromise(store.get(tabId))) as
          | TabActivityRecord
          | undefined;
        const next = updater(current);
        if (next === null) store.delete(tabId);
        else if (next !== undefined) store.put(next);
      }
    });
  }

  async put(record: TabActivityRecord): Promise<void> {
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      tx.objectStore(TAB_ACTIVITY_STORE).put(record);
    });
  }

  async putMany(records: readonly TabActivityRecord[]): Promise<void> {
    if (records.length === 0) return;
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      const store = tx.objectStore(TAB_ACTIVITY_STORE);
      for (const record of records) store.put(record);
    });
  }

  async delete(tabId: number): Promise<void> {
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      tx.objectStore(TAB_ACTIVITY_STORE).delete(tabId);
    });
  }

  async deleteMany(tabIds: readonly number[]): Promise<void> {
    if (tabIds.length === 0) return;
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      const store = tx.objectStore(TAB_ACTIVITY_STORE);
      for (const tabId of tabIds) store.delete(tabId);
    });
  }

  /** Replace every record at once (restart reconciliation) */
  async replaceAll(records: readonly TabActivityRecord[]): Promise<void> {
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      const store = tx.objectStore(TAB_ACTIVITY_STORE);
      store.clear();
      for (const record of records) store.put(record);
    });
  }

  async clear(): Promise<void> {
    await runTabLifecycleTransaction(TAB_ACTIVITY_STORE, "readwrite", (tx) => {
      tx.objectStore(TAB_ACTIVITY_STORE).clear();
    });
  }
}

export const tabActivityStorage = new TabActivityStorage();
