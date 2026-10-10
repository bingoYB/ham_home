/**
 * AI tidy-up answers by cleaned URL (local:tabTriageCache): this device only, kept
 * for 24 hours, at most 500 entries. Never synced or exported.
 */
import { pruneTriageCache, type TriageCache } from "@/lib/tabs/tab-triage.utils";

const cacheItem = storage.defineItem<TriageCache>("local:tabTriageCache", { fallback: {} });

class TabTriageCacheStorage {
  async get(now = Date.now()): Promise<TriageCache> {
    const value = await cacheItem.getValue();
    return pruneTriageCache(value && typeof value === "object" ? value : {}, now);
  }

  async merge(entries: TriageCache, now = Date.now()): Promise<void> {
    if (Object.keys(entries).length === 0) return;
    const current = await this.get(now);
    await cacheItem.setValue(pruneTriageCache({ ...current, ...entries }, now));
  }

  async clear(): Promise<void> {
    await cacheItem.setValue({});
  }
}

export const tabTriageCacheStorage = new TabTriageCacheStorage();
