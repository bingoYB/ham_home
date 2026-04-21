import type { LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createAzure } from "@ai-sdk/azure";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// ─── Provider 类型定义 ────────────────────────────────────────────

export type ProviderName =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "deepseek"
  | "groq"
  | "mistral"
  | "moonshot"
  | "zhipu"
  | "hunyuan"
  | "nvidia"
  | "siliconflow"
  | "ollama"
  | "custom";

export interface ProviderMeta {
  /** 显示名称 */
  label: string;
  /** 默认 API base URL（如果有官方端点） */
  defaultBaseURL?: string;
  /** 默认模型 ID */
  defaultModel: string;
  /** 是否需要 API Key */
  requiresApiKey: boolean;
  /** 是否需要 baseURL */
  requiresBaseURL: boolean;
  /** 使用的 SDK 接入方式 */
  sdkType: "native" | "openai-compatible" | "ollama";
}

export interface ProviderCreateOptions {
  apiKey?: string;
  baseURL?: string;
  model: string;
}

export interface ProviderConfig {
  baseUrl: string;
  models: string[];
  requiresApiKey: boolean;
}

export interface EmbeddingProviderConfig {
  baseUrl: string;
  defaultModel: string;
  supportsEmbedding: boolean;
}

export const PROVIDER_DEFAULTS: Record<ProviderName, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresApiKey: true,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    models: [
      "claude-3-5-haiku-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ],
    requiresApiKey: true,
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-1.5-flash",
      "gemini-1.5-pro",
    ],
    requiresApiKey: true,
  },
  azure: {
    baseUrl: "",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-35-turbo"],
    requiresApiKey: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
    requiresApiKey: true,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ],
    requiresApiKey: true,
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    models: [
      "mistral-small-latest",
      "mistral-medium-latest",
      "mistral-large-latest",
      "open-mistral-7b",
    ],
    requiresApiKey: true,
  },
  moonshot: {
    baseUrl: "https://api.moonshot.cn/v1",
    models: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    requiresApiKey: true,
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    models: ["glm-4-flash", "glm-4-plus", "glm-4-air", "glm-4-long"],
    requiresApiKey: true,
  },
  hunyuan: {
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    models: [
      "hunyuan-lite",
      "hunyuan-standard",
      "hunyuan-pro",
      "hunyuan-turbo",
    ],
    requiresApiKey: true,
  },
  nvidia: {
    baseUrl: "https://integrate.api.nvidia.com/v1",
    models: [
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.1-70b-instruct",
      "nvidia/llama-3.1-nemotron-70b-instruct",
    ],
    requiresApiKey: true,
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1",
    models: [
      "Qwen/Qwen2.5-7B-Instruct",
      "Qwen/Qwen2.5-72B-Instruct",
      "deepseek-ai/DeepSeek-V3",
      "Pro/deepseek-ai/DeepSeek-R1",
    ],
    requiresApiKey: true,
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    models: ["llama3.2", "llama3.1", "mistral", "qwen2.5", "phi3"],
    requiresApiKey: false,
  },
  custom: {
    baseUrl: "",
    models: ["gpt-4o-mini"],
    requiresApiKey: true,
  },
};

export const EMBEDDING_PROVIDER_DEFAULTS: Record<
  ProviderName,
  EmbeddingProviderConfig
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "text-embedding-3-small",
    supportsEmbedding: true,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    defaultModel: "",
    supportsEmbedding: false,
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "text-embedding-004",
    supportsEmbedding: true,
  },
  azure: {
    baseUrl: "",
    defaultModel: "text-embedding-ada-002",
    supportsEmbedding: true,
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "",
    supportsEmbedding: false,
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "",
    supportsEmbedding: false,
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-embed",
    supportsEmbedding: true,
  },
  moonshot: {
    baseUrl: "https://api.moonshot.cn/v1",
    defaultModel: "",
    supportsEmbedding: false,
  },
  zhipu: {
    baseUrl: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "embedding-3",
    supportsEmbedding: true,
  },
  hunyuan: {
    baseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    defaultModel: "hunyuan-embedding",
    supportsEmbedding: true,
  },
  nvidia: {
    baseUrl: "https://integrate.api.nvidia.com/v1",
    defaultModel: "nvidia/embed-qa-4",
    supportsEmbedding: true,
  },
  siliconflow: {
    baseUrl: "https://api.siliconflow.cn/v1",
    defaultModel: "BAAI/bge-m3",
    supportsEmbedding: true,
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1",
    defaultModel: "nomic-embed-text",
    supportsEmbedding: true,
  },
  custom: {
    baseUrl: "",
    defaultModel: "text-embedding-3-small",
    supportsEmbedding: true,
  },
};

