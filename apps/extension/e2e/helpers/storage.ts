import type { Worker } from "@playwright/test";
import type { BatchAITask } from "../../lib/storage/ai-task-storage";
import type {
  BookmarkEmbedding,
  LocalBookmark,
  LocalCategory,
  LocalSettings,
  SyncStatus,
  TabGroupAutoGroupSettings,
  TabGroupRule,
  WebDAVConfig,
  Workspace,
  WorkspaceCategory,
} from "../../types";
import { E2E_EXTENSION_CONFIG } from "../e2e.config";

const SNAPSHOT_DB = "hamhome-snapshots";
const ASSET_DB = "hamhome-assets";
const VECTOR_DB = "HamHomeVectors";
const VECTOR_STORE = "bookmarkEmbeddings";

export interface ExtensionStorageState {
  local: Record<string, unknown>;
  sync: Record<string, unknown>;
}

interface ResetExtensionDataOptions {
  settings?: Partial<LocalSettings>;
}

const DEFAULT_SETTINGS: LocalSettings = {
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
  updatedAt: Date.now(),
};

export async function resetExtensionData(
  worker: Worker,
  options: ResetExtensionDataOptions = {},
): Promise<void> {
  await worker.evaluate(async ({ config, settings }) => {
    await Promise.all([chrome.storage.local.clear(), chrome.storage.sync.clear()]);
    await chrome.storage.sync.set({
      aiConfig: config.aiConfig,
      embeddingConfig: config.embeddingConfig,
      settings: {
        ...settings.defaults,
        ...settings.overrides,
        updatedAt: Date.now(),
      },
    });

    await Promise.all([
      deleteDatabase("hamhome-snapshots"),
      deleteDatabase("hamhome-assets"),
      deleteDatabase("HamHomeVectors"),
    ]);

    function deleteDatabase(name: string): Promise<void> {
      return new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  }, {
    config: E2E_EXTENSION_CONFIG,
    settings: {
      defaults: DEFAULT_SETTINGS,
      overrides: options.settings ?? {},
    },
  });
}

export async function seedBookmarks(
  worker: Worker,
  bookmarks: LocalBookmark[],
): Promise<void> {
  await worker.evaluate(async (items) => {
    const contents: Record<string, string> = {};
    const metas = items.map((bookmark) => {
      const { content, ...meta } = bookmark;
      if (content) contents[bookmark.id] = content;
      return meta;
    });
    await chrome.storage.local.set({
      bookmarks: metas,
      bookmarkContents: contents,
    });
  }, bookmarks);
}

export async function seedCategories(
  worker: Worker,
  categories: LocalCategory[],
): Promise<void> {
  await worker.evaluate(
    async (items) => chrome.storage.sync.set({ categories: items }),
    categories,
  );
}

export async function seedWorkspaces(
  worker: Worker,
  workspaces: Workspace[],
  categories: WorkspaceCategory[] = [],
): Promise<void> {
  await worker.evaluate(
    async ({ workspaces: workspaceItems, categories: categoryItems }) => {
      await chrome.storage.local.set({
        workspaces: workspaceItems,
        workspaceCategories: categoryItems,
      });
    },
    { workspaces, categories },
  );
}

export async function seedTabGroupRules(
  worker: Worker,
  rules: TabGroupRule[],
  settings?: Partial<TabGroupAutoGroupSettings>,
): Promise<void> {
  await worker.evaluate(
    async ({ rules: ruleItems, settings: autoGroupSettings }) => {
      await chrome.storage.sync.set({
        tabGroupRules: ruleItems,
        tabGroupAutoGroupSettings: {
          aiAutoGroupEnabled: false,
          aiAutoGroupInstructions: "",
          domainAutoGroupEnabled: false,
          updatedAt: Date.now(),
          ...autoGroupSettings,
        },
      });
    },
    { rules, settings: settings ?? {} },
  );
}

export async function seedSettings(
  worker: Worker,
  settings: Partial<LocalSettings>,
): Promise<void> {
  await worker.evaluate(
    async ({ defaults, value }) => {
      const current = await chrome.storage.sync.get("settings");
      await chrome.storage.sync.set({
        settings: {
          ...defaults,
          ...(current.settings ?? {}),
          ...value,
          updatedAt: Date.now(),
        },
      });
    },
    { defaults: DEFAULT_SETTINGS, value: settings },
  );
}

export async function seedWebDAVConfig(
  worker: Worker,
  config: Partial<WebDAVConfig>,
): Promise<void> {
  await worker.evaluate(
    async (value) => {
      await chrome.storage.local.set({
        webdavConfig: {
          enabled: false,
          url: "",
          username: "",
          password: "",
          e2ePassword: "",
          ...value,
        },
      });
    },
    config,
  );
}

export async function seedSyncStatus(
  worker: Worker,
  status: Partial<SyncStatus>,
): Promise<void> {
  await worker.evaluate(
    async (value) => {
      await chrome.storage.local.set({
        syncStatus: {
          lastSyncTime: 0,
          syncVersion: "",
          status: "idle",
          ...value,
        },
      });
    },
    status,
  );
}

export async function seedBatchAITask(
  worker: Worker,
  task: BatchAITask,
): Promise<void> {
  await worker.evaluate(async (value) => {
    await chrome.storage.local.set({
      batchAITaskPayload: value.payload,
      batchAITaskProgress: value.progress,
    });
  }, task);
}

export async function seedSnapshot(
  worker: Worker,
  bookmarkId: string,
  html: string,
): Promise<void> {
  await worker.evaluate(
    async ({ bookmarkId: id, html: content }) => {
      const db = await openSnapshotDB();
      await new Promise<void>((resolve, reject) => {
        const blob = new Blob([content], { type: "text/html" });
        const tx = db.transaction("snapshots", "readwrite");
        const store = tx.objectStore("snapshots");
        store.put({
          id: `snapshot-${id}`,
          bookmarkId: id,
          html: blob,
          type: "text/html",
          size: blob.size,
          createdAt: Date.now(),
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      function openSnapshotDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open("hamhome-snapshots", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("snapshots")) {
              const store = db.createObjectStore("snapshots", { keyPath: "id" });
              store.createIndex("bookmarkId", "bookmarkId", { unique: true });
              store.createIndex("createdAt", "createdAt", { unique: false });
            }
          };
        });
      }
    },
    { bookmarkId, html },
  );
}

export async function seedEmbedding(
  worker: Worker,
  embedding: BookmarkEmbedding,
): Promise<void> {
  await worker.evaluate(
    async (item) => {
      const db = await openVectorDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("bookmarkEmbeddings", "readwrite");
        tx.objectStore("bookmarkEmbeddings").put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });

      function openVectorDB(): Promise<IDBDatabase> {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open("HamHomeVectors", 1);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains("bookmarkEmbeddings")) {
              const store = db.createObjectStore("bookmarkEmbeddings", {
                keyPath: "bookmarkId",
              });
              store.createIndex("modelKey", "modelKey", { unique: false });
              store.createIndex("checksum", "checksum", { unique: false });
              store.createIndex("bookmarkId_modelKey", ["bookmarkId", "modelKey"], {
                unique: true,
              });
            }
          };
        });
      }
    },
    embedding,
  );
}

