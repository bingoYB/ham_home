import { describe, expect, it } from "vitest";
import {
  buildClipHighlightPrompt,
  buildClipHighlightSystemPrompt,
  buildClipImagePrompt,
  buildClipImageSystemPrompt,
  clipHighlightOutputSchema,
  clipImageOutputSchema,
  clipImageResultSchema,
} from "../prompts";

describe("clip-highlight-prompt", () => {
  it("makes the selected passage the analysis subject", () => {
    const prompt = buildClipHighlightPrompt({
      language: "zh",
      selectedText: "Rust 的所有权系统在编译期消除数据竞争",
      contextBefore: "上一句",
      contextAfter: "下一句",
      sourceUrl: "https://example.com/post",
      sourceTitle: "编程语言周刊",
      sourceExcerpt: "本周的编程语言新闻汇总",
    });

    expect(prompt).toContain(
      "selectedText: Rust 的所有权系统在编译期消除数据竞争",
    );
    expect(prompt).toContain("contextBefore: 上一句");
    // 来源页降级为背景信息，不能与选中内容平级
    expect(prompt).toContain("sourcePageTitle: 编程语言周刊");
    expect(prompt).not.toContain("pageContent:");
  });

  it("only asks for category and tags", () => {
    expect(clipHighlightOutputSchema.required).toEqual(["category", "tags"]);
    expect(clipHighlightOutputSchema.properties).not.toHaveProperty("title");
    expect(buildClipHighlightSystemPrompt("zh")).toContain("选中的文字");
  });

  it("skips context lines that are absent", () => {
    const prompt = buildClipHighlightPrompt({
      language: "en",
      selectedText: "some passage",
    });

    expect(prompt).not.toContain("contextBefore:");
    expect(prompt).not.toContain("sourcePageTitle:");
  });
});

describe("clip-image-prompt", () => {
  it("carries the image url and its authored description", () => {
    const prompt = buildClipImagePrompt({
      language: "zh",
      imageUrl: "https://cdn.example.com/chart.png",
      imageAlt: "2024 年营收构成",
      caption: "图 3：各业务线营收占比",
      sourceTitle: "年度财报解读",
    });

    expect(prompt).toContain("imageUrl: https://cdn.example.com/chart.png");
    expect(prompt).toContain("imageAlt: 2024 年营收构成");
    expect(prompt).toContain("imageCaption: 图 3：各业务线营收占比");
    expect(prompt).toContain("sourcePageTitle: 年度财报解读");
  });

  it("asks for a title describing the image rather than the page", () => {
    expect(clipImageOutputSchema.required).toEqual([
      "title",
      "summary",
      "category",
      "tags",
      "colors",
    ]);
    expect(buildClipImageSystemPrompt("zh")).toContain("不是它所在的网页");
    expect(buildClipImagePrompt({ language: "zh", imageUrl: "x" })).toContain(
      "不要用来源页标题",
    );
  });

  it("requires 1-8 dominant colors as full hex values", () => {
    const baseResult = {
      title: "绿色武士",
      summary: "竹林中的武士角色。",
      category: "角色设计",
      tags: ["武士", "绿色"],
    };

    expect(
      clipImageResultSchema.parse({
        ...baseResult,
        colors: ["#102A18", "#D7C998"],
      }).colors,
    ).toEqual(["#102A18", "#D7C998"]);
    expect(() =>
      clipImageResultSchema.parse({ ...baseResult, colors: [] }),
    ).toThrow();
    expect(() =>
      clipImageResultSchema.parse({ ...baseResult, colors: ["green"] }),
    ).toThrow();
    expect(buildClipImageSystemPrompt("zh")).toContain("1-8 个");
  });
});
