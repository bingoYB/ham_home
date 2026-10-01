import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import type {
  BrowserContext,
  Locator,
  Page,
  TestInfo,
  Worker,
} from "@playwright/test";
import { expect, extPageUrl } from "../fixtures";
import {
  getStorageState,
  indexedDbNames,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
  seedEmbedding,
  seedSnapshot,
  seedSyncStatus,
  seedTabGroupRules,
  seedWebDAVConfig,
  seedWorkspaces,
} from "../helpers/storage";
import type { E2EVariant } from "../helpers/variants";
import {
  DEMO_AGENT_MESSAGES,
  DEMO_BOOKMARKS,
  DEMO_CATEGORIES,
  DEMO_CUSTOM_FILTERS,
  DEMO_PINNED_ITEMS,
  DEMO_TAB_GROUP_RULES,
  DEMO_WORKSPACE_CATEGORIES,
  DEMO_WORKSPACES,
  POPUP_AI_ANALYSIS,
  POPUP_CURRENT_PAGE,
  SCREENSHOT_BASE_TIME,
  demoEmbeddings,
  demoSnapshotHtml,
} from "./screenshot-data";
import {
  DEMO_GALLERY_SITES,
  DEMO_IMAGE_CLIPS,
  DEMO_INSPIRATION_CATEGORY,
  ICON_SET_ANALYSIS,
  ICON_SET_IMAGE_URL,
  IMAGE_CLIP_HOST,
  demoHealthRecords,
  showcaseBookmarks,
  showcaseClips,
} from "./screenshot-rich-data";
import {
  GALLERY_PAGE_SIZE,
  clipArtwork,
  galleryPageHtml,
  type ArtworkSpec,
} from "./screenshot-visuals";
import type {
  AIConfig,
  AnalysisResult,
  BookmarkScreenshotMetadata,
  ChatMessage,
  EmbeddingConfig,
} from "../../types";

export const APP_VIEWPORT = { width: 1440, height: 960 };
export const POPUP_VIEWPORT = { width: 420, height: 640 };
export const CONTENT_VIEWPORT = { width: 1440, height: 960 };

export function screenshotVariantFolder(variant: E2EVariant): string {
  if (variant.name === "englishDark") return "en-dark";
  if (variant.name === "english") return "en-light";
  if (variant.name === "dark") return "zh-dark";
  return "zh-light";
}

export function screenshotTheme(variant: E2EVariant): "light" | "dark" {
  return variant.theme === "dark" ? "dark" : "light";
}

export async function prepareScreenshotState(
  worker: Worker,
  variant: E2EVariant,
): Promise<void> {
  await resetExtensionData(worker, {
    settings: {
      ...variant.settings,
      language: variant.language,
      theme: screenshotTheme(variant),
      panelPosition: "left",
      autoSaveSnapshot: true,
      autoSaveScreenshot: true,
      enableOmniboxSearch: true,
    },
  });

  await clearExtraDatabases(worker);
  await seedCategories(worker, [...DEMO_CATEGORIES, DEMO_INSPIRATION_CATEGORY]);
  await seedBookmarks(worker, showcaseBookmarks(Date.now()));
  await seedClipsAndHealth(worker);
  await seedWorkspaces(worker, DEMO_WORKSPACES, DEMO_WORKSPACE_CATEGORIES);
  await seedTabGroupRules(worker, DEMO_TAB_GROUP_RULES, {
    aiAutoGroupEnabled: true,
    aiAutoGroupInstructions:
      "Group research tabs by project intent first, then keep docs and dashboards separate.",
    domainAutoGroupEnabled: false,
    updatedAt: SCREENSHOT_BASE_TIME,
  });

  await seedWebDAVConfig(worker, {
    enabled: true,
    url: "https://dav.hamhome.demo/remote.php/dav/files/showcase/",
    username: "demo@hamhome.app",
    password: "demo-password",
    e2ePassword: "demo-e2e-key",
  });
  await seedSyncStatus(worker, {
    lastSyncTime: SCREENSHOT_BASE_TIME - 42 * 60 * 1000,
    syncVersion: "showcase-2026-06-15",
    status: "idle",
  });

  for (const bookmark of DEMO_BOOKMARKS.filter((item) => item.hasSnapshot)) {
    await seedSnapshot(worker, bookmark.id, demoSnapshotHtml(bookmark));
  }

  for (const embedding of demoEmbeddings()) {
    await seedEmbedding(worker, embedding);
  }

  await seedScreenshotConfig(worker, variant);
  await seedAICache(worker, [
    { key: POPUP_CURRENT_PAGE.url, analysis: POPUP_AI_ANALYSIS },
    // Image clips use a versioned cache key, see background analyzeClip()
    { key: `clip-image-v2:${ICON_SET_IMAGE_URL}`, analysis: ICON_SET_ANALYSIS },
  ]);
  await seedAgentSession(worker, DEMO_AGENT_MESSAGES);

  // Give WXT storage watchers a short beat before pages read the seeded state.
  await worker.evaluate(() => new Promise((resolve) => setTimeout(resolve, 100)));
}

