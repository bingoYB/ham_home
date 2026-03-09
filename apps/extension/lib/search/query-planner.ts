/**
 * Query Planner
 * 扩展侧搜索查询适配层，AI 规划核心已下沉到 @hamhome/ai
 */
import {
  detectSearchQuerySubtype,
  isPureSearchFilterQuery,
  isSearchHelpIntent,
  isSearchStatisticsIntent,
  mergeSearchRequestWithState,
  parseSearchQueryWithRules,
  refineSearchQuery,
} from "@hamhome/ai/search-rules";
import { getDefaultModel } from "@hamhome/ai/providers";
import { createLogger } from "@hamhome/utils";

import { configStorage } from "@/lib/storage";
import type {
  ConversationState,
  LocalCategory,
  SearchRequest,
} from "@/types";

const logger = createLogger({ namespace: "QueryPlanner" });

class QueryPlanner {
  async parse(
    userInput: string,
    context: {
      categories?: LocalCategory[];
      existingTags?: string[];
      conversationState?: ConversationState;
    } = {},
  ): Promise<SearchRequest> {
    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();
      const language = settings.language || "zh";

      if (!aiConfig.apiKey && aiConfig.provider !== "ollama") {
        logger.debug("AI not configured, using rule-based parsing");
        return parseSearchQueryWithRules(userInput, language);
      }

      const { createSearchQueryPlanner } = await import(
        "@hamhome/ai/search-planner"
      );
      const planner = createSearchQueryPlanner({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.1,
        maxTokens: 500,
        language,
      });

      logger.debug("Parsing with AI", { userInput: userInput.slice(0, 100) });

      const result = await planner.parse(userInput, {
        categories: context.categories?.map((category) => ({
          id: category.id,
          name: category.name,
        })),
        existingTags: context.existingTags,
        conversationState: context.conversationState,
      });

      logger.debug("AI parsing result", { result });
      return result;
    } catch (error) {
      logger.warn("AI parsing failed, falling back to rules", error);
      const settings = await configStorage.getSettings();
      return parseSearchQueryWithRules(userInput, settings.language || "zh");
    }
  }

  mergeWithState(
    request: SearchRequest,
    state: ConversationState,
  ): SearchRequest {
    return mergeSearchRequestWithState(request, state);
  }

  parseQuick(userInput: string, language: "zh" | "en" = "zh"): SearchRequest {
    return parseSearchQueryWithRules(userInput, language);
  }

  isHelpIntent(userInput: string): boolean {
    return isSearchHelpIntent(userInput);
  }

  isStatisticsIntent(userInput: string): boolean {
    return isSearchStatisticsIntent(userInput);
  }

  refineQuery(query: string, language: "zh" | "en" = "zh"): string {
    return refineSearchQuery(query, language);
  }
}

export const queryPlanner = new QueryPlanner();

export {
  detectSearchQuerySubtype,
  isPureSearchFilterQuery as isPureFilterQuery,
  isSearchHelpIntent as isHelpIntent,
  isSearchStatisticsIntent as isStatisticsIntent,
  parseSearchQueryWithRules as parseWithRules,
  refineSearchQuery as refineQuery,
};
