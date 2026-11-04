import { test, expect } from "../fixtures";
import { createBookmarkFixture, createCategoryFixture } from "../helpers/factories";
import { pointAiConfigToMock, startMockAiServer } from "../helpers/mock-ai-server";
import { openAppPage, openControlledPopupPage, setHiddenFileInput } from "../helpers/pages";
import { getBookmarks, getStorageState, resetExtensionData, seedBookmarks, seedCategories } from "../helpers/storage";

test("small model mode persists and fills a bookmark from separate text responses", async ({
  context,
  extensionId,
  extensionWorker,
  e2eVariant,
}) => {
  await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  await seedCategories(extensionWorker, [createCategoryFixture({ id: "cat-dev", name: "开发" })]);
  const server = await startMockAiServer();

  try {
    for (const response of ["OK", "测试标题", "页面介绍书签管理。", "开发", "书签\n工具"]) {
      server.enqueueReply({ chunks: [response] });
    }
    await pointAiConfigToMock(extensionWorker, server.baseUrl);

    const page = await openAppPage(context, extensionId, "settings");
    const openAdvanced = async () => {
      await page.getByText(/高级设置|Advanced Settings/).locator("..").getByRole("button").click();
    };
    await openAdvanced();
    let toggle = page.getByRole("switch", { name: /小模型兼容模式|Small model compatibility mode/ });
    await expect(toggle).not.toBeChecked();
    await toggle.click();
    await expect.poll(async () => (await getStorageState(extensionWorker)).sync.aiConfig)
      .toMatchObject({ smallModelMode: true });

    await page.reload();
    await openAdvanced();
    toggle = page.getByRole("switch", { name: /小模型兼容模式|Small model compatibility mode/ });
    await expect(toggle).toBeChecked();
    await page.getByRole("button", { name: /测试连接|Test Connection/ }).first().click();
    await expect(page.getByText(/^(连接成功|Connection successful)$/)).toBeVisible();

    const popup = await openControlledPopupPage(context, extensionId, {
      tabId: 9941,
      url: "https://small-model.e2e.test/article",
      title: "Original page",
      content: {
        url: "https://small-model.e2e.test/article",
        title: "Original page",
        content: "",
        htmlContent: "",
        textContent: "This page describes a bookmark manager.",
        excerpt: "A bookmark tool",
        favicon: "",
      },
    });

    await expect(popup.getByLabel(/标题|Title/)).toHaveValue("测试标题");
    await expect(popup.getByLabel(/摘要|Summary/)).toHaveValue("页面介绍书签管理。");
    await expect(popup.getByText("书签", { exact: true })).toBeVisible();
    await expect(popup.getByText("工具", { exact: true })).toBeVisible();
    expect(server.requests).toHaveLength(5);
    expect(server.requests.every((request) => !("response_format" in request.body))).toBe(true);
  } finally {
    await server.close();
  }
});

test("cancelling AI import aborts the current field and stops the remaining requests", async ({
  context,
  extensionId,
  extensionWorker,
  e2eVariant,
}) => {
  await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  const server = await startMockAiServer();
  try {
    server.enqueueReply({ chunks: ["测试标题"], responseDelayMs: 10_000 });
    await pointAiConfigToMock(extensionWorker, server.baseUrl);
    await extensionWorker.evaluate(async () => {
      const { aiConfig } = await chrome.storage.sync.get("aiConfig");
      await chrome.storage.sync.set({ aiConfig: { ...aiConfig, smallModelMode: true } });
    });

    const page = await openAppPage(context, extensionId, "import-export");
    await page.locator("#enable-ai-analysis").click();
    await setHiddenFileInput(page, 'input[type="file"]', {
      name: "bookmarks.html",
      mimeType: "text/html",
      buffer: Buffer.from('<DL><p><DT><A HREF="https://cancel.e2e.test/one">One</A><DT><A HREF="https://cancel.e2e.test/two">Two</A></DL>'),
    });
    await expect.poll(() => server.requests.length).toBe(1);
    await page.getByRole("button", { name: /停止导入|Stop Import/i }).click();
    await expect(page.getByText(/导入已停止|Import stopped/i).first()).toBeVisible();
    await expect.poll(() => server.requests[0].aborted).toBe(true);
    expect(server.requests).toHaveLength(1);
    expect(await getBookmarks(extensionWorker)).toHaveLength(0);
  } finally {
    await server.close();
  }
});

test("small model batch analysis sends one bookmark at a time", async ({
  context,
  extensionId,
  extensionWorker,
  e2eVariant,
}) => {
  await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
  const server = await startMockAiServer();
  try {
    await pointAiConfigToMock(extensionWorker, server.baseUrl);
    await extensionWorker.evaluate(async () => {
      const { aiConfig } = await chrome.storage.sync.get("aiConfig");
      await chrome.storage.sync.set({ aiConfig: { ...aiConfig, smallModelMode: true } });
    });
    await seedCategories(extensionWorker, [createCategoryFixture({ id: "cat-dev", name: "开发" })]);
    const fixtureUrl = server.baseUrl.replace(/\/v1$/, "/fixture");
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "batch-one", url: `${fixtureUrl}/one`, title: "Page One" }),
      createBookmarkFixture({ id: "batch-two", url: `${fixtureUrl}/two`, title: "Page Two" }),
    ]);
    server.enqueueReply({ chunks: ["标题"], responseDelayMs: 2_000 });
    for (const response of ["第一条摘要。", "开发", "工具", "标题", "第二条摘要。", "开发", "工具"]) {
      server.enqueueReply({ chunks: [response] });
    }

    const page = await openAppPage(context, extensionId, "all");
    await page.getByRole("checkbox").first().check();
    await page.getByRole("button", { name: /全选|Select All/ }).click();
    await page.getByRole("button", { name: /批量 AI 整理|Batch AI Organize/ }).click();
    await expect.poll(() => server.requests.length).toBe(1);
    await page.waitForTimeout(350);
    expect(server.requests).toHaveLength(1);
    expect(server.requests[0].completed).toBe(false);
    await expect.poll(async () => (await getBookmarks(extensionWorker)).filter(
      (bookmark) => bookmark.description === "第一条摘要。" || bookmark.description === "第二条摘要。",
    ).length).toBe(2);
    expect(server.requests).toHaveLength(8);
  } finally {
    await server.close();
  }
});
