/**
 * Builds the open tabs snapshot shared by the tab center, the popup card, the budget
 * and the auto archive sweep. Pure: every input is passed in, so the sweep decisions
 * are fully unit-testable.
 */
import type {
  OpenTabInfo,
  OpenTabsSnapshot,
  OpenTabsWindowInfo,
  PendingArchiveConfirmation,
  TabActivityRecord,
  TabLifecycleLocalState,
  TabLifecycleSettings,
} from "@/types";
import { computeBudgetStatus } from "./tab-budget.utils";
import { buildTabDuplicateGroups, normalizeTabUrl } from "./tab-duplicates.utils";
import {
  estimateExpiryAt,
  evaluateIdle,
  getIdleState,
  IDLE_DISPLAY_MS,
} from "./tab-idle.utils";
import { getPendingConsents, isAutoArchiveEffective } from "./tab-lifecycle-settings.utils";
import { getProtectionReasons } from "./tab-protection.utils";
import { canReopenUrl, getDomainFromUrl } from "./tab-archive.utils";

/** Fields read from browser tabs; matches browser.tabs.Tab structurally */
export interface RawTab {
  id?: number;
  windowId?: number;
  index?: number;
  url?: string;
  pendingUrl?: string;
  title?: string;
  favIconUrl?: string;
  pinned?: boolean;
  active?: boolean;
  audible?: boolean;
  discarded?: boolean;
  status?: string;
  groupId?: number;
  incognito?: boolean;
  lastAccessed?: number;
}

export interface RawTabGroup {
  id: number;
  title?: string;
  color?: string;
}

export interface SnapshotInput {
  /** Tabs of normal, non-incognito windows */
  tabs: readonly RawTab[];
  focusedWindowId?: number;
  lastFocusedWindowId?: number;
  records: ReadonlyMap<number, TabActivityRecord>;
  groups: ReadonlyMap<number, RawTabGroup>;
  settings: TabLifecycleSettings;
  state: TabLifecycleLocalState;
  busyTabIds?: ReadonlySet<number>;
  dirtyTabIds?: ReadonlySet<number>;
  bulkOpenedTabIds?: ReadonlySet<number>;
  pendingConfirm?: readonly PendingArchiveConfirmation[];
  /** Group titles of Tab grouping rules that protect their tabs (see normalizeGroupTitle) */
  protectedGroupTitles?: ReadonlySet<string>;
  now: number;
}

const TAB_GROUP_ID_NONE = -1;

/** Group titles are compared trimmed and case-insensitively */
export function normalizeGroupTitle(title: string | undefined): string {
  return (title ?? "").trim().toLowerCase();
}

export function getTabUrl(tab: RawTab): string {
  return tab.url || tab.pendingUrl || "";
}