export async function openExtensionAppPage(
  context: BrowserContext,
  extensionId: string,
  route = "all",
): Promise<Page> {
  const page = await context.newPage();
  await page.setViewportSize(APP_VIEWPORT);
  await page.goto(extPageUrl(extensionId, `app.html#${route}`));
  await expect(page.locator("#root")).toBeVisible();
  return page;
}

export async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  variant: E2EVariant,
  name: string,
  options: { fullPage?: boolean; timeoutMs?: number } = {},
): Promise<string> {
  await stabilizeForScreenshot(page, options.timeoutMs);
  const outputDir = screenshotOutputDir(testInfo, variant);
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${name}.png`);
  await page.screenshot({
    path: filePath,
    fullPage: options.fullPage ?? false,
    animations: "disabled",
    caret: "hide",
  });
  return filePath;
}

export async function captureElementScreenshot(
  page: Page,
  locator: Locator,
  testInfo: TestInfo,
  variant: E2EVariant,
  name: string,
  options: { timeoutMs?: number } = {},
): Promise<string> {
  await stabilizeForScreenshot(page, options.timeoutMs);
  const outputDir = screenshotOutputDir(testInfo, variant);
  await fs.mkdir(outputDir, { recursive: true });
  const filePath = path.join(outputDir, `${name}.png`);
  await locator.screenshot({
    path: filePath,
    animations: "disabled",
    caret: "hide",
  });
  return filePath;
}

export async function stabilizeForScreenshot(
  page: Page,
  timeoutMs = 500,
): Promise<void> {
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    if ("fonts" in document) {
      await document.fonts.ready;
    }
  });
  await page.waitForTimeout(timeoutMs);
}

export function screenshotOutputDir(
  testInfo: TestInfo,
  variant: E2EVariant,
): string {
  const configured = testInfo.config.metadata?.screenshotDir;
  const root =
    typeof configured === "string"
      ? configured
      : path.resolve(__dirname, "../../output/screenshots");
  return path.join(root, screenshotVariantFolder(variant));
}

export async function assertScreenshotData(worker: Worker): Promise<void> {
  const state = await getStorageState(worker);
  const bookmarks = (state.local.bookmarks as unknown[]) ?? [];
  const categories = (state.sync.categories as unknown[]) ?? [];
  const workspaces = (state.local.workspaces as unknown[]) ?? [];
  const rules = (state.sync.tabGroupRules as unknown[]) ?? [];

  expect(bookmarks.length).toBeGreaterThanOrEqual(35);
  expect(categories.length).toBeGreaterThanOrEqual(8);
  expect(workspaces.length).toBeGreaterThanOrEqual(3);
  expect(rules.length).toBeGreaterThanOrEqual(8);
}

export const SHOWCASE_PAGE_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>HamHome Research Dashboard</title>
    <meta name="description" content="A dense product research page used for extension screenshots." />
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f8fb;
        color: #121826;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.95), rgba(244, 247, 251, 0.9)),
          repeating-linear-gradient(90deg, rgba(15, 23, 42, 0.04) 0 1px, transparent 1px 88px);
      }
      header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 22px 42px;
        border-bottom: 1px solid #dde3ee;
        background: rgba(255, 255, 255, 0.86);
        backdrop-filter: blur(12px);
      }
      main {
        display: grid;
        grid-template-columns: 1.1fr 0.9fr;
        gap: 24px;
        padding: 34px 42px;
      }
      h1 {
        margin: 0;
        font-size: 34px;
        letter-spacing: 0;
      }
      h2 {
        margin: 0 0 14px;
        font-size: 18px;
      }
      p {
        line-height: 1.6;
      }
      .muted {
        color: #64748b;
      }
      .panel {
        border: 1px solid #dce3ef;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.9);
        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
        padding: 22px;
      }
      .stats {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-top: 22px;
      }
      .stat {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 14px;
        background: #ffffff;
      }
      .stat strong {
        display: block;
        font-size: 24px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .card {
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        background: #fff;
        padding: 16px;
      }
      .tag {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        background: #eef2ff;
        color: #3730a3;
        padding: 5px 9px;
        margin: 0 6px 8px 0;
        font-size: 12px;
        font-weight: 600;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 14px;
      }
      td, th {
        border-bottom: 1px solid #e2e8f0;
        padding: 10px 8px;
        text-align: left;
      }
    </style>
  </head>
  <body>
    <header>
      <strong>Acme Research OS</strong>
      <span class="muted">Weekly product intelligence dashboard</span>
    </header>
    <main>
      <section class="panel">
        <h1>AI Search Feature Planning</h1>
        <p class="muted">A working dashboard for collecting references, launch notes, product analytics, and engineering docs. HamHome should open from the page edge and reveal the saved research library.</p>
        <div class="stats">
          <div class="stat"><strong>42</strong><span class="muted">sources</span></div>
          <div class="stat"><strong>8</strong><span class="muted">themes</span></div>
          <div class="stat"><strong>12</strong><span class="muted">snapshots</span></div>
          <div class="stat"><strong>28</strong><span class="muted">vectors</span></div>
        </div>
        <h2 style="margin-top: 28px;">Priority trails</h2>
        <div>
          <span class="tag">retrieval</span>
          <span class="tag">evals</span>
          <span class="tag">React</span>
          <span class="tag">launch</span>
          <span class="tag">analytics</span>
        </div>
      </section>
      <section class="grid">
        <article class="card">
          <h2>Architecture links</h2>
          <p class="muted">Server components, tool calling, semantic index rebuilds, and storage sync constraints.</p>
        </article>
        <article class="card">
          <h2>Launch notes</h2>
          <p class="muted">Positioning, onboarding copy, billing assumptions, and product metrics.</p>
        </article>
        <article class="card" style="grid-column: 1 / -1;">
          <h2>Open decisions</h2>
          <table>
            <tr><th>Topic</th><th>Status</th><th>Owner</th></tr>
            <tr><td>Embedding rebuild UX</td><td>Ready</td><td>Engineering</td></tr>
            <tr><td>AI source citations</td><td>Review</td><td>Product</td></tr>
            <tr><td>WebDAV conflict copy</td><td>Draft</td><td>Docs</td></tr>
          </table>
        </article>
      </section>
    </main>
  </body>
</html>`;

async function clearExtraDatabases(worker: Worker): Promise<void> {
  await worker.evaluate(async () => {
    await Promise.all([
      deleteDatabase("HamHomeAICache"),
      deleteDatabase("hamhome-global-agent"),
    ]);

    function deleteDatabase(name: string): Promise<void> {
      return new Promise((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onsuccess = () => resolve();
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
      });
    }
  });
}

async function seedScreenshotConfig(
  worker: Worker,
  variant: E2EVariant,
): Promise<void> {
  await worker.evaluate(
    async ({ language, baseTime, customFilters, pinnedItems }) => {
      const current = await chrome.storage.sync.get([
        "aiConfig",
        "embeddingConfig",
      ]);
      const aiConfig = current.aiConfig as AIConfig;
      const embeddingConfig = current.embeddingConfig as EmbeddingConfig;

      await chrome.storage.sync.set({
        aiConfig: {
          ...aiConfig,
          provider: "custom",
          apiKey: "showcase-api-key",
          baseUrl: "http://127.0.0.1:31415/v1",
          model: "showcase-agent-model",
          enableSmartCategory: true,
          enableTagSuggestion: true,
          enableTranslation: false,
          privacyDomains: ["bank.example", "accounts.internal", "hr.acme.test"],
          autoDetectPrivacy: true,
          language,
          presetTags: [
            "ai",
            "react",
            "growth",
            "docs",
            "ops",
            "design-system",
          ],
        },
        embeddingConfig: {
          ...embeddingConfig,
          enabled: true,
          provider: "custom",
          apiKey: "showcase-embedding-key",
          baseUrl: "http://127.0.0.1:31415/v1",
          model: "e2e-embedding-model",
          batchSize: 16,
        },
        customFilters,
        pinnedItems,
        settings: {
          ...(await chrome.storage.sync.get("settings")).settings,
          updatedAt: baseTime,
        },
      });
    },
    {
      language: variant.language,
      baseTime: SCREENSHOT_BASE_TIME,
      customFilters: DEMO_CUSTOM_FILTERS,
      pinnedItems: DEMO_PINNED_ITEMS,
    },
  );
}

async function seedAICache(
  worker: Worker,
  entries: Array<{ key: string; analysis: AnalysisResult }>,
): Promise<void> {
  await worker.evaluate(
    async ({ entries: cacheEntries, baseTime }) => {
      const openDb = (
        name: string,
        version: number,
        upgrade: (database: IDBDatabase) => void,
      ): Promise<IDBDatabase> =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = () => upgrade(request.result);
        });
      const transactionDone = (
        transaction: IDBTransaction,
        run: (transaction: IDBTransaction) => void,
      ): Promise<void> =>
        new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          run(transaction);
        });

      const db = await openDb("HamHomeAICache", 1, (database) => {
        if (!database.objectStoreNames.contains("analyses")) {
          const store = database.createObjectStore("analyses", { keyPath: "id" });
          store.createIndex("url", "url", { unique: true });
          store.createIndex("expiresAt", "expiresAt");
        }
      });
      await transactionDone(db.transaction("analyses", "readwrite"), (tx) => {
        const store = tx.objectStore("analyses");
        for (const { key, analysis } of cacheEntries) {
          store.put({
            id: key,
            url: key,
            analysisResult: analysis,
            createdAt: baseTime,
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
          });
        }
      });
    },
    { entries, baseTime: SCREENSHOT_BASE_TIME },
  );
}

