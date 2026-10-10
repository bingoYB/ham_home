/**
 * Tab lifecycle orchestration.
 *
 * - getSnapshot(): the open tabs with activity, protection, idle and duplicate state.
 *   Read-only and usable from the background and from extension pages (tab center,
 *   popup), which share the IndexedDB origin with the background.
 * - runSweep(): the 30-minute auto archive check (background only).
 * - consent: automatic closing only starts after the user turned it on on this
 *   device; synced settings alone never start it, and turning it on is not
 *   retroactive (idle time counts from that moment).
 */
import { browser, type Browser } from "wxt/browser";
import { tabActivityStorage } from "@/lib/storage/tab-activity-storage";
import { tabGroupRulesStorage } from "@/lib/storage/tab-group-rules-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabLifecycleStateStorage } from "@/lib/storage/tab-lifecycle-state-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { SWEEP_MAX_ARCHIVE } from "@/lib/tabs/tab-archive.utils";
import { normalizeTabUrl } from "@/lib/tabs/tab-duplicates.utils";
import {
  isAutoArchiveEffective,
} from "@/lib/tabs/tab-lifecycle-settings.utils";
import {
  buildOpenTabsSnapshot,
  normalizeGroupTitle,
  selectSweepCandidates,
  type RawTabGroup,
} from "@/lib/tabs/tab-snapshot.utils";
import type { ReconcileTab } from "@/lib/tabs/tab-reconcile.utils";
import { toLocalDateKey } from "@/lib/tabs/usage-days.utils";
import type {
  OpenTabsSnapshot,
  TabLifecycleSettings,
  TabLifecycleSettingsPatch,
  TabLifecycleSweepSummary,
} from "@/types";
import { tabActivityService } from "./tab-activity-service";
import { tabArchiveService } from "./tab-archive-service";
import { tabBadgeService } from "./tab-badge-service";
import { tabContentService } from "./tab-content-service";

/** No automatic archiving right after the browser started */
export const STARTUP_GRACE_MS = 15 * 60 * 1000;

interface TabGroupsQueryApi {
  query(query: Record<string, never>): Promise<RawTabGroup[]>;
}

async function queryTabGroups(): Promise<Map<number, RawTabGroup>> {
  const api = (browser as unknown as { tabGroups?: TabGroupsQueryApi }).tabGroups;
  if (!api?.query) return new Map();
  try {
    const groups = await api.query({});
    return new Map(groups.map((group) => [group.id, group]));
  } catch {
    return new Map();
  }
}

class TabLifecycleService {
  /** One windows.getAll call gives every normal window with its tabs */
  async loadNormalTabs(): Promise<{
    tabs: Browser.tabs.Tab[];
    focusedWindowId?: number;
  }> {
    const windows = await browser.windows.getAll({ populate: true, windowTypes: ["normal"] });
    const normal = windows.filter((window) => !window.incognito);
    return {
      tabs: normal.flatMap((window) => window.tabs ?? []),
      focusedWindowId: normal.find((window) => window.focused)?.id,
    };
  }

  async getSnapshot(): Promise<OpenTabsSnapshot> {
    const now = Date.now();
    const [
      { tabs, focusedWindowId },
      groups,
      settings,
      state,
      busyTabIds,
      bulk,
      pendingConfirm,
      lastFocusedWindowId,
      groupRules,
    ] = await Promise.all([
      this.loadNormalTabs(),
      queryTabGroups(),
      tabLifecycleConfigStorage.getSettings(),
      tabLifecycleStateStorage.get(),
      tabSessionStorage.getBusyTabIds(now),
      tabSessionStorage.getBulkOpened(now),
      tabSessionStorage.getPendingConfirm(),
      tabSessionStorage.getLastFocusedWindow(),
      tabGroupRulesStorage.getRules().catch(() => []),
    ]);
    const records = settings.activityTracking
      ? await tabActivityStorage.getMap()
      : new Map();

    return buildOpenTabsSnapshot({
      tabs,
      focusedWindowId,
      lastFocusedWindowId: lastFocusedWindowId ?? undefined,
      records,
      groups,
      settings,
      state,
      busyTabIds,
      bulkOpenedTabIds: bulk.tabIds,
      pendingConfirm,
      protectedGroupTitles: new Set(
        groupRules
          .filter((rule) => rule.enabled && rule.protectTabs)
          .map((rule) => normalizeGroupTitle(rule.groupTitle)),
      ),
      now,
    });
  }

  /**
   * Pick tabs with `select`, leaving out tabs with unsubmitted input. The content
   * script of every picked tab is asked; when one is dirty, `select` runs again
   * without it, and the tabs that take its place are asked as well.
   */
  async pickWithoutDirtyForms<T extends { tabId: number }>(
    select: (dirty: ReadonlySet<number>) => T[],
  ): Promise<T[]> {
    const dirty = new Set<number>();
    const asked = new Set<number>();
    for (;;) {
      const picked = select(dirty);
      const unasked = picked.filter((tab) => !asked.has(tab.tabId));
      if (unasked.length === 0) return picked;
      await Promise.all(
        unasked.map(async (tab) => {
          asked.add(tab.tabId);
          if (await tabContentService.hasDirtyForm(tab.tabId)) dirty.add(tab.tabId);
        }),
      );
    }
  }

