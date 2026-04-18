import { generateStructuredObject } from "@hamhome/agent";
import { z } from "zod";
import {
  buildCategoryTree,
  formatCategoryHierarchy,
} from "@/lib/preset-categories";
import type {
  AnalysisResult,
  LocalCategory,
  PageContent,
} from "@/types";
import {
  createAIRecommendedCategory,
  matchCategoryByName,
} from "../category-utils";
import { getAgentErrorMessage } from "../errors";
import { fetchPageContentForAI } from "../fetch-page-content";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";

const bookmarkAnalysisSchema = z.object({
  title: z.string().trim().min(1).max(200),
  summary: z.string().trim().min(1).max(500),
  category: z.string().trim().max(120).default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
});

type BookmarkAnalysisOutput = z.infer<typeof bookmarkAnalysisSchema>;

export interface EnhancedAnalyzeInput {
  pageContent: PageContent;
  userCategories?: LocalCategory[];
  existingTags?: string[];
}

export interface BookmarkAnalysisApplyResult {
  description: string;
  categoryId: string | null;
  tags: string[];
  newCategories: LocalCategory[];
}

function truncate(text: string | undefined, maxLength: number): string {
  return (text || "").trim().slice(0, maxLength);
}

function buildCategoryContext(categories?: LocalCategory[]): string[] {
  if (!categories?.length) {
    return [];
  }

  const categoryTree = buildCategoryTree(categories);
  return formatCategoryHierarchy(categoryTree);
}

class BookmarkAnalysisService {
  async analyzeBookmark(input: EnhancedAnalyzeInput): Promise<AnalysisResult> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    const categoryContext = buildCategoryContext(input.userCategories);
    const pageContent = input.pageContent;

    try {
      const result = await generateStructuredObject({
        provider: config.provider,
        model: config.model,
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        temperature: config.temperature ?? 0.2,
        maxTokens: config.maxTokens ?? 900,
        schema: bookmarkAnalysisSchema,
        system:
          config.language === "zh"
            ? "你是 HamHome 的书签分析 Agent。你必须根据给定页面上下文生成结构化书签分析结果，不允许编造页面中不存在的信息。若已有分类可匹配，优先复用已有分类名称；若需要新分类，输出简洁的分类名或层级路径。"
            : "You are HamHome's bookmark analysis agent. Produce grounded structured bookmark analysis only from the provided page context. Prefer existing category names when possible. If a new category is needed, keep it concise.",
        prompt: [
          `language: ${config.language}`,
          `url: ${pageContent.url}`,
          `title: ${pageContent.title}`,
          `excerpt: ${truncate(pageContent.excerpt, 800)}`,
          `metadata: ${JSON.stringify(pageContent.metadata || {})}`,
          `existingTags: ${JSON.stringify(input.existingTags || [])}`,
          `existingCategories: ${JSON.stringify(categoryContext)}`,
          `presetTags: ${JSON.stringify(config.rawConfig.presetTags || [])}`,
          `pageContent: ${truncate(pageContent.content || pageContent.textContent, 12000)}`,
          config.language === "zh"
            ? "输出要求：title 为最终保存标题，summary 为 1-3 句摘要，category 为最合适分类，tags 为不重复的简短标签。"
            : "Output requirements: title should be the saved title, summary should be a 1-3 sentence summary, category should be the best fit, tags should be short deduplicated labels.",
        ].join("\n\n"),
      });

      const output = result.object as BookmarkAnalysisOutput;

      return {
        title: output.title.trim(),
        summary: output.summary.trim(),
        category: output.category.trim(),
        tags: [...new Set(output.tags.map((tag) => tag.trim()).filter(Boolean))],
      };
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "书签分析失败"));
    }
  }

  async analyzeBookmarkForLibrary(options: {
    url: string;
    title: string;
    currentCategories: LocalCategory[];
    existingTags?: string[];
    shouldFetchPageContent?: boolean;
  }): Promise<BookmarkAnalysisApplyResult> {
    const content = options.shouldFetchPageContent
      ? await fetchPageContentForAI(options.url)
      : "";

    const hostname = (() => {
      try {
        return new URL(options.url).hostname;
      } catch {
        return "";
      }
    })();

    const result = await this.analyzeBookmark({
      pageContent: {
        url: options.url,
        title: options.title,
        content,
        htmlContent: "",
        textContent: content,
        excerpt: "",
        favicon: hostname
          ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
          : "",
        metadata: {},
        isReaderable: !!content,
      },
      userCategories: options.currentCategories,
      existingTags: options.existingTags,
    });

    let categoryId: string | null = null;
    let newCategories: LocalCategory[] = [];

    if (result.category) {
      const matchedCategory = matchCategoryByName(
        result.category,
        options.currentCategories,
      );

      if (matchedCategory.matched) {
        categoryId = matchedCategory.categoryId;
      } else {
        const createdCategory = await createAIRecommendedCategory(
          result.category,
          options.currentCategories,
        );
        categoryId = createdCategory.categoryId;
        newCategories = createdCategory.newCategories;
      }
    }

    return {
      description: result.summary || "",
      categoryId,
      tags: result.tags || [],
      newCategories,
    };
  }
}

export const bookmarkAnalysisService = new BookmarkAnalysisService();
