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
    getBookmarkById: vi.fn(),
    importRawBookmark: vi.fn(),
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
