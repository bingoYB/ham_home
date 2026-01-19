/**
 * @hamhome/ai - HamHome AI 客户端 SDK
 * 基于 Vercel AI SDK 构建
 */

export * from './types';
export {
  createAIClient,
  createExtendedAIClient,
  getDefaultModel,
  // AI 任务模式控制
  AI_BATCH_MODE,
  setAIBatchMode,
  getAIBatchMode,
} from './client';

// 版本常量，用于验证模块引用
export const AI_VERSION = '2.0.0'
