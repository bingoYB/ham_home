import type { AgentCommand } from "@hamhome/agent";
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
  type BookmarkAnalysisPromptInput,
} from "../prompts";
import {
  createAIRecommendedCategory,
  matchCategoryByName,
} from "../category-utils";
import { getAgentErrorMessage } from "../errors";
import { fetchPageContentForAI } from "../fetch-page-content";
import { createExtensionAgent } from "../factory";
import { analyzeBookmarkField } from "./bookmark-field-analysis";
import { analyzeBookmarkWithSmallModel } from "./small-model-bookmark-analysis";

const analyzeBookmarkCommand: AgentCommand<
  BookmarkAnalysisPromptInput,
  BookmarkAnalysisOutput
> = {
  name: "analyzeBookmark",
  description: "Analyze a web page and return bookmark metadata.",
  outputSchema: bookmarkAnalysisOutputSchema,
  maxIterations: 1,
  prompt: buildBookmarkAnalysisPrompt,
};

export type BookmarkOrganizeMode = "all" | "category" | "tags";

export interface EnhancedAnalyzeInput {
  pageContent: PageContent;
  mode?: BookmarkOrganizeMode;
  userCategories?: LocalCategory[];
  existingTags?: string[];
  signal?: AbortSignal;
}

export interface BookmarkAnalysisApplyResult {
  description: string;
  categoryId: string | null;
  tags: string[];
  newCategories: LocalCategory[];
}

class BookmarkAnalysisService {
  async analyzeBookmark(input: EnhancedAnalyzeInput): Promise<AnalysisResult> {
    input.signal?.throwIfAborted();
    const { agent, config } = await createExtensionAgent();

    try {
      const promptInput: BookmarkAnalysisPromptInput = {
        language: config.language,
        pageContent: input.pageContent,
        userCategories: input.userCategories,
        existingTags: input.existingTags,
        presetTags: config.rawConfig.presetTags,
      };
      const temperature = config.temperature ?? 0.2;
      let output: BookmarkAnalysisOutput;
      if (input.mode === "category" || input.mode === "tags") {
        // Targeted modes use a single-field command for every provider, without
        // running the full structured analysis or unrelated small-model fields.
        const fieldInput: BookmarkAnalysisPromptInput = {
          ...promptInput,
          userCategories: input.mode === "category" ? input.userCategories : undefined,
          existingTags: input.mode === "tags" ? input.existingTags : undefined,
          presetTags: input.mode === "tags" ? config.rawConfig.presetTags : undefined,
        };
        const value = await analyzeBookmarkField(
          agent, fieldInput, input.mode, temperature, input.signal,
          { smallModelMode: config.rawConfig.smallModelMode === true },
        );
        output = {
          title: "",
          summary: "",
          category: input.mode === "category" ? value as string : "",
          tags: input.mode === "tags" ? value as string[] : [],
        };
      } else if (config.rawConfig.smallModelMode) {
        output = await analyzeBookmarkWithSmallModel(agent, promptInput, temperature, input.signal);
      } else {
        const result = await agent.commands.run(analyzeBookmarkCommand, promptInput, {
          systemPrompt: buildBookmarkAnalysisSystemPrompt(config.language),
          temperature,
          signal: input.signal,
        });
        output = bookmarkAnalysisResultSchema.parse(result.output);
      }

      return {
        title: output.title.trim(),
        summary: output.summary.trim(),
        category: output.category.trim(),
        tags: [...new Set(output.tags.map((tag) => tag.trim()).filter(Boolean))],
      };
    } catch (error) {
      input.signal?.throwIfAborted();
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
    mode?: BookmarkOrganizeMode;
    signal?: AbortSignal;
  }): Promise<BookmarkAnalysisApplyResult> {
    options.signal?.throwIfAborted();
    let content = "";
    if (options.shouldFetchPageContent) {
      try {
        content = await fetchPageContentForAI(options.url, options.signal);
      } catch (error) {
        options.signal?.throwIfAborted();
        console.warn(`[BookmarkAnalysisService] Failed to fetch page content for ${options.url}, falling back to description. Error:`, error);
        content = options.description || "";
      }
    }

    options.signal?.throwIfAborted();
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
      mode: options.mode,
      userCategories: options.currentCategories,
      existingTags: options.existingTags,
      signal: options.signal,
    });

    options.signal?.throwIfAborted();
    let categoryId: string | null = null;
    let newCategories: LocalCategory[] = [];

    if (options.mode !== "tags" && result.category) {
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
      description: !options.mode || options.mode === "all" ? result.summary || "" : "",
      categoryId,
      tags: options.mode !== "category" ? result.tags || [] : [],
      newCategories,
    };
  }
}

export const bookmarkAnalysisService = new BookmarkAnalysisService();
