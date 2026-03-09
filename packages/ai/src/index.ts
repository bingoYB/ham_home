/**
 * @hamhome/ai - HamHome AI 客户端 SDK
 * 基于 LangChain 构建
 */

export * from "./types";
export {
  createAIClient,
  createExtendedAIClient,
  getDefaultModel,
  getProviderModels,
  getDefaultBaseUrl,
  requiresApiKey,
  PROVIDER_DEFAULTS,
  // AI 任务模式控制
  AI_BATCH_MODE,
  setAIBatchMode,
  getAIBatchMode,
} from "./client";
export { createBookmarkAnalysisFallback } from "./utils/fallback";
export type { ExtendedAIClient } from "./facade/client-facade";
export {
  createSearchQueryPlanner,
} from "./search/query-planner";
export {
  detectSearchQuerySubtype,
  isPureSearchFilterQuery,
  isSearchHelpIntent,
  isSearchStatisticsIntent,
  mergeSearchRequestWithState,
  parseSearchQueryWithRules,
  refineSearchQuery,
} from "./search/rules";
export type {
  SearchPlannerCategory,
  SearchPlannerContext,
  SearchPlannerConversationMessage,
  SearchPlannerConversationState,
  SearchPlannerFilters,
  SearchPlannerLanguage,
  SearchPlannerRequest,
  SearchConversationIntent,
  SearchQuerySubtype,
} from "./search/types";

// Embedding 相关
export {
  createEmbeddingClient,
  isEmbeddingSupported,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  calculateCosineSimilarity,
  EMBEDDING_PROVIDER_DEFAULTS,
} from "./embedding";
export type {
  EmbeddingClientConfig,
  EmbeddingResult,
  EmbeddingBatchResult,
  EmbeddingClient,
} from "./embedding";

// 版本常量，用于验证模块引用
export const AI_VERSION = "3.0.0";
