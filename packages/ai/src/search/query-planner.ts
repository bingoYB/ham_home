import { z } from "zod";

import { createExtendedAIClient } from "../client";
import { getSearchQueryPlannerSystemPrompt, buildSearchQueryPlannerPrompt } from "../prompts/search-query-planning";
import type { AIClientConfig } from "../types";
import {
  detectSearchQuerySubtype,
  parseSearchQueryWithRules,
  refineSearchQuery,
} from "./rules";
import type {
  SearchPlannerContext,
  SearchPlannerLanguage,
  SearchPlannerRequest,
} from "./types";

const SearchPlannerRequestSchema = z.object({
  intent: z.enum(["query", "statistics", "help"]).describe("用户意图"),
  querySubtype: z
    .enum(["time", "category", "tag", "semantic", "compound"])
    .optional()
    .describe("查询子类型"),
  query: z.string().describe("原始查询文本"),
  refinedQuery: z.string().describe("提炼后的语义查询关键词"),
  filters: z.object({
    categoryId: z.string().nullable().optional(),
    tagsAny: z.array(z.string()).optional(),
    domain: z.string().nullable().optional(),
    timeRangeDays: z.number().nullable().optional(),
    semantic: z.boolean().optional(),
  }),
  topK: z.number().min(1).max(50),
});

export function createSearchQueryPlanner(
  config: AIClientConfig & { language?: SearchPlannerLanguage },
) {
  const client = createExtendedAIClient({
    ...config,
    temperature: config.temperature ?? 0.1,
    maxTokens: config.maxTokens ?? 500,
  });
  const language = config.language || "zh";

  return {
    async parse(
      userInput: string,
      context: SearchPlannerContext = {},
    ): Promise<SearchPlannerRequest> {
      const result = await client.generateObject({
        schema: SearchPlannerRequestSchema,
        system: getSearchQueryPlannerSystemPrompt(language),
        prompt: buildSearchQueryPlannerPrompt(userInput, context),
      });

      const filters = {
        categoryId: result.filters.categoryId ?? undefined,
        tagsAny: result.filters.tagsAny,
        domain: result.filters.domain ?? undefined,
        timeRangeDays: result.filters.timeRangeDays ?? undefined,
        semantic: result.filters.semantic,
      };

      return {
        intent: result.intent,
        querySubtype:
          result.intent === "query"
            ? result.querySubtype || detectSearchQuerySubtype(userInput, filters)
            : undefined,
        query: result.query,
        refinedQuery:
          result.refinedQuery || refineSearchQuery(result.query, language),
        filters,
        topK: result.topK,
      };
    },
    parseWithRules(userInput: string): SearchPlannerRequest {
      return parseSearchQueryWithRules(userInput, language);
    },
  };
}
