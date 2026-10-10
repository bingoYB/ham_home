import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TabActivityRecord, TabLifecycleLocalState } from "@/types";

interface FakeTab {
  id: number;
  windowId: number;
  index: number;
  url: string;
  active?: boolean;
  incognito?: boolean;
}

interface FakeWindow {
  id: number;
  focused?: boolean;
  incognito?: boolean;
  type?: string;
  tabs: FakeTab[];
}

const fake = vi.hoisted(() => ({
  windows: [] as FakeWindow[],
  records: new Map<number, TabActivityRecord>(),
  session: new Map<string, unknown>(),
  state: {} as TabLifecycleLocalState,
}));

vi.mock("wxt/browser", () => ({
  browser: {
    windows: {
      getAll: vi.fn(async () => fake.windows),
      get: vi.fn(async (id: number) => {
        const window = fake.windows.find((item) => item.id === id);
        if (!window) throw new Error("No window");
        return { ...window, type: window.type ?? "normal" };
      }),
    },
    tabs: {
      get: vi.fn(async (id: number) => {
        const tab = fake.windows.flatMap((window) => window.tabs).find((item) => item.id === id);
        if (!tab) throw new Error("No tab");
        return tab;
      }),
      query: vi.fn(async () => []),
    },
  },
}));

vi.mock("@/lib/storage/tab-activity-storage", () => ({
  tabActivityStorage: {
    getAll: vi.fn(async () => Array.from(fake.records.values())),
    getMap: vi.fn(async () => new Map(fake.records)),
    get: vi.fn(async (tabId: number) => fake.records.get(tabId)),
    update: vi.fn(
      async (
        tabId: number,
        updater: (record?: TabActivityRecord) => TabActivityRecord | null | undefined,
      ) => {
        const current = fake.records.get(tabId);
        const next = updater(current);
        if (next === null) {
          fake.records.delete(tabId);
          return undefined;
        }
        if (next !== undefined) fake.records.set(tabId, next);
        return next ?? current;
      },
    ),
    updateMany: vi.fn(),
    put: vi.fn(async (record: TabActivityRecord) => {
      fake.records.set(record.tabId, record);
    }),
    putMany: vi.fn(async (records: TabActivityRecord[]) => {
      for (const record of records) fake.records.set(record.tabId, record);
    }),
    delete: vi.fn(async (tabId: number) => {
      fake.records.delete(tabId);
    }),
    deleteMany: vi.fn(async (tabIds: number[]) => {
      for (const id of tabIds) fake.records.delete(id);
    }),
    replaceAll: vi.fn(async (records: TabActivityRecord[]) => {
      fake.records.clear();
      for (const record of records) fake.records.set(record.tabId, record);
    }),
    clear: vi.fn(async () => fake.records.clear()),
  },
}));

vi.mock("@/lib/storage/tab-lifecycle-config-storage", async () => {
  const { DEFAULT_TAB_LIFECYCLE_SETTINGS } = await import("@/lib/tabs/tab-lifecycle-settings.utils");
  return {
    tabLifecycleConfigStorage: {
      getSettings: vi.fn(async () => DEFAULT_TAB_LIFECYCLE_SETTINGS),
      watchSettings: vi.fn(() => () => undefined),
    },
  };
});

vi.mock("@/lib/storage/tab-lifecycle-state-storage", () => ({
  tabLifecycleStateStorage: {
    get: vi.fn(async () => fake.state),
    update: vi.fn(async (updater: (state: TabLifecycleLocalState) => TabLifecycleLocalState) => {
      fake.state = updater(fake.state);
      return fake.state;
    }),
  },
}));

vi.mock("@/lib/storage/tab-session-storage", () => {
  const get = async <T,>(key: string, fallback: T): Promise<T> =>
    (fake.session.has(key) ? fake.session.get(key) : fallback) as T;
  const set = async (key: string, value: unknown) => {
    fake.session.set(key, value);
  };
  return {
    tabSessionStorage: {
      get,
      set,
      remove: async (key: string) => {
        fake.session.delete(key);
      },
      claimNewSession: async () => {
        if (fake.session.has("tl.sessionId")) return false;
        fake.session.set("tl.sessionId", "session");
        return true;
      },
      getActiveTab: (windowId: number) => get<number | null>(`tl.active.${windowId}`, null),
      setActiveTab: (windowId: number, tabId: number) => set(`tl.active.${windowId}`, tabId),
      clearActiveTab: async (windowId: number) => {
        fake.session.delete(`tl.active.${windowId}`);
      },
      getFocusedWindow: () => get<number | null>("tl.focusedWindow", null),
      setFocusedWindow: (windowId: number | null) => set("tl.focusedWindow", windowId),
      setPendingConfirm: vi.fn(),
    },
  };
});

const HOUR = 60 * 60 * 1000;
const START = new Date("2026-10-03T09:00:00").getTime();

function record(tab: FakeTab, lastActiveAt: number, extra: Partial<TabActivityRecord> = {}) {
  return {
    tabId: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    url: tab.url,
    firstSeenAt: lastActiveAt,
    lastActiveAt,
    ...extra,
  } satisfies TabActivityRecord;
}

/** A fresh module instance, like a service worker that just woke up */
async function loadService() {
  vi.resetModules();
  return (await import("../tab-activity-service")).tabActivityService;
}

