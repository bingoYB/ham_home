import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getJSON: vi.fn(),
  putJSON: vi.fn(),
  getSettings: vi.fn(),
  importRawSettings: vi.fn(),
  getRules: vi.fn(),
  getAutoGroupSettings: vi.fn(),
  importRawRule: vi.fn(),
  importRawAutoGroupSettings: vi.fn(),
  getAllClips: vi.fn(),
  importRawClip: vi.fn(),
  getBookmarksForSync: vi.fn(),
  getBookmarkById: vi.fn(),
  getBookmarkContent: vi.fn(),
  importRawBookmark: vi.fn(),
  purgeBookmarks: vi.fn(),
  getTombstones: vi.fn(),
  replaceTombstones: vi.fn(),
  deleteFile: vi.fn(),
  getReadLater: vi.fn(),
  replaceReadLater: vi.fn(),
  getLifecycleSettings: vi.fn(),
  importLifecycleSettings: vi.fn(),
}));

vi.mock("../webdav-client", async () => {
  const actual = await vi.importActual<typeof import("../webdav-client")>("../webdav-client");
  return {
    ...actual,
    webdavClientAdapter: {
      getJSON: mocks.getJSON,
      putJSON: mocks.putJSON,
      isInitialized: true,
      init: vi.fn(),
      reset: vi.fn(),
      checkAuth: vi.fn(),
      ensureDirectory: vi.fn(),
      deleteFile: mocks.deleteFile,
    },
  };
});

vi.mock("../sync-config-storage", () => ({
  syncConfigStorage: {
    getConfig: vi.fn(),
    setStatus: vi.fn(),
  },
}));

vi.mock("../../storage/bookmark-storage", () => ({
  bookmarkStorage: {
    getCategories: vi.fn(),
    getBookmarks: vi.fn(),
    getBookmarksForSync: mocks.getBookmarksForSync,
    getBookmarkById: mocks.getBookmarkById,
    getBookmarkContent: mocks.getBookmarkContent,
    importRawBookmark: mocks.importRawBookmark,
    importRawCategory: vi.fn(),
    mergeCategories: vi.fn(),
    deleteBookmark: vi.fn(),
    purgeBookmarks: mocks.purgeBookmarks,
  },
}));

