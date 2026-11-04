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
    })).rejects.toThrow("分类生成失败");
    expect(mocks.run.mock.calls.map((call) => call[1].field)).toEqual([
      "title", "summary", "category", "category",
    ]);
    expect(mocks.createCategory).not.toHaveBeenCalled();
  });

  it("propagates request errors without repeatedly calling the model", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockRejectedValue(new Error("connection refused"));
    const { bookmarkAnalysisService } = await import("../bookmark-analysis-service");

    await expect(bookmarkAnalysisService.analyzeBookmark({ pageContent })).rejects.toThrow("connection refused");
    expect(mocks.run).toHaveBeenCalledTimes(1);
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

  it("tests connectivity without requiring JSON in compatibility mode", async () => {
    mocks.config.rawConfig.smallModelMode = true;
    mocks.run.mockResolvedValue({ output: "OK" });
    const { agentConfigService } = await import("../agent-config-service");

    await expect(agentConfigService.testConnection()).resolves.toEqual({ success: true, message: "连接成功" });
    expect(mocks.run.mock.calls[0][0]).toMatchObject({ name: "testSmallModelConnection", tools: [] });
    expect(mocks.run.mock.calls[0][0].outputSchema).toBeUndefined();
  });
});
