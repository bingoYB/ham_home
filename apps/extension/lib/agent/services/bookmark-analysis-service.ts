import { getFavicon } from "@hamhome/utils";
import type {
  AnalysisResult,
  LocalCategory,
  PageContent,
} from "@/types";
import {
  bookmarkAnalysisOutputSchema,
  bookmarkAnalysisResultSchema,
  buildBookmarkAnalysisPrompt,
  buildBookmarkAnalysisSystemPrompt,
  type BookmarkAnalysisOutput,
} from "../prompts";
import {
  createAIRecommendedCategory,
  matchCategoryByName,
} from "../category-utils";
import { getAgentErrorMessage } from "../errors";
import { fetchPageContentForAI } from "../fetch-page-content";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";
import { runExtensionCommand } from "../command-runner";

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

class BookmarkAnalysisService {
  async analyzeBookmark(input: EnhancedAnalyzeInput): Promise<AnalysisResult> {
    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await runExtensionCommand<Record<string, never>, BookmarkAnalysisOutput>({
        config,
        temperature: config.temperature ?? 0.2,
        maxIterations: 1,
        systemPrompt: buildBookmarkAnalysisSystemPrompt(config.language),
        command: {
          name: "analyzeBookmark",
          description: "Analyze a web page and return bookmark metadata.",
          outputSchema: bookmarkAnalysisOutputSchema,
          prompt: buildBookmarkAnalysisPrompt({
            language: config.language,
            pageContent: input.pageContent,
            userCategories: input.userCategories,
            existingTags: input.existingTags,
            presetTags: config.rawConfig.presetTags,
          }),
        },
        input: {},
      });

      const output = bookmarkAnalysisResultSchema.parse(result.output);

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
    description?: string;
    currentCategories: LocalCategory[];
    existingTags?: string[];
    shouldFetchPageContent?: boolean;
  }): Promise<BookmarkAnalysisApplyResult> {
    let content = "";
    if (options.shouldFetchPageContent) {
      try {
        content = await fetchPageContentForAI(options.url);
      } catch (error) {
        console.warn(`[BookmarkAnalysisService] Failed to fetch page content for ${options.url}, falling back to description. Error:`, error);
        content = options.description || "";
      }
    }

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
        excerpt: options.description || "",
        favicon: hostname ? getFavicon(hostname) : "",
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
