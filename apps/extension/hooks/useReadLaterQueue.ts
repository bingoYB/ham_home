/**
 * useReadLaterQueue - the read later queue: unread / read / expired views, sorting,
 * filters, search, queue health (expiring soon, completion rate) and item actions.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@hamhome/ui";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { getBackgroundService } from "@/lib/services";
import {
  buildReadLaterItems,
  computeCompletionRate,
  countExpiringSoon,
  getEntryView,
  matchesReadLaterQuery,
  sortReadLaterItems,
  type ReadLaterItem,
} from "@/lib/read-later/read-later.utils";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { DEFAULT_TAB_LIFECYCLE_SETTINGS } from "@/lib/tabs/tab-lifecycle-settings.utils";
import type {
  ReadLaterSettings,
  ReadLaterSort,
  ReadLaterSource,
  ReadLaterView,
} from "@/types";

export type ReadLaterKeptFilter = "all" | "kept" | "queueOnly";

export interface ReadLaterFilters {
  domain: string;
  source: ReadLaterSource | "all";
  kept: ReadLaterKeptFilter;
}

export interface UseReadLaterQueueResult {
  settings: ReadLaterSettings;
  view: ReadLaterView;
  setView: (view: ReadLaterView) => void;
  sort: ReadLaterSort;
  setSort: (sort: ReadLaterSort) => void;
  query: string;
  setQuery: (query: string) => void;
  filters: ReadLaterFilters;
  setFilters: (patch: Partial<ReadLaterFilters>) => void;
  /** Items of the current view after filters, search and sorting */
  items: ReadLaterItem[];
  counts: Record<ReadLaterView, number>;
  domains: string[];
  expiringSoon: number;
  completion: { read: number; expired: number; rate: number | null };
  updateSettings: (patch: Partial<ReadLaterSettings>) => Promise<void>;
  open: (bookmarkId: string) => Promise<void>;
  markRead: (ids: string[]) => Promise<void>;
  requeue: (ids: string[]) => Promise<void>;
  keep: (ids: string[], classify: boolean) => Promise<void>;
  remove: (ids: string[]) => Promise<void>;
  updateNote: (id: string, note: string) => Promise<void>;
}

const INITIAL_FILTERS: ReadLaterFilters = { domain: "all", source: "all", kept: "all" };

export function useReadLaterQueue(initialQuery = ""): UseReadLaterQueueResult {
  const { t } = useTranslation("bookmark");
  const { allBookmarks, readLaterEntries } = useBookmarks();
  const [settings, setSettings] = useState<ReadLaterSettings>(
    DEFAULT_TAB_LIFECYCLE_SETTINGS.readLater,
  );
  const [view, setView] = useState<ReadLaterView>("unread");
  const [sort, setSort] = useState<ReadLaterSort>("newest");
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilterState] = useState<ReadLaterFilters>(INITIAL_FILTERS);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    void tabLifecycleConfigStorage.getSettings().then((value) => setSettings(value.readLater));
    const unwatch = tabLifecycleConfigStorage.watchSettings((value) =>
      setSettings(value.readLater),
    );
    const tick = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      unwatch();
      window.clearInterval(tick);
    };
  }, []);

  const allItems = useMemo(
    () => buildReadLaterItems(readLaterEntries, allBookmarks),
    [allBookmarks, readLaterEntries],
  );

  const counts = useMemo(() => {
    const result: Record<ReadLaterView, number> = { unread: 0, read: 0, expired: 0 };
    for (const item of allItems) {
      const itemView = getEntryView(item.entry);
      if (itemView) result[itemView] += 1;
    }
    return result;
  }, [allItems]);

  const domains = useMemo(
    () => Array.from(new Set(allItems.map((item) => item.domain).filter(Boolean))).sort(),
    [allItems],
  );

  const items = useMemo(() => {
    const visible = allItems.filter((item) => {
      if (getEntryView(item.entry) !== view) return false;
      if (filters.domain !== "all" && item.domain !== filters.domain) return false;
      if (filters.source !== "all" && item.entry.source !== filters.source) return false;
      if (filters.kept === "kept" && item.entry.queueOnly) return false;
      if (filters.kept === "queueOnly" && !item.entry.queueOnly) return false;
      return matchesReadLaterQuery(item, query);
    });
    return sortReadLaterItems(visible, sort);
  }, [allItems, filters, query, sort, view]);

  const entryList = useMemo(() => allItems.map((item) => item.entry), [allItems]);
  const expiringSoon = useMemo(
    () => countExpiringSoon(entryList, settings.expireAfterDays, now),
    [entryList, now, settings.expireAfterDays],
  );
  const completion = useMemo(() => computeCompletionRate(entryList, now), [entryList, now]);

  const setFilters = useCallback((patch: Partial<ReadLaterFilters>) => {
    setFilterState((current) => ({ ...current, ...patch }));
  }, []);

  const run = useCallback(async (action: () => Promise<string | void>) => {
    try {
      const message = await action();
      if (message) toast.success(message);
    } catch (error) {
      console.error("[useReadLaterQueue] action failed:", error);
      toast.error(t("readLater.actionFailed"));
    }
  }, [t]);

  const updateSettings = useCallback(async (patch: Partial<ReadLaterSettings>) => {
    const next = await tabLifecycleConfigStorage.updateSettings({ readLater: patch });
    setSettings(next.readLater);
  }, []);

  const open = useCallback(
    (bookmarkId: string) =>
      run(async () => {
        await getBackgroundService().readLaterOpen(bookmarkId);
      }),
    [run],
  );

  const markRead = useCallback(
    (ids: string[]) =>
      run(async () => {
        await getBackgroundService().readLaterMarkRead(ids);
        return t("readLater.toast.markedRead", { count: ids.length });
      }),
    [run, t],
  );

  const requeue = useCallback(
    (ids: string[]) =>
      run(async () => {
        await getBackgroundService().readLaterRequeue(ids);
        return t("readLater.toast.requeued", { count: ids.length });
      }),
    [run, t],
  );

  const keep = useCallback(
    (ids: string[], classify: boolean) =>
      run(async () => {
        await getBackgroundService().readLaterKeep(ids, classify);
        return t("readLater.toast.kept", { count: ids.length });
      }),
    [run, t],
  );

  const remove = useCallback(
    (ids: string[]) =>
      run(async () => {
        const result = await getBackgroundService().readLaterRemove(ids);
        return t("readLater.toast.removed", {
          count: result.trashed + result.dequeued,
        });
      }),
    [run, t],
  );

  const updateNote = useCallback(
    (id: string, note: string) =>
      run(async () => {
        await getBackgroundService().readLaterUpdateNote(id, note);
      }),
    [run],
  );

  return {
    settings,
    view,
    setView,
    sort,
    setSort,
    query,
    setQuery,
    filters,
    setFilters,
    items,
    counts,
    domains,
    expiringSoon,
    completion,
    updateSettings,
    open,
    markRead,
    requeue,
    keep,
    remove,
    updateNote,
  };
}
