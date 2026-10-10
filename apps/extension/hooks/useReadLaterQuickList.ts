/**
 * useReadLaterQuickList - newest unread Read later items for the in-page edge panel.
 *
 * Loads only while the panel is open and refreshes while the queue changes, so pages
 * where the panel is never opened pay nothing.
 */
import { useCallback, useEffect, useState } from "react";
import { getBackgroundService } from "@/lib/services";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { readLaterStorage } from "@/lib/storage/read-later-storage";
import type { ReadLaterQuickList } from "@/types";

const QUICK_LIST_LIMIT = 8;
const EMPTY_LIST: ReadLaterQuickList = { items: [], unreadCount: 0 };

export interface UseReadLaterQuickListResult extends ReadLaterQuickList {
  /** Open in a new tab and mark as reading */
  open: (bookmarkId: string) => void;
  /** Open the Read later page */
  openAll: () => void;
}

export function useReadLaterQuickList(active: boolean): UseReadLaterQuickListResult {
  const [list, setList] = useState<ReadLaterQuickList>(EMPTY_LIST);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = () => {
      getBackgroundService()
        .getReadLaterQuickList(QUICK_LIST_LIMIT)
        .then((next) => {
          if (!cancelled) setList(next);
        })
        .catch(() => undefined);
    };
    load();
    // Titles of links added unopened fill in later, so bookmark changes count too
    const unwatchQueue = readLaterStorage.watch(load);
    const unwatchBookmarks = bookmarkStorage.watchBookmarks(load);
    return () => {
      cancelled = true;
      unwatchQueue();
      unwatchBookmarks();
    };
  }, [active]);

  const open = useCallback((bookmarkId: string) => {
    void getBackgroundService().readLaterOpen(bookmarkId).catch(() => undefined);
  }, []);

  const openAll = useCallback(() => {
    void getBackgroundService().openOptionsPage("read-later").catch(() => undefined);
  }, []);

  return { ...list, open, openAll };
}
