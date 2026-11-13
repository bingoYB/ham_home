import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PageContent } from "@/types";

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  createCategory: vi.fn(),
  matchCategory: vi.fn(() => ({ matched: false, categoryId: null })),
  config: {
    language: "zh" as "zh" | "en",
    temperature: 0.2,
    rawConfig: { smallModelMode: false, presetTags: ["阅读"] },
  },
}));

vi.mock("../../factory", () => ({
  createExtensionAgent: vi.fn(async () => ({
    agent: { commands: { run: mocks.run } },
    config: mocks.config,
  })),
}));
vi.mock("../../category-utils", () => ({
  createAIRecommendedCategory: mocks.createCategory,
  matchCategoryByName: mocks.matchCategory,
}));
vi.mock("../../fetch-page-content", () => ({
  fetchPageContentForAI: vi.fn(),
}));

const pageContent: PageContent = {
  url: "https://example.com/article",
  title: "Original title",
  content: "This page explains TypeScript.",
  textContent: "This page explains TypeScript.",
  htmlContent: "",
  excerpt: "A programming article",
  favicon: "",
  metadata: {},
  isReaderable: true,
};

describe("bookmark analysis compatibility mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.language = "zh";
    mocks.config.rawConfig.smallModelMode = false;
  });

  it("keeps one structured request for existing configurations", async () => {
    mocks.run.mockResolvedValue({
      output: { title: " 标题 ", summary: " 摘要 ", category: " 开发 ", tags: ["TS", "TS"] },
    });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    const result = await bookmarkAnalysisService.analyzeBookmark({ pageContent });

    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(mocks.run.mock.calls[0][0]).toMatchObject({
      name: "analyzeBookmark",
      outputSchema: { required: ["title", "summary", "category", "tags"] },
    });
    expect(result).toEqual({ title: "标题", summary: "摘要", category: "开发", tags: ["TS"] });
  });

  it("requests each field as plain text and assembles validated output", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    const responses: Record<string, string> = {
      title: "标题：TypeScript 入门",
      summary: "介绍 TypeScript 的基础知识。",
      category: "开发>前端",
      tags: "1、TypeScript\n2、前端\n3、typescript",
    };
    mocks.run.mockImplementation(async (_command, input) => ({ output: responses[input.field] }));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    const result = await bookmarkAnalysisService.analyzeBookmark({ pageContent });

    expect(mocks.run.mock.calls.map((call) => call[1].field)).toEqual([
      "title", "summary", "category", "tags",
    ]);
    for (const [command, input, options] of mocks.run.mock.calls) {
      expect(command.outputSchema).toBeUndefined();
      expect(command.tools).toEqual([]);
      expect(command.prompt(input, {})).toContain("This page explains TypeScript.");
      expect(options.temperature).toBe(0.2);
      expect(options.maxOutputTokens).toBe({ title: 128, summary: 256, category: 96, tags: 96 }[input.field as "title" | "summary" | "category" | "tags"]);
    }
    expect(result).toEqual({
      title: "TypeScript 入门",
      summary: "介绍 TypeScript 的基础知识。",
      category: "开发 > 前端",
      tags: ["TypeScript", "前端"],
    });
  });

  it("retries only a field with invalid output", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    const attempts: Record<string, number> = {};
    mocks.run.mockImplementation(async (_command, input) => {
      attempts[input.field] = (attempts[input.field] || 0) + 1;
      const responses: Record<string, string> = {
        title: "TypeScript",
        summary: "介绍 TypeScript。",
        category: attempts.category === 1 ? "分类：开发。这是一个编程网页。" : "开发",
        tags: '["TypeScript", "前端"]',
      };
      return { output: responses[input.field] };
    });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    const result = await bookmarkAnalysisService.analyzeBookmark({ pageContent });

    expect(attempts).toEqual({ title: 1, summary: 1, category: 2, tags: 1 });
    expect(mocks.run.mock.calls[3][1]).toMatchObject({ field: "category", retry: true });
    expect(mocks.run.mock.calls[3][1].retryReason).toBe("包含不支持的字符“。”");
    expect(mocks.run.mock.calls[3][0].prompt(mocks.run.mock.calls[3][1], {})).toContain("包含不支持的字符“。”");
    expect(result.category).toBe("开发");
    expect(result.tags).toEqual(["TypeScript", "前端"]);
  });

  it("fails without creating a category when a field remains invalid", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockImplementation(async (_command, input) => ({
      output: input.field === "category" ? "分类：这是一个关于编程的页面。" : "有效内容",
    }));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");

    await expect(bookmarkAnalysisService.analyzeBookmarkForLibrary({
      url: pageContent.url,
      title: pageContent.title,
      currentCategories: [],
    })).rejects.toThrow("分类校验失败：包含不支持的字符“。”");
    expect(mocks.run.mock.calls.map((call) => call[1].field)).toEqual([
      "title", "summary", "category", "category",
    ]);
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it.each(["category", "tags", "all", undefined] as const)(
    "limits applied metadata and category side effects for mode %s",
    async (mode) => {
      mocks.run.mockResolvedValue({
        output: mode === "category" ? "开发" : mode === "tags" ? "新标签" :
          { title: "标题", summary: "新摘要", category: "开发", tags: ["新标签"] },
      });
      mocks.createCategory.mockResolvedValue({ categoryId: "new-category", newCategories: [] });
      const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
      const result = await bookmarkAnalysisService.analyzeBookmarkForLibrary({
        url: pageContent.url,
        title: pageContent.title,
        currentCategories: [],
        mode,
      });
      expect(result).toEqual({
        description: !mode || mode === "all" ? "新摘要" : "",
        categoryId: mode === "tags" ? null : "new-category",
        tags: mode === "category" ? [] : ["新标签"],
        newCategories: [],
      });
      expect(mocks.createCategory).toHaveBeenCalledTimes(mode === "tags" ? 0 : 1);
      expect(mocks.matchCategory).toHaveBeenCalledTimes(mode === "tags" ? 0 : 1);
    },
  );

  it.each([
    { mode: "category" as const, smallModelMode: false },
    { mode: "tags" as const, smallModelMode: false },
    { mode: "category" as const, smallModelMode: true },
    { mode: "tags" as const, smallModelMode: true },
  ])("requests only $mode with smallModelMode=$smallModelMode", async ({ mode, smallModelMode }) => {
    mocks.config.rawConfig.smallModelMode = smallModelMode;
    mocks.run.mockResolvedValue({ output: mode === "category" ? "开发" : "TypeScript" });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    const result = await bookmarkAnalysisService.analyzeBookmark({
      pageContent, mode, existingTags: ["TypeScript"],
    });

    expect(mocks.run).toHaveBeenCalledTimes(1);
    const [command, input, options] = mocks.run.mock.calls[0];
    expect(command.name).toBe("analyzeBookmarkField");
    expect(command.outputSchema).toBeUndefined();
    expect(command.ignoreBaseSystemPrompt).toBe(true);
    expect(input.field).toBe(mode);
    expect(command.prompt(input, {})).toContain(mode === "category" ? "只输出一个最合适的分类" : "提取一个关键词");
    expect(options.maxOutputTokens).toBe(smallModelMode ? 96 : undefined);
    expect(options.systemPrompt).not.toContain("结构化");
    expect(result.summary).toBe("");
    expect(result.title).toBe("");
    if (mode === "category") {
      expect(input.existingTags).toBeUndefined();
      expect(input.presetTags).toBeUndefined();
      expect(result.tags).toEqual([]);
    } else {
      expect(input.userCategories).toBeUndefined();
      expect(result.category).toBe("");
    }
  });

  it.each(["category", "tags"] as const)("retries only %s and fails without category writes", async (mode) => {
    mocks.run.mockResolvedValue({ output: "" });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    await expect(bookmarkAnalysisService.analyzeBookmarkForLibrary({
      url: pageContent.url, title: pageContent.title, currentCategories: [], mode,
    })).rejects.toThrow("校验失败：模型未返回内容");
    expect(mocks.run.mock.calls.map((call) => call[1].field)).toEqual([mode, mode]);
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it("propagates request errors without repeatedly calling the model", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockRejectedValue(new Error("connection refused"));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");

    await expect(bookmarkAnalysisService.analyzeBookmark({ pageContent })).rejects.toThrow("connection refused");
    expect(mocks.run).toHaveBeenCalledTimes(1);
  });

  it("reports the actual Ollama category rejection and its response", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockImplementation(async (_command, input) => ({
      output: input.field === "category" ? "开发：前端" : "有效内容",
    }));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    await expect(bookmarkAnalysisService.analyzeBookmark({ pageContent })).rejects.toThrow(
      '分类校验失败：包含不支持的字符“：”。模型返回："开发：前端"',
    );
    expect(mocks.run.mock.calls.map(call => call[1].field)).toEqual(["title", "summary", "category", "category"]);
  });

  it("reports the final retry's rejection and bounds the response preview", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockResolvedValueOnce({ output: "" }).mockResolvedValueOnce({ output: "长".repeat(1000) });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    const error = await bookmarkAnalysisService.analyzeBookmark({ pageContent }).catch(error => error as Error);
    expect(error.message).toContain("标题校验失败：长度为 1000 字符，超过 240 字符上限");
    expect(error.message).toContain(`${"长".repeat(200)}…`);
    expect(error.message.length).toBeLessThan(300);
  });

  it("keeps provider details and HTTP status when a field request fails", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockRejectedValue(Object.assign(new Error("Model qwen-test was not found"), { statusCode: 404 }));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    await expect(bookmarkAnalysisService.analyzeBookmark({ pageContent })).rejects.toThrow(
      "标题请求失败：HTTP 404: Model qwen-test was not found",
    );
    expect(mocks.run).toHaveBeenCalledTimes(1);
  });

  it("reports localized validation details in English", async () => {
    mocks.config.language = "en";
    mocks.run.mockResolvedValue({ output: "dev:frontend" });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");
    await expect(bookmarkAnalysisService.analyzeBookmark({ pageContent, mode: "category" })).rejects.toThrow(
      'Invalid category: Contains the unsupported character “:”. Model response: "dev:frontend"',
    );
  });

  it("stops issuing fields when an import is cancelled", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    const controller = new AbortController();
    mocks.run.mockImplementation(async () => {
      controller.abort();
      return { output: "标题" };
    });
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");

    await expect(bookmarkAnalysisService.analyzeBookmark({
      pageContent,
      signal: controller.signal,
    })).rejects.toMatchObject({ name: "AbortError" });
    expect(mocks.run).toHaveBeenCalledTimes(1);
    expect(mocks.run.mock.calls[0][2].signal).toBe(controller.signal);
  });

  it.each([false, true])("tests connectivity without requiring JSON (small model mode: %s)", async (smallModelMode) => {
    mocks.config.rawConfig.smallModelMode = smallModelMode;
    mocks.run.mockResolvedValue({ output: "OK" });
    const { agentConfigService } = await import("../agent-config-service");

    await expect(agentConfigService.testConnection()).resolves.toEqual({ success: true, message: "连接成功" });
    expect(mocks.run.mock.calls[0][0]).toMatchObject({ name: "testPlainConnection", tools: [] });
    expect(mocks.run.mock.calls[0][0].outputSchema).toBeUndefined();
  });

  it("reports an empty connection-test response as a failure", async () => {
    mocks.config.language = "en";
    mocks.run.mockResolvedValue({ output: "  " });
    const { agentConfigService } = await import("../agent-config-service");

    await expect(agentConfigService.testConnection()).resolves.toEqual({
      success: false, message: "The model returned no text.",
    });
  });
});
