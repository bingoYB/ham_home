/**
 * Tab activity tracking (background only).
 *
 * Records when every tab in a normal window was first seen and last used:
 * - activating a tab, focusing its window and switching away from it count as use;
 * - navigating the current tab counts as use, background reloads / redirects do not;
 * - each day with such an interaction is a usage day.
 *
 * Everything is persisted inside the event handler, one record per write, so the MV3
 * service worker can be stopped at any time. Incognito, app and popup windows are
 * ignored. Records never leave the device.
 */
import { browser, type Browser } from "wxt/browser";
import { tabActivityStorage } from "@/lib/storage/tab-activity-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabLifecycleStateStorage } from "@/lib/storage/tab-lifecycle-state-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { normalizeTabUrl } from "@/lib/tabs/tab-duplicates.utils";
import {
  collectLockedUrls,
  createActivityRecord,
  reconcileActivityRecordsDetailed,
  type ReconcileTab,
} from "@/lib/tabs/tab-reconcile.utils";
import { addUsageDay, toLocalDateKey } from "@/lib/tabs/usage-days.utils";
import type { TabActivityRecord, TabLifecycleSettings } from "@/types";

/** After a restart, late restored tabs can still claim previous records for this long */
const RECONCILE_POOL_MS = 2 * 60 * 1000;
const RECONCILE_POOL_KEY = "tl.reconcilePool";
/** Locked URLs not open at start-up; a tab restored with one later this session is locked again */
const PENDING_LOCKS_KEY = "tl.pendingLocks";
const WINDOW_ID_NONE = -1;

interface ReconcilePool {
  records: TabActivityRecord[];
  until: number;
}

type TabLike = Pick<
  Browser.tabs.Tab,
  "id" | "windowId" | "index" | "url" | "pendingUrl" | "incognito" | "active"
>;

function toReconcileTab(tab: TabLike): ReconcileTab | null {
  if (tab.id == null || tab.windowId == null || tab.incognito) return null;
  const url = normalizeTabUrl(tab.url || tab.pendingUrl);
  if (!url) return null;
  return { tabId: tab.id, windowId: tab.windowId, index: tab.index ?? 0, url };
}

class TabActivityService {
  private ready: Promise<void> | null = null;
  private settings: TabLifecycleSettings | null = null;
  private unwatchSettings: (() => void) | null = null;
  private normalWindows = new Map<number, boolean>();
  private lastUsageDayKey: string | null = null;
  /** Restored tabs may claim previous records until then (in memory: best effort) */
  private poolUntil = 0;
  /** Tracking resumed: the stored active tab / focused window pointers are stale */
  private pointersStale = false;

  /** Load settings once and keep them fresh, so handlers stay cheap */
  private async getSettings(): Promise<TabLifecycleSettings> {
    if (!this.settings) {
      this.settings = await tabLifecycleConfigStorage.getSettings();
      this.unwatchSettings ??= tabLifecycleConfigStorage.watchSettings((next) => {
        const wasTracking = this.settings?.activityTracking;
        this.settings = next;
        if (wasTracking === false && next.activityTracking) {
          this.ready = null;
          this.pointersStale = true;
          void this.initialize();
        }
      });
    }
    return this.settings;
  }

  async isTracking(): Promise<boolean> {
    return (await this.getSettings()).activityTracking;
  }

  private async isNormalWindow(windowId: number | undefined): Promise<boolean> {
    if (windowId == null || windowId === WINDOW_ID_NONE) return false;
    const cached = this.normalWindows.get(windowId);
    if (cached !== undefined) return cached;
    try {
      const window = await browser.windows.get(windowId);
      const normal = window.type === "normal" && !window.incognito;
      this.normalWindows.set(windowId, normal);
      return normal;
    } catch {
      return false;
    }
  }

  forgetWindow(windowId: number): void {
    this.normalWindows.delete(windowId);
    void tabSessionStorage.clearActiveTab(windowId);
  }

  /** Idempotent; every handler waits for it so a restart is reconciled first */
  initialize(): Promise<void> {
    this.ready ??= this.doInitialize().catch((error) => {
      console.warn("[TabActivity] initialize failed:", error);
    });
    return this.ready;
  }

