/**
 * End-to-end sync scenarios between two simulated devices sharing one in-memory WebDAV
 * server. Each test reproduces a data-loss bug of the previous engine.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeContentChunk, contentFingerprint } from "../sync-codec";
import { emptySyncTombstones, mergeSyncTombstones, type SyncTombstones } from "../sync-tombstones";
import { DEFAULT_TAB_LIFECYCLE_SETTINGS } from "../../tabs/tab-lifecycle-settings.utils";
import type {
  BookmarkClip,
  BookmarkTombstone,
  LocalBookmark,
  LocalCategory,
  TabGroupRule,
  Workspace,
  WorkspaceCategory,
  ReadLaterEntryMap,
  TabLifecycleSettings,
} from "@/types";

interface Device {
  bookmarks: Map<string, LocalBookmark>;
  contents: Record<string, string>;
  tombstones: BookmarkTombstone[];
  categories: LocalCategory[];
  workspaces: Workspace[];
  workspaceCategories: WorkspaceCategory[];
  rules: TabGroupRule[];
  clips: BookmarkClip[];
  syncTombstones: SyncTombstones;
  repair: { done: boolean; attempted: string[] };
  settings: Record<string, unknown>;
  readLaterEntries: ReadLaterEntryMap;
  lifecycleSettings: TabLifecycleSettings;
}

const state = vi.hoisted(() => ({
  remote: new Map<string, string>(),
  device: null as unknown as Device,
  getJSONCalls: [] as string[],
  /** Simulates a second client writing sys.json right after us. */
  stealLock: false,
}));

const baseSettings = {
  autoSaveSnapshot: true,
  autoSaveScreenshot: false,
  screenshotPrivatePagePolicy: "skip",
  bookmarkHealthSchedule: "off",
  enableOmniboxSearch: true,
  defaultCategory: null,
  theme: "system",
  language: "zh",
  shortcut: "Ctrl+Shift+E",
  enableSidePanel: true,
  usePopupSavePanel: false,
  panelPosition: "left",
  panelShortcut: "Ctrl+Shift+B",
  updatedAt: 1,
};

function newDevice(): Device {
  return {
    bookmarks: new Map(),
    contents: {},
    tombstones: [],
    categories: [],
    workspaces: [],
    workspaceCategories: [],
    rules: [],
    clips: [],
    syncTombstones: emptySyncTombstones(),
    repair: { done: false, attempted: [] },
    settings: { ...baseSettings },
    readLaterEntries: {},
    lifecycleSettings: structuredClone(DEFAULT_TAB_LIFECYCLE_SETTINGS),
  };
}

vi.mock("../webdav-client", async () => {
  const actual = await vi.importActual<typeof import("../webdav-client")>("../webdav-client");
  return {
    ...actual,
    webdavClientAdapter: {
      withExclusiveLock: vi.fn(async (_path: string, operation: () => Promise<unknown>) => operation()),
      init: vi.fn(),
      reset: vi.fn(),
      checkAuth: vi.fn(),
      ensureDirectory: vi.fn(),
      async getJSON(path: string) {
        state.getJSONCalls.push(path);
        const text = state.remote.get(path);
        if (text === undefined || text.trim() === "") return null;
        try {
          return JSON.parse(text);
        } catch {
          throw new actual.SyncError("invalidRemoteData", `Remote file ${path} is not valid JSON`);
        }
      },
      async putJSON(path: string, data: unknown) {
        state.remote.set(path, JSON.stringify(data));
        if (state.stealLock && path.endsWith("/sys.json") && (data as { lock_status?: string }).lock_status === "locked") {
          state.remote.set(path, JSON.stringify({ ...(data as object), lock_owner: "someone-else" }));
        }
        return true;
      },
      async deleteFile(path: string) {
        for (const key of [...state.remote.keys()]) if (key === path || key.startsWith(`${path}/`)) state.remote.delete(key);
        return true;
      },
    },
  };
});

