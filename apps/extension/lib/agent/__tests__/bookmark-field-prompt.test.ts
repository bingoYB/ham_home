import { describe, expect, it } from "vitest";
import { buildBookmarkFieldPrompt, type BookmarkFieldPromptInput } from "../prompts/bookmark-field-prompt";

const input: BookmarkFieldPromptInput = {
  field: "tags", retry: false, language: "zh",
  pageContent: {
    url: "https://example.com/react", title: "React 前端开发", content: "React 用于构建网页界面。",
    textContent: "React 用于构建网页界面。", htmlContent: "", excerpt: "React 入门", favicon: "",
    metadata: { author: "metadata-only-author" }, isReaderable: true,
  },
  userCategories: [{ id: "dev", name: "开发", parentId: null, order: 0, createdAt: 0 }],
  existingTags: ["React", "美食", "HTTP：缓存"],
  presetTags: ["React", "旅行"],
};

describe("small-model bookmark field prompts", () => {
  it("does not feed unrelated existing labels into the tag task", () => {
    const prompt = buildBookmarkFieldPrompt(input);
    expect(prompt).toContain("可选名称（仅选与网页相关的）: React");
    expect(prompt).not.toContain("美食");
    expect(prompt).not.toContain("旅行");
    expect(prompt).not.toContain("HTTP：缓存");
    expect(prompt).not.toContain("metadata-only-author");
  });

  it.each(["title", "summary"] as const)("keeps category and tag candidates out of the %s task", field => {
    const prompt = buildBookmarkFieldPrompt({ ...input, field, existingTags: ["tag-only-name"], userCategories: [{ ...input.userCategories![0], name: "category-only-name" }] });
    expect(prompt).not.toContain("tag-only-name");
    expect(prompt).not.toContain("category-only-name");
    expect(prompt).toContain(input.pageContent.content);
  });

  it("does not offer category names rejected by the field parser", () => {
    const prompt = buildBookmarkFieldPrompt({ ...input, field: "category", userCategories: [
      { ...input.userCategories![0], name: "开发：前端" },
      { ...input.userCategories![0], id: "tools", name: "工具" },
    ] });
    expect(prompt).toContain("可选名称（仅选与网页相关的）: 工具");
    expect(prompt).not.toContain("开发：前端");
    expect(prompt).not.toContain("HTTP：缓存");
  });

  it("bounds long page and candidate context while retaining the task", () => {
    const prompt = buildBookmarkFieldPrompt({
      ...input, field: "category",
      pageContent: { ...input.pageContent, content: `${"正".repeat(3000)}tail-not-in-context` },
      userCategories: Array.from({ length: 50 }, (_, index) => ({ ...input.userCategories![0], id: `cat-${index}`, name: `cat-${index}` })),
    });
    expect(prompt).not.toContain("tail-not-in-context");
    expect(prompt).toContain("cat-19");
    expect(prompt).not.toContain("cat-20");
    expect(prompt.length).toBeLessThan(3600);
    expect(prompt).toContain("只输出一个最合适的分类");
  });

  it("uses the excerpt if a page has no extracted body", () => {
    const prompt = buildBookmarkFieldPrompt({ ...input, pageContent: { ...input.pageContent, content: "", textContent: "" } });
    expect(prompt).toContain("正文:\nReact 入门");
  });

  it("puts the concrete retry feedback before the output contract", () => {
    const prompt = buildBookmarkFieldPrompt({ ...input, retry: true, retryReason: "包含不支持的字符“：”" });
    expect(prompt).toContain("上次输出的格式无效：包含不支持的字符“：”");
    expect(prompt.indexOf("上次输出的格式无效")).toBeLessThan(prompt.indexOf("提取一个关键词"));
  });

  it("uses English instructions and retry feedback for English configuration", () => {
    const prompt = buildBookmarkFieldPrompt({ ...input, language: "en", retry: true, retryReason: "Returned multiple lines" });
    expect(prompt).toContain("The previous response had an invalid format: Returned multiple lines");
    expect(prompt).toContain("Return only that keyword");
    expect(prompt).not.toContain("上次输出");
  });

  it("asks for only one keyword on sparse pages instead of filling a list", () => {
    expect(buildBookmarkFieldPrompt({ ...input, pageContent: { ...input.pageContent, title: "首页", content: "欢迎访问。", textContent: "欢迎访问。" } })).toContain("提取一个关键词");
    expect(buildBookmarkFieldPrompt({ ...input, pageContent: { ...input.pageContent, content: "介绍 React 状态管理和前端开发。".repeat(10) } })).toContain("提取最多三个关键词");
  });
});