  private async doInitialize(): Promise<void> {
    if (!(await this.isTracking())) return;
    const newSession = await tabSessionStorage.claimNewSession();
    const now = Date.now();
    const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
    const normalWindows = windows.filter((window) => !window.incognito);
    for (const window of windows) {
      if (window.id != null) this.normalWindows.set(window.id, !window.incognito);
    }
    const tabs = normalWindows.flatMap((window) => window.tabs ?? []);
    const current = tabs
      .map(toReconcileTab)
      .filter((tab): tab is ReconcileTab => !!tab);
    const [previous, state] = await Promise.all([
      tabActivityStorage.getAll(),
      tabLifecycleStateStorage.get(),
    ]);

    let records: TabActivityRecord[];
    if (newSession) {
      const reconciled = reconcileActivityRecordsDetailed(
        previous,
        current,
        now,
        new Set(state.lockedUrls),
      );
      records = reconciled.records;
      await tabActivityStorage.replaceAll(records);
      if (reconciled.unclaimed.length > 0) {
        this.poolUntil = now + RECONCILE_POOL_MS;
        await tabSessionStorage.set(RECONCILE_POOL_KEY, {
          records: reconciled.unclaimed,
          until: this.poolUntil,
        } satisfies ReconcilePool);
      }
      const lockedUrls = collectLockedUrls(records);
      const restoredLocks = new Set(lockedUrls);
      const pendingLocks = new Set(
        [...state.lockedUrls, ...collectLockedUrls(reconciled.unclaimed)].filter(
          (url) => !restoredLocks.has(url),
        ),
      );
      await tabSessionStorage.set(PENDING_LOCKS_KEY, Array.from(pendingLocks));
      await tabLifecycleStateStorage.update((value) => ({
        ...value,
        lastStartupAt: now,
        trackingStartedAt: value.trackingStartedAt ?? now,
        lockedUrls,
      }));
    } else {
      const pool = await tabSessionStorage.get<ReconcilePool | null>(RECONCILE_POOL_KEY, null);
      this.poolUntil = pool?.until ?? 0;
      records = await this.syncRecords(current, previous, now);
    }

    // A worker restart within the session keeps the stored pointers: the event that
    // woke the worker still needs to know which tab was active before it
    const refreshPointers = newSession || this.pointersStale;
    this.pointersStale = false;
    for (const window of normalWindows) {
      const active = window.tabs?.find((tab) => tab.active);
      if (window.id == null || active?.id == null) continue;
      if (refreshPointers || (await tabSessionStorage.getActiveTab(window.id)) == null) {
        await tabSessionStorage.setActiveTab(window.id, active.id);
      }
    }
    if (refreshPointers) {
      const focused = normalWindows.find((window) => window.focused);
      await tabSessionStorage.setFocusedWindow(focused?.id ?? null);
    }
  }

  /**
   * Same browser session: create records for tabs HamHome has not seen, drop records
   * of tabs that are gone and refresh positions. Used at start-up and by the sweep.
   */
  async syncRecords(
    current: readonly ReconcileTab[],
    previous?: readonly TabActivityRecord[],
    now = Date.now(),
  ): Promise<TabActivityRecord[]> {
    const existing = previous ?? (await tabActivityStorage.getAll());
    const byId = new Map(existing.map((record) => [record.tabId, record]));
    const currentIds = new Set(current.map((tab) => tab.tabId));
    const writes: TabActivityRecord[] = [];
    const next: TabActivityRecord[] = [];

    for (const tab of current) {
      const record = byId.get(tab.tabId);
      if (!record) {
        const created = createActivityRecord(tab, now, { estimated: true });
        writes.push(created);
        next.push(created);
        continue;
      }
      if (record.windowId !== tab.windowId || record.index !== tab.index || record.url !== tab.url) {
        const moved = { ...record, windowId: tab.windowId, index: tab.index, url: tab.url };
        writes.push(moved);
        next.push(moved);
      } else {
        next.push(record);
      }
    }

    const orphans = existing.filter((record) => !currentIds.has(record.tabId));
    await tabActivityStorage.putMany(writes);
    await tabActivityStorage.deleteMany(orphans.map((record) => record.tabId));
    if (orphans.some((record) => record.locked) || writes.some((record) => record.locked)) {
      await this.refreshLockedUrls(next);
    }
    return next;
  }

  private async refreshLockedUrls(records?: readonly TabActivityRecord[]): Promise<void> {
    const all = records ?? (await tabActivityStorage.getAll());
    const lockedUrls = collectLockedUrls(all);
    await tabLifecycleStateStorage.update((state) =>
      state.lockedUrls.join("\n") === lockedUrls.join("\n") ? state : { ...state, lockedUrls },
    );
  }

  /** Record today as a usage day (one storage write per day) */
  private async recordUsageDay(now: number): Promise<void> {
    const key = toLocalDateKey(now);
    if (this.lastUsageDayKey === key) return;
    this.lastUsageDayKey = key;
    await tabLifecycleStateStorage.update((state) => {
      const usageDays = addUsageDay(state.usageDays, now);
      return usageDays === state.usageDays ? state : { ...state, usageDays };
    });
  }

