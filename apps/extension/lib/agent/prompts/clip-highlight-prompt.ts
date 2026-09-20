/**
 * 文字剪藏的分析提示词。
 * 分析主体是用户选中的片段，来源页只是上下文。
 * 文字剪藏在保存面板上没有标题与摘要输入，因此只产出分类与标签。
 */
import { z } from "zod";
import type { JsonSchema } from "@hamhome/agent";
import type { LocalCategory } from "@/types";
import {
  buildCategoryContext,
  joinPromptLines,
  truncate,
  type PromptLanguage,
} from "./shared";

export const clipHighlightResultSchema = z.object({
  category: z.string(),
  tags: z.array(z.string()),
});

export type ClipHighlightOutput = z.infer<typeof clipHighlightResultSchema>;

export const clipHighlightOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
  required: ["category", "tags"],
  additionalProperties: false,
};

export function buildClipHighlightSystemPrompt(
  language: PromptLanguage,
): string {
  return language === "zh"
    ? [
        "你是 HamHome 的划词剪藏分析 Agent。用户保存的主体是这段选中的文字，不是它所在的整个网页。",
        "分类与标签必须描述这段文字讲了什么，禁止直接套用来源页的整体主题。",
        "只依据给定内容判断，不要编造。若已有分类可匹配，优先复用已有分类名称；若需要新分类，输出简洁的分类名或层级路径。",
      ].join("\n")
    : [
        "You are HamHome's text clip analysis agent. The saved subject is the selected passage, not the whole page it came from.",
        "Category and tags must describe what this passage is about; never simply reuse the overall topic of the source page.",
        "Judge only from the given content and do not invent facts. Prefer existing category names; if a new one is needed, keep it concise.",
      ].join("\n");
}

export interface ClipHighlightPromptInput {
  language: PromptLanguage;
  selectedText: string;
  /** 选段在原文中的上下文，来自 TextQuoteSelector */
  contextBefore?: string;
  contextAfter?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceExcerpt?: string;
  userCategories?: LocalCategory[];
  existingTags?: string[];
  presetTags?: string[];
}

export function buildClipHighlightPrompt(
  input: ClipHighlightPromptInput,
): string {
  const { language } = input;

  return joinPromptLines([
    `language: ${language}`,
    `selectedText: ${truncate(input.selectedText, 2000)}`,
    input.contextBefore && `contextBefore: ${truncate(input.contextBefore, 200)}`,
    input.contextAfter && `contextAfter: ${truncate(input.contextAfter, 200)}`,
    // 来源页仅作背景参考，因此只给标题与短摘要
    input.sourceUrl && `sourcePageUrl: ${input.sourceUrl}`,
    input.sourceTitle && `sourcePageTitle: ${truncate(input.sourceTitle, 200)}`,
    input.sourceExcerpt &&
      `sourcePageExcerpt: ${truncate(input.sourceExcerpt, 300)}`,
    `existingTags: ${JSON.stringify(input.existingTags || [])}`,
    `existingCategories: ${JSON.stringify(buildCategoryContext(input.userCategories))}`,
    `presetTags: ${JSON.stringify(input.presetTags || [])}`,
    language === "zh"
      ? "输出要求：category 为最适合这段文字的分类，tags 为描述这段文字主题的不重复短标签。不要输出标题或摘要。"
      : "Output requirements: category is the best fit for this passage, tags are short deduplicated labels describing its topic. Do not output a title or summary.",
  ]);
}
