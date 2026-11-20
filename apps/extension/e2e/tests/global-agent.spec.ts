import type { Page } from "@playwright/test";
import { test as base, expect } from "../fixtures";
import {
  pointAiConfigToMock,
  startMockAiServer,
  type MockAiServer,
} from "../helpers/mock-ai-server";
import { attachStepScreenshot, openAppPage } from "../helpers/pages";
import { resetExtensionData } from "../helpers/storage";
import type { E2EVariant } from "../helpers/variants";

const test = base.extend<{ mockAi: MockAiServer }>({
  mockAi: async ({}, use) => {
    const server = await startMockAiServer();
    await use(server);
    await server.close();
  },
});

type Text = E2EVariant["text"];

function botAvatar(page: Page) {
  return page.locator('header [data-shape="bot"][data-color="orange"][data-style="pixel"]');
}

/** Opens the global assistant panel and returns its message input. */
async function openAssistant(page: Page, t: Text) {
  await page.getByLabel(t("打开全局助手", "Open global assistant")).click();
  const input = page.getByPlaceholder(t("问插件功能、配置项或书签...", "Ask about features, settings, or bookmarks..."));
  await expect(input).toBeVisible();
  return input;
}

/** Mock answer streamed piece by piece; "第一段"/"firstpart" arrives early, "结束标记"/"endmarker" last. */
const ANSWER_CHUNKS: Record<E2EVariant["language"], string[]> = {
  zh: ["流式", "回答", "第一段", "已经", "到达", "，", "后续", "内容", "正在", "逐步", "生成", "，", "结束标记"],
  en: ["Streamed", " answer", " firstpart", " has", " arrived,", " more", " text", " keeps", " coming", " in,", " endmarker"],
};

