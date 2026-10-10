import { describe, expect, it } from "vitest";
import type { TabActivityRecord, TabLifecycleLocalState, TabLifecycleSettings } from "@/types";
import {
  DEFAULT_TAB_LIFECYCLE_SETTINGS,
  DEFAULT_TAB_LIFECYCLE_STATE,
  applyTabLifecycleSettingsPatch,
  getPendingConsents,
  isAutoArchiveEffective,
  normalizeTabLifecycleSettings,
} from "../tab-lifecycle-settings.utils";
import {
  buildOpenTabsSnapshot,
  selectSweepCandidates,
  type RawTab,
} from "../tab-snapshot.utils";
import { toLocalDateKey } from "../usage-days.utils";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 5, 20, 12, 0).getTime();

function settingsWith(patch: Parameters<typeof applyTabLifecycleSettingsPatch>[1]): TabLifecycleSettings {
  return applyTabLifecycleSettingsPatch(DEFAULT_TAB_LIFECYCLE_SETTINGS, patch, NOW);
}

const everyDay = Array.from({ length: 40 }, (_, i) => toLocalDateKey(NOW - i * DAY));

function stateWith(patch: Partial<TabLifecycleLocalState> = {}): TabLifecycleLocalState {
  return {
    ...DEFAULT_TAB_LIFECYCLE_STATE,
    usageDays: [...everyDay].sort(),
    autoArchiveConsent: true,
    autoArchiveBaselineAt: NOW - 60 * DAY,
    autoArchiveActive: true,
    ...patch,
  };
}

function rawTab(id: number, patch: Partial<RawTab> = {}): RawTab {
  return {
    id,
    windowId: 1,
    index: id,
    url: `https://site${id}.com/`,
    title: `Tab ${id}`,
    pinned: false,
    active: false,
    audible: false,
    ...patch,
  };
}

function records(entries: Array<[number, number, Partial<TabActivityRecord>?]>): Map<number, TabActivityRecord> {
  return new Map(
    entries.map(([tabId, idleDays, patch]) => [
      tabId,
      {
        tabId,
        windowId: 1,
        index: tabId,
        url: `https://site${tabId}.com`,
        firstSeenAt: NOW - 90 * DAY,
        lastActiveAt: NOW - idleDays * DAY,
        ...patch,
      },
    ]),
  );
}

const enabled = settingsWith({ autoArchive: { enabled: true } });

describe("settings", () => {
  it("defaults to everything off except local activity tracking", () => {
    const settings = normalizeTabLifecycleSettings(undefined);
    expect(settings.activityTracking).toBe(true);
    expect(settings.autoArchive.enabled).toBe(false);
    expect(settings.budget.enabled).toBe(false);
    expect(settings.autoArchive.idleThreshold).toEqual({ value: 7, unit: "day" });
    expect(settings.budget.limit).toBe(15);
    expect(settings.readLater.expireAfterDays).toBe(30);
  });

  it("falls back to safe values for malformed input", () => {
    const settings = normalizeTabLifecycleSettings({
      autoArchive: { enabled: "yes", idleThreshold: { value: 2, unit: "day" }, protectedDomains: ["*.Slack.com", 3, "bad domain"] },
      budget: { limit: 1000, overBudgetAction: "explode" },
      archive: { retentionDays: 45 },
    });
    expect(settings.autoArchive.enabled).toBe(false);
    expect(settings.autoArchive.idleThreshold).toEqual({ value: 7, unit: "day" });
    expect(settings.autoArchive.protectedDomains).toEqual(["slack.com"]);
    expect(settings.budget.limit).toBe(100);
    expect(settings.budget.overBudgetAction).toBe("nudge");
    expect(settings.archive.retentionDays).toBe(90);
  });

  it("never runs auto archive without this device's consent", () => {
    expect(isAutoArchiveEffective(enabled, { autoArchiveConsent: false })).toBe(false);
    expect(isAutoArchiveEffective(enabled, { autoArchiveConsent: true })).toBe(true);
    expect(getPendingConsents(enabled, { autoArchiveConsent: false, autoMakeRoomConsent: false }).autoArchive).toBe(true);
    const trackingOff = settingsWith({ activityTracking: false, autoArchive: { enabled: true } });
    expect(isAutoArchiveEffective(trackingOff, { autoArchiveConsent: true })).toBe(false);
  });
});