vi.mock("../sync-config-storage", () => ({
  syncConfigStorage: {
    getConfig: async () => ({ enabled: true, url: "https://dav.example/dav", username: "u", password: "p" }),
    setStatus: vi.fn(async () => ({})),
    getContentRepairState: async () => ({ ...state.device.repair }),
    setContentRepairState: async (value: Device["repair"]) => {
      state.device.repair = value;
    },
  },
}));

vi.mock("../../storage/sync-tombstone-storage", async () => {
  const { mergeSyncTombstones: merge } = await vi.importActual<typeof import("../sync-tombstones")>("../sync-tombstones");
  return {
    syncTombstoneStorage: {
      getAll: async () => merge(state.device.syncTombstones, {}),
      replaceAll: async (value: SyncTombstones) => {
        state.device.syncTombstones = value;
      },
      add: async (kind: keyof SyncTombstones, ids: string[]) => {
        state.device.syncTombstones = merge(state.device.syncTombstones, {
          [kind]: ids.map((id) => ({ id, deletedAt: Date.now() })),
        });
      },
    },
  };
});

vi.mock("../../storage/bookmark-tombstone-storage", () => ({
  bookmarkTombstoneStorage: {
    getAll: async () => [...state.device.tombstones],
    replaceAll: async (value: BookmarkTombstone[]) => {
      state.device.tombstones = value;
    },
  },
}));

vi.mock("../../storage/read-later-storage", () => ({
  readLaterStorage: {
    replaceWith: async (updater: (entries: ReadLaterEntryMap) => ReadLaterEntryMap | null) => {
      state.device.readLaterEntries = updater(state.device.readLaterEntries) ?? state.device.readLaterEntries;
      return state.device.readLaterEntries;
    },
  },
}));

vi.mock("../../storage/tab-lifecycle-config-storage", () => ({
  tabLifecycleConfigStorage: {
    getRawSettings: async () => ({ ...state.device.lifecycleSettings }),
    importRawSettings: async (settings: TabLifecycleSettings) => {
      state.device.lifecycleSettings = { ...settings };
    },
  },
}));

vi.mock("../../storage/bookmark-storage", () => ({
  bookmarkStorage: {
    async getBookmarksForSync() {
      return [...state.device.bookmarks.values()].map((b) => ({ ...b, content: undefined }));
    },
    async getContentsMap() {
      return { ...state.device.contents };
    },
    async importRawBookmarks(list: LocalBookmark[], contents: Record<string, string> = {}) {
      for (const bookmark of list) {
        const { content: _c, ...meta } = bookmark;
        state.device.bookmarks.set(meta.id, { ...state.device.bookmarks.get(meta.id), ...meta } as LocalBookmark);
      }
      Object.assign(state.device.contents, contents);
    },
    async purgeBookmarks(ids: string[]) {
      for (const id of ids) {
        state.device.bookmarks.delete(id);
        delete state.device.contents[id];
      }
      state.device.clips = state.device.clips.filter((clip) => !ids.includes(clip.bookmarkId));
    },
    async getCategories() {
      return [...state.device.categories];
    },
    async deleteCategory(id: string) {
      const ids = new Set([id]);
      let grew = true;
      while (grew) {
        grew = false;
        for (const c of state.device.categories) {
          if (c.parentId && ids.has(c.parentId) && !ids.has(c.id)) {
            ids.add(c.id);
            grew = true;
          }
        }
      }
      state.device.categories = state.device.categories.filter((c) => !ids.has(c.id));
      state.device.syncTombstones = mergeSyncTombstones(state.device.syncTombstones, {
        categories: [...ids].map((cid) => ({ id: cid, deletedAt: Date.now() })),
      });
      return [...ids];
    },
    async mergeCategories(mapping: Record<string, string>) {
      state.device.categories = state.device.categories.filter((c) => !mapping[c.id])
        .map((c) => c.parentId && mapping[c.parentId] ? { ...c, parentId: mapping[c.parentId], updatedAt: Date.now() } : c);
      for (const [id, bookmark] of state.device.bookmarks) {
        if (bookmark.categoryId && mapping[bookmark.categoryId]) {
          state.device.bookmarks.set(id, { ...bookmark, categoryId: mapping[bookmark.categoryId], updatedAt: Date.now() });
        }
      }
    },
    async importRawCategory(category: LocalCategory) {
      const index = state.device.categories.findIndex((c) => c.id === category.id);
      if (index === -1) state.device.categories.push(category);
      else state.device.categories[index] = { ...state.device.categories[index], ...category };
    },
  },
}));