vi.mock("../../storage/bookmark-tombstone-storage", () => ({
  bookmarkTombstoneStorage: {
    getAll: mocks.getTombstones,
    replaceAll: mocks.replaceTombstones,
    add: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../storage/config-storage", () => ({
  configStorage: {
    getSettings: mocks.getSettings,
    importRawSettings: mocks.importRawSettings,
  },
}));

vi.mock("../../storage/workspace-storage", () => ({
  workspaceStorage: {
    getWorkspaces: vi.fn(),
    getCategories: vi.fn(),
    importRawWorkspace: vi.fn(),
    importRawCategory: vi.fn(),
  },
}));

vi.mock("../../storage/tab-group-rules-storage", () => ({
  tabGroupRulesStorage: {
    getRules: mocks.getRules,
    getAutoGroupSettings: mocks.getAutoGroupSettings,
    importRawRule: mocks.importRawRule,
    importRawAutoGroupSettings: mocks.importRawAutoGroupSettings,
  },
}));

vi.mock("../../storage/read-later-storage", () => ({
  readLaterStorage: {
    getAll: mocks.getReadLater,
    replaceAll: mocks.replaceReadLater,
    replaceWith: async (build: (current: Record<string, unknown>) => Record<string, unknown> | null) => {
      const current = await mocks.getReadLater();
      const next = build({ ...current });
      if (!next) return current;
      await mocks.replaceReadLater(next);
      return next;
    },
  },
}));

vi.mock("../../storage/tab-lifecycle-config-storage", () => ({
  tabLifecycleConfigStorage: {
    getRawSettings: mocks.getLifecycleSettings,
    importRawSettings: mocks.importLifecycleSettings,
  },
}));

vi.mock("../../storage/bookmark-clip-storage", () => ({
  bookmarkClipStorage: {
    getAllClips: mocks.getAllClips,
    importRawClip: mocks.importRawClip,
  },
}));

const baseSettings = {
  autoSaveSnapshot: true,
  autoSaveScreenshot: false,
  screenshotPrivatePagePolicy: "skip",
  bookmarkHealthSchedule: "off",
  enableOmniboxSearch: true,
  defaultCategory: null,
  theme: "system" as const,
  language: "zh" as const,
  shortcut: "Ctrl+Shift+E",
  enableSidePanel: true,
  usePopupSavePanel: false,
  panelPosition: "left" as const,
  panelShortcut: "Ctrl+Shift+B",
};

describe("SyncEngine settings merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRules.mockResolvedValue([]);
    mocks.getAllClips.mockResolvedValue([]);
    mocks.getTombstones.mockResolvedValue([]);
  });

  it("uploads newer local settings instead of applying stale remote settings", async () => {
    const localSettings = {
      ...baseSettings,
      theme: "dark" as const,
      updatedAt: 2000,
    };
    const remoteSettings = {
      ...baseSettings,
      theme: "light" as const,
      updatedAt: 1000,
    };

    mocks.getSettings.mockResolvedValue(localSettings);
    mocks.getJSON.mockImplementation(async (filename: string) =>
      filename.endsWith("/settings.json") ? remoteSettings : null,
    );

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncSettings: () => Promise<void> }).syncSettings();

    expect(mocks.importRawSettings).not.toHaveBeenCalled();
    expect(mocks.putJSON).toHaveBeenCalledWith(
      expect.stringMatching(/settings\.json$/),
      localSettings,
    );
  });

  it("imports newer remote settings", async () => {
    const localSettings = {
      ...baseSettings,
      theme: "light" as const,
      updatedAt: 1000,
    };
    const remoteSettings = {
      ...baseSettings,
      theme: "dark" as const,
      updatedAt: 2000,
    };

    mocks.getSettings.mockResolvedValue(localSettings);
    mocks.getJSON.mockImplementation(async (filename: string) =>
      filename.endsWith("/settings.json") ? remoteSettings : null,
    );

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncSettings: () => Promise<void> }).syncSettings();

    expect(mocks.importRawSettings).toHaveBeenCalledWith(remoteSettings);
    expect(mocks.putJSON).not.toHaveBeenCalled();
  });

  it("uploads newer local AI auto group settings instead of applying stale remote settings", async () => {
    const localAutoGroupSettings = {
      aiAutoGroupEnabled: true,
      aiAutoGroupInstructions: "按项目分组",
      domainAutoGroupEnabled: false,
      updatedAt: 2000,
    };
    const remoteAutoGroupSettings = {
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: false,
      updatedAt: 1000,
    };

    mocks.getRules.mockResolvedValue([]);
    mocks.getAutoGroupSettings.mockResolvedValue(localAutoGroupSettings);
    mocks.getJSON.mockImplementation(async (filename: string) =>
      filename.endsWith("/tab-group-config.json")
        ? { rules: [], autoGroupSettings: remoteAutoGroupSettings }
        : null,
    );

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncTabGroupConfig: () => Promise<void> }).syncTabGroupConfig();

    expect(mocks.importRawAutoGroupSettings).not.toHaveBeenCalled();
    expect(mocks.putJSON).toHaveBeenCalledWith(
      expect.stringMatching(/tab-group-config\.json$/),
      {
        rules: [],
        autoGroupSettings: localAutoGroupSettings,
      },
    );
  });

  it("imports newer remote AI auto group settings", async () => {
    const localAutoGroupSettings = {
      aiAutoGroupEnabled: false,
      aiAutoGroupInstructions: "",
      domainAutoGroupEnabled: false,
      updatedAt: 1000,
    };
    const remoteAutoGroupSettings = {
      aiAutoGroupEnabled: true,
      aiAutoGroupInstructions: "按项目分组",
      domainAutoGroupEnabled: false,
      updatedAt: 2000,
    };

    mocks.getRules.mockResolvedValue([]);
    mocks.getAutoGroupSettings.mockResolvedValue(localAutoGroupSettings);
    mocks.getJSON.mockImplementation(async (filename: string) =>
      filename.endsWith("/tab-group-config.json")
        ? { rules: [], autoGroupSettings: remoteAutoGroupSettings }
        : null,
    );

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncTabGroupConfig: () => Promise<void> }).syncTabGroupConfig();

    expect(mocks.importRawAutoGroupSettings).toHaveBeenCalledWith(remoteAutoGroupSettings);
    expect(mocks.putJSON).not.toHaveBeenCalled();
  });
});