  /** Mark a tab as used now; creates the record when the tab is unknown and `create` is set */
  private async markUsed(tabId: number, now: number, create = false): Promise<void> {
    const updated = await tabActivityStorage.update(tabId, (record) =>
      record ? { ...record, lastActiveAt: now, estimated: undefined } : undefined,
    );
    if (updated || !create) return;
    const tab = await browser.tabs.get(tabId).catch(() => null);
    const input = tab && !tab.incognito ? toReconcileTab(tab) : null;
    if (!input) return;
    await tabActivityStorage.update(tabId, (record) =>
      record ? { ...record, lastActiveAt: now, estimated: undefined } : createActivityRecord(input, now),
    );
  }

  /** Claim a previous-session record for a tab restored after the start-up reconcile */
  private async claimFromPool(tab: ReconcileTab): Promise<TabActivityRecord | null> {
    if (Date.now() > this.poolUntil) return null;
    const pool = await tabSessionStorage.get<ReconcilePool | null>(RECONCILE_POOL_KEY, null);
    if (!pool || pool.until < Date.now()) return null;
    const candidates = pool.records
      .filter((record) => record.url === tab.url)
      .sort((a, b) => Math.abs(a.index - tab.index) - Math.abs(b.index - tab.index));
    const match = candidates[0];
    if (!match) return null;
    await tabSessionStorage.set(RECONCILE_POOL_KEY, {
      ...pool,
      records: pool.records.filter((record) => record !== match && record.tabId !== match.tabId),
    } satisfies ReconcilePool);
    const now = Date.now();
    return {
      ...match,
      tabId: tab.tabId,
      windowId: tab.windowId,
      index: tab.index,
      firstSeenAt: Math.min(match.firstSeenAt, now),
      lastActiveAt: Math.min(match.lastActiveAt, now),
    };
  }

  async handleCreated(tab: Browser.tabs.Tab): Promise<void> {
    await this.initialize();
    if (!(await this.isTracking()) || tab.incognito) return;
    if (!(await this.isNormalWindow(tab.windowId))) return;
    const input = toReconcileTab(tab);
    if (!input) return;
    const now = Date.now();
    const inherited = await this.claimFromPool(input);
    const relock = await this.claimPendingLock(input.url);

    await tabActivityStorage.update(input.tabId, (record) => {
      if (record) return relock && !record.locked ? { ...record, locked: true } : undefined;
      // Opened in the background and never looked at still counts from now
      const created = inherited ?? createActivityRecord(input, now);
      return relock ? { ...created, locked: true } : created;
    });
    if (relock) await this.refreshLockedUrls();
    if (tab.active) await this.handleActivated({ tabId: input.tabId, windowId: input.windowId });
  }

  /** Each pending lock goes to the first tab that comes back with its URL */
  private async claimPendingLock(url: string): Promise<boolean> {
    const pending = await tabSessionStorage.get<string[]>(PENDING_LOCKS_KEY, []);
    if (!pending.includes(url)) return false;
    await tabSessionStorage.set(
      PENDING_LOCKS_KEY,
      pending.filter((item) => item !== url),
    );
    return true;
  }

  async handleActivated(info: { tabId: number; windowId: number }): Promise<void> {
    await this.initialize();
    if (!(await this.isTracking())) return;
    if (!(await this.isNormalWindow(info.windowId))) return;
    const now = Date.now();
    const previous = await tabSessionStorage.getActiveTab(info.windowId);
    if (previous != null && previous !== info.tabId) {
      // Switching away: the previous tab was in use until now
      await this.markUsed(previous, now);
    }
    await this.markUsed(info.tabId, now, true);
    await tabSessionStorage.setActiveTab(info.windowId, info.tabId);
    await this.recordUsageDay(now);
  }

  async handleUpdated(
    tabId: number,
    changeInfo: Browser.tabs.OnUpdatedInfo,
    tab: Browser.tabs.Tab,
  ): Promise<void> {
    if (changeInfo.url === undefined && changeInfo.audible === undefined) return;
    await this.initialize();
    if (!(await this.isTracking()) || tab.incognito) return;
    if (!(await this.isNormalWindow(tab.windowId))) return;
    const now = Date.now();

    if (changeInfo.url !== undefined) {
      const url = normalizeTabUrl(changeInfo.url) ?? changeInfo.url;
      let lockedChanged = false;
      const input = toReconcileTab(tab);
      const inherited =
        input && Date.now() <= this.poolUntil && (await tabActivityStorage.get(tabId))?.estimated
          ? await this.claimFromPool({ ...input, url })
          : null;
      await tabActivityStorage.update(tabId, (record) => {
        if (!record) return input ? (inherited ?? createActivityRecord({ ...input, url }, now)) : undefined;
        lockedChanged = !!record.locked && record.url !== url;
        const base = inherited ?? record;
        // Navigating the current tab is use; background redirects and reloads are not
        return tab.active
          ? { ...base, url, lastActiveAt: now, estimated: undefined }
          : { ...base, url };
      });
      if (lockedChanged) await this.refreshLockedUrls();
      if (tab.active) await this.recordUsageDay(now);
    }

    if (changeInfo.audible !== undefined) {
      // Either way the tab was playing sound until now
      await tabActivityStorage.update(tabId, (record) =>
        record ? { ...record, lastAudibleAt: now } : undefined,
      );
    }
  }

