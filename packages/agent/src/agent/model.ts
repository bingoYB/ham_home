import type { LanguageModel } from "ai";
import type { AgentModelConfig } from "./types";
import {
  createModelFromProvider,
  createModelFromProviderSync,
  PROVIDER_REGISTRY,
  type ProviderName,
} from "./providers";

function isLanguageModel(value: AgentModelConfig["model"]): value is LanguageModel {
  return typeof value === "object" && value !== null;
}

function normalizeProvider(provider?: string): ProviderName {
  const normalized = provider?.trim().toLowerCase() || "openai";
  if (normalized in PROVIDER_REGISTRY) {
    return normalized as ProviderName;
  }
  // 未知 provider 尝试走 custom（OpenAI-compatible）路径
  return "custom";
}

function resolveBaseURL(config: Pick<AgentModelConfig, "baseURL" | "baseUrl" | "baseurl">): string | undefined {
  return config.baseURL ?? config.baseUrl ?? config.baseurl;
}

/**
 * 同步创建 AI SDK LanguageModel。
 *
 * 根据 provider 名称自动选择对应的 SDK 包：
 * - 官方提供商（openai/anthropic/google/azure/deepseek/groq/mistral）
 *   使用对应的 @ai-sdk/* 原生包
 * - 国内提供商（moonshot/zhipu/hunyuan/siliconflow）和 nvidia
 *   使用 @ai-sdk/openai-compatible
 * - ollama 使用 ollama-ai-provider
 * - custom 使用 @ai-sdk/openai-compatible，需要显式提供 baseURL
 *
 * 也可以直接传入 LanguageModel 实例跳过此逻辑。
 *
 * 注意：同步版本对 OpenAI provider 默认使用 chat/completions API。
 * 如需自适应探测，使用 createAgentModelAsync。
 */
export function createAgentModel(config: AgentModelConfig): LanguageModel {
  if (isLanguageModel(config.model)) {
    return config.model;
  }

  const providerName = normalizeProvider(config.provider);
  const baseURL = resolveBaseURL(config);
  const apiKey = config.apiKey ?? config.apikey;

  return createModelFromProviderSync(providerName, {
    apiKey,
    baseURL,
    model: config.model,
    openaiApiMode: config.apiMode,
  });
}

/**
 * 异步创建 AI SDK LanguageModel（支持自适应探测）。
 *
 * 对于支持自适应 API 模式的 provider（如 OpenAI），
 * 首次连接时会自动探测 responses/chat API 可用性，
 * 成功后缓存结果以固化调用方式。
 */
export async function createAgentModelAsync(config: AgentModelConfig): Promise<LanguageModel> {
  if (isLanguageModel(config.model)) {
    return config.model;
  }

  const providerName = normalizeProvider(config.provider);
  const baseURL = resolveBaseURL(config);
  const apiKey = config.apiKey ?? config.apikey;

  return createModelFromProvider(providerName, {
    apiKey,
    baseURL,
    model: config.model,
    openaiApiMode: config.apiMode,
  });
}

