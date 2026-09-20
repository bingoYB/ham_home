import { test, expect } from "../fixtures";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import {
  getBookmarks,
  getScreenshotAssetSizes,
  resetExtensionData,
} from "../helpers/storage";

const PAGE_URL = "https://inpage.e2e.test/article";
const PAGE_HTML = `<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <title>页内保存测试页</title>
    <meta name="description" content="用于验证页内保存流程的测试页面" />
  </head>
  <body>
    <article>
      <h1>页内保存测试页</h1>
      <p>这是一段用于触发正文提取的内容，长度需要足够让 Readability 判定为可读页面。</p>
      <p>页内保存流程会在页面角落展示分析浮窗，分析结束后展开保存表单。</p>
    </article>
  </body>
</html>`;

test.describe("CONTENT 页内保存流程", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, {
      // 关闭自动快照，避免测试依赖真实页面抓取
      settings: { ...e2eVariant.settings, autoSaveSnapshot: false },
    });
  });

  test("CONTENT-001 触发页内保存浮窗并保存书签", async ({
    context,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;

    const page = await context.newPage();
    await page.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE_HTML }),
    );
    await page.goto(PAGE_URL);

    // 快捷键 / 右键菜单最终都是向当前 tab 发送 START_SAVE_FLOW
    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url });
      if (!tab?.id) throw new Error("测试页面未找到");
      await chrome.tabs.sendMessage(tab.id, {
        type: "START_SAVE_FLOW",
        source: "shortcut",
      });
    }, `${PAGE_URL}*`);

    // 分析结束后浮窗展开保存表单（AI 在 e2e 环境不可用，会直接落到表单）
    const titleInput = page.getByLabel(t("标题", "Title"));
    await expect(titleInput).toBeVisible({ timeout: 20_000 });
    await expect(titleInput).toHaveValue(/页内保存测试页/);
    await attachStepScreenshot(page, testInfo, "CONTENT-001-页内保存表单");

    await titleInput.fill("页内保存的书签");
    await page
      .getByRole("button", { name: /保存书签|Save Bookmark/ })
      .click();

    await expect
      .poll(async () => getBookmarks(extensionWorker))
      .toEqual([
        expect.objectContaining({
          url: PAGE_URL,
          title: "页内保存的书签",
        }),
      ]);

    // 保存成功后浮窗自动关闭
    await expect(titleInput).toBeHidden({ timeout: 10_000 });
    await attachStepScreenshot(page, testInfo, "CONTENT-001-保存完成");
  });

  test("CONTENT-002 已收藏页面进入更新态", async ({
    context,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;

    const page = await context.newPage();
    await page.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE_HTML }),
    );
    await page.goto(PAGE_URL);

    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url });
      if (!tab?.id) throw new Error("测试页面未找到");
      await chrome.tabs.sendMessage(tab.id, { type: "START_SAVE_FLOW" });
    }, `${PAGE_URL}*`);

    const titleInput = page.getByLabel(t("标题", "Title"));
    await expect(titleInput).toBeVisible({ timeout: 20_000 });
    await titleInput.fill("首次保存");
    await page.getByRole("button", { name: /保存书签|Save Bookmark/ }).click();
    await expect(titleInput).toBeHidden({ timeout: 10_000 });

    // 再次触发：同一 URL 已有书签，浮窗应进入更新态
    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url });
      await chrome.tabs.sendMessage(tab!.id!, { type: "START_SAVE_FLOW" });
    }, `${PAGE_URL}*`);

    await expect(
      page.getByRole("button", { name: /更新书签|Update Bookmark/ }),
    ).toBeVisible({ timeout: 20_000 });
    await expect(page.getByLabel(t("标题", "Title"))).toHaveValue("首次保存");
    await attachStepScreenshot(page, testInfo, "CONTENT-002-更新态");
  });

  test("CONTENT-003 开启弹窗保存后页面内不接管", async ({
    context,
    extensionWorker,
    e2eVariant,
  }) => {
    await resetExtensionData(extensionWorker, {
      settings: {
        ...e2eVariant.settings,
        autoSaveSnapshot: false,
        usePopupSavePanel: true,
      },
    });

    const page = await context.newPage();
    await page.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE_HTML }),
    );
    await page.goto(PAGE_URL);

    // 回执为 ok: false，调用方据此回退到 Popup 内的保存表单
    const response = await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url });
      if (!tab?.id) throw new Error("测试页面未找到");
      return chrome.tabs.sendMessage(tab.id, {
        type: "START_SAVE_FLOW",
        source: "shortcut",
      });
    }, `${PAGE_URL}*`);

    expect(response).toEqual({ ok: false });
    await expect(page.locator("[data-hamhome-save-flow]")).toHaveCount(0);
  });

  test("CONTENT-004 保存可见区域截图并在视觉画廊展示", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await resetExtensionData(extensionWorker, {
      settings: {
        ...e2eVariant.settings,
        autoSaveSnapshot: false,
        autoSaveScreenshot: true,
      },
    });

    const page = await context.newPage();
    await page.route("**/*", (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: PAGE_HTML }),
    );
    await page.goto(PAGE_URL);

    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url });
      if (!tab?.id) throw new Error("测试页面未找到");
      await chrome.tabs.sendMessage(tab.id, {
        type: "START_SAVE_FLOW",
        source: "shortcut",
      });
    }, `${PAGE_URL}*`);

    const titleInput = page.getByLabel(t("标题", "Title"));
    await expect(titleInput).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByRole("switch", { name: /保存页面截图|Save page screenshot/ }),
    ).toBeChecked();
    await titleInput.fill("页面截图书签");
    await page.getByRole("button", { name: /保存书签|Save Bookmark/ }).click();

    const [saved] = await expect
      .poll(async () => getBookmarks(extensionWorker))
      .toEqual([expect.objectContaining({ title: "页面截图书签" })])
      .then(async () => getBookmarks(extensionWorker));
    await expect
      .poll(async () => getScreenshotAssetSizes(extensionWorker, saved.id))
      .toEqual({ image: expect.any(Number), thumbnail: expect.any(Number) });
    const sizes = await getScreenshotAssetSizes(extensionWorker, saved.id);
    expect(sizes.image).toBeGreaterThan(1_000);
    expect(sizes.thumbnail).toBeGreaterThan(100);

    const app = await openAppPage(context, extensionId, "all");
    await app.getByTitle(t("视觉画廊", "Visual Gallery")).click();
    await expect(app.getByRole("img", { name: "页面截图书签" })).toBeVisible();
    await attachStepScreenshot(app, testInfo, "CONTENT-004-视觉画廊截图");
  });
});
