import { z } from "zod";

import { CategorySuggestionsSchema, GeneratedCategoriesSchema, TagSuggestionsSchema } from "../types";
import type {
  AIClient,
  AIClientConfig,
  AILanguage,
  AnalyzeBookmarkInput,
  CategorySuggestionResult,
  GeneratedCategory,
  TagSuggestionResult,
} from "../types";
import { createChatModel } from "../factory/chat-model";
import { buildGenerateCategoriesPrompt, buildSuggestCategoryPrompt, buildSuggestTagsPrompt, buildTranslatePrompt } from "../prompts/generation";
import { invokeStructuredChain, invokeTextChain } from "../chains/runnable-helpers";
import {
  BatchBookmarkAnalysisStrategy,
  SinglePassBookmarkAnalysisStrategy,
} from "../strategies/bookmark-analysis";

export interface ExtendedAIClient extends AIClient {
  suggestTags(input: {
    url: string;
    title: string;
    content: string;
    existingTags: string[];
  }): Promise<TagSuggestionResult[]>;
  suggestCategory(input: {
    url: string;
    title: string;
    content: string;
    userCategories: string[];
  }): Promise<CategorySuggestionResult[]>;
  translate(text: string, targetLang?: "zh" | "en"): Promise<string>;
  generateObject<T>(options: {
    schema: z.ZodType<T>;
    prompt: string;
    system?: string;
  }): Promise<T>;
  generateRaw(prompt: string): Promise<string>;
  generateCategories(description: string): Promise<GeneratedCategory[]>;
}

interface ClientFacadeOptions {
  config: AIClientConfig;
  isBatchModeEnabled: () => boolean;
}

export class LangChainAIClientFacade implements ExtendedAIClient {
  private readonly model: ReturnType<typeof createChatModel>;
  private readonly language: AILanguage;
  private readonly debug: boolean;
  private readonly singlePassStrategy: SinglePassBookmarkAnalysisStrategy;
  private readonly batchStrategy: BatchBookmarkAnalysisStrategy;

  constructor(private readonly options: ClientFacadeOptions) {
    this.model = createChatModel(this.options.config);
    this.language = this.options.config.language || "zh";
    this.debug = this.options.config.debug ?? false;
    this.singlePassStrategy = new SinglePassBookmarkAnalysisStrategy({
      model: this.model,
      language: this.language,
      debug: this.debug,
    });
    this.batchStrategy = new BatchBookmarkAnalysisStrategy({
      model: this.model,
      language: this.language,
      debug: this.debug,
    });
  }

  async analyzeBookmark(
    input: AnalyzeBookmarkInput,
  ) {
    const strategy = this.options.isBatchModeEnabled()
      ? this.batchStrategy
      : this.singlePassStrategy;
    return strategy.analyze(input);
  }

  async suggestTags(input: {
    url: string;
    title: string;
    content: string;
    existingTags: string[];
  }): Promise<TagSuggestionResult[]> {
    try {
      return await invokeStructuredChain({
        model: this.model,
        schema: TagSuggestionsSchema,
        prompt: buildSuggestTagsPrompt(this.language, input),
        taskName: "suggestTags",
        debug: this.debug,
      });
    } catch {
      return [];
    }
  }

  async suggestCategory(input: {
    url: string;
    title: string;
    content: string;
    userCategories: string[];
  }): Promise<CategorySuggestionResult[]> {
    try {
      return await invokeStructuredChain({
        model: this.model,
        schema: CategorySuggestionsSchema,
        prompt: buildSuggestCategoryPrompt(this.language, input),
        taskName: "suggestCategory",
        debug: this.debug,
      });
    } catch {
      return [];
    }
  }

  async translate(
    text: string,
    targetLang: "zh" | "en" = "zh",
  ): Promise<string> {
    try {
      return await invokeTextChain({
        model: this.model,
        prompt: buildTranslatePrompt(text, targetLang),
        taskName: "translate",
        debug: this.debug,
      });
    } catch {
      return text;
    }
  }

  async generateObject<T>(options: {
    schema: z.ZodType<T>;
    prompt: string;
    system?: string;
  }): Promise<T> {
    return invokeStructuredChain({
      model: this.model,
      schema: options.schema,
      prompt: options.prompt,
      system: options.system,
      taskName: "generateObject",
      debug: this.debug,
    });
  }

  async generateRaw(prompt: string): Promise<string> {
    return invokeTextChain({
      model: this.model,
      prompt,
      taskName: "generateRaw",
      debug: this.debug,
    });
  }

  async generateCategories(description: string): Promise<GeneratedCategory[]> {
    const result = await invokeStructuredChain({
      model: this.model,
      schema: GeneratedCategoriesSchema,
      prompt: buildGenerateCategoriesPrompt(this.language, description),
      taskName: "generateCategories",
      debug: this.debug,
    });

    return result.categories || [];
  }
}