describe("buildOpenTabsSnapshot / sweep candidates", () => {
  it("never selects pinned, current or locked tabs, whatever the mode", () => {
    const snapshot = buildOpenTabsSnapshot({
      tabs: [
        rawTab(1, { pinned: true }),
        rawTab(2, { active: true }),
        rawTab(3),
        rawTab(4),
      ],
      records: records([[1, 30], [2, 30], [3, 30, { locked: true }], [4, 30]]),
      groups: new Map(),
      settings: enabled,
      state: stateWith(),
      now: NOW,
    });
    expect(selectSweepCandidates(snapshot, enabled, 30).map((tab) => tab.tabId)).toEqual([4]);
    expect(snapshot.tabs.find((tab) => tab.tabId === 3)!.protection).toEqual(["locked"]);
    expect(snapshot.stats.protected).toBe(3);
  });

  it("leaves pages open that the archive could not open again", () => {
    const snapshot = buildOpenTabsSnapshot({
      tabs: [
        rawTab(1, { url: "file:///Users/me/paper.pdf" }),
        rawTab(2, { url: "about:preferences" }),
        rawTab(3),
      ],
      records: records([
        [1, 30, { url: "file:///Users/me/paper.pdf" }],
        [2, 30, { url: "about:preferences" }],
        [3, 30],
      ]),
      groups: new Map(),
      settings: enabled,
      state: stateWith(),
      now: NOW,
    });
    expect(snapshot.tabs.filter((tab) => tab.idleState === "expired")).toHaveLength(3);
    expect(selectSweepCandidates(snapshot, enabled, 30).map((tab) => tab.tabId)).toEqual([3]);
  });

  it("does not archive anything before consent, even when settings say on", () => {
    const snapshot = buildOpenTabsSnapshot({
      tabs: [rawTab(1), rawTab(2, { active: true })],
      records: records([[1, 30]]),
      groups: new Map(),
      settings: enabled,
      state: stateWith({ autoArchiveConsent: false }),
      now: NOW,
    });
    expect(snapshot.autoArchive).toMatchObject({ active: false, needsConsent: true });
    expect(selectSweepCandidates(snapshot, enabled, 30)).toEqual([]);
  });

  it("counts idle time from the baseline, so turning it on is not retroactive", () => {
    const snapshot = buildOpenTabsSnapshot({
      tabs: [rawTab(1), rawTab(2, { active: true })],
      records: records([[1, 60]]),
      groups: new Map(),
      settings: enabled,
      state: stateWith({ autoArchiveBaselineAt: NOW - 2 * DAY }),
      now: NOW,
    });
    expect(selectSweepCandidates(snapshot, enabled, 30)).toEqual([]);
    // Still reported as stale so the user can tidy up by hand
    expect(snapshot.tabs[0].stale).toBe(true);
  });

  it("archives at most the cap, least recently used first", () => {
    const tabs = Array.from({ length: 40 }, (_, i) => rawTab(i + 1));
    const snapshot = buildOpenTabsSnapshot({
      tabs: [...tabs, rawTab(99, { active: true })],
      records: records(tabs.map((tab, i) => [tab.id!, 10 + i] as [number, number])),
      groups: new Map(),
      settings: enabled,
      state: stateWith(),
      now: NOW,
    });
    const selected = selectSweepCandidates(snapshot, enabled, 30);
    expect(selected).toHaveLength(30);
    expect(selected[0].tabId).toBe(40);
  });

  it("keeps the configured minimum number of tabs open", () => {
    const settings = settingsWith({ autoArchive: { enabled: true, minOpenTabs: 3 } });
    const snapshot = buildOpenTabsSnapshot({
      tabs: [rawTab(1), rawTab(2), rawTab(3), rawTab(4, { active: true })],
      records: records([[1, 30], [2, 30], [3, 30]]),
      groups: new Map(),
      settings,
      state: stateWith(),
      now: NOW,
    });
    expect(selectSweepCandidates(snapshot, settings, 30)).toHaveLength(1);
  });

  it("protects audible, grouped and protected-domain tabs when configured", () => {
    const settings = settingsWith({
      autoArchive: { enabled: true, protectGrouped: true, protectedDomains: ["site3.com"] },
    });
    const snapshot = buildOpenTabsSnapshot({
      tabs: [
        rawTab(1, { audible: true }),
        rawTab(2, { groupId: 5 }),
        rawTab(3),
        rawTab(4),
        rawTab(9, { active: true }),
      ],
      records: records([[1, 30], [2, 30], [3, 30], [4, 30]]),
      groups: new Map([[5, { id: 5, title: "Work", color: "blue" }]]),
      settings,
      state: stateWith(),
      now: NOW,
    });
    expect(selectSweepCandidates(snapshot, settings, 30).map((tab) => tab.tabId)).toEqual([4]);
    expect(snapshot.tabs.find((tab) => tab.tabId === 2)).toMatchObject({ groupTitle: "Work" });
  });

  it("protects only the groups of protected grouping rules", () => {
    const settings = settingsWith({ autoArchive: { enabled: true } });
    const snapshot = buildOpenTabsSnapshot({
      tabs: [rawTab(1, { groupId: 5 }), rawTab(2, { groupId: 6 }), rawTab(9, { active: true })],
      records: records([[1, 30], [2, 30]]),
      groups: new Map([
        [5, { id: 5, title: " Work ", color: "blue" }],
        [6, { id: 6, title: "News", color: "red" }],
      ]),
      protectedGroupTitles: new Set(["work"]),
      settings,
      state: stateWith(),
      now: NOW,
    });
    expect(selectSweepCandidates(snapshot, settings, 30).map((tab) => tab.tabId)).toEqual([2]);
    expect(snapshot.tabs.find((tab) => tab.tabId === 1)?.protection).toEqual(["grouped"]);
  });

  it("treats tabs without a record as just used and only uses lastAccessed for display", () => {
    const snapshot = buildOpenTabsSnapshot({
      tabs: [rawTab(1, { lastAccessed: NOW - 20 * DAY }), rawTab(2, { active: true })],
      records: new Map(),
      groups: new Map(),
      settings: enabled,
      state: stateWith(),
      now: NOW,
    });
    const [tab] = snapshot.tabs;
    expect(tab.lastActiveAt).toBe(NOW);
    expect(tab.displayLastActiveAt).toBe(NOW - 20 * DAY);
    expect(tab.activityEstimated).toBe(true);
    expect(selectSweepCandidates(snapshot, enabled, 30)).toEqual([]);
  });

  it("reports duplicates, budget and stats", () => {
    const settings = settingsWith({ budget: { enabled: true, limit: 5 } });
    const snapshot = buildOpenTabsSnapshot({
      tabs: [
        rawTab(1, { url: "https://dup.com/a" }),
        rawTab(2, { url: "https://dup.com/a/" }),
        rawTab(3, { pinned: true }),
        rawTab(4),
        rawTab(5),
        rawTab(6),
        rawTab(7, { active: true, windowId: 2 }),
      ],
      records: records([[1, 3], [2, 1], [4, 1], [5, 1], [6, 1]]),
      groups: new Map(),
      settings,
      state: stateWith(),
      focusedWindowId: 2,
      now: NOW,
    });
    expect(snapshot.stats.duplicateGroups).toBe(1);
    expect(snapshot.tabs.find((tab) => tab.tabId === 1)!.redundantDuplicate).toBe(true);
    expect(snapshot.tabs.find((tab) => tab.tabId === 2)!.redundantDuplicate).toBe(false);
    expect(snapshot.budget).toMatchObject({ count: 6, over: 1, level: "over" });
    expect(snapshot.windows.map((window) => window.focused)).toEqual([false, true]);
  });
});