// ─── Provider 元数据注册表 ────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<ProviderName, ProviderMeta> = {
  openai: {
    label: "OpenAI",
    defaultBaseURL: "https://api.openai.com/v1",
    defaultModel: "gpt-4o",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  anthropic: {
    label: "Anthropic",
    defaultBaseURL: "https://api.anthropic.com",
    defaultModel: "claude-sonnet-4-20250514",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  google: {
    label: "Google Gemini",
    defaultBaseURL: "https://generativelanguage.googleapis.com/v1beta",
    defaultModel: "gemini-2.0-flash",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  azure: {
    label: "Azure OpenAI",
    defaultModel: "gpt-4o",
    requiresApiKey: true,
    requiresBaseURL: true,
    sdkType: "native",
  },
  deepseek: {
    label: "DeepSeek",
    defaultBaseURL: "https://api.deepseek.com",
    defaultModel: "deepseek-chat",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  groq: {
    label: "Groq",
    defaultBaseURL: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  mistral: {
    label: "Mistral AI",
    defaultBaseURL: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "native",
  },
  moonshot: {
    label: "Moonshot / Kimi",
    defaultBaseURL: "https://api.moonshot.cn/v1",
    defaultModel: "moonshot-v1-8k",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "openai-compatible",
  },
  zhipu: {
    label: "智谱AI / GLM",
    defaultBaseURL: "https://open.bigmodel.cn/api/paas/v4",
    defaultModel: "glm-4-flash",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "openai-compatible",
  },
  hunyuan: {
    label: "腾讯混元",
    defaultBaseURL: "https://api.hunyuan.cloud.tencent.com/v1",
    defaultModel: "hunyuan-pro",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "openai-compatible",
  },
  nvidia: {
    label: "NVIDIA NIM",
    defaultBaseURL: "https://integrate.api.nvidia.com/v1",
    defaultModel: "meta/llama-3.1-405b-instruct",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "openai-compatible",
  },
  siliconflow: {
    label: "硅基流动",
    defaultBaseURL: "https://api.siliconflow.cn/v1",
    defaultModel: "deepseek-ai/DeepSeek-V3",
    requiresApiKey: true,
    requiresBaseURL: false,
    sdkType: "openai-compatible",
  },
  ollama: {
    label: "Ollama (本地)",
    defaultBaseURL: "http://localhost:11434/api",
    defaultModel: "llama3.2",
    requiresApiKey: false,
    requiresBaseURL: false,
    sdkType: "ollama",
  },
  custom: {
    label: "自定义",
    defaultModel: "gpt-4o",
    requiresApiKey: true,
    requiresBaseURL: true,
    sdkType: "openai-compatible",
  },
};

// ─── Provider 工厂 ────────────────────────────────────────────────

type ProviderFactory = (options: ProviderCreateOptions) => LanguageModel;
type EmbeddingFactory = (options: ProviderCreateOptions) => any;

/**
 * 为原生支持的 provider 创建 LanguageModel。
 * 每个 provider 使用其对应的官方 @ai-sdk/* 包。
 */
const nativeFactories: Partial<Record<ProviderName, ProviderFactory>> = {
  openai: ({ apiKey, baseURL, model }) => {
    const provider = createOpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider.chat(model);
  },

  anthropic: ({ apiKey, baseURL, model }) => {
    const provider = createAnthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider(model);
  },

  google: ({ apiKey, baseURL, model }) => {
    const provider = createGoogleGenerativeAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider(model);
  },

  azure: ({ apiKey, baseURL, model }) => {
    if (!baseURL) {
      throw new Error(
        "Azure OpenAI requires a baseURL (your Azure resource endpoint, e.g. https://<resource>.openai.azure.com/openai/deployments).",
      );
    }
    const provider = createAzure({
      apiKey,
      baseURL,
    });
    return provider(model);
  },

  deepseek: ({ apiKey, baseURL, model }) => {
    const provider = createDeepSeek({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider.chat(model);
  },

  groq: ({ apiKey, baseURL, model }) => {
    const provider = createGroq({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider(model);
  },

  mistral: ({ apiKey, baseURL, model }) => {
    const provider = createMistral({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider(model);
  },
};

const nativeEmbeddingFactories: Partial<Record<ProviderName, EmbeddingFactory>> = {
  openai: ({ apiKey, baseURL, model }) => {
    const provider = createOpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider.embedding(model);
  },

  google: ({ apiKey, baseURL, model }) => {
    const provider = createGoogleGenerativeAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider.embedding(model);
  },

  azure: ({ apiKey, baseURL, model }) => {
    if (!baseURL) {
      throw new Error(
        "Azure OpenAI requires a baseURL (your Azure resource endpoint, e.g. https://<resource>.openai.azure.com/openai/deployments).",
      );
    }
    const provider = createAzure({
      apiKey,
      baseURL,
    });
    return provider.embedding(model);
  },

  mistral: ({ apiKey, baseURL, model }) => {
    const provider = createMistral({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
    return provider.embedding(model);
  },
};

/**
 * 通过 @ai-sdk/openai-compatible 创建 LanguageModel。
 * 适用于 moonshot、zhipu、hunyuan、nvidia、siliconflow、custom 等
 * 提供 OpenAI 兼容 API 的 provider。
 */
function createOpenAICompatibleModel(
  providerName: string,
  options: ProviderCreateOptions,
  meta: ProviderMeta,
): LanguageModel {
  const baseURL = options.baseURL ?? meta.defaultBaseURL;
  if (!baseURL) {
    throw new Error(
      `Provider "${providerName}" requires a baseURL. ` +
      `Please provide one via the baseURL option.`,
    );
  }

  const provider = createOpenAICompatible({
    name: providerName,
    baseURL,
    headers: options.apiKey
      ? { Authorization: `Bearer ${options.apiKey}` }
      : {},
  });

  return provider.chatModel(options.model);
}

function createOpenAICompatibleEmbeddingModel(
  providerName: string,
  options: ProviderCreateOptions,
  meta: ProviderMeta,
) {
  const baseURL = options.baseURL ?? meta.defaultBaseURL;
  if (!baseURL) {
    throw new Error(
      `Provider "${providerName}" requires a baseURL. ` +
      `Please provide one via the baseURL option.`,
    );
  }

  const provider = createOpenAICompatible({
    name: providerName,
    baseURL,
    headers: options.apiKey
      ? { Authorization: `Bearer ${options.apiKey}` }
      : {},
  });

  return provider.embeddingModel(options.model);
}

/**
 * 通过 @ai-sdk/openai-compatible 接入 Ollama。
 * Ollama 在 http://localhost:11434/v1 暴露了 OpenAI 兼容 API。
 */
function createOllamaModel(
  options: ProviderCreateOptions,
  meta: ProviderMeta,
): LanguageModel {
  const rawBaseURL = options.baseURL ?? meta.defaultBaseURL ?? "http://localhost:11434";
  // Ollama 的 OpenAI 兼容端点在 /v1
  const baseURL = rawBaseURL.replace(/\/api\/?$/, "").replace(/\/+$/, "") + "/v1";

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL,
  });

  return provider.chatModel(options.model);
}

function createOllamaEmbeddingModel(
  options: ProviderCreateOptions,
  meta: ProviderMeta,
) {
  const rawBaseURL = options.baseURL ?? meta.defaultBaseURL ?? "http://localhost:11434";
  const baseURL = rawBaseURL.replace(/\/api\/?$/, "").replace(/\/+$/, "") + "/v1";

  const provider = createOpenAICompatible({
    name: "ollama",
    baseURL,
  });

  return provider.embeddingModel(options.model);
}

// ─── 统一创建入口 ──────────────────────────────────────────────────

/**
 * 根据 provider 名称创建对应的 LanguageModel 实例。
 * 自动选择最合适的 SDK 接入方式。
 */
export function createModelFromProvider(
  providerName: ProviderName,
  options: ProviderCreateOptions,
): LanguageModel {
  const meta = PROVIDER_REGISTRY[providerName];
  if (!meta) {
    throw new Error(
      `Unknown provider "${providerName}". ` +
      `Supported providers: ${Object.keys(PROVIDER_REGISTRY).join(", ")}`,
    );
  }

  // 1. 原生 SDK 工厂
  const nativeFactory = nativeFactories[providerName];
  if (nativeFactory) {
    return nativeFactory(options);
  }

  // 2. Ollama
  if (meta.sdkType === "ollama") {
    return createOllamaModel(options, meta);
  }

  // 3. OpenAI 兼容模式
  return createOpenAICompatibleModel(providerName, options, meta);
}

export function createEmbeddingModelFromProvider(
  providerName: ProviderName,
  options: ProviderCreateOptions,
) {
  const meta = PROVIDER_REGISTRY[providerName];
  if (!meta) {
    throw new Error(
      `Unknown provider "${providerName}". ` +
      `Supported providers: ${Object.keys(PROVIDER_REGISTRY).join(", ")}`,
    );
  }

  if (!EMBEDDING_PROVIDER_DEFAULTS[providerName]?.supportsEmbedding) {
    throw new Error(`Provider "${providerName}" does not support embeddings.`);
  }

  const nativeFactory = nativeEmbeddingFactories[providerName];
  if (nativeFactory) {
    return nativeFactory(options);
  }

  if (meta.sdkType === "ollama") {
    return createOllamaEmbeddingModel(options, meta);
  }

  return createOpenAICompatibleEmbeddingModel(providerName, options, meta);
}

// ─── 辅助工具 ──────────────────────────────────────────────────────

/**
 * 获取所有可用 provider 的名称和标签列表。
 */
export function getAvailableProviders(): Array<{ name: ProviderName; label: string }> {
  return Object.entries(PROVIDER_REGISTRY).map(([name, meta]) => ({
    name: name as ProviderName,
    label: meta.label,
  }));
}

/**
 * 获取指定 provider 的元数据。
 */
export function getProviderMeta(name: ProviderName): ProviderMeta | undefined {
  return PROVIDER_REGISTRY[name];
}

/**
 * 获取指定 provider 的默认模型 ID。
 */
export function getDefaultModel(name: ProviderName): string {
  return PROVIDER_DEFAULTS[name]?.models[0] ?? PROVIDER_REGISTRY[name]?.defaultModel ?? "gpt-4o";
}

export function getProviderModels(name: ProviderName): string[] {
  return PROVIDER_DEFAULTS[name]?.models ?? [getDefaultModel(name)];
}

export function getDefaultBaseUrl(name: ProviderName): string {
  return PROVIDER_DEFAULTS[name]?.baseUrl ?? "";
}

export function requiresApiKey(name: ProviderName): boolean {
  return PROVIDER_DEFAULTS[name]?.requiresApiKey ?? true;
}

export function isEmbeddingSupported(name: ProviderName): boolean {
  return EMBEDDING_PROVIDER_DEFAULTS[name]?.supportsEmbedding ?? false;
}

export function getDefaultEmbeddingModel(name: ProviderName): string {
  return EMBEDDING_PROVIDER_DEFAULTS[name]?.defaultModel ?? "";
}

export function getEmbeddingModelKey(config: {
  provider: ProviderName;
  model?: string;
  dimensions?: number;
}): string {
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[config.provider];
  const actualModel = config.model || defaults?.defaultModel || "unknown";
  const dimension = config.dimensions || "auto";
  return `${config.provider}:${actualModel}:${dimension}:v1`;
}