interface TestBookmark {
  id: string;
  url: string;
  title?: string;
  description?: string;
  tags?: string[];
  createdAt?: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

function bookmark(input: TestBookmark) {
  return {
    title: `Bookmark ${input.id}`,
    description: "",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: 1,
    updatedAt: 1,
    ...input,
  };
}

interface Tombstone {
  id: string;
  deletedAt: number;
}

/** 跑一次书签同步，返回写入远端 meta.json 的内容 */
async function runBookmarkSync(options: {
  local: ReturnType<typeof bookmark>[];
  remote: ReturnType<typeof bookmark>[] | null;
  localTombstones?: Tombstone[];
  remoteDeletions?: Tombstone[];
}) {
  mocks.getBookmarksForSync.mockResolvedValue(options.local);
  mocks.getBookmarkById.mockImplementation(async (id: string) =>
    options.local.find((item) => item.id === id) ?? null,
  );
  mocks.getBookmarkContent.mockResolvedValue(undefined);
  mocks.getTombstones.mockResolvedValue(options.localTombstones ?? []);
  mocks.getJSON.mockImplementation(async (filename: string) =>
    filename.endsWith("/bookmarks/meta.json") && options.remote
      ? { bookmarks: options.remote, deletions: options.remoteDeletions ?? [] }
      : null,
  );

  const { syncEngine } = await import("../sync-engine");
  await (syncEngine as unknown as { syncBookmarks: () => Promise<void> }).syncBookmarks();

  const metaCall = mocks.putJSON.mock.calls.find(([filename]: [string]) =>
    filename.endsWith("/bookmarks/meta.json"),
  );
  return {
    bookmarks: metaCall?.[1]?.bookmarks as
      | Array<ReturnType<typeof bookmark> & { isDeleted: boolean }>
      | undefined,
    deletions: metaCall?.[1]?.deletions as Tombstone[] | undefined,
  };
}

describe("SyncEngine bookmark merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTombstones.mockResolvedValue([]);
  });

  it("collapses the same URL saved on two devices into a single bookmark", async () => {
    const { bookmarks: uploaded } = await runBookmarkSync({
      local: [
        bookmark({ id: "local-1", url: "https://example.com/a", createdAt: 200, tags: ["本地"] }),
      ],
      remote: [
        bookmark({ id: "remote-1", url: "https://example.com/a?utm_source=x", createdAt: 100, tags: ["远端"] }),
      ],
    });

    const alive = uploaded?.filter((item) => !item.isDeleted) ?? [];
    expect(alive).toHaveLength(1);
    // 创建更早的一条胜出，两边的标签都保留下来
    expect(alive[0].id).toBe("remote-1");
    expect([...alive[0].tags].sort()).toEqual(["本地", "远端"]);
    expect(uploaded?.find((item) => item.id === "local-1")?.isDeleted).toBe(true);
    // 被合并掉的那条要落到本地，用户才看不到重复项
    expect(mocks.importRawBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ id: "local-1", isDeleted: true }),
    );
  });

  it("merges duplicates that only exist locally", async () => {
    const { bookmarks: uploaded } = await runBookmarkSync({
      local: [
        bookmark({ id: "b1", url: "https://example.com/a", createdAt: 100 }),
        bookmark({ id: "b2", url: "https://example.com/a", createdAt: 200 }),
        bookmark({ id: "b3", url: "https://example.com/b", createdAt: 300 }),
      ],
      remote: null,
    });

    expect(uploaded?.filter((item) => !item.isDeleted).map((item) => item.id)).toEqual([
      "b1",
      "b3",
    ]);
  });

  it("keeps text clips of the same page apart", async () => {
    const { bookmarks: uploaded } = await runBookmarkSync({
      local: [
        bookmark({ id: "c1", url: "https://example.com/p#:~:text=one" }),
        bookmark({ id: "c2", url: "https://example.com/p#:~:text=two" }),
      ],
      remote: null,
    });

    expect(uploaded?.filter((item) => item.isDeleted)).toHaveLength(0);
  });

  it("uploads local tombstones so deletions reach other devices", async () => {
    const { bookmarks: uploaded } = await runBookmarkSync({
      local: [
        bookmark({ id: "b1", url: "https://example.com/a", updatedAt: 200, isDeleted: true }),
      ],
      remote: [bookmark({ id: "b1", url: "https://example.com/a", updatedAt: 100 })],
    });

    expect(uploaded?.find((item) => item.id === "b1")?.isDeleted).toBe(true);
  });

  it("does not resurrect a remote tombstone that never existed locally", async () => {
    await runBookmarkSync({
      local: [],
      remote: [
        bookmark({ id: "b1", url: "https://example.com/a", updatedAt: 100, isDeleted: true }),
      ],
    });

    expect(mocks.importRawBookmark).not.toHaveBeenCalled();
  });

  it("applies a remote restore back to a locally deleted bookmark", async () => {
    await runBookmarkSync({
      local: [
        bookmark({ id: "b1", url: "https://example.com/a", updatedAt: 100, isDeleted: true }),
      ],
      remote: [
        bookmark({ id: "b1", url: "https://example.com/a", updatedAt: 200, isDeleted: false }),
      ],
    });

    expect(mocks.importRawBookmark).toHaveBeenCalledWith(
      expect.objectContaining({ id: "b1", isDeleted: false }),
    );
  });
});