vi.mock("../../storage/config-storage", () => ({
  configStorage: {
    getSettings: async () => ({ ...state.device.settings }),
    importRawSettings: async (value: Record<string, unknown>) => {
      state.device.settings = { ...value };
    },
  },
}));

vi.mock("../../storage/workspace-storage", () => ({
  workspaceStorage: {
    getWorkspaces: async () => [...state.device.workspaces],
    getCategories: async () => [...state.device.workspaceCategories],
    async importRawWorkspace(workspace: Workspace) {
      state.device.workspaces = [...state.device.workspaces.filter((w) => w.id !== workspace.id), workspace];
    },
    async importRawCategory(category: WorkspaceCategory) {
      state.device.workspaceCategories = [...state.device.workspaceCategories.filter((c) => c.id !== category.id), category];
    },
    async mergeCategories(mapping: Record<string, string>) {
      state.device.workspaceCategories = state.device.workspaceCategories.filter((c) => !mapping[c.id])
        .map((c) => c.parentId && mapping[c.parentId] ? { ...c, parentId: mapping[c.parentId] } : c);
      state.device.workspaces = state.device.workspaces.map((w) => w.categoryId && mapping[w.categoryId]
        ? { ...w, categoryId: mapping[w.categoryId], updatedAt: Date.now() } : w);
    },
    async deleteWorkspace(id: string) {
      state.device.workspaces = state.device.workspaces.filter((w) => w.id !== id);
    },
    async deleteCategory(id: string) {
      state.device.workspaceCategories = state.device.workspaceCategories.filter((c) => c.id !== id);
    },
  },
}));

vi.mock("../../storage/tab-group-rules-storage", () => ({
  tabGroupRulesStorage: {
    getRules: async () => [...state.device.rules],
    getAutoGroupSettings: async () => ({ aiAutoGroupEnabled: false, aiAutoGroupInstructions: "", domainAutoGroupEnabled: false, updatedAt: 0 }),
    async importRawRule(rule: TabGroupRule) {
      state.device.rules = [...state.device.rules.filter((r) => r.id !== rule.id), rule];
    },
    importRawAutoGroupSettings: vi.fn(),
    async deleteRule(id: string) {
      state.device.rules = state.device.rules.filter((r) => r.id !== id);
    },
  },
}));

vi.mock("../../storage/bookmark-clip-storage", () => ({
  bookmarkClipStorage: {
    getAllClips: async () => [...state.device.clips],
    async upsertRawClips(list: BookmarkClip[]) {
      for (const clip of list) {
        state.device.clips = [...state.device.clips.filter((c) => c.id !== clip.id), clip];
      }
    },
  },
}));

const ROOT = "/HamHomeSync";