  /**
   * The tabs, chosen earlier (a confirmation list, a suggestion), that may still be
   * closed now: unprotected in a fresh snapshot, still expired when `expiredOnly` is
   * set, and without unsubmitted input when that protection is on.
   */
  async filterStillArchivable(
    tabIds: readonly number[],
    options: { expiredOnly?: boolean; snapshot?: OpenTabsSnapshot } = {},
  ): Promise<number[]> {
    const wanted = new Set(tabIds);
    if (wanted.size === 0) return [];
    const [snapshot, settings] = await Promise.all([
      options.snapshot ?? this.getSnapshot(),
      tabLifecycleConfigStorage.getSettings(),
    ]);
    const eligible = snapshot.tabs.filter(
      (tab) =>
        wanted.has(tab.tabId) &&
        tab.protection.length === 0 &&
        (!options.expiredOnly || tab.idleState === "expired"),
    );
    const kept = settings.autoArchive.protectDirtyForms
      ? await this.pickWithoutDirtyForms((dirty) => eligible.filter((tab) => !dirty.has(tab.tabId)))
      : eligible;
    return kept.map((tab) => tab.tabId);
  }

  /**
   * The auto archive check. Archives at most 30 tabs per run (the rest wait for the
   * next one), never within 15 minutes after start-up, and records why it skipped.
   */
  async runSweep(now = Date.now()): Promise<TabLifecycleSweepSummary> {
    const settings = await tabLifecycleConfigStorage.getSettings();
    const summary = await this.sweep(settings, now);
    await tabLifecycleStateStorage.update((state) => ({ ...state, lastSweep: summary }));
    await tabBadgeService.refresh().catch(() => undefined);
    return summary;
  }

  private async sweep(
    settings: TabLifecycleSettings,
    now: number,
  ): Promise<TabLifecycleSweepSummary> {
    const base = { at: now, archived: 0, pendingConfirm: 0 };
    if (!settings.activityTracking) {
      await tabSessionStorage.setPendingConfirm([]);
      return { ...base, skippedReason: "tracking-off" };
    }

    await tabActivityService.initialize();
    const { tabs } = await this.loadNormalTabs();
    await tabActivityService.syncRecords(
      tabs
        .map((tab): ReconcileTab | null => {
          const url = normalizeTabUrl(tab.url || tab.pendingUrl);
          return tab.id != null && tab.windowId != null && url
            ? { tabId: tab.id, windowId: tab.windowId, index: tab.index, url }
            : null;
        })
        .filter((tab): tab is ReconcileTab => !!tab),
    );
    await this.syncAutoArchiveActivation(settings, now);

    const state = await tabLifecycleStateStorage.get();
    if (!isAutoArchiveEffective(settings, state)) {
      await tabSessionStorage.setPendingConfirm([]);
      return { ...base, skippedReason: "inactive" };
    }
    if (now - state.lastStartupAt < STARTUP_GRACE_MS) {
      return { ...base, skippedReason: "startup-grace" };
    }

    const snapshot = await this.getSnapshot();
    const pick = (dirty: ReadonlySet<number>) =>
      selectSweepCandidates(
        { ...snapshot, tabs: snapshot.tabs.filter((tab) => !dirty.has(tab.tabId)) },
        settings,
        SWEEP_MAX_ARCHIVE,
      );
    const candidates = settings.autoArchive.protectDirtyForms
      ? await this.pickWithoutDirtyForms(pick)
      : pick(new Set());

    if (candidates.length === 0) {
      await tabSessionStorage.setPendingConfirm([]);
      const keepAll =
        settings.autoArchive.minOpenTabs > 0 &&
        snapshot.stats.counted <= settings.autoArchive.minOpenTabs &&
        snapshot.stats.expired > 0;
      return keepAll ? { ...base, skippedReason: "min-open-tabs" } : base;
    }

    if (settings.autoArchive.mode === "mark-only") {
      await tabSessionStorage.setPendingConfirm([]);
      return base;
    }

    if (settings.autoArchive.mode === "confirm") {
      const pending = candidates.map((tab) => ({
        tabId: tab.tabId,
        url: tab.url,
        title: tab.title,
        lastActiveAt: tab.lastActiveAt,
      }));
      await tabSessionStorage.setPendingConfirm(pending);
      return { ...base, pendingConfirm: pending.length };
    }

    const result = await tabArchiveService.archiveTabs(
      candidates.map((tab) => tab.tabId),
      "expired",
      { automatic: true, skipProtected: true },
    );
    await tabSessionStorage.setPendingConfirm([]);
    return result.ok
      ? { ...base, archived: result.archived }
      : { ...base, error: result.error ?? "archive-failed" };
  }