  async handleRemoved(
    tabId: number,
    removeInfo: { windowId: number; isWindowClosing: boolean },
  ): Promise<void> {
    await this.initialize();
    if ((await tabSessionStorage.getActiveTab(removeInfo.windowId)) === tabId) {
      await tabSessionStorage.clearActiveTab(removeInfo.windowId);
    }
    // A closing window may be the browser quitting: keep the records so the next
    // start-up can carry idle time and locks over. Leftovers are cleaned by the sweep.
    if (removeInfo.isWindowClosing) return;
    const record = await tabActivityStorage.get(tabId);
    if (!record) return;
    await tabActivityStorage.delete(tabId);
    if (record.locked) await this.refreshLockedUrls();
  }

  async handleReplaced(addedTabId: number, removedTabId: number): Promise<void> {
    await this.initialize();
    const record = await tabActivityStorage.get(removedTabId);
    if (!record) return;
    await tabActivityStorage.delete(removedTabId);
    await tabActivityStorage.put({ ...record, tabId: addedTabId });
    if ((await tabSessionStorage.getActiveTab(record.windowId)) === removedTabId) {
      await tabSessionStorage.setActiveTab(record.windowId, addedTabId);
    }
  }

  async handleAttached(
    tabId: number,
    attachInfo: { newWindowId: number; newPosition: number },
  ): Promise<void> {
    await this.initialize();
    if (!(await this.isTracking())) return;
    if (!(await this.isNormalWindow(attachInfo.newWindowId))) {
      await tabActivityStorage.delete(tabId);
      return;
    }
    await tabActivityStorage.update(tabId, (record) => {
      if (record) {
        return { ...record, windowId: attachInfo.newWindowId, index: attachInfo.newPosition };
      }
      return undefined;
    });
  }

  async handleWindowFocusChanged(windowId: number): Promise<void> {
    await this.initialize();
    if (!(await this.isTracking())) return;
    const now = Date.now();
    const previousWindow = await tabSessionStorage.getFocusedWindow();
    if (previousWindow != null && previousWindow !== windowId) {
      const previousTab = await tabSessionStorage.getActiveTab(previousWindow);
      if (previousTab != null) await this.markUsed(previousTab, now);
    }

    if (!(await this.isNormalWindow(windowId))) {
      await tabSessionStorage.setFocusedWindow(null);
      return;
    }
    await tabSessionStorage.setFocusedWindow(windowId);

    let activeTabId = await tabSessionStorage.getActiveTab(windowId);
    if (activeTabId == null) {
      const [active] = await browser.tabs.query({ active: true, windowId }).catch(() => []);
      activeTabId = active?.id ?? null;
      if (activeTabId != null) await tabSessionStorage.setActiveTab(windowId, activeTabId);
    }
    if (activeTabId != null) await this.markUsed(activeTabId, now, true);
    await this.recordUsageDay(now);
  }

  async setLocked(tabIds: readonly number[], locked: boolean): Promise<void> {
    await this.initialize();
    const tabs = await Promise.all(tabIds.map((id) => browser.tabs.get(id).catch(() => null)));
    const now = Date.now();
    for (const tab of tabs) {
      if (!tab?.id) continue;
      const input = toReconcileTab(tab);
      await tabActivityStorage.update(tab.id, (record) => {
        if (record) return { ...record, locked: locked || undefined };
        if (!input || !locked) return undefined;
        return createActivityRecord(input, now, { estimated: true, locked: true });
      });
    }
    await this.refreshLockedUrls();
  }

  /** Reset the idle timer of tabs ("renew") */
  async renew(tabIds: readonly number[]): Promise<void> {
    await this.initialize();
    const now = Date.now();
    await tabActivityStorage.updateMany(tabIds, (record) =>
      record ? { ...record, lastActiveAt: now, estimated: undefined } : undefined,
    );
  }

  /** Turning tracking off stops recording and wipes what was recorded */
  async clearAll(): Promise<void> {
    await tabActivityStorage.clear();
    await tabLifecycleStateStorage.update((state) => ({
      ...state,
      usageDays: [],
      lockedUrls: [],
      trackingStartedAt: undefined,
    }));
    await tabSessionStorage.setPendingConfirm([]);
    await tabSessionStorage.remove(PENDING_LOCKS_KEY);
    this.lastUsageDayKey = null;
    this.ready = null;
    this.pointersStale = true;
  }
}

export const tabActivityService = new TabActivityService();