export async function getStorageState(
  worker: Worker,
): Promise<ExtensionStorageState> {
  return worker.evaluate(async () => ({
    local: await chrome.storage.local.get(null),
    sync: await chrome.storage.sync.get(null),
  }));
}

export async function getBookmarks(worker: Worker): Promise<LocalBookmark[]> {
  return worker.evaluate(async () => {
    const { bookmarks = [], bookmarkContents = {} } =
      await chrome.storage.local.get(["bookmarks", "bookmarkContents"]);
    return bookmarks
      .filter((bookmark: LocalBookmark) => !bookmark.isDeleted)
      .map((bookmark: LocalBookmark) => ({
        ...bookmark,
        content: bookmarkContents[bookmark.id],
      }));
  });
}

export async function getScreenshotAssetSizes(
  worker: Worker,
  bookmarkId: string,
): Promise<{ image: number; thumbnail: number }> {
  return worker.evaluate(async (id) => {
    const db = await openAssetDB();
    const [image, thumbnail] = await Promise.all([
      getBlob("screenshotImages"),
      getBlob("screenshotThumbnails"),
    ]);
    db.close();
    return { image: image?.size ?? 0, thumbnail: thumbnail?.size ?? 0 };

    function openAssetDB(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("hamhome-assets", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    function getBlob(storeName: string): Promise<Blob | null> {
      return new Promise((resolve, reject) => {
        const request = db.transaction(storeName, "readonly").objectStore(storeName).get(id);
        request.onsuccess = () => resolve(request.result?.blob ?? null);
        request.onerror = () => reject(request.error);
      });
    }
  }, bookmarkId);
}

export async function clearHtmlImportTask(worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    await chrome.storage.local.set({
      htmlImportTaskPayload: null,
      htmlImportTaskProgress: null,
    });
  });
}

export const indexedDbNames = {
  snapshots: SNAPSHOT_DB,
  assets: ASSET_DB,
  vectors: VECTOR_DB,
  vectorStore: VECTOR_STORE,
};
