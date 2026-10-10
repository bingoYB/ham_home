import { beforeEach, describe, expect, it, vi } from "vitest";

interface FakeTab {
  id: number;
  windowId: number;
  index: number;
  url: string;
  title: string;
  pinned?: boolean;
  active?: boolean;
  audible?: boolean;
  incognito?: boolean;
  groupId?: number;
}

const state = vi.hoisted(() => ({
  tabs: new Map<number, FakeTab>(),
  calls: [] as string[],
  failWrite: false,
  stuckTabIds: new Set<number>(),
}));

const mocks = vi.hoisted(() => ({
  addBatch: vi.fn(),
  deleteEntries: vi.fn(),
  getMap: vi.fn(),
  getBusyTabIds: vi.fn(),
  remove: vi.fn(),
  countStats: vi.fn(),
}));

vi.mock("wxt/browser", () => ({
  browser: {
    tabs: {
      get: vi.fn(async (id: number) => {
        const tab = state.tabs.get(id);
        if (!tab) throw new Error("No tab with id");
        return tab;
      }),
      remove: mocks.remove,
      create: vi.fn(),
      update: vi.fn(),
    },
    windows: { get: vi.fn(), update: vi.fn(), getLastFocused: vi.fn() },
  },
}));

vi.mock("@/lib/storage/tab-archive-storage", () => ({
  tabArchiveStorage: { addBatch: mocks.addBatch, deleteEntries: mocks.deleteEntries },
}));
vi.mock("@/lib/storage/tab-activity-storage", () => ({
  tabActivityStorage: { getMap: mocks.getMap },
}));
vi.mock("@/lib/storage/tab-session-storage", () => ({
  tabSessionStorage: { getBusyTabIds: mocks.getBusyTabIds, markBulkOpened: vi.fn() },
}));
vi.mock("@/lib/storage/tab-lifecycle-config-storage", () => ({
  tabLifecycleConfigStorage: { getSettings: vi.fn() },
}));
vi.mock("@/lib/services/tab-stats-service", () => ({
  tabStatsService: { count: mocks.countStats },
}));
vi.mock("@/lib/storage/workspace-restore-suppression-storage", () => ({
  workspaceRestoreSuppressionStorage: { suppressUrls: vi.fn(), suppressTabIds: vi.fn() },
}));

function addTab(tab: Partial<FakeTab> & Pick<FakeTab, "id">): void {
  state.tabs.set(tab.id, {
    windowId: 1,
    index: tab.id,
    url: `https://site${tab.id}.com/page`,
    title: `Tab ${tab.id}`,
    ...tab,
  });
}

describe("TabArchiveService.archiveTabs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.tabs.clear();
    state.calls = [];
    state.failWrite = false;
    state.stuckTabIds.clear();
    mocks.getMap.mockResolvedValue(new Map([[3, { tabId: 3, locked: true }]]));
    mocks.getBusyTabIds.mockResolvedValue(new Set([5]));
    mocks.addBatch.mockImplementation(async (batch: { id: string }, entries: unknown[]) => {
      state.calls.push("write");
      if (state.failWrite) throw new Error("QuotaExceededError");
      return { batch: { ...batch, entryIds: [] }, entries };
    });
    mocks.remove.mockImplementation(async (ids: number | number[]) => {
      state.calls.push("close");
      for (const id of Array.isArray(ids) ? ids : [ids]) {
        if (!state.stuckTabIds.has(id)) state.tabs.delete(id);
      }
    });
  });

  it("writes the archive before closing anything", async () => {
    addTab({ id: 1 });
    addTab({ id: 2 });
    const { tabArchiveService } = await import("../tab-archive-service");
    const result = await tabArchiveService.archiveTabs([1, 2], "expired", { automatic: true });

    expect(result).toMatchObject({ ok: true, archived: 2, skipped: 0 });
    expect(state.calls).toEqual(["write", "close"]);
    const [batch, entries] = mocks.addBatch.mock.calls[0];
    expect(batch).toMatchObject({ reason: "expired", automatic: true });
    expect(entries.map((entry: { url: string }) => entry.url)).toEqual([
      "https://site1.com/page",
      "https://site2.com/page",
    ]);
    expect(mocks.countStats).toHaveBeenCalledWith("autoArchived", 2);
  });

  it("closes nothing when the archive write fails", async () => {
    addTab({ id: 1 });
    state.failWrite = true;
    const { tabArchiveService } = await import("../tab-archive-service");
    const result = await tabArchiveService.archiveTabs([1], "expired", { automatic: true });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("QuotaExceededError");
    expect(mocks.remove).not.toHaveBeenCalled();
    expect(mocks.countStats).not.toHaveBeenCalled();
    expect(state.tabs.has(1)).toBe(true);
  });

  it("never closes pinned tabs, and skips protected tabs on automatic runs", async () => {
    addTab({ id: 1, pinned: true });
    addTab({ id: 2, active: true });
    addTab({ id: 3 }); // locked
    addTab({ id: 4, audible: true });
    addTab({ id: 5 }); // saving
    addTab({ id: 6 });
    addTab({ id: 7, incognito: true });
    const { tabArchiveService } = await import("../tab-archive-service");
    const result = await tabArchiveService.archiveTabs([1, 2, 3, 4, 5, 6, 7], "expired", {
      automatic: true,
      skipProtected: true,
    });

    expect(result).toMatchObject({ archived: 1, skipped: 6 });
    expect(mocks.remove).toHaveBeenCalledWith([6]);
    const [, entries] = mocks.addBatch.mock.calls[0];
    expect(entries).toHaveLength(1);
  });

  it("still never closes a pinned tab when asked manually", async () => {
    addTab({ id: 1, pinned: true });
    const { tabArchiveService } = await import("../tab-archive-service");
    const result = await tabArchiveService.archiveTabs([1], "manual");
    expect(result).toMatchObject({ ok: true, archived: 0, skipped: 1 });
    expect(mocks.addBatch).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  });

  it("removes the entry of a tab that could not be closed", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    addTab({ id: 1 });
    addTab({ id: 2 });
    state.stuckTabIds.add(2);
    const { tabArchiveService } = await import("../tab-archive-service");
    const result = await tabArchiveService.archiveTabs([1, 2], "manual");
    vi.useRealTimers();

    expect(result).toMatchObject({ archived: 1, skipped: 1 });
    const [, written] = mocks.addBatch.mock.calls[0];
    const stuckEntry = written.find((entry: { url: string }) => entry.url.includes("site2"));
    expect(mocks.deleteEntries).toHaveBeenCalledWith([stuckEntry.id]);
  });
});
