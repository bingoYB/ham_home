import { z } from "zod";

import type {
  AILanguage,
  AnalyzeBookmarkInput,
  BookmarkAnalysisResult,
} from "../types";
import {
  buildBookmarkAnalysisPrompt,
  buildCategoryPrompt,
  buildTagsPrompt,
  buildTitleSummaryPrompt,
  getBookmarkAnalysisSystemPrompt,
  getCategorySystemPrompt,
  getTagsSystemPrompt,
  getTitleSummarySystemPrompt,
} from "../prompts/bookmark-analysis";
import { invokeStructuredChain } from "../chains/runnable-helpers";
import { cleanTags } from "../utils/text";
import { createBookmarkAnalysisFallback } from "../utils/fallback";
import type { SupportedChatModel } from "../factory/chat-model";

const TitleSummarySchema = z.object({
  title: z.string().describe("优化后的标题，简洁明了，不超过50字"),
  summary: z.string().max(200).describe("一句话摘要，概括核心内容，不超过200字"),
});

const CategorySchema = z.object({
  category: z.string().describe("推荐的分类名称，优先从用户已有分类中选择"),
});

const TagsSchema = z.object({
  tags: z.array(z.string()).max(5).describe("3-5个相关标签，简洁有辨识度"),
});

export interface BookmarkAnalysisStrategy {
  analyze(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult>;
}

interface BookmarkAnalysisStrategyOptions {
  model: SupportedChatModel;
  language: AILanguage;
  debug?: boolean;
}

export class SinglePassBookmarkAnalysisStrategy
  implements BookmarkAnalysisStrategy
{
  constructor(private readonly options: BookmarkAnalysisStrategyOptions) {}

  async analyze(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult> {
    const object = await invokeStructuredChain({
      model: this.options.model,
      schema: z.object({
        title: z.string().describe("优化后的标题，简洁明了，不超过50字"),
        summary: z
          .string()
          .max(200)
          .describe("一句话摘要，概括核心内容，不超过200字"),
        category: z
          .string()
          .describe("推荐的分类名称，优先从用户已有分类或预设分类中选择"),
        tags: z.array(z.string()).max(5).describe("3-5个相关标签，简洁有辨识度"),
      }),
      system: getBookmarkAnalysisSystemPrompt(this.options.language),
      prompt: buildBookmarkAnalysisPrompt(input, this.options.language),
      taskName: "analyzeBookmarkSingle",
      debug: this.options.debug,
    });

    return {
      title: object.title || input.title || "未命名书签",
      summary: object.summary || "",
      category: object.category || "未分类",
      tags: cleanTags(object.tags || []),
    };
  }
}

export class BatchBookmarkAnalysisStrategy implements BookmarkAnalysisStrategy {
  constructor(private readonly options: BookmarkAnalysisStrategyOptions) {}

  async analyze(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult> {
    try {
      const [titleSummary, category, tags] = await Promise.all([
        invokeStructuredChain({
          model: this.options.model,
          schema: TitleSummarySchema,
          system: getTitleSummarySystemPrompt(this.options.language),
          prompt: buildTitleSummaryPrompt(input, this.options.language),
          taskName: "TitleSummary",
          debug: this.options.debug,
        }).catch(() => ({
          title: input.title || "未命名书签",
          summary: "",
        })),
        invokeStructuredChain({
          model: this.options.model,
          schema: CategorySchema,
          system: getCategorySystemPrompt(this.options.language),
          prompt: buildCategoryPrompt(input, this.options.language),
          taskName: "Category",
          debug: this.options.debug,
        }).catch(() => ({ category: "未分类" })),
        invokeStructuredChain({
          model: this.options.model,
          schema: TagsSchema,
          system: getTagsSystemPrompt(this.options.language),
          prompt: buildTagsPrompt(input, this.options.language),
          taskName: "Tags",
          debug: this.options.debug,
        }).catch(() => ({ tags: [] })),
      ]);

      return {
        title: titleSummary.title || input.title || "未命名书签",
        summary: titleSummary.summary || "",
        category: category.category || "未分类",
        tags: cleanTags(tags.tags || []),
      };
    } catch {
      return createBookmarkAnalysisFallback(input);
    }
  }
}