  /**
   * Track the moment auto archive starts running on this device. The baseline makes
   * enabling it (here or by sync after consent) never retroactive.
   */
  async syncAutoArchiveActivation(
    settings?: TabLifecycleSettings,
    now = Date.now(),
  ): Promise<void> {
    const current = settings ?? (await tabLifecycleConfigStorage.getSettings());
    await tabLifecycleStateStorage.update((state) => {
      const active = isAutoArchiveEffective(current, state);
      if (active === state.autoArchiveActive) return state;
      return active
        ? { ...state, autoArchiveActive: true, autoArchiveBaselineAt: now }
        : { ...state, autoArchiveActive: false, autoArchiveBaselineAt: undefined };
    });
  }

  /**
   * Turn auto archive on or off from this device's UI. Turning it on records consent
   * and starts counting idle time from now; turning it off withdraws the consent, so
   * a sync or an imported backup cannot turn automatic closing back on by itself.
   */
  async setAutoArchiveEnabled(
    enabled: boolean,
    patch: TabLifecycleSettingsPatch["autoArchive"] = {},
  ): Promise<TabLifecycleSettings> {
    await tabLifecycleStateStorage.update((state) => ({ ...state, autoArchiveConsent: enabled }));
    const settings = await tabLifecycleConfigStorage.updateSettings({
      autoArchive: { ...patch, enabled },
    });
    await this.syncAutoArchiveActivation(settings);
    if (!enabled) await tabSessionStorage.setPendingConfirm([]);
    await tabBadgeService.refresh().catch(() => undefined);
    return settings;
  }

  /** "Make room automatically" needs the same explicit, per-device opt-in (and opt-out) */
  async setOverBudgetAction(
    action: TabLifecycleSettings["budget"]["overBudgetAction"],
  ): Promise<TabLifecycleSettings> {
    await tabLifecycleStateStorage.update((state) => ({
      ...state,
      autoMakeRoomConsent: action === "auto-archive",
    }));
    return tabLifecycleConfigStorage.updateSettings({ budget: { overBudgetAction: action } });
  }

  /** Accept on this device what another device turned on */
  async acceptSyncedConsent(kind: "autoArchive" | "autoMakeRoom"): Promise<void> {
    await tabLifecycleStateStorage.update((state) =>
      kind === "autoArchive"
        ? { ...state, autoArchiveConsent: true }
        : { ...state, autoMakeRoomConsent: true },
    );
    await this.syncAutoArchiveActivation();
  }

  async setActivityTracking(enabled: boolean): Promise<void> {
    await tabLifecycleConfigStorage.updateSettings({ activityTracking: enabled });
    if (!enabled) await tabActivityService.clearAll();
    else await tabActivityService.initialize();
    await this.syncAutoArchiveActivation();
  }

  async completeOnboarding(): Promise<void> {
    await tabLifecycleStateStorage.update((state) => ({
      ...state,
      onboardingCompletedAt: state.onboardingCompletedAt ?? Date.now(),
    }));
  }

  /**
   * Confirm mode: archive the tabs waiting for confirmation. The list is from the last
   * sweep, so tabs used, renewed or protected since then are left open.
   */
  async confirmPendingArchive(tabIds?: readonly number[]): Promise<number> {
    const pending = await tabSessionStorage.getPendingConfirm();
    const selected = tabIds ? pending.filter((item) => tabIds.includes(item.tabId)) : pending;
    const archivable = await this.filterStillArchivable(
      selected.map((item) => item.tabId),
      { expiredOnly: true },
    );
    const result = await tabArchiveService.archiveTabs(archivable, "expired", {
      skipProtected: true,
    });
    const done = new Set(selected.map((item) => item.tabId));
    await tabSessionStorage.setPendingConfirm(pending.filter((item) => !done.has(item.tabId)));
    await tabBadgeService.refresh().catch(() => undefined);
    return result.archived;
  }

  /** Confirm mode: keep the tabs and restart their idle time */
  async keepPendingArchive(tabIds?: readonly number[]): Promise<void> {
    const pending = await tabSessionStorage.getPendingConfirm();
    const selected = tabIds ? pending.filter((item) => tabIds.includes(item.tabId)) : pending;
    await tabActivityService.renew(selected.map((item) => item.tabId));
    const done = new Set(selected.map((item) => item.tabId));
    await tabSessionStorage.setPendingConfirm(pending.filter((item) => !done.has(item.tabId)));
    await tabBadgeService.refresh().catch(() => undefined);
  }

  async dismissBudgetNudge(mode: "today" | "hour"): Promise<void> {
    const now = Date.now();
    await tabLifecycleStateStorage.update((state) => ({
      ...state,
      budgetNudge:
        mode === "today"
          ? { ...state.budgetNudge, dismissedDate: toLocalDateKey(now) }
          : { ...state.budgetNudge, snoozedUntil: now + 60 * 60 * 1000 },
    }));
  }

  async resumeBudgetNudge(): Promise<void> {
    await tabLifecycleStateStorage.update((state) => ({
      ...state,
      budgetNudge: { lastShownAt: state.budgetNudge.lastShownAt },
    }));
  }

  /** Switch to a tab and its window */
  async focusTab(tabId: number): Promise<void> {
    const tab = await browser.tabs.update(tabId, { active: true });
    if (tab?.windowId != null) await browser.windows.update(tab.windowId, { focused: true });
  }
}

export const tabLifecycleService = new TabLifecycleService();
