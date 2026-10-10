/**
 * useRecentAutoArchive - "N tabs archived automatically today": automatic batches of
 * the last 24 hours that still hold tabs, and restoring them all at once.
 */
import { useCallback, useEffect, useState } from "react";
import { getBackgroundService } from "@/lib/services";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import { RECENT_AUTO_BATCH_MS } from "@/lib/tabs/tab-archive.utils";
import type { TabArchiveRecentSummary } from "@/types";

export interface UseRecentAutoArchiveResult {
  summary: TabArchiveRecentSummary;
  restoreAll: () => Promise<number>;
}

export function useRecentAutoArchive(): UseRecentAutoArchiveResult {
  const [summary, setSummary] = useState<TabArchiveRecentSummary>({ batchIds: [], count: 0 });

  const load = useCallback(async () => {
    const now = Date.now();
    const batches = (await tabArchiveStorage.getAllBatches()).filter(
      (batch) => batch.automatic && !batch.undoneAt && now - batch.createdAt < RECENT_AUTO_BATCH_MS,
    );
    const counts = await Promise.all(
      batches.map(async (batch) => (await tabArchiveStorage.getEntriesByBatch(batch.id)).length),
    );
    const withTabs = batches.filter((_, index) => counts[index] > 0);
    setSummary({
      batchIds: withTabs.map((batch) => batch.id),
      count: counts.reduce((sum, count) => sum + count, 0),
    });
  }, []);

  useEffect(() => {
    void load().catch(() => undefined);
    return tabArchiveStorage.watchVersion(() => void load().catch(() => undefined));
  }, [load]);

  const restoreAll = useCallback(async () => {
    if (summary.batchIds.length === 0) return 0;
    const result = await getBackgroundService().restoreArchiveBatches(summary.batchIds);
    return result.restored;
  }, [summary.batchIds]);

  return { summary, restoreAll };
}
