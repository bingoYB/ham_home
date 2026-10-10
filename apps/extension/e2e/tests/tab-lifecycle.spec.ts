import type { BrowserContext, Page, Worker } from "@playwright/test";
import { test, expect } from "../fixtures";
import { createBookmarkFixture } from "../helpers/factories";
import { pointAiConfigToMock, startMockAiServer } from "../helpers/mock-ai-server";
import {
  attachStepScreenshot,
  openAppPage,
  openControlledPopupPage,
} from "../helpers/pages";
import {
  fireAlarm,
  getBookmarks,
  getReadLaterEntries,
  getTabArchiveEntries,
  resetExtensionData,
  seedBookmarks,
  seedTabActivity,
  seedTabLifecycle,
} from "../helpers/storage";

const DAY = 24 * 60 * 60 * 1000;

function articleHtml(title: string): string {
  const paragraph =
    "这是一段用于触发正文提取的内容，长度需要足够让 Readability 判定为可读页面。Tab lifecycle end to end test content keeps going for a while. ";
  return `<!doctype html><html lang="zh"><head><meta charset="utf-8" /><title>${title}</title>
    <meta name="description" content="${title} 的页面描述" /></head>
    <body><article><h1>${title}</h1>${Array.from({ length: 12 }, () => `<p>${paragraph.repeat(3)}</p>`).join("")}</article></body></html>`;
}

async function openSite(context: BrowserContext, url: string, title: string): Promise<Page> {
  const page = await context.newPage();
  // Only the fake site is routed: the content UI fetches its stylesheet from the extension
  await page.route(`${new URL(url).origin}/**`, (route) =>
    route.fulfill({ contentType: "text/html; charset=utf-8", body: articleHtml(title) }),
  );
  await page.goto(url);
  return page;
}

async function getTabId(worker: Worker, url: string): Promise<number> {
  return worker.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    const tab = tabs.find((item) => item.url?.startsWith(prefix));
    if (!tab?.id) throw new Error(`tab not found: ${prefix}`);
    return tab.id;
  }, url);
}

async function countTabs(worker: Worker, url: string): Promise<number> {
  return worker.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    // tabs.create may return before navigation commits, especially for fake test hosts.
    // Count the created tab's pending URL as well as its committed URL.
    return tabs.filter((item) =>
      item.url?.startsWith(prefix) || item.pendingUrl?.startsWith(prefix),
    ).length;
  }, url);
}

/** Toggle the in-page edge panel; retried until the content UI is mounted and answers */
async function openEdgePanel(worker: Worker, url: string): Promise<void> {
  await expect
    .poll(
      () =>
        worker.evaluate(async (prefix) => {
          const tabs = await chrome.tabs.query({});
          const tab = tabs.find((item) => item.url?.startsWith(prefix));
          if (!tab?.id) return false;
          const response = await chrome.tabs
            .sendMessage(tab.id, { type: "TOGGLE_BOOKMARK_PANEL" })
            .catch(() => null);
          return response?.ok === true;
        }, url),
      { timeout: 15_000 },
    )
    .toBe(true);
}

/** Usage days for the last `count` days, as the background stores them */
function recentUsageDays(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.now() - i * DAY);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }).sort();
}