async function seedClipsAndHealth(worker: Worker): Promise<void> {
  const health = Object.fromEntries(
    demoHealthRecords().map((record) => [record.bookmarkId, record]),
  );
  await worker.evaluate(
    async ({ clips, healthMap }) => {
      await chrome.storage.local.set({
        bookmarkClips: clips,
        bookmarkHealth: healthMap,
      });
    },
    { clips: showcaseClips(), healthMap: health },
  );
}

/**
 * Render the fictional gallery pages and clip artworks, store the pages as
 * bookmark screenshots and serve the artworks at their image clip URLs.
 */
export async function seedShowcaseVisuals(
  context: BrowserContext,
  worker: Worker,
): Promise<void> {
  const renderer = await context.newPage();
  const screenshots: Array<{
    bookmarkId: string;
    sourceUrl: string;
    image: string;
    thumbnail: string;
    imageSize: number;
    thumbnailSize: number;
  }> = [];

  for (const site of DEMO_GALLERY_SITES) {
    const png = await renderHtml(renderer, {
      ...GALLERY_PAGE_SIZE,
      html: galleryPageHtml(site.template),
    });
    const image = await sharp(png).webp({ quality: 86 }).toBuffer();
    const thumbnail = await sharp(png)
      .resize({ width: 640 })
      .webp({ quality: 82 })
      .toBuffer();
    screenshots.push({
      bookmarkId: site.id,
      sourceUrl: site.url,
      image: image.toString("base64"),
      thumbnail: thumbnail.toString("base64"),
      imageSize: image.length,
      thumbnailSize: thumbnail.length,
    });
  }

  const artworks = new Map<string, Buffer>();
  for (const item of DEMO_IMAGE_CLIPS) {
    artworks.set(
      new URL(item.clip.imageSourceUrl!).pathname,
      await renderHtml(renderer, clipArtwork(item.artwork)),
    );
  }
  artworks.set(
    new URL(ICON_SET_IMAGE_URL).pathname,
    await renderHtml(renderer, clipArtwork("iconSet")),
  );
  await renderer.close();

  await context.route(`${IMAGE_CLIP_HOST}/**`, async (route) => {
    const body = artworks.get(new URL(route.request().url()).pathname);
    if (!body) return route.fulfill({ status: 404 });
    return route.fulfill({ status: 200, contentType: "image/png", body });
  });

  await worker.evaluate(
    async ({ items, dbName, imageStore, thumbnailStore, size, capturedAt }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        // Same schema as lib/storage/bookmark-screenshot-storage.ts (version 1)
        const request = indexedDB.open(dbName, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = () => {
          const database = request.result;
          for (const name of [imageStore, thumbnailStore]) {
            if (!database.objectStoreNames.contains(name)) {
              database.createObjectStore(name, { keyPath: "bookmarkId" });
            }
          }
        };
      });
      const toBlob = (base64: string) => {
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        return new Blob([bytes], { type: "image/webp" });
      };

      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([imageStore, thumbnailStore], "readwrite");
        for (const item of items) {
          tx.objectStore(imageStore).put({
            bookmarkId: item.bookmarkId,
            blob: toBlob(item.image),
          });
          tx.objectStore(thumbnailStore).put({
            bookmarkId: item.bookmarkId,
            blob: toBlob(item.thumbnail),
          });
        }
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();

      const index: Record<string, BookmarkScreenshotMetadata> = {};
      items.forEach((item, order) => {
        index[item.bookmarkId] = {
          id: `shot-${item.bookmarkId}`,
          bookmarkId: item.bookmarkId,
          sourceUrl: item.sourceUrl,
          mimeType: "image/webp",
          width: size.width,
          height: size.height,
          size: item.imageSize,
          thumbnailSize: item.thumbnailSize,
          capturedAt: capturedAt - order * 60 * 60 * 1000,
          updatedAt: capturedAt - order * 60 * 60 * 1000,
        };
      });
      await chrome.storage.local.set({ bookmarkScreenshotIndex: index });
    },
    {
      items: screenshots,
      dbName: indexedDbNames.assets,
      imageStore: indexedDbNames.assetImageStore,
      thumbnailStore: indexedDbNames.assetThumbnailStore,
      size: GALLERY_PAGE_SIZE,
      capturedAt: SCREENSHOT_BASE_TIME,
    },
  );
}