function bookmark(id: string, overrides: Partial<LocalBookmark> = {}): LocalBookmark {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Bookmark ${id}`,
    description: "",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: 100,
    updatedAt: 100,
    isDeleted: false,
    ...overrides,
  };
}

function category(id: string, overrides: Partial<LocalCategory> = {}): LocalCategory {
  return { id, name: `Category ${id}`, parentId: null, order: 0, createdAt: 100, ...overrides };
}

function rule(id: string, overrides: Partial<TabGroupRule> = {}): TabGroupRule {
  return {
    id,
    name: `Rule ${id}`,
    enabled: true,
    matchType: "domain",
    pattern: "example.com",
    groupTitle: "Example",
    color: "blue",
    collapsed: false,
    order: 0,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  } as TabGroupRule;
}

function remoteJSON<T = unknown>(file: string): T {
  return JSON.parse(state.remote.get(`${ROOT}/${file}`) ?? "null") as T;
}

let deviceA: Device;
let deviceB: Device;

async function syncAs(device: Device) {
  state.device = device;
  const { syncEngine } = await import("../sync-engine");
  await syncEngine.doSync();
}

beforeEach(() => {
  state.remote.clear();
  state.getJSONCalls = [];
  state.stealLock = false;
  deviceA = newDevice();
  deviceB = newDevice();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("bookmark content", () => {
  it("syncs read-later entries and lifecycle settings alongside bookmark content", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.contents.b1 = "Article body";
    deviceA.readLaterEntries.b1 = {
      bookmarkId: "b1", status: "unread", queueOnly: true,
      source: "bookmark", addedAt: 100, updatedAt: 100,
    };
    deviceA.lifecycleSettings.updatedAt = 200;
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.contents.b1).toBe("Article body");
    expect(deviceB.readLaterEntries.b1).toMatchObject({ bookmarkId: "b1", status: "unread", queueOnly: true });
    expect(deviceB.lifecycleSettings.updatedAt).toBe(200);
  });

  it("delivers content to the second device (was always empty: gzip read with unzip)", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.contents.b1 = "# Article\n\nFull text";
    await syncAs(deviceA);
    await syncAs(deviceB);

    expect(deviceB.bookmarks.get("b1")).toBeDefined();
    expect(deviceB.contents.b1).toBe("# Article\n\nFull text");
  });

  it("refreshes content edited on another device, and only when it changed", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.contents.b1 = "v1";
    await syncAs(deviceA);
    await syncAs(deviceB);

    // Metadata-only edit on A: B must not download the chunk again
    deviceA.bookmarks.set("b1", bookmark("b1", { title: "renamed", updatedAt: 200 }));
    await syncAs(deviceA);
    state.getJSONCalls = [];
    await syncAs(deviceB);
    expect(deviceB.bookmarks.get("b1")?.title).toBe("renamed");
    expect(state.getJSONCalls.filter((p) => p.includes("/chunks/"))).toEqual([]);

    // Content edit on A: B picks up the new content
    deviceA.bookmarks.set("b1", bookmark("b1", { title: "renamed", updatedAt: 300 }));
    deviceA.contents.b1 = "v2";
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.contents.b1).toBe("v2");
  });

  it("does not re-upload unchanged content on metadata edits", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.contents.b1 = "body";
    await syncAs(deviceA);
    state.remote.delete(`${ROOT}/bookmarks/chunks/b1.gz.txt`);

    deviceA.bookmarks.set("b1", bookmark("b1", { tags: ["x"], updatedAt: 200 }));
    await syncAs(deviceA);
    expect(state.remote.has(`${ROOT}/bookmarks/chunks/b1.gz.txt`)).toBe(false);
    expect(remoteJSON<{ bookmarks: Array<{ contentHash?: string }> }>("bookmarks/meta.json").bookmarks[0].contentHash).toBe(
      contentFingerprint("body"),
    );
  });

  it("keeps local content when a chunk is missing or corrupt instead of writing an empty string", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.contents.b1 = "v1";
    await syncAs(deviceA);
    await syncAs(deviceB);

    deviceA.bookmarks.set("b1", bookmark("b1", { updatedAt: 200 }));
    deviceA.contents.b1 = "v2";
    await syncAs(deviceA);
    state.remote.set(`${ROOT}/bookmarks/chunks/b1.gz.txt`, JSON.stringify({ data: btoa("garbage") }));
    await syncAs(deviceB);
    expect(deviceB.contents.b1).toBe("v1");
  });

  it("repairs content lost by earlier versions, once", async () => {
    // Remote written by an old client: chunk present, meta without contentHash
    state.remote.set(`${ROOT}/bookmarks/meta.json`, JSON.stringify({ bookmarks: [bookmark("b1"), bookmark("img")], deletions: [] }));
    state.remote.set(`${ROOT}/bookmarks/chunks/b1.gz.txt`, JSON.stringify(encodeContentChunk("recovered")));
    // Device B pulled both bookmarks with the old engine: metadata present, content empty
    deviceB.bookmarks.set("b1", bookmark("b1"));
    deviceB.bookmarks.set("img", bookmark("img"));

    await syncAs(deviceB);
    expect(deviceB.contents.b1).toBe("recovered");
    expect(deviceB.repair).toEqual({ done: true, attempted: [] });

    state.getJSONCalls = [];
    await syncAs(deviceB);
    expect(state.getJSONCalls.filter((p) => p.includes("/chunks/"))).toEqual([]);
  });

  it("never copies hasSnapshot from another device (snapshots are not synced)", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1", { hasSnapshot: true }));
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.bookmarks.get("b1")?.hasSnapshot).toBe(false);

    deviceB.bookmarks.set("b1", { ...deviceB.bookmarks.get("b1")!, title: "edited on B", updatedAt: 500 });
    await syncAs(deviceB);
    await syncAs(deviceA);
    expect(deviceA.bookmarks.get("b1")).toMatchObject({ title: "edited on B", hasSnapshot: true });
  });
});

describe("remote data that this version cannot fully read", () => {
  it("keeps unreadable bookmarks in meta.json instead of overwriting the file", async () => {
    const future = { ...bookmark("future"), tags: "not-an-array" };
    state.remote.set(`${ROOT}/bookmarks/meta.json`, JSON.stringify({ bookmarks: [bookmark("b1"), future], deletions: [] }));
    deviceA.bookmarks.set("b2", bookmark("b2"));

    await syncAs(deviceA);

    const ids = remoteJSON<{ bookmarks: Array<{ id: string }> }>("bookmarks/meta.json").bookmarks.map((b) => b.id).sort();
    expect(ids).toEqual(["b1", "b2", "future"]);
    expect(deviceA.bookmarks.has("b1")).toBe(true);
    expect(deviceA.bookmarks.has("future")).toBe(false);
  });

  it("stops the sync on a corrupt file and leaves it untouched", async () => {
    state.remote.set(`${ROOT}/categories.json`, "{ broken json");
    deviceA.categories.push(category("c1"));

    await syncAs(deviceA);

    expect(state.remote.get(`${ROOT}/categories.json`)).toBe("{ broken json");
    const { syncConfigStorage } = await import("../sync-config-storage");
    expect(syncConfigStorage.setStatus).toHaveBeenCalledWith(expect.objectContaining({ status: "error", errorCode: "invalidRemoteData" }));
  });

  it("leaves settings written by a newer version alone", async () => {
    const newer = { ...baseSettings, language: "ja", updatedAt: 1 };
    state.remote.set(`${ROOT}/settings.json`, JSON.stringify(newer));
    deviceA.settings = { ...baseSettings, theme: "dark", updatedAt: 5 };

    await syncAs(deviceA);

    expect(remoteJSON("settings.json")).toEqual(newer);
    expect(deviceA.settings.theme).toBe("dark");
  });
});

describe("categories", () => {
  it("maps independently-created parents and descendants consistently on both devices and the remote", async () => {
    deviceA.categories = [category('a-root', { name: 'Work' }),
      category('a-child', { name: 'Writing', parentId: 'a-root' }),
      category('a-leaf', { name: 'Clips', parentId: 'a-child' })];
    deviceB.categories = [category('b-leaf', { name: 'Clips', parentId: 'b-child' }),
      category('unique', { name: 'New', parentId: 'b-child' }),
      category('b-child', { name: 'Writing', parentId: 'b-root' }),
      category('b-root', { name: 'Work' })];
    deviceB.bookmarks.set('b1', bookmark('b1', { categoryId: 'b-leaf' }));
    deviceB.contents.b1 = '# Preserved content';
    await syncAs(deviceA);
    await syncAs(deviceB);
    const expected = ['a-root', 'a-child', 'a-leaf', 'unique'].sort();
    const assertHierarchy = (categories: LocalCategory[]) => {
      expect(categories.map((c) => c.id).sort()).toEqual(expected);
      expect(categories.find((c) => c.id === 'unique')?.parentId).toBe('a-child');
      expect(categories.every((c) => !c.parentId || categories.some((p) => p.id === c.parentId))).toBe(true);
    };
    assertHierarchy(remoteJSON('categories.json'));
    assertHierarchy(deviceB.categories);
    expect(deviceB.bookmarks.get('b1')?.categoryId).toBe('a-leaf');
    await syncAs(deviceA);
    await syncAs(deviceB);
    assertHierarchy(deviceA.categories);
    assertHierarchy(deviceB.categories);
    assertHierarchy(remoteJSON('categories.json'));
    expect(deviceA.bookmarks.get('b1')?.categoryId).toBe('a-leaf');
    expect(deviceA.contents.b1).toBe('# Preserved content');
  });

  it("keeps category icons", async () => {
    deviceA.categories.push(category("c1", { icon: "📚" }));
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.categories[0]).toMatchObject({ id: "c1", icon: "📚" });
  });

  it("propagates renames in both directions", async () => {
    deviceA.categories.push(category("c1", { name: "Reading" }));
    await syncAs(deviceA);
    await syncAs(deviceB);

    deviceB.categories = [category("c1", { name: "To read", updatedAt: 200 })];
    await syncAs(deviceB);
    await syncAs(deviceA);
    expect(deviceA.categories[0].name).toBe("To read");
  });

  it("propagates deletions instead of re-importing the remote copy", async () => {
    deviceA.categories.push(category("parent"), category("child", { parentId: "parent" }), category("other"));
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.categories).toHaveLength(3);

    // Deleted on A (the storage records the tombstones)
    deviceA.categories = deviceA.categories.filter((c) => c.id === "other");
    deviceA.syncTombstones.categories = [
      { id: "parent", deletedAt: Date.now() },
      { id: "child", deletedAt: Date.now() },
    ];
    await syncAs(deviceA);
    expect(deviceA.categories.map((c) => c.id)).toEqual(["other"]);
    expect(remoteJSON<LocalCategory[]>("categories.json").map((c) => c.id)).toEqual(["other"]);

    await syncAs(deviceB);
    expect(deviceB.categories.map((c) => c.id)).toEqual(["other"]);

    // B does not push them back on its next sync either
    await syncAs(deviceB);
    await syncAs(deviceA);
    expect(deviceA.categories.map((c) => c.id)).toEqual(["other"]);
  });
});

describe("workspaces and tab-group rules", () => {
  it("normalizes workspace category parents and workspace references before uploading", async () => {
    deviceA.workspaceCategories = [category('a-root', { name: 'Work' }), category('a-child', { name: 'Writing', parentId: 'a-root' })];
    deviceB.workspaceCategories = [category('b-child', { name: 'Writing', parentId: 'b-root' }),
      category('unique', { name: 'New', parentId: 'b-child' }), category('b-root', { name: 'Work' })];
    deviceB.workspaces = [{ id: 'w1', name: 'Workspace', description: '', categoryId: 'b-child',
      tags: [], pages: [], isRestored: false, convertedToBookmarks: false, createdAt: 100, updatedAt: 100 } as Workspace];
    await syncAs(deviceA);
    await syncAs(deviceB);
    const remote = remoteJSON<{ categories: WorkspaceCategory[]; workspaces: Workspace[] }>('workspaces.json');
    expect(remote.categories.map((c) => c.id).sort()).toEqual(['a-child', 'a-root', 'unique']);
    expect(remote.categories.find((c) => c.id === 'unique')?.parentId).toBe('a-child');
    expect(remote.workspaces[0].categoryId).toBe('a-child');
    expect(deviceB.workspaceCategories.map((c) => c.id).sort()).toEqual(['a-child', 'a-root', 'unique']);
    await syncAs(deviceA);
    expect(deviceA.workspaces[0].categoryId).toBe('a-child');
  });

  it("propagates rule deletions", async () => {
    deviceA.rules.push(rule("r1"), rule("r2"));
    await syncAs(deviceA);
    await syncAs(deviceB);

    deviceA.rules = [rule("r2")];
    deviceA.syncTombstones.tabGroupRules = [{ id: "r1", deletedAt: Date.now() }];
    await syncAs(deviceA);
    await syncAs(deviceB);
    await syncAs(deviceA);

    expect(deviceA.rules.map((r) => r.id)).toEqual(["r2"]);
    expect(deviceB.rules.map((r) => r.id)).toEqual(["r2"]);
  });

  it("keeps an item edited after it was deleted elsewhere", async () => {
    deviceA.rules.push(rule("r1"));
    await syncAs(deviceA);
    await syncAs(deviceB);

    const deletedAt = Date.now();
    deviceA.rules = [];
    deviceA.syncTombstones.tabGroupRules = [{ id: "r1", deletedAt }];
    deviceB.rules = [rule("r1", { name: "edited", updatedAt: deletedAt + 1000 })];
    await syncAs(deviceA);
    await syncAs(deviceB);
    await syncAs(deviceA);

    expect(deviceA.rules.map((r) => r.name)).toEqual(["edited"]);
    expect(remoteJSON<SyncTombstones>("deletions.json").tabGroupRules).toEqual([]);
  });

  it("propagates workspace deletions", async () => {
    const workspace = {
      id: "w1",
      name: "Research",
      description: "",
      categoryId: null,
      tags: [],
      pages: [],
      isRestored: false,
      convertedToBookmarks: false,
      createdAt: 100,
      updatedAt: 100,
    } as Workspace;
    deviceA.workspaces.push(workspace);
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.workspaces).toHaveLength(1);

    deviceA.workspaces = [];
    deviceA.syncTombstones.workspaces = [{ id: "w1", deletedAt: Date.now() }];
    await syncAs(deviceA);
    await syncAs(deviceB);
    await syncAs(deviceA);
    expect(deviceA.workspaces).toEqual([]);
    expect(deviceB.workspaces).toEqual([]);
  });
});

describe("clips", () => {
  it("drops clips of bookmarks deleted for good instead of re-importing them", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    deviceA.clips.push({
      id: "clip1",
      bookmarkId: "b1",
      type: "highlight",
      text: "quote",
      sourceUrl: "https://example.com/b1",
      createdAt: 100,
      updatedAt: 100,
    } as BookmarkClip);
    await syncAs(deviceA);
    await syncAs(deviceB);
    expect(deviceB.clips).toHaveLength(1);

    // Purged on A: the bookmark and its clips are gone, a tombstone remains
    deviceA.bookmarks.delete("b1");
    deviceA.clips = [];
    deviceA.tombstones = [{ id: "b1", deletedAt: Date.now() }];
    await syncAs(deviceA);
    expect(remoteJSON<{ clips: unknown[] }>("bookmarks/clips.json").clips).toEqual([]);

    await syncAs(deviceB);
    expect(deviceB.bookmarks.has("b1")).toBe(false);
    expect(deviceB.clips).toEqual([]);
  });
});

describe("lock", () => {
  it("backs off when another client overwrote the lock at the same time", async () => {
    deviceA.bookmarks.set("b1", bookmark("b1"));
    state.stealLock = true;
    await syncAs(deviceA);
    expect(state.remote.has(`${ROOT}/bookmarks/meta.json`)).toBe(false);
  });
});