describe("SyncEngine deletion tombstones", () => {
  const NOW = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTombstones.mockResolvedValue([]);
  });

  it("publishes local tombstones and drops the remote copy of the bookmark", async () => {
    const { bookmarks, deletions } = await runBookmarkSync({
      local: [],
      remote: [bookmark({ id: "b1", url: "https://example.com/a", updatedAt: NOW - DAY })],
      localTombstones: [{ id: "b1", deletedAt: NOW }],
    });

    expect(deletions).toEqual([{ id: "b1", deletedAt: NOW }]);
    expect(bookmarks).toEqual([]);
  });

  it("purges a bookmark another device deleted for good", async () => {
    await runBookmarkSync({
      local: [bookmark({ id: "b1", url: "https://example.com/a", updatedAt: NOW - DAY })],
      remote: [],
      remoteDeletions: [{ id: "b1", deletedAt: NOW }],
    });

    expect(mocks.purgeBookmarks).toHaveBeenCalledWith(["b1"]);
    expect(mocks.replaceTombstones).toHaveBeenCalledWith([{ id: "b1", deletedAt: NOW }]);
  });

  it("keeps a bookmark that was edited after the delete", async () => {
    const { bookmarks, deletions } = await runBookmarkSync({
      local: [bookmark({ id: "b1", url: "https://example.com/a", updatedAt: NOW + DAY })],
      remote: [],
      remoteDeletions: [{ id: "b1", deletedAt: NOW }],
    });

    expect(deletions).toEqual([]);
    expect(mocks.purgeBookmarks).not.toHaveBeenCalled();
    expect(bookmarks?.map((item) => item.id)).toEqual(["b1"]);
  });

  it("stops syncing tombstones past the retention window", async () => {
    const { deletions } = await runBookmarkSync({
      local: [],
      remote: [],
      remoteDeletions: [
        { id: "fresh", deletedAt: NOW - DAY },
        { id: "stale", deletedAt: NOW - 200 * DAY },
      ],
    });

    expect(deletions?.map((item) => item.id)).toEqual(["fresh"]);
  });

  it("removes the remote content chunk only for newly published deletions", async () => {
    await runBookmarkSync({
      local: [],
      remote: [],
      localTombstones: [
        { id: "new", deletedAt: NOW },
        { id: "known", deletedAt: NOW - DAY },
      ],
      remoteDeletions: [{ id: "known", deletedAt: NOW - DAY }],
    });

    expect(mocks.deleteFile).toHaveBeenCalledTimes(1);
    expect(mocks.deleteFile).toHaveBeenCalledWith(
      expect.stringContaining("/chunks/new.gz.txt"),
    );
  });
});

