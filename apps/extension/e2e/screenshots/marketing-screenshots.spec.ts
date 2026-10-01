import type { Worker } from "@playwright/test";
import { expect, test } from "../fixtures";
import { openControlledPopupPage } from "../helpers/pages";
import {
  POPUP_CURRENT_PAGE,
  SAVE_DEMO_PAGE_HTML,
} from "./screenshot-data";
import {
  DEMO_GALLERY_SITES,
  DEMO_IMAGE_CLIPS,
  DEMO_TEXT_CLIPS,
  ICON_SET_ANALYSIS,
  ICON_SET_IMAGE_URL,
  ICON_SET_SOURCE_PAGE,
} from "./screenshot-rich-data";
import {
  APP_VIEWPORT,
  CONTENT_VIEWPORT,
  POPUP_VIEWPORT,
  SHOWCASE_PAGE_HTML,
  assertScreenshotData,
  captureElementScreenshot,
  captureScreenshot,
  openExtensionAppPage,
  prepareScreenshotState,
  seedShowcaseVisuals,
  stabilizeForScreenshot,
  waitForImagesLoaded,
} from "./screenshot-utils";
import { studioNotesPageHtml } from "./screenshot-visuals";

/** Image clips that land in the first screen of the bookmark library */
const LIBRARY_IMAGE_TITLES = DEMO_IMAGE_CLIPS.slice(0, 2).map(
  (item) => item.bookmark.title,
);