describe("TabActivityService after a service worker restart", () => {
  const tabA: FakeTab = { id: 10, windowId: 1, index: 0, url: "https://a.example.com/page" };
  const tabB: FakeTab = { id: 11, windowId: 1, index: 1, url: "https://b.example.com/page" };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { DEFAULT_TAB_LIFECYCLE_STATE } = await import("@/lib/tabs/tab-lifecycle-settings.utils");
    fake.state = { ...DEFAULT_TAB_LIFECYCLE_STATE };
    fake.records.clear();
    fake.session.clear();
    fake.windows = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("credits the tab the user switched away from when the switch woke the worker", async () => {
    // Same browser session: tab A became active at 09:00 and the worker went to sleep
    fake.session.set("tl.sessionId", "session");
    fake.session.set("tl.active.1", tabA.id);
    fake.session.set("tl.focusedWindow", 1);
    fake.records.set(tabA.id, record(tabA, START));
    fake.records.set(tabB.id, record(tabB, START - HOUR));

    // 11:00: switching to tab B wakes the worker; B is already the active tab
    vi.setSystemTime(START + 2 * HOUR);
    fake.windows = [
      { id: 1, focused: true, tabs: [{ ...tabA }, { ...tabB, active: true }] },
    ];
    const service = await loadService();
    await service.handleActivated({ tabId: tabB.id, windowId: 1 });

    expect(fake.records.get(tabA.id)?.lastActiveAt).toBe(START + 2 * HOUR);
    expect(fake.records.get(tabB.id)?.lastActiveAt).toBe(START + 2 * HOUR);
    expect(fake.session.get("tl.active.1")).toBe(tabB.id);
  });

  it("credits the focused window's tab when leaving the browser woke the worker", async () => {
    fake.session.set("tl.sessionId", "session");
    fake.session.set("tl.active.1", tabA.id);
    fake.session.set("tl.focusedWindow", 1);
    fake.records.set(tabA.id, record(tabA, START));

    vi.setSystemTime(START + HOUR);
    fake.windows = [{ id: 1, focused: false, tabs: [{ ...tabA, active: true }] }];
    const service = await loadService();
    await service.handleWindowFocusChanged(-1);

    expect(fake.records.get(tabA.id)?.lastActiveAt).toBe(START + HOUR);
    expect(fake.session.get("tl.focusedWindow")).toBeNull();
  });

  it("fills in the active tab of windows it has no pointer for", async () => {
    fake.session.set("tl.sessionId", "session");
    fake.records.set(tabA.id, record(tabA, START));
    fake.windows = [{ id: 1, focused: true, tabs: [{ ...tabA, active: true }] }];

    const service = await loadService();
    await service.initialize();

    expect(fake.session.get("tl.active.1")).toBe(tabA.id);
  });

  it("sets every pointer from the current tabs on a new browser session", async () => {
    fake.session.set("tl.active.1", 999);
    fake.windows = [{ id: 1, focused: true, tabs: [{ ...tabA }, { ...tabB, active: true }] }];

    const service = await loadService();
    await service.initialize();

    expect(fake.session.get("tl.active.1")).toBe(tabB.id);
    expect(fake.session.get("tl.focusedWindow")).toBe(1);
  });
});

describe("TabActivityService locks after a browser restart", () => {
  const lockedUrl = "https://docs.example.com/spec";
  const previousTab: FakeTab = { id: 5, windowId: 1, index: 0, url: lockedUrl };
  const other: FakeTab = { id: 30, windowId: 7, index: 0, url: "https://other.example.com/page" };

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
    const { DEFAULT_TAB_LIFECYCLE_STATE } = await import("@/lib/tabs/tab-lifecycle-settings.utils");
    fake.state = { ...DEFAULT_TAB_LIFECYCLE_STATE, lockedUrls: [lockedUrl] };
    fake.records.clear();
    fake.session.clear();
    // The locked tab was not restored at start-up
    fake.records.set(previousTab.id, record(previousTab, START - 24 * HOUR, { locked: true }));
    fake.windows = [{ id: 7, focused: true, tabs: [{ ...other, active: true }] }];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks a tab restored later in the session with a URL that was locked", async () => {
    const service = await loadService();
    await service.initialize();
    expect(fake.state.lockedUrls).toEqual([]);

    // Restored from history five minutes later, after the reconcile pool expired
    vi.setSystemTime(START + 5 * 60 * 1000);
    const restored: FakeTab = { id: 40, windowId: 7, index: 1, url: lockedUrl };
    fake.windows[0].tabs.push(restored);
    await service.handleCreated({ ...restored, highlighted: false, pinned: false } as never);

    expect(fake.records.get(restored.id)?.locked).toBe(true);
    expect(fake.state.lockedUrls).toEqual([lockedUrl]);
  });

  it("gives each pending lock to one tab only", async () => {
    const service = await loadService();
    await service.initialize();

    vi.setSystemTime(START + 5 * 60 * 1000);
    const first: FakeTab = { id: 40, windowId: 7, index: 1, url: lockedUrl };
    const second: FakeTab = { id: 41, windowId: 7, index: 2, url: lockedUrl };
    fake.windows[0].tabs.push(first, second);
    await service.handleCreated(first as never);
    await service.handleCreated(second as never);

    expect(fake.records.get(first.id)?.locked).toBe(true);
    expect(fake.records.get(second.id)?.locked).toBeUndefined();
  });
});