describe("SyncEngine read later and lifecycle settings", () => {
  const entry = (bookmarkId: string, patch: Record<string, unknown> = {}) => ({
    bookmarkId,
    status: "unread",
    queueOnly: true,
    source: "manual",
    addedAt: 1000,
    updatedAt: 1000,
    ...patch,
  });
  const bookmark = (id: string, patch: Record<string, unknown> = {}) => ({
    id,
    url: `https://example.com/${id}`,
    title: id,
    description: "",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: 1,
    updatedAt: 1,
    ...patch,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getTombstones.mockResolvedValue([]);
    mocks.getBookmarksForSync.mockResolvedValue([bookmark("a"), bookmark("b"), bookmark("c")]);
  });

  it("merges queue state by last write and keeps fields of newer clients", async () => {
    mocks.getReadLater.mockResolvedValue({
      a: entry("a", { status: "read", updatedAt: 3000 }),
      b: entry("b", { updatedAt: 1000 }),
    });
    mocks.getJSON.mockImplementation(async (filename: string) =>
      filename.endsWith("/bookmarks/read-later.json")
        ? {
            version: 1,
            entries: [
              entry("a", { status: "unread", updatedAt: 2000 }),
              entry("b", { status: "expired", updatedAt: 2000, futureField: "keep" }),
              entry("c", { updatedAt: 500 }),
            ],
          }
        : null,
    );

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncReadLater: () => Promise<void> }).syncReadLater();

    const merged = mocks.replaceReadLater.mock.calls[0][0];
    expect(merged.a.status).toBe("read");
    expect(merged.b).toMatchObject({ status: "expired", futureField: "keep" });
    expect(merged.c).toBeDefined();
    expect(mocks.putJSON).toHaveBeenCalledWith(
      expect.stringMatching(/bookmarks\/read-later\.json$/),
      expect.objectContaining({ version: 1 }),
    );
  });

  it("keeps queue changes made while the remote file was loading", async () => {
    let store: Record<string, unknown> = { a: entry("a", { updatedAt: 1000 }) };
    mocks.getReadLater.mockImplementation(async () => ({ ...store }));
    mocks.replaceReadLater.mockImplementation(async (next: Record<string, unknown>) => {
      store = { ...next };
    });
    mocks.getJSON.mockImplementation(async (filename: string) => {
      if (!filename.endsWith("/bookmarks/read-later.json")) return null;
      // "Read later & close" while the request is in flight
      store = { ...store, q: entry("q", { updatedAt: 4000 }) };
      return { version: 1, entries: [entry("a", { status: "read", updatedAt: 2000 })] };
    });

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncReadLater: () => Promise<void> }).syncReadLater();

    expect(store).toMatchObject({ a: { status: "read" }, q: { bookmarkId: "q" } });
    const uploaded = mocks.putJSON.mock.calls[0][1] as { entries: Array<{ bookmarkId: string }> };
    expect(uploaded.entries.map((item) => item.bookmarkId).sort()).toEqual(["a", "q"]);
  });

  it("drops the queue state of bookmarks deleted for good", async () => {
    mocks.getReadLater.mockResolvedValue({ a: entry("a"), gone: entry("gone") });
    mocks.getTombstones.mockResolvedValue([{ id: "gone", deletedAt: 5000 }]);
    mocks.getJSON.mockResolvedValue(null);

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncReadLater: () => Promise<void> }).syncReadLater();

    const uploaded = mocks.putJSON.mock.calls[0][1] as { entries: Array<{ bookmarkId: string }> };
    expect(uploaded.entries.map((item) => item.bookmarkId)).toEqual(["a"]);
  });

  it("never overwrites a remote read later file it cannot parse", async () => {
    mocks.getReadLater.mockResolvedValue({ a: entry("a") });
    mocks.getJSON.mockResolvedValue({ entries: "not-a-list" });

    const { syncEngine } = await import("../sync-engine");
    await (syncEngine as unknown as { syncReadLater: () => Promise<void> }).syncReadLater();

    expect(mocks.putJSON).not.toHaveBeenCalled();
    expect(mocks.replaceReadLater).not.toHaveBeenCalled();
  });

  it("imports newer remote lifecycle settings and uploads newer local ones", async () => {
    const { syncEngine } = await import("../sync-engine");
    const sync = () =>
      (syncEngine as unknown as { syncTabLifecycleConfig: () => Promise<void> }).syncTabLifecycleConfig();
    const remote = { activityTracking: true, budget: { enabled: true, limit: 20 }, updatedAt: 2000 };

    mocks.getLifecycleSettings.mockResolvedValue({ activityTracking: true, updatedAt: 1000 });
    mocks.getJSON.mockResolvedValue({ version: 1, settings: remote });
    await sync();
    expect(mocks.importLifecycleSettings).toHaveBeenCalledWith(remote);
    expect(mocks.putJSON).not.toHaveBeenCalled();

    vi.clearAllMocks();
    const local = { activityTracking: false, updatedAt: 3000 };
    mocks.getLifecycleSettings.mockResolvedValue(local);
    mocks.getJSON.mockResolvedValue({ version: 1, settings: remote });
    await sync();
    expect(mocks.importLifecycleSettings).not.toHaveBeenCalled();
    expect(mocks.putJSON).toHaveBeenCalledWith(
      expect.stringMatching(/tab-lifecycle-config\.json$/),
      { version: 1, settings: local },
    );
  });
});
