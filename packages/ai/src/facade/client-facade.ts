import { generateStructuredObject } from "@hamhome/agent";
import { z } from "zod";

import {
  CategorySuggestionsSchema,
  GeneratedCategoriesSchema,
  TagSuggestionsSchema,
} from "../types";
import type {
  AIClient,
  AIClientConfig,
  AILanguage,
  AnalyzeBookmarkInput,
  CategorySuggestionResult,
  GeneratedCategory,
  TagSuggestionResult,
} from "../types";
import {
  buildGenerateCategoriesPrompt,
  buildSuggestCategoryPrompt,
  buildSuggestTagsPrompt,
  buildTranslatePrompt,
} from "../prompts/generation";
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

export class AISDKAIClientFacade implements ExtendedAIClient {
  private readonly language: AILanguage;
  private readonly singlePassStrategy: SinglePassBookmarkAnalysisStrategy;
  private readonly batchStrategy: BatchBookmarkAnalysisStrategy;

  constructor(private readonly options: ClientFacadeOptions) {
    this.language = this.options.config.language || "zh";
    this.singlePassStrategy = new SinglePassBookmarkAnalysisStrategy({
      config: this.options.config,
      language: this.language,
      debug: this.options.config.debug,
    });
    this.batchStrategy = new BatchBookmarkAnalysisStrategy({
      config: this.options.config,
      language: this.language,
      debug: this.options.config.debug,
    });
  }

  private async generateObjectWithConfig<T>(options: {
    schema: z.ZodType<T>;
    prompt: string;
    system?: string;
  }): Promise<T> {
    const result = await generateStructuredObject({
      provider: this.options.config.provider,
      model: this.options.config.model || "gpt-4o-mini",
      apiKey: this.options.config.apiKey,
      baseURL: this.options.config.baseUrl,
      temperature: this.options.config.temperature,
      maxTokens: this.options.config.maxTokens,
      schema: options.schema,
      prompt: options.prompt,
      system: options.system,
    });

    return result.object as T;
  }

  async analyzeBookmark(input: AnalyzeBookmarkInput) {
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
      return await this.generateObjectWithConfig({
        schema: TagSuggestionsSchema,
        prompt: buildSuggestTagsPrompt(this.language, input),
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
      return await this.generateObjectWithConfig({
        schema: CategorySuggestionsSchema,
        prompt: buildSuggestCategoryPrompt(this.language, input),
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
      const result = await this.generateObjectWithConfig({
        schema: z.object({
          text: z.string(),
        }),
        prompt: buildTranslatePrompt(text, targetLang),
      });
      return result.text;
    } catch {
      return text;
    }
  }

  async generateObject<T>(options: {
    schema: z.ZodType<T>;
    prompt: string;
    system?: string;
  }): Promise<T> {
    return this.generateObjectWithConfig(options);
  }

  async generateRaw(prompt: string): Promise<string> {
    const result = await this.generateObjectWithConfig({
      schema: z.object({
        text: z.string(),
      }),
      prompt,
    });

    return result.text;
  }

  async generateCategories(description: string): Promise<GeneratedCategory[]> {
    const result = await this.generateObjectWithConfig({
      schema: GeneratedCategoriesSchema,
      prompt: buildGenerateCategoriesPrompt(this.language, description),
    });

    return result.categories || [];
  }
}
