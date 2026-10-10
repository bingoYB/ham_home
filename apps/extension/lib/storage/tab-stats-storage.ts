/**
 * Local tab stats (local:tabLifecycleStats): counts only, this device only, never
 * synced or exported, kept for 90 days. Updates run one after another.
 */
import { EMPTY_TAB_STATS, normalizeTabStats } from "@/lib/tabs/tab-stats.utils";
import type { TabLifecycleStats } from "@/types";

const statsItem = storage.defineItem<TabLifecycleStats>("local:tabLifecycleStats", {
  fallback: EMPTY_TAB_STATS,
});

class TabStatsStorage {
  private queue: Promise<unknown> = Promise.resolve();

  async get(): Promise<TabLifecycleStats> {
    return normalizeTabStats(await statsItem.getValue());
  }

  /** Serialized read-modify-write. Return the same object to skip the write. */
  update(updater: (stats: TabLifecycleStats) => TabLifecycleStats): Promise<TabLifecycleStats> {
    const run = async () => {
      const current = await this.get();
      const next = updater(current);
      if (next !== current) await statsItem.setValue(next);
      return next;
    };
    const result = this.queue.then(run, run);
    this.queue = result.catch(() => undefined);
    return result;
  }

  async clear(): Promise<void> {
    await statsItem.setValue(EMPTY_TAB_STATS);
  }
}

export const tabStatsStorage = new TabStatsStorage();