export function getTabGroupId(tab: RawTab): number | undefined {
  return typeof tab.groupId === "number" && tab.groupId !== TAB_GROUP_ID_NONE
    ? tab.groupId
    : undefined;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function buildOpenTabsSnapshot(input: SnapshotInput): OpenTabsSnapshot {
  const { settings, state, now } = input;
  const rule = settings.autoArchive;
  const autoArchiveActive = isAutoArchiveEffective(settings, state);
  const baselineAt = autoArchiveActive ? state.autoArchiveBaselineAt : undefined;
  const busy = input.busyTabIds ?? new Set<number>();
  const dirty = input.dirtyTabIds ?? new Set<number>();
  const bulkOpened = input.bulkOpenedTabIds ?? new Set<number>();
  const protectedGroupTitles = input.protectedGroupTitles ?? new Set<string>();

  const tabs = input.tabs.filter(
    (tab): tab is RawTab & { id: number; windowId: number } =>
      typeof tab.id === "number" && typeof tab.windowId === "number" && !tab.incognito,
  );

  const infos: OpenTabInfo[] = tabs.map((tab) => {
    const url = getTabUrl(tab);
    const normalizedUrl = normalizeTabUrl(url) ?? url;
    const record = input.records.get(tab.id);
    const lastActiveAt = Math.min(record?.lastActiveAt ?? now, now);
    const firstSeenAt = Math.min(record?.firstSeenAt ?? now, now);
    const estimated = !record || !!record.estimated;
    const browserLastAccessed =
      typeof tab.lastAccessed === "number" && tab.lastAccessed > 0
        ? Math.min(tab.lastAccessed, now)
        : undefined;
    // tab.lastAccessed is only a hint for display, never a reason to close a tab
    const displayLastActiveAt =
      tab.active
        ? now
        : estimated && browserLastAccessed != null
          ? Math.min(lastActiveAt, browserLastAccessed)
          : lastActiveAt;
    const groupId = getTabGroupId(tab);
    const group = groupId != null ? input.groups.get(groupId) : undefined;

    const protection = getProtectionReasons(
      {
        pinned: !!tab.pinned,
        active: !!tab.active,
        locked: !!record?.locked,
        saving: busy.has(tab.id),
        audible: !!tab.audible,
        lastAudibleAt: record?.lastAudibleAt,
        grouped: groupId != null,
        protectedGroup:
          !!group?.title && protectedGroupTitles.has(normalizeGroupTitle(group.title)),
        dirtyForm: dirty.has(tab.id),
        hostname: getHostname(url),
      },
      {
        protectAudible: rule.protectAudible,
        protectGrouped: rule.protectGrouped,
        protectDirtyForms: rule.protectDirtyForms,
        protectedDomains: rule.protectedDomains,
        now,
      },
    );

    let idleState: OpenTabInfo["idleState"];
    let archiveAt: number | undefined;
    let remainingUsageDays: number | undefined;
    if (autoArchiveActive && !tab.active) {
      const evaluation = evaluateIdle({
        lastActiveAt: Math.max(lastActiveAt, baselineAt ?? 0),
        now,
        threshold: rule.idleThreshold,
        countBy: rule.countBy,
        usageDays: state.usageDays,
      });
      idleState = getIdleState(evaluation);
      archiveAt = estimateExpiryAt(evaluation, now);
      remainingUsageDays = evaluation.remainingUsageDays;
    } else {
      idleState = now - displayLastActiveAt >= IDLE_DISPLAY_MS ? "idle" : "fresh";
    }

    const staleEvaluation = evaluateIdle({
      lastActiveAt: displayLastActiveAt,
      now,
      threshold: rule.idleThreshold,
      // Without real observations usage days mean nothing yet
      countBy: estimated ? "calendar" : rule.countBy,
      usageDays: state.usageDays,
    });

    return {
      tabId: tab.id,
      windowId: tab.windowId,
      index: tab.index ?? 0,
      title: tab.title || url || "",
      url,
      normalizedUrl,
      domain: getDomainFromUrl(url),
      favicon: tab.favIconUrl || undefined,
      pinned: !!tab.pinned,
      active: !!tab.active,
      audible: !!tab.audible,
      discarded: !!tab.discarded,
      loading: tab.status === "loading",
      groupId,
      groupTitle: group?.title,
      groupColor: group?.color,
      firstSeenAt,
      lastActiveAt,
      displayLastActiveAt,
      activityEstimated: estimated,
      locked: !!record?.locked,
      protection,
      idleState,
      archiveAt: protection.length === 0 ? archiveAt : undefined,
      remainingUsageDays,
      stale: !tab.active && staleEvaluation.expired,
      redundantDuplicate: false,
      bulkOpened: bulkOpened.has(tab.id),
    };
  });

  const duplicateGroups = buildTabDuplicateGroups(
    infos.map((tab) => ({
      tabId: tab.tabId,
      url: tab.url,
      lastActiveAt: tab.displayLastActiveAt,
      active: tab.active,
      pinned: tab.pinned,
      protected: tab.protection.length > 0,
    })),
  );
  const infoById = new Map(infos.map((tab) => [tab.tabId, tab]));
  let redundantDuplicates = 0;
  for (const group of duplicateGroups) {
    const redundant = new Set(group.redundantTabIds);
    for (const tabId of group.tabIds) {
      const info = infoById.get(tabId);
      if (!info) continue;
      info.duplicateGroupId = group.id;
      info.duplicateCount = group.tabIds.length;
      info.redundantDuplicate = redundant.has(tabId);
      if (info.redundantDuplicate) redundantDuplicates += 1;
    }
  }

  const windowIds = Array.from(new Set(infos.map((tab) => tab.windowId))).sort(
    (a, b) => a - b,
  );
  const windows: OpenTabsWindowInfo[] = windowIds.map((windowId, order) => {
    const windowTabs = infos.filter((tab) => tab.windowId === windowId);
    return {
      windowId,
      order,
      focused: windowId === input.focusedWindowId,
      tabCount: windowTabs.length,
      countedTabCount: windowTabs.filter((tab) => !tab.pinned).length,
    };
  });

  const budget = computeBudgetStatus({
    enabled: settings.budget.enabled,
    limit: settings.budget.limit,
    scope: settings.budget.scope,
    windows: windows.map((window) => ({
      windowId: window.windowId,
      counted: window.countedTabCount,
      focused: window.focused,
    })),
    lastFocusedWindowId: input.lastFocusedWindowId,
  });

  const consents = getPendingConsents(settings, state);
  const openIds = new Set(infos.map((tab) => tab.tabId));

  return {
    generatedAt: now,
    tabs: infos,
    windows,
    budget,
    stats: {
      total: infos.length,
      counted: infos.filter((tab) => !tab.pinned).length,
      pinned: infos.filter((tab) => tab.pinned).length,
      protected: infos.filter((tab) => tab.protection.length > 0).length,
      expiring: infos.filter(
        (tab) => tab.idleState === "expiring" && tab.protection.length === 0,
      ).length,
      expired: infos.filter(
        (tab) => tab.idleState === "expired" && tab.protection.length === 0,
      ).length,
      // Only tabs the user can act on: protected ones never leave automatically anyway
      stale: infos.filter((tab) => tab.stale && tab.protection.length === 0).length,
      duplicateGroups: duplicateGroups.length,
      redundantDuplicates,
    },
    autoArchive: {
      enabled: settings.activityTracking && rule.enabled,
      active: autoArchiveActive,
      needsConsent: consents.autoArchive,
      mode: rule.mode,
      threshold: rule.idleThreshold,
      countBy: rule.countBy,
      baselineAt,
    },
    activityTracking: settings.activityTracking,
    pendingConfirm: (input.pendingConfirm ?? []).filter((item) => openIds.has(item.tabId)),
  };
}

/**
 * Tabs the sweep may archive: expired, unprotected, least recently used first,
 * at most `max`, and never below the "keep at least N tabs" setting.
 */
export function selectSweepCandidates(
  snapshot: OpenTabsSnapshot,
  settings: TabLifecycleSettings,
  max: number,
): OpenTabInfo[] {
  if (!snapshot.autoArchive.active) return [];
  const minOpenTabs = settings.autoArchive.minOpenTabs;
  const allowance =
    minOpenTabs > 0 ? Math.max(0, snapshot.stats.counted - minOpenTabs) : Number.POSITIVE_INFINITY;
  const limit = Math.min(max, allowance);
  if (limit <= 0) return [];

  return snapshot.tabs
    .filter(
      (tab) =>
        tab.idleState === "expired" && tab.protection.length === 0 && canReopenUrl(tab.url),
    )
    .sort(
      (a, b) =>
        Math.max(a.lastActiveAt, snapshot.autoArchive.baselineAt ?? 0) -
          Math.max(b.lastActiveAt, snapshot.autoArchive.baselineAt ?? 0) || a.tabId - b.tabId,
    )
    .slice(0, limit);
}

/** Least recently used tabs first; the current tab of each window last */
export function sortTabsByLeastRecentlyUsed(tabs: readonly OpenTabInfo[]): OpenTabInfo[] {
  return [...tabs].sort(
    (a, b) =>
      Number(a.active) - Number(b.active) ||
      a.displayLastActiveAt - b.displayLastActiveAt ||
      a.tabId - b.tabId,
  );
}
