/**
 * useOpenTabsSnapshot - live snapshot of the open tabs for extension pages
 * (tab center, popup card). Reloads, debounced, on tab and window events and when
 * lifecycle settings or state change; relative times refresh every minute.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { browser, type Browser } from "wxt/browser";
import { tabLifecycleService } from "@/lib/services/tab-lifecycle-service";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabLifecycleStateStorage } from "@/lib/storage/tab-lifecycle-state-storage";
import type { OpenTabsSnapshot } from "@/types";

const RELOAD_DEBOUNCE_MS = 400;
const TICK_MS = 60 * 1000;

/** tabs.onUpdated fires a lot; only these changes are visible in the snapshot */
function isRelevantUpdate(changeInfo: Browser.tabs.OnUpdatedInfo): boolean {
  return (
    changeInfo.url !== undefined ||
    changeInfo.title !== undefined ||
    changeInfo.pinned !== undefined ||
    changeInfo.audible !== undefined ||
    changeInfo.discarded !== undefined ||
    changeInfo.groupId !== undefined ||
    changeInfo.favIconUrl !== undefined ||
    changeInfo.status === "complete"
  );
}

export interface UseOpenTabsSnapshotResult {
  snapshot: OpenTabsSnapshot | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useOpenTabsSnapshot(): UseOpenTabsSnapshotResult {
  const [snapshot, setSnapshot] = useState<OpenTabsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await tabLifecycleService.getSnapshot());
      setError(null);
    } catch (err) {
      console.error("[useOpenTabsSnapshot] Failed to load tabs:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const schedule = useCallback(() => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void refresh();
    }, RELOAD_DEBOUNCE_MS);
  }, [refresh]);

  useEffect(() => {
    void refresh();

    const onUpdated = (
      _tabId: number,
      changeInfo: Browser.tabs.OnUpdatedInfo,
    ) => {
      if (isRelevantUpdate(changeInfo)) schedule();
    };
    const onStorageChanged = (_changes: unknown, areaName: string) => {
      // Busy tabs, bulk-opened tabs and confirmations live in session storage
      if (areaName === "session") schedule();
    };

    browser.tabs.onCreated.addListener(schedule);
    browser.tabs.onRemoved.addListener(schedule);
    browser.tabs.onActivated.addListener(schedule);
    browser.tabs.onMoved.addListener(schedule);
    browser.tabs.onAttached.addListener(schedule);
    browser.tabs.onDetached.addListener(schedule);
    browser.tabs.onReplaced.addListener(schedule);
    browser.tabs.onUpdated.addListener(onUpdated);
    browser.windows.onRemoved.addListener(schedule);
    browser.storage.onChanged.addListener(onStorageChanged);
    const unwatchState = tabLifecycleStateStorage.watch(schedule);
    const unwatchSettings = tabLifecycleConfigStorage.watchSettings(schedule);
    const tick = window.setInterval(() => void refresh(), TICK_MS);

    return () => {
      browser.tabs.onCreated.removeListener(schedule);
      browser.tabs.onRemoved.removeListener(schedule);
      browser.tabs.onActivated.removeListener(schedule);
      browser.tabs.onMoved.removeListener(schedule);
      browser.tabs.onAttached.removeListener(schedule);
      browser.tabs.onDetached.removeListener(schedule);
      browser.tabs.onReplaced.removeListener(schedule);
      browser.tabs.onUpdated.removeListener(onUpdated);
      browser.windows.onRemoved.removeListener(schedule);
      browser.storage.onChanged.removeListener(onStorageChanged);
      unwatchState();
      unwatchSettings();
      window.clearInterval(tick);
      if (timerRef.current != null) window.clearTimeout(timerRef.current);
    };
  }, [refresh, schedule]);

  return { snapshot, loading, error, refresh };
}