test.describe("marketing screenshots", () => {
  test("generates required showcase screenshots", async ({
    context,
    extensionId,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const t = e2eVariant.text;
    await prepareScreenshotState(extensionWorker, e2eVariant);
    await seedShowcaseVisuals(context, extensionWorker);
    await assertScreenshotData(extensionWorker);

    // 保存流程已移到页面内：在示例文章页触发保存浮窗后截取浮窗本身
    await context.route("https://react.dev/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: SAVE_DEMO_PAGE_HTML,
      });
    });
    const savePage = await context.newPage();
    await savePage.setViewportSize(CONTENT_VIEWPORT);
    await savePage.goto(POPUP_CURRENT_PAGE.url);
    await stabilizeForScreenshot(savePage);
    await startSaveFlow(extensionWorker, POPUP_CURRENT_PAGE.url);

    const savePanel = savePage.locator('[data-hamhome-save-flow="panel"]');
    await expect(savePage.getByLabel(/标题|Title/)).toHaveValue(
      /AI-assisted React Workflows/,
    );
    await expect(savePage.getByText(/react/i).first()).toBeVisible();
    await captureElementScreenshot(
      savePage,
      savePanel,
      testInfo,
      e2eVariant,
      "01-popup-save",
    );

    // Popup 现在是快捷面板，单独出一张图（用受控当前页，保证"保存当前页面"可用）
    const popup = await openControlledPopupPage(
      context,
      extensionId,
      POPUP_CURRENT_PAGE,
      { view: "quick" },
    );
    await popup.setViewportSize(POPUP_VIEWPORT);
    await expect(
      popup.getByRole("button", { name: /保存当前页面|Save current page/ }),
    ).toBeVisible();
    await captureElementScreenshot(
      popup,
      popup.locator("#root > div").first(),
      testInfo,
      e2eVariant,
      "09-popup-quick-panel",
    );

    const library = await openExtensionAppPage(context, extensionId, "all");
    await library.setViewportSize(APP_VIEWPORT);
    await expect(library.getByText("OpenAI Platform Docs")).toBeVisible();
    await waitForImagesLoaded(library, LIBRARY_IMAGE_TITLES);
    await captureScreenshot(library, testInfo, e2eVariant, "02-bookmark-library", {
      // Masonry re-measures cards after the clip images decode
      timeoutMs: 900,
    });

    const bulk = await openExtensionAppPage(context, extensionId, "all");
    await bulk.setViewportSize(APP_VIEWPORT);
    await expect(bulk.getByText("OpenAI Platform Docs")).toBeVisible();
    await waitForImagesLoaded(bulk, LIBRARY_IMAGE_TITLES);
    // Pick cards from the first screen explicitly: masonry DOM order does not
    // follow the visual order, and clicking an off-screen card scrolls the list
    const libraryCard = bulk.locator("div.group.bg-card");
    const selectedCards = [
      libraryCard.filter({
        has: bulk.getByRole("img", { name: LIBRARY_IMAGE_TITLES[0], exact: true }),
      }),
      libraryCard.filter({ hasText: "OpenAI Platform Docs" }),
      libraryCard.filter({ hasText: DEMO_TEXT_CLIPS[0].clip.text! }),
      libraryCard.filter({ hasText: "Anthropic Prompt Engineering Guide" }),
    ];
    for (const card of selectedCards) {
      await card.getByRole("checkbox").first().click();
    }
    await expect(
      bulk.getByText(/selected|已选择|已选中|已选择\s*\d+/i).first(),
    ).toBeVisible();
    await captureScreenshot(
      bulk,
      testInfo,
      e2eVariant,
      "03-bookmark-bulk-actions",
      { timeoutMs: 900 },
    );

    await context.route("https://screenshots.hamhome.test/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: SHOWCASE_PAGE_HTML,
      });
    });
    const contentPage = await context.newPage();
    await contentPage.setViewportSize(CONTENT_VIEWPORT);
    await contentPage.goto("https://screenshots.hamhome.test/research-dashboard");
    await stabilizeForScreenshot(contentPage);
    await contentPage.mouse.move(2, Math.floor(CONTENT_VIEWPORT.height / 2));
    await contentPage.waitForTimeout(350);
    await contentPage.mouse.click(20, Math.floor(CONTENT_VIEWPORT.height / 2));
    await expect(contentPage.getByText("OpenAI Platform Docs").first()).toBeVisible({
      timeout: 10_000,
    });
    await captureScreenshot(contentPage, testInfo, e2eVariant, "04-content-panel");

    const agent = await openExtensionAppPage(context, extensionId, "all");
    await agent.setViewportSize(APP_VIEWPORT);
    await expect(agent.getByLabel(agentOpenLabel(e2eVariant.language))).toBeVisible();
    await agent.getByLabel(agentOpenLabel(e2eVariant.language)).click();
    await expect(agent.getByText("AI search planning").first()).toBeVisible();
    await expect(agent.getByText("Find the best bookmarks").first()).toBeVisible();
    await captureScreenshot(agent, testInfo, e2eVariant, "05-ai-agent");

    const workspaces = await openExtensionAppPage(context, extensionId, "workspaces");
    await workspaces.setViewportSize(APP_VIEWPORT);
    await expect(workspaces.getByText("AI Bookmark Launch Plan")).toBeVisible();
    await expect(workspaces.getByText("React UI Redesign")).toBeVisible();
    await captureScreenshot(workspaces, testInfo, e2eVariant, "06-workspaces");

    const tabGroups = await openExtensionAppPage(context, extensionId, "tab-groups");
    await tabGroups.setViewportSize(APP_VIEWPORT);
    await expect(tabGroups.getByText("AI Research (AI Lab)")).toBeVisible();
    await expect(tabGroups.getByText("Frontend Build (Frontend)")).toBeVisible();
    await captureScreenshot(tabGroups, testInfo, e2eVariant, "07-tab-groups");

    const importExport = await openExtensionAppPage(
      context,
      extensionId,
      "import-export",
    );
    await importExport.setViewportSize(APP_VIEWPORT);
    await expect(importExport.getByText(/42|OpenAI|JSON|HTML/).first()).toBeVisible();
    await importExport
      .getByText(syncBrowserTitle(e2eVariant.language))
      .first()
      .scrollIntoViewIfNeeded();
    await captureScreenshot(importExport, testInfo, e2eVariant, "08-import-export-sync", {
      timeoutMs: 700,
    });

    // 视觉画廊：只展示保存时截取了页面截图的书签
    const gallery = await openExtensionAppPage(context, extensionId, "all");
    await gallery.setViewportSize(APP_VIEWPORT);
    await expect(gallery.getByText("OpenAI Platform Docs")).toBeVisible();
    await gallery.getByTitle(t("视觉画廊", "Visual Gallery")).click();
    await waitForImagesLoaded(
      gallery,
      DEMO_GALLERY_SITES.map((site) => site.title),
    );
    await captureScreenshot(gallery, testInfo, e2eVariant, "10-visual-gallery", {
      timeoutMs: 700,
    });

    // 右键图片剪藏：页内浮窗展示图片、来源和 AI 生成的标题/摘要/标签
    await context.route("https://studio-notes.demo/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: studioNotesPageHtml(ICON_SET_IMAGE_URL),
      });
    });
    const clipPage = await context.newPage();
    // The panel caps at 80vh; the image preview needs a taller viewport to fit
    await clipPage.setViewportSize({ width: CONTENT_VIEWPORT.width, height: 1120 });
    await clipPage.goto(ICON_SET_SOURCE_PAGE.url);
    await stabilizeForScreenshot(clipPage);
    await startSaveFlow(extensionWorker, ICON_SET_SOURCE_PAGE.url, {
      type: "image",
      imageSourceUrl: ICON_SET_IMAGE_URL,
      sourceUrl: ICON_SET_SOURCE_PAGE.url,
      sourceTitle: ICON_SET_SOURCE_PAGE.title,
    });
    const clipPanel = clipPage.locator('[data-hamhome-save-flow="panel"]');
    await expect(clipPage.getByLabel(/标题|Title/)).toHaveValue(
      ICON_SET_ANALYSIS.title,
    );
    await expect(
      clipPanel.getByRole("img", { name: ICON_SET_SOURCE_PAGE.title }),
    ).toBeVisible();
    await captureElementScreenshot(
      clipPage,
      clipPanel,
      testInfo,
      e2eVariant,
      "11-image-clip-save",
      { timeoutMs: 700 },
    );

    // 书签健康中心：切到「需要关注」，集中展示失效、跳转、访问受限与重复项
    const health = await openExtensionAppPage(context, extensionId, "health");
    await health.setViewportSize(APP_VIEWPORT);
    // The list is virtualized, so only assert rows after narrowing the filter
    await health
      .getByRole("button", { name: t("需要关注", "Needs Attention"), exact: true })
      .click();
    await expect(health.getByText("Fieldnote Pricing Page")).toBeVisible();
    await expect(health.getByText("Kiln Ceramics Shop")).toBeVisible();
    // Healthy bookmarks drop out of the attention filter
    await expect(health.getByText("MDN Web APIs Reference")).toHaveCount(0);
    await captureScreenshot(health, testInfo, e2eVariant, "12-health-center");

    const trash = await openExtensionAppPage(context, extensionId, "trash");
    await trash.setViewportSize(APP_VIEWPORT);
    await expect(trash.getByText("Q2 Planning Offsite Agenda")).toBeVisible();
    await trash.getByRole("checkbox").nth(1).click();
    await trash.getByRole("checkbox").nth(2).click();
    await captureScreenshot(trash, testInfo, e2eVariant, "13-trash");
  });
});

async function startSaveFlow(
  worker: Worker,
  pageUrl: string,
  clip?: Record<string, string>,
): Promise<void> {
  await worker.evaluate(
    async ({ url, clipContext }) => {
      const [tab] = await chrome.tabs.query({ url });
      if (!tab?.id) throw new Error("示例页面未找到");
      await chrome.tabs.sendMessage(tab.id, {
        type: "START_SAVE_FLOW",
        source: clipContext ? "contextMenu" : "shortcut",
        clip: clipContext,
      });
    },
    { url: `${pageUrl}*`, clipContext: clip },
  );
}

function agentOpenLabel(language: string): string | RegExp {
  return language === "en" ? "Open global assistant" : "打开全局助手";
}

function syncBrowserTitle(language: string): string {
  return language === "en"
    ? "Sync to Browser Bookmarks"
    : "同步到浏览器书签栏";
}
