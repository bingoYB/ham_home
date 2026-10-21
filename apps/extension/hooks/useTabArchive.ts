/**
 * useTabArchive - the tab archive for the tab center: entries, batches, search and
 * filters (10,000 entries are filtered in memory on a precomputed index) and the
 * archive actions, which run in the background.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { getBackgroundService } from "@/lib/services";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import {
  filterArchiveEntries,
  indexArchiveEntries,
  listArchiveDomains,
  type ArchiveDateGroup,
  type IndexedArchiveEntry,
} from "@/lib/tabs/tab-archive.utils";
import type { TabArchiveBatch, TabArchiveEntry, TabArchiveReason } from "@/types";

export interface ArchiveFilterState {
  query: string;
  reason: TabArchiveReason | "all";
  domain: string;
  dateGroup: ArchiveDateGroup | "all";
}

const INITIAL_FILTER: ArchiveFilterState = {
  query: "",
  reason: "all",
  domain: "all",
  dateGroup: "all",
};

export interface UseTabArchiveResult {
  entries: TabArchiveEntry[];
  batches: Map<string, TabArchiveBatch>;
  loading: boolean;
  filter: ArchiveFilterState;
  setFilter: (patch: Partial<ArchiveFilterState>) => void;
  filtered: IndexedArchiveEntry[];
  domains: string[];
  /** Most recent batch that still has archived tabs */
  latestBatch: { batch: TabArchiveBatch; count: number } | null;
  restore: (entryIds: string[], activate?: boolean) => Promise<void>;
  restoreBatch: (batchId: string) => Promise<void>;
  readLater: (entryIds: string[]) => Promise<void>;
  bookmark: (entryIds: string[]) => Promise<void>;
  remove: (entryIds: string[]) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useTabArchive(): UseTabArchiveResult {
  const { t } = useTranslation("bookmark");
  const [entries, setEntries] = useState<TabArchiveEntry[]>([]);
  const [batchList, setBatchList] = useState<TabArchiveBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilterState] = useState<ArchiveFilterState>(INITIAL_FILTER);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [nextEntries, nextBatches] = await Promise.all([
        tabArchiveStorage.getAllEntries(),
        tabArchiveStorage.getAllBatches(),
      ]);
      setEntries(nextEntries);
      setBatchList(nextBatches);
      setNow(Date.now());
    } catch (error) {
      console.error("[useTabArchive] Failed to load archive:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    return tabArchiveStorage.watchVersion(() => void load());
  }, [load]);

  const indexed = useMemo(() => indexArchiveEntries(entries, now), [entries, now]);
  const filtered = useMemo(
    () => filterArchiveEntries(indexed, filter),
    [filter, indexed],
  );
  const domains = useMemo(() => listArchiveDomains(entries), [entries]);
  const batches = useMemo(
    () => new Map(batchList.map((batch) => [batch.id, batch])),
    [batchList],
  );

  const latestBatch = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of entries) counts.set(entry.batchId, (counts.get(entry.batchId) ?? 0) + 1);
    const latest = batchList
      .filter((batch) => (counts.get(batch.id) ?? 0) > 0)
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    return latest ? { batch: latest, count: counts.get(latest.id) ?? 0 } : null;
  }, [batchList, entries]);

  const setFilter = useCallback((patch: Partial<ArchiveFilterState>) => {
    setFilterState((current) => ({ ...current, ...patch }));
  }, []);

  const run = useCallback(
    async (action: () => Promise<string | void>, failure: string) => {
      try {
        const message = await action();
        if (message) toast.success(message);
      } catch (error) {
        console.error("[useTabArchive] action failed:", error);
        toast.error(failure);
      }
    },
    [],
  );

  const restore = useCallback(
    (entryIds: string[], activate = false) =>
      run(async () => {
        const result = await getBackgroundService().restoreArchiveEntries(entryIds, activate);
        return t("tabCenter.archive.restored", { count: result.restored });
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  const restoreBatch = useCallback(
    (batchId: string) =>
      run(async () => {
        const result = await getBackgroundService().restoreArchiveBatches([batchId]);
        return t("tabCenter.archive.restored", { count: result.restored });
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  const readLater = useCallback(
    (entryIds: string[]) =>
      run(async () => {
        const result = await getBackgroundService().readLaterArchiveEntries(entryIds);
        return t("tabCenter.readLaterAdded", { count: result.added + result.alreadyQueued });
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  const bookmark = useCallback(
    (entryIds: string[]) =>
      run(async () => {
        const result = await getBackgroundService().bookmarkArchiveEntries(entryIds);
        return t("tabCenter.bookmarked", { count: result.created, existing: result.existing });
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  const remove = useCallback(
    (entryIds: string[]) =>
      run(async () => {
        await getBackgroundService().deleteArchiveEntries(entryIds);
        return t("tabCenter.archive.deleted", { count: entryIds.length });
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  const clearAll = useCallback(
    () =>
      run(async () => {
        await getBackgroundService().clearTabArchive();
        return t("tabCenter.archive.cleared");
      }, t("tabCenter.actionFailed")),
    [run, t],
  );

  return {
    entries,
    batches,
    loading,
    filter,
    setFilter,
    filtered,
    domains,
    latestBatch,
    restore,
    restoreBatch,
    readLater,
    bookmark,
    remove,
    clearAll,
  };
}

/** Number of archived tabs, kept up to date (cheap: no entries are loaded) */
export function useTabArchiveCount(): { count: number; clear: () => Promise<void> } {
  const { t } = useTranslation("bookmark");
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = () => void tabArchiveStorage.count().then(setCount).catch(() => undefined);
    load();
    return tabArchiveStorage.watchVersion(load);
  }, []);
  const clear = useCallback(async () => {
    try {
      await getBackgroundService().clearTabArchive();
      toast.success(t("tabCenter.archive.cleared"));
    } catch (error) {
      console.error("[useTabArchiveCount] clear failed:", error);
      toast.error(t("tabCenter.actionFailed"));
    }
  }, [t]);
  return { count, clear };
}
