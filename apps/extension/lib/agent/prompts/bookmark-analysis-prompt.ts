/**
 * 整页书签的分析提示词。
 * 分析主体是整个网页，产出标题、摘要、分类与标签。
 * 剪藏（图片 / 选中文字）有各自独立的提示词，不要在此文件混用。
 */
import { z } from "zod";
import type { JsonSchema } from "@hamhome/agent";
import type { LocalCategory, PageContent } from "@/types";
import {
  buildCategoryContext,
  joinPromptLines,
  truncate,
  type PromptLanguage,
} from "./shared";

export const bookmarkAnalysisResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
});

export type BookmarkAnalysisOutput = z.infer<typeof bookmarkAnalysisResultSchema>;

export const bookmarkAnalysisOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "category", "tags"],
  additionalProperties: false,
};

export function buildBookmarkAnalysisSystemPrompt(
  language: PromptLanguage,
): string {
  return language === "zh"
    ? "你是 HamHome 的书签分析 Agent。你必须根据给定页面上下文生成结构化书签分析结果，不允许编造页面中不存在的信息。若已有分类可匹配，优先复用已有分类名称；若需要新分类，输出简洁的分类名或层级路径。"
    : "You are HamHome's bookmark analysis agent. Produce grounded structured bookmark analysis only from the provided page context. Prefer existing category names when possible. If a new category is needed, keep it concise.";
}

export interface BookmarkAnalysisPromptInput {
  language: PromptLanguage;
  pageContent: PageContent;
  userCategories?: LocalCategory[];
  existingTags?: string[];
  presetTags?: string[];
}

export function buildBookmarkAnalysisPrompt(
  input: BookmarkAnalysisPromptInput,
): string {
  const { language, pageContent } = input;

  return joinPromptLines([
    `language: ${language}`,
    `url: ${pageContent.url}`,
    `title: ${pageContent.title}`,
    `excerpt: ${truncate(pageContent.excerpt, 800)}`,
    `metadata: ${JSON.stringify(pageContent.metadata || {})}`,
    `existingTags: ${JSON.stringify(input.existingTags || [])}`,
    `existingCategories: ${JSON.stringify(buildCategoryContext(input.userCategories))}`,
    `presetTags: ${JSON.stringify(input.presetTags || [])}`,
    `pageContent: ${truncate(pageContent.content || pageContent.textContent, 12000)}`,
    language === "zh"
      ? "输出要求：title 为最终保存标题，summary 为 1-3 句摘要，category 为最合适分类，tags 为不重复的简短标签。"
      : "Output requirements: title should be the saved title, summary should be a 1-3 sentence summary, category should be the best fit, tags should be short deduplicated labels.",
  ]);
}