test.describe("全局助手流式对话", () => {
  test.beforeEach(async ({ extensionWorker, e2eVariant, mockAi }) => {
    await resetExtensionData(extensionWorker, { settings: e2eVariant.settings });
    await pointAiConfigToMock(extensionWorker, mockAi.baseUrl);
  });

  test("流式输出只跟随在底部阅读的用户", async ({ context, extensionId, e2eVariant, mockAi }) => {
    const t = e2eVariant.text;
    const chunks = Array.from({ length: 6 }, (_, index) =>
      `\n\nStream section ${index + 1}\n\n${"Reading content. ".repeat(240)}`,
    );
    mockAi.enqueueReply({ chunks, chunkDelayMs: 900 });

    const page = await openAppPage(context, extensionId, "all");
    const input = await openAssistant(page, t);
    const viewport = page.locator('[data-slot="scroll-area-viewport"]').filter({ hasText: "Stream section 1" });
    const distanceFromBottom = () => viewport.evaluate(
      (element) => element.scrollHeight - element.clientHeight - element.scrollTop,
    );
    const scrollTo = (end: boolean) => viewport.evaluate((element, toEnd) => new Promise<void>((resolve) => {
      element.addEventListener("scroll", () => resolve(), { once: true });
      element.scrollTop = toEnd ? element.scrollHeight : 0;
    }), end);

    await input.fill("Stream a long answer");
    await page.getByRole("button", { name: t("发送", "Send"), exact: true }).click();
    await expect(viewport.getByText("Stream section 1", { exact: true })).toBeVisible();
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(200);
    await expect.poll(distanceFromBottom).toBeLessThanOrEqual(1);

    await scrollTo(false);
    await expect(viewport.getByText("Stream section 3", { exact: true })).toBeVisible();
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await distanceFromBottom()).toBeGreaterThan(200);

    await scrollTo(true);
    await expect(viewport.getByText("Stream section 6", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: t("停止生成", "Stop generating") })).toHaveCount(0);
    await expect.poll(distanceFromBottom).toBeLessThanOrEqual(1);
  });

  test("AGENT-001 回答实时流式显示并保存到会话", async ({
    context,
    extensionId,
    e2eVariant,
    mockAi,
  }, testInfo) => {
    const t = e2eVariant.text;
    const question = t("帮我总结最近的收藏", "Summarize my recent saves");
    const chunks = ANSWER_CHUNKS[e2eVariant.language];
    const firstPart = t("第一段", "firstpart");
    const endMarker = t("结束标记", "endmarker");
    mockAi.enqueueReply({ chunks, chunkDelayMs: 300 });

    const page = await openAppPage(context, extensionId, "all");
    if (e2eVariant.name === "dark") {
      await expect(page.locator("html")).toHaveClass(/dark/);
    }
    const launcher = page.getByPlaceholder(t("问插件功能、配置项或书签...", "Ask about features, settings, or bookmarks..."));
    await expect(page.locator(".aora-mark")).toHaveCount(0);
    await expect(page.getByRole("button", { name: t("打开全局助手", "Open global assistant") })).toBeVisible();
    await testInfo.attach("收起入口", {
      body: await page.locator("form").filter({ has: launcher }).screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    await launcher.fill(question);
    await page.getByRole("button", { name: t("发送", "Send"), exact: true }).click();

    const stopButton = page.getByRole("button", { name: t("停止生成", "Stop generating") });
    await expect(stopButton).toBeVisible();
    await expect(botAvatar(page)).toHaveAttribute("data-state", "working");
    // Part of the answer is shown while the rest is still being generated.
    // The stop button shows only while the turn runs, so seeing it together
    // with partial text proves live streaming rather than the typing
    // animation that plays after a turn has finished.
    await expect(page.getByText(firstPart)).toBeVisible();
    expect(await stopButton.isVisible()).toBe(true);
    await expect(page.getByText(endMarker)).toHaveCount(0);
    await attachStepScreenshot(page, testInfo, "AGENT-001-流式输出中");

    await expect(page.getByText(endMarker)).toBeVisible({ timeout: 15_000 });
    await expect(stopButton).toHaveCount(0);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "sleeping");
    await expect(page.getByRole("button", { name: t("发送", "Send") })).toBeVisible();
    await attachStepScreenshot(page, testInfo, "AGENT-001-回答完成");

    expect(mockAi.requests).toHaveLength(1);
    expect(mockAi.requests[0].body.stream).toBe(true);
    expect(JSON.stringify(mockAi.requests[0].body.messages)).toContain(question);

    // The finished turn is stored in the session.
    await page.reload();
    await openAssistant(page, t);
    await expect(page.getByText(question, { exact: true }).last()).toBeVisible();
    await expect(page.getByText(endMarker)).toBeVisible();
  });

  test("AGENT-002 中途停止生成不保存本轮", async ({
    context,
    extensionId,
    e2eVariant,
    mockAi,
  }, testInfo) => {
    const t = e2eVariant.text;
    const question = t("把所有书签整理一遍", "Tidy up all my bookmarks");
    const emptyHint = t("可以问我插件功能", "Ask about extension features");
    const firstPart = t("第一段", "firstpart");
    // Long enough that the turn is still streaming when it is stopped.
    const chunks = ANSWER_CHUNKS[e2eVariant.language];
    mockAi.enqueueReply({ chunks: [...chunks, ...chunks], chunkDelayMs: 300 });

    const page = await openAppPage(context, extensionId, "all");
    const input = await openAssistant(page, t);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "sleeping");
    const emptyAvatar = page.getByText(emptyHint).locator("..").locator('[data-shape="bot"]');
    await expect(emptyAvatar.locator("svg")).toBeVisible();
    await expect(emptyAvatar).toHaveCSS("width", "72px");
    await input.fill(question);
    await expect(emptyAvatar).toHaveAttribute("data-state", "idle");
    await input.press("Enter");
    await expect(emptyAvatar).toHaveCount(0);

    await expect(page.getByText(firstPart).first()).toBeVisible();
    await page.getByRole("button", { name: t("停止生成", "Stop generating") }).click();

    // The message goes back into the input and the chat returns to its empty state.
    await expect(input).toHaveValue(question);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "idle");
    await expect(page.getByText(emptyHint)).toBeVisible();
    await expect(page.getByText(firstPart)).toHaveCount(0);
    await expect(page.getByText("Error", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: t("发送", "Send") })).toBeEnabled();
    await expect.poll(() => mockAi.requests[0]?.aborted).toBe(true);
    await attachStepScreenshot(page, testInfo, "AGENT-002-停止后恢复输入");

    // Nothing of the stopped turn is stored.
    await page.reload();
    await openAssistant(page, t);
    await expect(page.getByText(emptyHint)).toBeVisible();
  });

  test("AGENT-004 报错时显示警报，修复配置后恢复", async ({
    context, extensionId, extensionWorker, e2eVariant, mockAi,
  }, testInfo) => {
    const t = e2eVariant.text;
    await extensionWorker.evaluate(async () => {
      const { aiConfig } = await chrome.storage.sync.get("aiConfig");
      await chrome.storage.sync.set({ aiConfig: { ...aiConfig, provider: "openai", apiKey: "" } });
    });

    const page = await openAppPage(context, extensionId);
    const input = await openAssistant(page, t);
    await input.fill(t("整理收藏", "Organize my bookmarks"));
    await input.press("Enter");
    await expect(page.getByText("请先配置 API Key")).toBeVisible();
    await expect(botAvatar(page)).toHaveAttribute("data-state", "alerting");
    await expect(botAvatar(page).locator("svg")).toBeVisible();
    await attachStepScreenshot(page, testInfo, "AGENT-004-配置报错");

    await input.fill("");
    await page.locator("header").getByTitle(t("关闭", "Close"), { exact: true }).click();
    await expect(page.locator(".aora-mark")).toHaveCount(0);
    await openAssistant(page, t);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "alerting");

    await pointAiConfigToMock(extensionWorker, mockAi.baseUrl);
    await input.fill(t("重试", "Try again"));
    await input.press("Enter");
    await expect(page.getByText("OK", { exact: true })).toBeVisible();
    await expect(botAvatar(page)).toHaveAttribute("data-state", "idle");
  });

  test("AGENT-005 聚焦唤醒，重新聚焦取消休眠计时", async ({ context, extensionId, e2eVariant }) => {
    const page = await openAppPage(context, extensionId);
    const input = await openAssistant(page, e2eVariant.text);
    await page.clock.install();
    await input.focus();
    await expect(botAvatar(page)).toHaveAttribute("data-state", "idle");
    await input.blur();
    await page.clock.fastForward(9_000);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "idle");
    await input.focus();
    await page.clock.fastForward(10_000);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "idle");
    await input.blur();
    await page.clock.fastForward(10_000);
    await expect(botAvatar(page)).toHaveAttribute("data-state", "sleeping");
  });

  for (const surface of ["扩展主页", "页内书签面板"] as const) {
    test(`AGENT-003 ${surface}从标题切换会话`, async ({
      context, extensionId, e2eVariant, mockAi,
    }, testInfo) => {
      const t = e2eVariant.text;
      const inPanel = surface === "页内书签面板";
      const page = inPanel ? await context.newPage() : await openAppPage(context, extensionId);
      if (inPanel) {
        await page.setViewportSize({ width: 390, height: 760 });
        const url = "https://agent-sessions.e2e.test/";
        await page.route(url, (route) => route.fulfill({ contentType: "text/html", body: "<main>Bookmarks</main>" }));
        await page.goto(url);
        const panelTrigger = page.getByTitle(t("打开书签面板", "Open Bookmark Panel"));
        await expect(panelTrigger).toBeAttached();
        await page.bringToFront();
        await page.mouse.move(2, 380);
        await panelTrigger.click();
      }

      const input = await openAssistant(page, t);
      await expect(botAvatar(page).locator("svg")).toBeVisible();
      await expect(botAvatar(page)).toHaveCSS("width", "48px");
      const host = inPanel ? page.locator("hamhome-bookmark-panel") : page.locator("body");
      const heading = host.getByText("HamHome Agent", { exact: true });
      await expect(heading).toBeVisible();
      expect(await heading.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
      const picker = host.getByRole("button", { name: t("切换对话", "Switch chat") });
      const newChat = t("新对话", "New chat");
      await expect(host.locator("header").getByText(newChat, { exact: true })).toBeVisible();
      await expect(picker).toHaveCount(0);

      const question = t("帮我找出最近收藏的设计资料", "Find recently saved design references");
      const answer = t("找到了最近收藏的设计资料。", "Here are your recent design references.");
      mockAi.enqueueReply({ chunks: [answer] });
      await input.fill(question);
      await input.press("Enter");
      await expect(host.getByText(answer, { exact: true })).toBeVisible();
      await host.getByRole("button", { name: newChat, exact: true }).click();
      await expect(picker).toHaveText(newChat);

      await picker.press("Enter");
      const list = host.getByRole("listbox");
      const search = host.getByPlaceholder(t("搜索会话…", "Search chats…"));
      await expect(search).toBeFocused();
      await expect(list.getByRole("option", { name: newChat })).toHaveAttribute("aria-current", "true");
      const headerBox = await host.locator("header").filter({ hasText: "HamHome Agent" }).boundingBox();
      const listBox = await list.boundingBox();
      if (headerBox && listBox) {
        await testInfo.attach("会话切换", {
          body: await page.screenshot({
            animations: "disabled",
            clip: {
              ...headerBox,
              width: Math.max(headerBox.width, listBox.x + listBox.width - headerBox.x) + 2,
              height: listBox.y + listBox.height - headerBox.y + 24,
            },
          }),
          contentType: "image/png",
        });
      }
      await page.keyboard.press("Escape");
      await expect(list).toHaveCount(0);
      await expect(picker).toBeFocused();

      await picker.press("Enter");
      await expect(search).toBeFocused();
      await page.keyboard.press("ArrowDown");
      await expect(list.getByRole("option", { name: question })).toHaveAttribute("aria-selected", "true");
      await search.fill(t("设计", "design"));
      await expect(list.getByRole("option")).toHaveCount(1);
      await page.keyboard.press("Enter");
      await expect(picker).toHaveText(question);
      await expect(host.getByText(answer, { exact: true })).toBeVisible();

      await picker.click();
      await search.fill("zzz");
      await expect(host.getByText(t("未找到匹配结果", "No results found"), { exact: true })).toBeVisible();
      await search.fill("");
      await list.getByRole("option", { name: newChat }).click();
      await expect(picker).toHaveText(newChat);
      await expect(host.getByText(answer, { exact: true })).toHaveCount(0);
    });
  }
});
