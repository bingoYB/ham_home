import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenTabInfo, OpenTabsSnapshot, TabLifecycleSettings } from "@/types";

const mocks = vi.hoisted(() => ({
  settings: {} as TabLifecycleSettings,
  dirtyTabIds: new Set<number>(),
  asked: [] as number[],
  pending: [] as { tabId: number; url: string; title: string; lastActiveAt: number }[],
  archiveTabs: vi.fn(),
  getBudgetStatus: vi.fn(),
}));

vi.mock("wxt/browser", () => ({
  browser: { windows: { getAll: vi.fn(async () => []) }, tabs: {} },
}));
vi.mock("@/lib/privacy", () => ({
  containsPrivateContent: vi.fn(async () => ({ isPrivate: false })),
}));
vi.mock("@/lib/storage/tab-lifecycle-config-storage", () => ({
  tabLifecycleConfigStorage: {
    getSettings: vi.fn(async () => mocks.settings),
    updateSettings: vi.fn(async () => mocks.settings),
  },
}));
vi.mock("@/lib/storage/tab-lifecycle-state-storage", async () => {
  const { DEFAULT_TAB_LIFECYCLE_STATE } = await import("@/lib/tabs/tab-lifecycle-settings.utils");
  const state = {
    ...DEFAULT_TAB_LIFECYCLE_STATE,
    autoArchiveConsent: true,
    autoMakeRoomConsent: true,
  };
  return {
    tabLifecycleStateStorage: {
      get: vi.fn(async () => state),
      update: vi.fn(async () => state),
    },
  };
});
vi.mock("@/lib/storage/tab-session-storage", () => ({
  tabSessionStorage: {
    getBudgetEpisode: vi.fn(async () => null),
    setBudgetEpisode: vi.fn(),
    getBulkOpened: vi.fn(async () => ({ activeUntil: 0, tabIds: new Set() })),
    getPendingConfirm: vi.fn(async () => mocks.pending),
    setPendingConfirm: vi.fn(),
  },
}));
vi.mock("@/lib/storage/tab-activity-storage", () => ({ tabActivityStorage: {} }));
vi.mock("@/lib/storage/tab-group-rules-storage", () => ({ tabGroupRulesStorage: {} }));
vi.mock("@/lib/services/tab-activity-service", () => ({
  tabActivityService: { initialize: vi.fn(), syncRecords: vi.fn() },
}));
vi.mock("@/lib/services/tab-archive-service", () => ({
  tabArchiveService: { archiveTabs: mocks.archiveTabs },
}));
vi.mock("@/lib/services/tab-badge-service", () => ({
  tabBadgeService: { getBudgetStatus: mocks.getBudgetStatus, refresh: vi.fn(async () => undefined) },
}));
vi.mock("@/lib/services/tab-content-service", () => ({
  tabContentService: {
    hasDirtyForm: vi.fn(async (tabId: number) => {
      mocks.asked.push(tabId);
      return mocks.dirtyTabIds.has(tabId);
    }),
  },
}));
vi.mock("@/lib/services/tab-feedback-service", () => ({
  tabFeedbackService: { showInActiveTab: vi.fn(async () => true) },
}));
vi.mock("@/lib/services/tab-undo-records", () => ({
  saveUndoRecord: vi.fn(async () => "undo-token"),
}));

import { DEFAULT_TAB_LIFECYCLE_SETTINGS } from "@/lib/tabs/tab-lifecycle-settings.utils";
import { tabBudgetService } from "../tab-budget-service";
import { tabLifecycleService } from "../tab-lifecycle-service";

const NOW = new Date("2026-10-03T15:00:00").getTime();
const HOUR = 60 * 60 * 1000;

/** An idle, unprotected tab last used `idleHours` ago */
function idleTab(tabId: number, windowId: number, idleHours: number): OpenTabInfo {
  return {
    tabId,
    windowId,
    title: `Tab ${tabId}`,
    url: `https://site${tabId}.example.com/page`,
    lastActiveAt: NOW - idleHours * HOUR,
    displayLastActiveAt: NOW - idleHours * HOUR,
    firstSeenAt: NOW - 48 * HOUR,
    protection: [],
    idleState: "expired",
  } as unknown as OpenTabInfo;
}

