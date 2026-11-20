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
    const launcher = page.getByRole("textbox", { name: t("问问书签助手…", "Ask the bookmark assistant…") });
    await launcher.fill(question);
    await page.getByRole("button", { name: t("发送", "Send"), exact: true }).click();

    const stopButton = page.getByRole("button", { name: t("停止生成", "Stop generating") });
    await expect(stopButton).toBeVisible();
    await expect(page.locator('header img[src$="/agent/hammy-thinking.svg"]')).toBeVisible();
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
    await expect(page.locator('header img[src$="/agent/hammy-idle.svg"]')).toBeVisible();
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
    await page.getByRole("textbox", { name: t("问问书签助手…", "Ask the bookmark assistant…") }).fill(question);
    const input = await openAssistant(page, t);
    await expect(input).toHaveValue(question);
    await input.press("Enter");

    await expect(page.getByText(firstPart).first()).toBeVisible();
    await page.getByRole("button", { name: t("停止生成", "Stop generating") }).click();

    // The message goes back into the input and the chat returns to its empty state.
    await expect(input).toHaveValue(question);
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
});
