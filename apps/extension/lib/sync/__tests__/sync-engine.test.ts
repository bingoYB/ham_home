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

/** 跑一次书签同步，返回写入远端 meta.json 的内容 */
async function runBookmarkSync(options: {
  local: ReturnType<typeof bookmark>[];
  remote: ReturnType<typeof bookmark>[] | null;
}) {
  mocks.getBookmarksForSync.mockResolvedValue(options.local);
  mocks.getBookmarkById.mockImplementation(async (id: string) =>
    options.local.find((item) => item.id === id) ?? null,
  );
  mocks.getBookmarkContent.mockResolvedValue(undefined);
  mocks.getJSON.mockImplementation(async (filename: string) =>
    filename.endsWith("/bookmarks/meta.json") && options.remote
      ? { bookmarks: options.remote }
      : null,
  );

  const { syncEngine } = await import("../sync-engine");
  await (syncEngine as unknown as { syncBookmarks: () => Promise<void> }).syncBookmarks();

  const metaCall = mocks.putJSON.mock.calls.find(([filename]: [string]) =>
    filename.endsWith("/bookmarks/meta.json"),
  );
  return metaCall?.[1]?.bookmarks as
    | Array<ReturnType<typeof bookmark> & { isDeleted: boolean }>
    | undefined;
}

describe("SyncEngine bookmark merge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("collapses the same URL saved on two devices into a single bookmark", async () => {
    const uploaded = await runBookmarkSync({
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
    const uploaded = await runBookmarkSync({
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
    const uploaded = await runBookmarkSync({
      local: [
        bookmark({ id: "c1", url: "https://example.com/p#:~:text=one" }),
        bookmark({ id: "c2", url: "https://example.com/p#:~:text=two" }),
      ],
      remote: null,
    });

    expect(uploaded?.filter((item) => item.isDeleted)).toHaveLength(0);
  });

  it("uploads local tombstones so deletions reach other devices", async () => {
    const uploaded = await runBookmarkSync({
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
