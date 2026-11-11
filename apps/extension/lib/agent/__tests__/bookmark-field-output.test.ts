import { describe, expect, it } from "vitest";
import { parseBookmarkFieldOutput, type BookmarkField } from "../bookmark-field-output";

describe("bookmark field output diagnostics", () => {
  it.each([
    ["category", "开发：前端", "包含不支持的字符“：”"],
    ["title", "第一行\n第二行", "必须为单行文本，实际返回多行"],
    ["summary", "文".repeat(1201), "长度为 1201 字符，超过 1200 字符上限"],
    ["category", "A > B > C > D > E", "分类有 5 层，最多支持 4 层"],
    ["category", "A > > B", "第 2 层分类名称为空"],
    ["category", "名".repeat(31), "第 1 层分类名称长度为 31 字符，超过 30 字符上限"],
    ["title", "```title```", "包含 Markdown 代码块，预期为纯文本"],
    ["summary", "<think>thinking</think>摘要", "包含 <think> 推理标记，预期为最终结果"],
    ["title", '{"title":"标题"}', "返回了 JSON 对象或数组，预期为纯文本"],
    ["category", "unknown", "模型返回了未知或空值占位内容"],
    ["tags", '["React",]', "标签 JSON 数组格式无效，无法解析"],
    ["tags", '["React",123]', "第 2 个标签不是文本"],
    ["tags", "HTTP：缓存", "第 1 个标签包含不支持的字符“：”"],
    ["tags", "文".repeat(31), "第 1 个标签长度为 31 字符，超过 30 字符上限"],
    ["tags", '["", " "]', "模型未返回任何非空标签"],
    ["tags", Array.from({ length: 11 }, (_, index) => `tag${index}`).join(","), "去重后有 11 个标签，最多支持 10 个"],
    ["summary", "   ", "模型未返回内容"],
    ["title", { title: "标题" }, "模型返回了非文本结果（object），预期为文本"],
  ] as Array<[BookmarkField, unknown, string]>)("explains invalid %s output", (field, raw, reason) => {
    expect(parseBookmarkFieldOutput(raw, field, "zh")).toEqual({ error: reason });
  });

  it("preserves existing normalization and tag deduplication", () => {
    expect(parseBookmarkFieldOutput("分类：开发>前端", "category", "zh")).toEqual({ value: "开发 > 前端" });
    expect(parseBookmarkFieldOutput("1、React\n2、react\n3、TypeScript", "tags", "zh")).toEqual({ value: ["React", "TypeScript"] });
    expect(parseBookmarkFieldOutput('["React","TypeScript"]', "tags", "en")).toEqual({ value: ["React", "TypeScript"] });
  });
});
