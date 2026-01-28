/**
 * @hamhome/ai - HamHome AI 客户端 SDK
 * 基于 Vercel AI SDK 构建
 */

export * from './types';
export {
  createAIClient,
  createExtendedAIClient,
  getDefaultModel,
  getProviderModels,
  // AI 任务模式控制
  AI_BATCH_MODE,
  setAIBatchMode,
  getAIBatchMode,
} from './client';

// Embedding 相关
export {
  createEmbeddingClient,
  isEmbeddingSupported,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  calculateCosineSimilarity,
} from './embedding';
export type {
  EmbeddingClientConfig,
  EmbeddingResult,
  EmbeddingBatchResult,
  EmbeddingClient,
} from './embedding';

// 版本常量，用于验证模块引用
export const AI_VERSION = '2.0.0'
