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
    const input = await openAssistant(page, t);
    await input.fill(question);
    await input.press("Enter");

    const stopButton = page.getByRole("button", { name: t("停止生成", "Stop generating") });
    await expect(stopButton).toBeVisible();
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
    await input.fill(question);
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