function snapshotOf(
  tabs: OpenTabInfo[],
  budget: { over: number; windowId?: number },
): OpenTabsSnapshot {
  return {
    tabs,
    budget: { enabled: true, limit: 15, scope: "all-windows", count: 15 + budget.over, level: "over", ...budget },
    stats: { counted: tabs.length, expired: tabs.length },
    autoArchive: { active: true, baselineAt: 0 },
  } as unknown as OpenTabsSnapshot;
}

describe("TabBudgetService make room", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.dirtyTabIds.clear();
    mocks.asked = [];
    mocks.settings = {
      ...DEFAULT_TAB_LIFECYCLE_SETTINGS,
      budget: { ...DEFAULT_TAB_LIFECYCLE_SETTINGS.budget, enabled: true, overBudgetAction: "auto-archive" },
    };
    mocks.archiveTabs.mockImplementation(async (tabIds: number[]) => ({
      ok: true,
      archived: tabIds.length,
      batchId: "batch",
    }));
  });

  it("only archives tabs of the window that went over in per-window mode", async () => {
    mocks.getBudgetStatus.mockResolvedValue({ over: 2 });
    vi.spyOn(tabLifecycleService, "getSnapshot").mockResolvedValue(
      snapshotOf(
        [idleTab(1, 1, 50), idleTab(2, 1, 40), idleTab(3, 2, 5), idleTab(4, 2, 3), idleTab(5, 2, 2)],
        { over: 2, windowId: 2 },
      ),
    );

    await tabBudgetService.evaluate(true);

    expect(mocks.archiveTabs).toHaveBeenCalledWith([3, 4], "budget", expect.anything());
  });

  it("skips tabs with unsubmitted input and checks the tabs that take their place", async () => {
    mocks.getBudgetStatus.mockResolvedValue({ over: 2 });
    mocks.dirtyTabIds.add(1);
    vi.spyOn(tabLifecycleService, "getSnapshot").mockResolvedValue(
      snapshotOf([idleTab(1, 1, 50), idleTab(2, 1, 40), idleTab(3, 1, 30)], { over: 2 }),
    );

    await tabBudgetService.evaluate(true);

    expect([...mocks.asked].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(mocks.archiveTabs).toHaveBeenCalledWith([2, 3], "budget", expect.anything());
  });

  it("never archives more than the current overage", async () => {
    mocks.getBudgetStatus.mockResolvedValue({ over: 3 });
    vi.spyOn(tabLifecycleService, "getSnapshot").mockResolvedValue(
      snapshotOf([idleTab(1, 1, 50), idleTab(2, 1, 40), idleTab(3, 1, 30)], { over: 1 }),
    );

    await tabBudgetService.evaluate(true);

    expect(mocks.archiveTabs).toHaveBeenCalledWith([1], "budget", expect.anything());
  });
});

describe("TabLifecycleService sweep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.dirtyTabIds.clear();
    mocks.asked = [];
    mocks.settings = {
      ...DEFAULT_TAB_LIFECYCLE_SETTINGS,
      autoArchive: { ...DEFAULT_TAB_LIFECYCLE_SETTINGS.autoArchive, enabled: true },
    };
    mocks.archiveTabs.mockImplementation(async (tabIds: number[]) => ({
      ok: true,
      archived: tabIds.length,
    }));
  });

  it("checks every tab that fills a dirty tab's place before archiving it", async () => {
    // 31 expired tabs, oldest first; the 1st and the 31st hold unsubmitted input
    const tabs = Array.from({ length: 31 }, (_, index) => idleTab(index + 1, 1, 400 - index));
    mocks.dirtyTabIds.add(1);
    mocks.dirtyTabIds.add(31);
    vi.spyOn(tabLifecycleService, "getSnapshot").mockResolvedValue(snapshotOf(tabs, { over: 0 }));

    await tabLifecycleService.runSweep(NOW);

    const archived = mocks.archiveTabs.mock.calls[0][0] as number[];
    expect(archived).toHaveLength(29);
    expect(archived).not.toContain(1);
    expect(archived).not.toContain(31);
    expect(new Set(mocks.asked)).toEqual(new Set(tabs.map((tab) => tab.tabId)));
  });
});


