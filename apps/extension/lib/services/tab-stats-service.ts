/**
 * Local tab stats: samples the open tab count while activity tracking is on, and
 * counts archive, restore and Read later events. Recording never throws into the
 * action it counts.
 */
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { tabStatsStorage } from "@/lib/storage/tab-stats-storage";
import { computeBudgetStatus } from "@/lib/tabs/tab-budget.utils";
import {
  buildWeeklyOverview,
  incrementStatsCounter,
  isSampleWorthWriting,
  pruneStats,
  recordOpenSample,
} from "@/lib/tabs/tab-stats.utils";
import type { TabStatsCounter, TabWeeklyOverview } from "@/types";
import { countBudgetTabs } from "./tab-badge-service";

/** An unchanged count is written at most this often (the sweep keeps it going) */
const SAMPLE_MIN_INTERVAL_MS = 10 * 60 * 1000;

class TabStatsService {
  /** Record the current open tab count (budget counting: pinned tabs excluded) */
  async sample(now = Date.now()): Promise<void> {
    const settings = await tabLifecycleConfigStorage.getSettings();
    if (!settings.activityTracking) {
      // No history while tracking is off, and no credit for the gap once it is back on
      await tabStatsStorage.update((stats) =>
        stats.lastSample ? { ...stats, lastSample: undefined } : stats,
      );
      return;
    }
    const [counts, lastFocusedWindowId] = await Promise.all([
      countBudgetTabs(),
      tabSessionStorage.getLastFocusedWindow(),
    ]);
    const status = computeBudgetStatus({
      enabled: settings.budget.enabled,
      limit: settings.budget.limit,
      scope: settings.budget.scope,
      windows: counts.windows,
      lastFocusedWindowId: lastFocusedWindowId ?? undefined,
    });
    const sample = {
      at: now,
      open: counts.windows.reduce((sum, window) => sum + window.counted, 0),
      overBudget: status.enabled && status.over > 0,
    };
    await tabStatsStorage.update((stats) =>
      isSampleWorthWriting(stats, sample, SAMPLE_MIN_INTERVAL_MS)
        ? pruneStats(recordOpenSample(stats, sample), now)
        : stats,
    );
  }

  /** Fire and forget */
  count(counter: TabStatsCounter, delta = 1): void {
    if (!(delta > 0)) return;
    const now = Date.now();
    void tabStatsStorage
      .update((stats) => incrementStatsCounter(stats, counter, delta, now))
      .catch((error) => console.warn("[TabStats] count failed:", error));
  }

  async getWeeklyOverview(now = Date.now()): Promise<TabWeeklyOverview> {
    const [stats, settings] = await Promise.all([
      tabStatsStorage.get(),
      tabLifecycleConfigStorage.getSettings(),
    ]);
    return buildWeeklyOverview(stats, now, settings.activityTracking);
  }
}

export const tabStatsService = new TabStatsService();