test.describe("TABLIFE 标签页减负", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant }) => {
    await resetExtensionData(extensionWorker, {
      settings: { ...e2eVariant.settings, autoSaveSnapshot: false },
    });
  });

  test("TABLIFE-001 稍后读并关闭，页内撤销恢复标签页", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const OTHER_URL = "https://other.e2e.test/home";
    const ARTICLE_URL = "https://read.e2e.test/article";
    const other = await openSite(context, OTHER_URL, "其他页面");
    const article = await openSite(context, ARTICLE_URL, "稍后读测试文章");
    await article.bringToFront();
    const tabId = await getTabId(extensionWorker, ARTICLE_URL);

    const popup = await openControlledPopupPage(
      context,
      extensionId,
      {
        tabId,
        url: ARTICLE_URL,
        title: "稍后读测试文章",
        content: {
          url: ARTICLE_URL,
          title: "稍后读测试文章",
          content: "",
          htmlContent: "",
          textContent: "",
          excerpt: "",
          favicon: "",
        },
      },
      { view: "quick" },
    );
    // The popup page lives in its own window so the article window keeps focus semantics
    await extensionWorker.evaluate(async (popupUrl) => {
      const [tab] = await chrome.tabs.query({ url: popupUrl });
      if (tab?.id) await chrome.windows.create({ tabId: tab.id });
    }, popup.url());
    await attachStepScreenshot(popup, testInfo, "TABLIFE-001-Popup快捷面板");

    await popup.getByRole("button", { name: /稍后读并关闭|Read later & close/ }).click();

    await expect.poll(() => countTabs(extensionWorker, ARTICLE_URL), { timeout: 20_000 }).toBe(0);
    const bookmarks = await getBookmarks(extensionWorker);
    expect(bookmarks).toEqual([
      expect.objectContaining({ url: ARTICLE_URL, title: "稍后读测试文章" }),
    ]);
    const entries = await getReadLaterEntries(extensionWorker);
    expect(Object.values(entries)).toEqual([
      expect.objectContaining({ status: "unread", queueOnly: true, source: "manual" }),
    ]);
    expect(Object.values(entries)[0].estimatedMinutes).toBeGreaterThan(0);

    // Undo toast in the tab the browser switched to
    const toast = other.locator('[data-hamhome-tab-feedback="read-later"]');
    await expect(toast).toBeVisible({ timeout: 10_000 });
    await attachStepScreenshot(other, testInfo, "TABLIFE-001-页内撤销提示");
    await toast.getByRole("button", { name: /撤销|Undo/ }).click();

    await expect.poll(() => countTabs(extensionWorker, ARTICLE_URL), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => getBookmarks(extensionWorker)).toEqual([]);
    await expect.poll(async () => Object.keys(await getReadLaterEntries(extensionWorker))).toEqual([]);
  });

  test("TABLIFE-002 稍后读队列：不进入收藏库，收藏后出现在书签列表", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const now = Date.now();
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-library", title: "收藏库里的书签", url: "https://library.e2e.test" }),
      createBookmarkFixture({ id: "bm-queued", title: "仅在稍后读里的文章", url: "https://queued.e2e.test/post" }),
      createBookmarkFixture({ id: "bm-old", title: "很久以前加入的文章", url: "https://old.e2e.test/post" }),
    ]);
    await extensionWorker.evaluate(async (time) => {
      await chrome.storage.local.set({
        readLaterEntries: {
          "bm-queued": { bookmarkId: "bm-queued", status: "unread", queueOnly: true, source: "manual", addedAt: time - 2 * 86400000, estimatedMinutes: 6, note: "定价思路", updatedAt: time },
          "bm-old": { bookmarkId: "bm-old", status: "unread", queueOnly: true, source: "link", addedAt: time - 28 * 86400000, updatedAt: time },
        },
      });
    }, now);

    const library = await openAppPage(context, extensionId, "all");
    await expect(library.getByText("收藏库里的书签")).toBeVisible();
    await expect(library.getByText("仅在稍后读里的文章")).toBeHidden();

    const page = await openAppPage(context, extensionId, "read-later");
    await expect(page.getByText("仅在稍后读里的文章")).toBeVisible();
    await expect(page.getByText("定价思路")).toBeVisible();
    await expect(page.getByTestId("read-later-expiring-soon")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TABLIFE-002-稍后读队列");

    const card = page.getByTestId("read-later-item").filter({ hasText: "仅在稍后读里的文章" });
    await card.getByRole("button", { name: /收藏到书签库|Keep in library/ }).click();
    await expect
      .poll(async () => (await getReadLaterEntries(extensionWorker))["bm-queued"]?.queueOnly)
      .toBe(false);

    await card.getByRole("button", { name: /标记已读|Mark as read/ }).click();
    await page.getByTestId("read-later-view-read").click();
    await expect(page.getByText("仅在稍后读里的文章")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TABLIFE-002-已读视图");

    await library.reload();
    await expect(library.getByText("仅在稍后读里的文章")).toBeVisible();
    await expect(library.getByText("很久以前加入的文章")).toBeHidden();
  });

  test("TABLIFE-003 标签页中心：归档关闭后在归档中恢复", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const URL_A = "https://alpha.e2e.test/doc";
    const URL_B = "https://beta.e2e.test/doc";
    await openSite(context, URL_A, "Alpha 文档");
    await openSite(context, URL_B, "Beta 文档");

    const page = await openAppPage(context, extensionId, "tabs");
    const onboarding = page.getByTestId("tab-onboarding");
    await expect(onboarding).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TABLIFE-003-首次引导");
    await onboarding.getByRole("button", { name: /暂不开启|Not now/ }).click();

    const row = page.getByTestId("open-tab-row").filter({ hasText: "Alpha 文档" });
    await expect(row).toBeVisible();
    await expect(page.getByTestId("open-tab-row").filter({ hasText: "Beta 文档" })).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TABLIFE-003-打开中");

    await row.getByRole("button", { name: /归档关闭|Archive & close/ }).click();
    await expect.poll(() => countTabs(extensionWorker, URL_A), { timeout: 10_000 }).toBe(0);
    await expect
      .poll(async () => (await getTabArchiveEntries(extensionWorker)).map((entry) => entry.url))
      .toEqual([URL_A]);

    await page.getByTestId("tab-center-view-archive").click();
    const archived = page.getByTestId("archive-entry-row").filter({ hasText: "Alpha 文档" });
    await expect(archived).toBeVisible();
    await attachStepScreenshot(page, testInfo, "TABLIFE-003-归档");
    await archived.getByRole("button", { name: /^恢复$|^Restore$/ }).click();

    await expect.poll(() => countTabs(extensionWorker, URL_A), { timeout: 10_000 }).toBe(1);
    await expect.poll(() => getTabArchiveEntries(extensionWorker)).toEqual([]);
  });

  test("TABLIFE-004 自动归档：只关闭闲置超过 7 个使用日、不受保护的标签页", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const OLD_URL = "https://old.e2e.test/page";
    const PINNED_URL = "https://pinned.e2e.test/page";
    const LOCKED_URL = "https://locked.e2e.test/page";
    const ACTIVE_URL = "https://active.e2e.test/page";
    await openSite(context, OLD_URL, "很久没看的页面");
    const pinned = await openSite(context, PINNED_URL, "固定页面");
    await openSite(context, LOCKED_URL, "锁定页面");
    const active = await openSite(context, ACTIVE_URL, "当前页面");
    await active.bringToFront();
    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: `${url}*` });
      if (tab?.id) await chrome.tabs.update(tab.id, { pinned: true });
    }, PINNED_URL);
    void pinned;

    const longAgo = Date.now() - 10 * DAY;
    await seedTabLifecycle(extensionWorker, {
      settings: { activityTracking: true, autoArchive: { enabled: true } },
      state: {
        usageDays: recentUsageDays(12),
        lastStartupAt: 0,
        autoArchiveConsent: true,
        autoArchiveActive: true,
        autoArchiveBaselineAt: longAgo - DAY,
        onboardingCompletedAt: longAgo,
      },
    });
    await seedTabActivity(extensionWorker, [
      { url: OLD_URL, lastActiveAt: longAgo },
      { url: PINNED_URL, lastActiveAt: longAgo },
      { url: LOCKED_URL, lastActiveAt: longAgo, locked: true },
      { url: ACTIVE_URL, lastActiveAt: longAgo },
    ]);

    await fireAlarm(extensionWorker, "tab-lifecycle-sweep");
    await expect
      .poll(async () => (await getTabArchiveEntries(extensionWorker)).map((entry) => entry.url), {
        timeout: 20_000,
      })
      .toEqual([OLD_URL]);
    expect(await countTabs(extensionWorker, OLD_URL)).toBe(0);
    expect(await countTabs(extensionWorker, PINNED_URL)).toBe(1);
    expect(await countTabs(extensionWorker, LOCKED_URL)).toBe(1);
    expect(await countTabs(extensionWorker, ACTIVE_URL)).toBe(1);

    const popup = await openControlledPopupPage(
      context,
      extensionId,
      {
        tabId: await getTabId(extensionWorker, ACTIVE_URL),
        url: ACTIVE_URL,
        title: "当前页面",
        content: { url: ACTIVE_URL, title: "当前页面", content: "", htmlContent: "", textContent: "", excerpt: "", favicon: "" },
      },
      { view: "quick" },
    );
    const recent = popup.getByTestId("popup-recent-archive");
    await expect(recent).toBeVisible();
    await expect(recent).toContainText(/1/);
    await attachStepScreenshot(popup, testInfo, "TABLIFE-004-今日自动归档");
    await recent.getByRole("button", { name: /全部恢复|Restore all/ }).click();
    await expect.poll(() => countTabs(extensionWorker, OLD_URL), { timeout: 10_000 }).toBe(1);
  });

  test("TABLIFE-005 标签预算：超出时在当前页显示轻提示", async ({
    context,
    extensionWorker,
  }, testInfo) => {
    await seedTabLifecycle(extensionWorker, {
      settings: { activityTracking: true, budget: { enabled: true, limit: 5, overBudgetAction: "nudge" } },
      state: { lastStartupAt: 0 },
    });

    let last: Page | null = null;
    for (let index = 0; index < 6; index += 1) {
      last = await openSite(context, `https://budget${index}.e2e.test/page`, `预算测试 ${index}`);
    }
    await last!.bringToFront();

    const nudge = last!.locator('[data-hamhome-tab-feedback="budget-nudge"]');
    await expect(nudge).toBeVisible({ timeout: 15_000 });
    await expect(nudge).toContainText(/超出预算|over budget/);
    await attachStepScreenshot(last!, testInfo, "TABLIFE-005-预算轻提示");

    await nudge.getByRole("button", { name: /今天不再提醒|Not today/ }).click();
    await expect(nudge).toBeHidden();
    const state = await extensionWorker.evaluate(async () =>
      (await chrome.storage.local.get("tabLifecycleState")).tabLifecycleState,
    );
    expect(state.budgetNudge.dismissedDate).toBeTruthy();
  });
  test("TABLIFE-006 页内保存浮层：改为放进稍后读", async ({
    context,
    extensionWorker,
    e2eVariant,
  }, testInfo) => {
    const OTHER_URL = "https://stay.e2e.test/home";
    const ARTICLE_URL = "https://overlay.e2e.test/article";
    await openSite(context, OTHER_URL, "留下的页面");
    const article = await openSite(context, ARTICLE_URL, "浮层稍后读文章");
    await article.bringToFront();

    await extensionWorker.evaluate(async (url) => {
      const [tab] = await chrome.tabs.query({ url: `${url}*` });
      if (!tab?.id) throw new Error("article tab not found");
      await chrome.tabs.sendMessage(tab.id, { type: "START_SAVE_FLOW", source: "shortcut" });
    }, ARTICLE_URL);

    await expect(article.getByLabel(e2eVariant.text("标题", "Title"))).toBeVisible({ timeout: 20_000 });
    const readLater = article.getByTestId("inpage-save-read-later");
    await expect(readLater).toBeVisible();
    await attachStepScreenshot(article, testInfo, "TABLIFE-006-保存浮层稍后读入口");
    await readLater.click();

    await expect.poll(() => countTabs(extensionWorker, ARTICLE_URL), { timeout: 20_000 }).toBe(0);
    expect(await getBookmarks(extensionWorker)).toEqual([
      expect.objectContaining({ url: ARTICLE_URL, title: "浮层稍后读文章" }),
    ]);
    expect(Object.values(await getReadLaterEntries(extensionWorker))).toEqual([
      expect.objectContaining({ status: "unread", queueOnly: true, source: "manual" }),
    ]);
  });

  test("TABLIFE-007 页内边缘面板：稍后读快速列表", async ({
    context,
    extensionWorker,
  }, testInfo) => {
    const now = Date.now();
    await seedBookmarks(extensionWorker, [
      createBookmarkFixture({ id: "bm-lib", title: "面板里的收藏", url: "https://lib.e2e.test/page" }),
      createBookmarkFixture({ id: "bm-new", title: "最新加入的长文", url: "https://quick.e2e.test/new" }),
      createBookmarkFixture({ id: "bm-older", title: "稍早加入的教程", url: "https://quick.e2e.test/older" }),
      createBookmarkFixture({ id: "bm-done", title: "已经读完的文章", url: "https://quick.e2e.test/done" }),
    ]);
    await extensionWorker.evaluate(async (time) => {
      await chrome.storage.local.set({
        readLaterEntries: {
          "bm-new": { bookmarkId: "bm-new", status: "unread", queueOnly: true, source: "manual", addedAt: time - 3600000, estimatedMinutes: 8, updatedAt: time },
          "bm-older": { bookmarkId: "bm-older", status: "unread", queueOnly: true, source: "link", addedAt: time - 2 * 86400000, updatedAt: time },
          "bm-done": { bookmarkId: "bm-done", status: "read", queueOnly: true, source: "manual", addedAt: time - 86400000, readAt: time, updatedAt: time },
        },
      });
    }, now);
    await context.route("https://quick.e2e.test/**", (route) =>
      route.fulfill({ contentType: "text/html; charset=utf-8", body: articleHtml("最新加入的长文") }),
    );

    const page = await openSite(context, "https://panel.e2e.test/home", "边缘面板测试页");
    await page.bringToFront();
    await openEdgePanel(extensionWorker, "https://panel.e2e.test/");

    const section = page.getByTestId("panel-read-later");
    await expect(section).toBeVisible({ timeout: 15_000 });
    await expect(section).toContainText("最新加入的长文");
    await expect(section).toContainText("稍早加入的教程");
    await expect(section).not.toContainText("已经读完的文章");
    // Let the panel finish sliding in before the screenshot
    await page.waitForTimeout(400);
    await attachStepScreenshot(page, testInfo, "TABLIFE-007-边缘面板稍后读");

    await section.getByRole("button", { name: /最新加入的长文/ }).click();
    await expect.poll(() => countTabs(extensionWorker, "https://quick.e2e.test/new"), { timeout: 10_000 }).toBe(1);
    await expect
      .poll(async () => (await getReadLaterEntries(extensionWorker))["bm-new"]?.status)
      .toBe("reading");
  });

  test("TABLIFE-008 本周概览：打开数趋势、归档与稍后读进出", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    await extensionWorker.evaluate(async () => {
      const key = (offset: number) => {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + offset);
        const pad = (value: number) => String(value).padStart(2, "0");
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
      };
      const day = (offset: number, patch: Record<string, number>) => ({
        date: key(offset),
        peakOpen: 0,
        openTabMinutes: 0,
        sampledMinutes: 0,
        overBudgetMinutes: 0,
        autoArchived: 0,
        manualArchived: 0,
        restored: 0,
        readLaterAdded: 0,
        readLaterRead: 0,
        readLaterExpired: 0,
        ...patch,
      });
      await chrome.storage.local.set({
        tabLifecycleStats: {
          days: {
            [key(-9)]: day(-9, { peakOpen: 52, openTabMinutes: 40 * 600, sampledMinutes: 600 }),
            [key(-3)]: day(-3, { peakOpen: 31, openTabMinutes: 24 * 300, sampledMinutes: 300, overBudgetMinutes: 95, autoArchived: 4, readLaterAdded: 5 }),
            [key(-1)]: day(-1, { peakOpen: 22, openTabMinutes: 16 * 300, sampledMinutes: 300, manualArchived: 3, restored: 1, readLaterRead: 2, readLaterExpired: 1 }),
          },
        },
      });
    });

    const page = await openAppPage(context, extensionId, "tabs");
    const onboarding = page.getByTestId("tab-onboarding");
    await expect(onboarding).toBeVisible();
    await onboarding.getByRole("button", { name: /暂不开启|Not now/ }).click();

    await page.getByTestId("tab-center-overview").click();
    const dialog = page.getByTestId("tab-weekly-overview");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByTestId("weekly-open-tabs-chart")).toBeVisible();
    // 24 tabs for 5 h and 16 for 5 h average 20, half of last week's 40
    await expect(dialog.getByTestId("overview-summary")).toContainText(/20/);
    await expect(dialog.getByTestId("overview-summary")).toContainText(/50%/);
    await expect(dialog.getByTestId("overview-autoArchived")).toContainText("4");
    await expect(dialog.getByTestId("overview-manualArchived")).toContainText("3");
    await expect(dialog.getByTestId("overview-readLaterAdded")).toContainText("5");
    await expect(dialog.getByTestId("overview-readLaterRead")).toContainText("2");
    await attachStepScreenshot(page, testInfo, "TABLIFE-008-本周概览");
  });
  test("TABLIFE-009 AI 一键整理：只发送标题与去敏网址，按建议归档、稍后读与保留", async ({
    context,
    extensionId,
    extensionWorker,
  }, testInfo) => {
    const mockAi = await startMockAiServer();
    try {
      await pointAiConfigToMock(extensionWorker, mockAi.baseUrl);
      const URL_A = "https://triage-a.e2e.test/doc";
      const URL_B = "https://triage-b.e2e.test/post";
      const URL_C = "https://triage-c.e2e.test/app";
      // A private page (sign-in with a token) never goes to AI
      const URL_D = "https://triage-d.e2e.test/login";
      // `sig` is not private by itself, but is stripped before sending
      await openSite(context, `${URL_A}?sig=secret-sig-value`, "已经处理完的工单");
      await openSite(context, URL_B, "一篇值得读的长文");
      await openSite(context, `${URL_D}?token=secret-token-value`, "私密的登录页");
      await openSite(context, URL_C, "正在用的工具");
      // A and B were idle for days; C becomes the least idle when the app opens
      await seedTabActivity(extensionWorker, [
        { url: URL_A, lastActiveAt: Date.now() - 5 * DAY },
        { url: URL_B, lastActiveAt: Date.now() - 3 * DAY },
        { url: URL_D, lastActiveAt: Date.now() - 4 * DAY },
        { url: URL_C, lastActiveAt: Date.now() - DAY },
      ]);
      // Batch ids follow "most idle first": 1 = A, 2 = B, 3 = C
      mockAi.enqueueReply({
        chunks: [
          JSON.stringify({
            items: [
              { id: 1, destination: "close", reason: "工单已处理完", category: null, workspace: null },
              { id: 2, destination: "readLater", reason: "长文，适合稍后读", category: null, workspace: null },
              { id: 3, destination: "keep", reason: "仍在使用", category: null, workspace: null },
            ],
          }),
        ],
      });

      const page = await openAppPage(context, extensionId, "tabs");
      const onboarding = page.getByTestId("tab-onboarding");
      await expect(onboarding).toBeVisible();
      await onboarding.getByRole("button", { name: /暂不开启|Not now/ }).click();

      await page.getByTestId("tab-center-ai-triage").click();
      const dialog = page.getByTestId("ai-triage-dialog");
      const closeGroup = dialog.getByTestId("ai-triage-group-close");
      await expect(closeGroup).toContainText("已经处理完的工单", { timeout: 20_000 });
      await expect(closeGroup).toContainText("私密的登录页");
      await expect(closeGroup).toContainText(/本地规则|local rule/);
      await expect(dialog.getByTestId("ai-triage-group-readLater")).toContainText("一篇值得读的长文");
      // "Keep" starts collapsed
      const keepGroup = dialog.getByTestId("ai-triage-group-keep");
      await keepGroup.getByRole("button", { name: /继续保留|Keep/ }).click();
      await expect(keepGroup).toContainText("正在用的工具");
      await attachStepScreenshot(page, testInfo, "TABLIFE-009-AI整理建议");

      // Titles and cleaned URLs only: no secrets, no private pages, no page content
      expect(mockAi.requests).toHaveLength(1);
      const prompt = JSON.stringify(mockAi.requests[0].body.messages ?? []);
      expect(prompt).toContain("triage-a.e2e.test/doc");
      expect(prompt).not.toContain("secret-sig-value");
      expect(prompt).not.toContain("triage-d.e2e.test");
      expect(prompt).not.toContain("私密的登录页");
      expect(prompt).not.toContain("Readability");

      await dialog.getByTestId("ai-triage-apply").click();
      await expect(dialog).toBeHidden({ timeout: 20_000 });
      await expect.poll(() => countTabs(extensionWorker, URL_A), { timeout: 10_000 }).toBe(0);
      await expect.poll(() => countTabs(extensionWorker, URL_B), { timeout: 10_000 }).toBe(0);
      await expect.poll(() => countTabs(extensionWorker, URL_D), { timeout: 10_000 }).toBe(0);
      expect(await countTabs(extensionWorker, URL_C)).toBe(1);
      const archived = await getTabArchiveEntries(extensionWorker);
      expect(archived).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ reason: "triage", title: "已经处理完的工单" }),
          expect.objectContaining({ reason: "triage", title: "私密的登录页" }),
        ]),
      );
      expect(Object.values(await getReadLaterEntries(extensionWorker))).toEqual([
        expect.objectContaining({ source: "triage", status: "unread" }),
      ]);
    } finally {
      await mockAi.close();
    }
  });
});