describe("TabLifecycleService confirm mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    mocks.dirtyTabIds.clear();
    mocks.asked = [];
    mocks.settings = {
      ...DEFAULT_TAB_LIFECYCLE_SETTINGS,
      autoArchive: { ...DEFAULT_TAB_LIFECYCLE_SETTINGS.autoArchive, enabled: true, mode: "confirm" },
    };
    mocks.archiveTabs.mockImplementation(async (tabIds: number[]) => ({
      ok: true,
      archived: tabIds.length,
    }));
  });

  it("leaves tabs open that were renewed, locked or edited after the sweep listed them", async () => {
    mocks.pending = [1, 2, 3, 4].map((tabId) => ({
      tabId,
      url: `https://site${tabId}.example.com/page`,
      title: `Tab ${tabId}`,
      lastActiveAt: NOW - 50 * HOUR,
    }));
    const renewed = { ...idleTab(2, 1, 0), idleState: "fresh" } as OpenTabInfo;
    const locked = { ...idleTab(3, 1, 50), protection: ["locked"] } as OpenTabInfo;
    mocks.dirtyTabIds.add(4);
    vi.spyOn(tabLifecycleService, "getSnapshot").mockResolvedValue(
      snapshotOf([idleTab(1, 1, 50), renewed, locked, idleTab(4, 1, 50)], { over: 0 }),
    );

    const archived = await tabLifecycleService.confirmPendingArchive();

    expect(archived).toBe(1);
    expect(mocks.archiveTabs).toHaveBeenCalledWith([1], "expired", { skipProtected: true });
  });
});


describe("TabLifecycleService consent", () => {
  /** Applies the state updates the service made to a state that had both consents */
  async function consentAfter(action: () => Promise<unknown>) {
    const { DEFAULT_TAB_LIFECYCLE_STATE } = await import("@/lib/tabs/tab-lifecycle-settings.utils");
    const { tabLifecycleStateStorage } = await import("@/lib/storage/tab-lifecycle-state-storage");
    const update = vi.mocked(tabLifecycleStateStorage.update);
    update.mockClear();
    await action();
    let state = { ...DEFAULT_TAB_LIFECYCLE_STATE, autoArchiveConsent: true, autoMakeRoomConsent: true };
    for (const [updater] of update.mock.calls) {
      state = (updater as (value: typeof state) => typeof state)(state);
    }
    return { autoArchive: state.autoArchiveConsent, autoMakeRoom: state.autoMakeRoomConsent };
  }

  beforeEach(() => {
    mocks.settings = DEFAULT_TAB_LIFECYCLE_SETTINGS;
  });

  it("withdraws this device's consent when automatic closing is turned off here", async () => {
    expect(await consentAfter(() => tabLifecycleService.setAutoArchiveEnabled(false))).toMatchObject({
      autoArchive: false,
      autoMakeRoom: true,
    });
    expect(await consentAfter(() => tabLifecycleService.setOverBudgetAction("nudge"))).toMatchObject({
      autoArchive: true,
      autoMakeRoom: false,
    });
  });

  it("records consent when it is turned on here", async () => {
    expect(await consentAfter(() => tabLifecycleService.setAutoArchiveEnabled(true))).toMatchObject({
      autoArchive: true,
    });
    expect(await consentAfter(() => tabLifecycleService.setOverBudgetAction("auto-archive"))).toMatchObject({
      autoMakeRoom: true,
    });
  });
});

afterEach(() => {
  vi.useRealTimers();
});
