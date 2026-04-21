import type { AIClient, AIClientConfig } from "./types";
import { AISDKAIClientFacade, type ExtendedAIClient } from "./facade/client-facade";
import {
  getDefaultBaseUrl,
  getDefaultModel,
  getProviderModels,
  PROVIDER_DEFAULTS,
  requiresApiKey,
} from "./config/providers";

/**
 * 全局配置：是否使用分批任务模式
 * - true: 分三个独立 AI 任务并行执行（标题摘要、分类、标签）
 * - false: 单个 AI 任务一次性生成所有内容
 */
export let AI_BATCH_MODE = false;

export function setAIBatchMode(enabled: boolean): void {
  AI_BATCH_MODE = enabled;
}

export function getAIBatchMode(): boolean {
  return AI_BATCH_MODE;
}

export function createAIClient(config: AIClientConfig): AIClient {
  return new AISDKAIClientFacade({
    config,
    isBatchModeEnabled: () => AI_BATCH_MODE,
  });
}

export function createExtendedAIClient(config: AIClientConfig): ExtendedAIClient {
  return new AISDKAIClientFacade({
    config,
    isBatchModeEnabled: () => AI_BATCH_MODE,
  });
}

export {
  getDefaultBaseUrl,
  getDefaultModel,
  getProviderModels,
  PROVIDER_DEFAULTS,
  requiresApiKey,
};
