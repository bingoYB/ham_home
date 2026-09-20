import { test, expect } from "../fixtures";
import { E2E_EXTENSION_CONFIG } from "../e2e.config";
import { createBookmarkFixture, createLibraryFixtures } from "../helpers/factories";
import {
  attachStepScreenshot,
  openAppPage,
  openControlledPopupPage,
} from "../helpers/pages";
import {
  getBookmarks,
  getStorageState,
  resetExtensionData,
  seedBookmarks,
  seedCategories,
  seedSyncStatus,
  seedWebDAVConfig,
} from "../helpers/storage";

const AI_CURRENT_PAGE = {
  tabId: 9101,
  url: "https://ai.e2e.test/manual-save",
  title: "AI Manual Save Page",
  content: {
    url: "https://ai.e2e.test/manual-save",
    title: "AI Manual Save Page",
    content: "",
    htmlContent: "",
    textContent: "This content intentionally triggers the AI suggestion entry.",
    excerpt: "AI suggestion entry test",
    favicon: "",
  },
};

test.describe("AI 与同步核心流程", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  });

  test("AI-001 未配置 AI 时的建议入口", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    await extensionWorker.evaluate(async (config) => {
      await chrome.storage.sync.set({
        aiConfig: {
          ...config.aiConfig,
          apiKey: "",
          baseUrl: "",
          model: "",
        },
      });
    }, E2E_EXTENSION_CONFIG);

    const popup = await openControlledPopupPage(context, extensionId, AI_CURRENT_PAGE);
    await popup.getByText(/获取推荐|Get Suggestions/).first().click();
    await expect(popup.getByText(/AI 未配置，使用手动填写|AI not configured, using manual input/)).toBeVisible();
    await attachStepScreenshot(popup, testInfo, "AI-001-未配置提示");

    const [settingsPage] = await Promise.all([
      context.waitForEvent("page"),
      popup.getByText(/去配置|Configure/).click(),
    ]);
    await expect
      .poll(() => settingsPage.evaluate(() => window.location.hash))
      .toBe("#settings");

    await popup.bringToFront();
    await popup.getByLabel(/标题|Title/).fill("AI 未配置手动保存");
    await popup.getByLabel(/摘要|Summary/).fill("AI 不可用时仍可手动保存");
    await attachStepScreenshot(popup, testInfo, "AI-001-手动保存表单");
    await popup.getByRole("button", { name: /保存书签|Save Bookmark/ }).click();

    await expect
      .poll(async () => getBookmarks(extensionWorker))
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            url: AI_CURRENT_PAGE.url,
            title: "AI 未配置手动保存",
            description: "AI 不可用时仍可手动保存",
          }),
        ]),
      );
  });

  test("AI-002 AI 配置连接失败态", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    await extensionWorker.evaluate(async (config) => {
      await chrome.storage.sync.set({
        aiConfig: {
          ...config.aiConfig,
          apiKey: "e2e-secret-ai-key",
          baseUrl: "http://127.0.0.1:9/v1",
          model: "e2e-unreachable-model",
        },
      });
    }, E2E_EXTENSION_CONFIG);

    const page = await openAppPage(context, extensionId, "settings");
    await page.getByRole("button", { name: /测试连接|Test Connection/ }).first().click();
    await expect(
      page.getByRole("button", { name: /测试中|测试连接|Testing|Test Connection/ }).first(),
    ).toBeVisible();
    await expect(page.getByText(/连接失败|失败|fetch|Failed|ECONN/i).first()).toBeVisible();
    await expect(page.getByText("e2e-secret-ai-key")).toHaveCount(0);
    await attachStepScreenshot(page, testInfo, "AI-002-连接失败态");
  });

  test("AI-003 批量 AI 整理进度", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    test.skip(
      process.env.E2E_RUN_AI_BATCH_MOCK !== "1",
      "需要 E2E_RUN_AI_BATCH_MOCK=1 并启动 OpenAI-compatible mock 服务后运行。",
    );

    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks.slice(0, 3));

    const page = await openAppPage(context, extensionId, "all");
    await page.getByRole("button", { name: /全选|Select All/ }).click();
    await page.getByRole("button", { name: /批量 AI 整理|Batch AI Organize/ }).click();

    await expect(page.getByText(/AI 正在重新整理书签|AI is organizing bookmarks/)).toBeVisible();
    await expect(page.getByText(/0\/3|1\/3|2\/3|3\/3/)).toBeVisible();
    await attachStepScreenshot(page, testInfo, "AI-003-批量整理进度");
  });

  test("SYNC-001 WebDAV 配置保存和失败态", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const page = await openAppPage(context, extensionId, "settings");
    await page.getByRole("tab", { name: /存储管理|Storage/ }).click();
    const storagePanel = page.getByRole("tabpanel", { name: /存储管理|Storage/ });
    await expect(storagePanel.getByText(/WebDAV 数据同步|WebDAV Data Sync/)).toBeVisible();

    await storagePanel.getByRole("switch").click();
    await expect(storagePanel.getByPlaceholder("https://example.com/webdav/")).toBeVisible();
    await storagePanel.getByPlaceholder("https://example.com/webdav/").fill("https://webdav.invalid/e2e/");
    await storagePanel.getByPlaceholder("https://example.com/webdav/").blur();
    await storagePanel.getByPlaceholder("username").fill("e2e-user");
    await storagePanel.getByPlaceholder("username").blur();
    await storagePanel.getByPlaceholder("password").fill("e2e-password");
    await storagePanel.getByPlaceholder("password").blur();
    await attachStepScreenshot(page, testInfo, "SYNC-001-WebDAV配置填写后");

    await expect
      .poll(async () => getStorageState(extensionWorker))
      .toMatchObject({
        local: {
          webdavConfig: expect.objectContaining({
            enabled: true,
            url: "https://webdav.invalid/e2e/",
            username: "e2e-user",
          }),
        },
      });

    let state = await getStorageState(extensionWorker);
    expect((state.local.webdavConfig as any).password).not.toBe("e2e-password");

    await seedSyncStatus(extensionWorker, {
      status: "error",
      errorMessage: "E2E WebDAV 连接失败",
    });
    await page.reload();
    await page.getByRole("tab", { name: /存储管理|Storage/ }).click();
    const reloadedStoragePanel = page.getByRole("tabpanel", { name: /存储管理|Storage/ });

    await expect(reloadedStoragePanel.getByPlaceholder("password")).toHaveValue("e2e-password");
    // Match only the status text in the sync status row, not the error hint below it

    await expect(
      reloadedStoragePanel.getByText(/^(同步失败|Sync Failed)$/),
    ).toBeVisible();
    await expect(reloadedStoragePanel.getByText("E2E WebDAV 连接失败")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "SYNC-001-WebDAV失败态");
  });

  test("SYNC-002 真实 WebDAV 同步", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    test.skip(
      process.env.E2E_REAL_WEBDAV !== "1",
      "需要 E2E_REAL_WEBDAV=1 和隔离 WebDAV 测试账号后运行。",
    );

    const url = process.env.E2E_WEBDAV_URL;
    const username = process.env.E2E_WEBDAV_USERNAME;
    const password = process.env.E2E_WEBDAV_PASSWORD;
    test.skip(!url || !username || !password, "缺少 E2E_WEBDAV_URL/USERNAME/PASSWORD。");

    const { bookmarks, categories } = createLibraryFixtures();
    await seedCategories(extensionWorker, categories);
    await seedBookmarks(extensionWorker, bookmarks.slice(0, 2));
    await seedWebDAVConfig(extensionWorker, {
      enabled: true,
      url,
      username,
      password,
    });

    const page = await openAppPage(context, extensionId, "settings");
    await page.getByRole("tab", { name: /存储管理|Storage/ }).click();
    await page.getByRole("button", { name: /立即同步|Sync Now/ }).click();
    await expect(page.getByText(/同步中|Syncing/)).toBeVisible();
    await attachStepScreenshot(page, testInfo, "SYNC-002-真实同步中");
    await expect(page.getByText(/空闲|已同步|Idle|Synced/)).toBeVisible({ timeout: 30_000 });

    await extensionWorker.evaluate(async () => {
      await chrome.storage.local.set({ bookmarks: [], bookmarkContents: {} });
      await chrome.storage.sync.set({ categories: [] });
    });
    await page.getByRole("button", { name: /立即同步|Sync Now/ }).click();
    await expect
      .poll(async () => getBookmarks(extensionWorker), { timeout: 30_000 })
      .toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: "React Docs" }),
        ]),
      );
  });
});