async function renderHtml(page: Page, spec: ArtworkSpec): Promise<Buffer> {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.setContent(spec.html, { waitUntil: "load" });
  await page.evaluate(async () => {
    if ("fonts" in document) await document.fonts.ready;
  });
  return page.screenshot({ type: "png", animations: "disabled" });
}

/** Wait until the named images have actually decoded, not just mounted */
export async function waitForImagesLoaded(
  page: Page,
  names: string[],
): Promise<void> {
  for (const name of names) {
    const image = page.getByRole("img", { name, exact: true }).first();
    await expect(image).toBeVisible();
    await expect
      .poll(() =>
        image.evaluate(
          (element) =>
            (element as HTMLImageElement).complete &&
            (element as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
  }
}

async function seedAgentSession(
  worker: Worker,
  messages: ChatMessage[],
): Promise<void> {
  await worker.evaluate(
    async ({ messages: chatMessages, baseTime }) => {
      const openDb = (
        name: string,
        version: number,
        upgrade: (database: IDBDatabase) => void,
      ): Promise<IDBDatabase> =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
          request.onupgradeneeded = () => upgrade(request.result);
        });
      const transactionDone = (
        transaction: IDBTransaction,
        run: (transaction: IDBTransaction) => void,
      ): Promise<void> =>
        new Promise((resolve, reject) => {
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          run(transaction);
        });

      const db = await openDb("hamhome-global-agent", 1, (database) => {
        if (!database.objectStoreNames.contains("sessions")) {
          database.createObjectStore("sessions", { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains("messages")) {
          const store = database.createObjectStore("messages", { keyPath: "id" });
          store.createIndex("bySessionId", "sessionId", { unique: false });
        }
      });

      const sessionId = "session-showcase";
      await transactionDone(
        db.transaction(["sessions", "messages"], "readwrite"),
        (tx) => {
          tx.objectStore("sessions").put({
            id: sessionId,
            title: "AI search planning",
            createdAt: baseTime - 10 * 60 * 1000,
            updatedAt: baseTime,
            metadata: {
              agentState: {
                filters: {},
                seenBookmarkIds: ["bm-00", "bm-22", "bm-23", "bm-36"],
                lastSelectedBookmarkIds: ["bm-00", "bm-22", "bm-23", "bm-36"],
                lastQuery: chatMessages[0]?.content,
                history: [],
              },
            },
          });

          const store = tx.objectStore("messages");
          chatMessages.forEach((message, index) => {
            store.put({
              id: `message-showcase-${index}`,
              sessionId,
              message: {
                role: message.role,
                content: message.content,
                metadata: {
                  sources: message.sources,
                  steps: message.steps,
                },
              },
              createdAt: message.timestamp,
              sequence: index,
            });
          });
        },
      );
    },
    { messages, baseTime: SCREENSHOT_BASE_TIME },
  );
}
