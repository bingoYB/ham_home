import { supportsEmbeddingDimensions, type AiSdkProviderName } from "@hamhome/agent";
import type { AIProvider, EmbeddingConfig } from "@/types";

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

export interface EmbeddingDimensionSpec {
  /** Native output size, used when `dimensions` is unset */
  defaultDimensions: number;
  /** Other output sizes the model accepts, largest first */
  options: number[];
}

/**
 * Embedding models known to accept a custom output size. Matching by model id
 * also covers gateways that proxy them through custom/OpenAI-compatible endpoints.
 */
const EMBEDDING_DIMENSION_RULES: Array<EmbeddingDimensionSpec & { pattern: RegExp }> = [
  // OpenAI (also Azure deployments named after the model)
  { pattern: /text-embedding-3-large/i, defaultDimensions: 3072, options: [2048, 1536, 1024, 768, 512, 256] },
  { pattern: /text-embedding-3-small/i, defaultDimensions: 1536, options: [1024, 768, 512, 256] },
  // Google
  { pattern: /gemini-embedding-001/i, defaultDimensions: 3072, options: [1536, 768] },
  { pattern: /text-embedding-004/i, defaultDimensions: 768, options: [512, 256, 128] },
  // Zhipu
  { pattern: /(^|\/)embedding-3$/i, defaultDimensions: 2048, options: [1024, 512, 256] },
  // Qwen3 embedding (e.g. SiliconFlow)
  { pattern: /qwen3-embedding-8b/i, defaultDimensions: 4096, options: [2048, 1024, 768, 512, 256, 128, 64] },
  { pattern: /qwen3-embedding-4b/i, defaultDimensions: 2560, options: [2048, 1024, 768, 512, 256, 128, 64] },
  { pattern: /qwen3-embedding-0\.6b/i, defaultDimensions: 1024, options: [768, 512, 256, 128, 64] },
  // Alibaba DashScope (OpenAI-compatible mode)
  { pattern: /(^|\/)text-embedding-v4$/i, defaultDimensions: 1024, options: [2048, 1536, 768, 512, 256, 128, 64] },
  { pattern: /(^|\/)text-embedding-v3$/i, defaultDimensions: 1024, options: [768, 512, 256, 128, 64] },
];

export const PROVIDER_DEFAULTS: Record<AIProvider, ProviderConfig> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
    requiresApiKey: true,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
    models: [
      "claude-3-5-haiku-latest",
      "claude-3-5-sonnet-latest",
      "claude-3-opus-latest",
    ],
    requiresApiKey: true,
  },
  google: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
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
    models: ["hunyuan-lite", "hunyuan-standard", "hunyuan-pro", "hunyuan-turbo"],
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
  AIProvider,
  EmbeddingProviderConfig
> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "text-embedding-3-small",
    supportsEmbedding: true,
  },
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1",
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

const NATIVE_AGENT_PROVIDERS: Partial<Record<AIProvider, AiSdkProviderName>> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  azure: "azure",
  deepseek: "deepseek",
  groq: "groq",
  mistral: "mistral",
};

/**
 * 将 HamHome 的 provider 枚举转换为 Browser Agent SDK provider。
 *
 * 示例：
 * ```ts
 * resolveAgentProvider("moonshot"); // "openai-compatible"
 * resolveAgentProvider("openai"); // "openai"
 * ```
 */
export function resolveAgentProvider(provider: AIProvider): AiSdkProviderName {
  return NATIVE_AGENT_PROVIDERS[provider] ?? "openai-compatible";
}

/**
 * 获取 provider 的默认模型。
 */
export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.models[0] ?? "gpt-4o-mini";
}

/**
 * 获取 provider 的推荐模型列表。
 */
export function getProviderModels(provider: AIProvider): string[] {
  return PROVIDER_DEFAULTS[provider]?.models ?? [getDefaultModel(provider)];
}

/**
 * 获取 provider 默认 Base URL。
 */
export function getDefaultBaseUrl(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.baseUrl ?? "";
}

/**
 * Normalize a configured base URL into the form the AI SDK provider expects.
 * The Anthropic provider appends `/messages` directly, so its base URL must end
 * with `/v1`; older configs stored the bare host `https://api.anthropic.com`.
 */
export function normalizeProviderBaseUrl(
  provider: AIProvider,
  baseUrl?: string,
): string | undefined {
  const trimmed = baseUrl?.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return undefined;
  }

  if (provider === "anthropic" && !trimmed.endsWith("/v1")) {
    return `${trimmed}/v1`;
  }

  return trimmed;
}

/**
 * 判断 provider 是否需要 API Key。
 */
export function requiresApiKey(provider: AIProvider): boolean {
  return PROVIDER_DEFAULTS[provider]?.requiresApiKey ?? true;
}

/**
 * 判断 provider 是否支持 Embedding。
 */
export function isEmbeddingSupported(provider: AIProvider): boolean {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.supportsEmbedding ?? false;
}

/**
 * 获取 provider 默认 Embedding 模型。
 */
export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.defaultModel ?? "";
}

/**
 * Output sizes the embedding model accepts, or null when its size is fixed or
 * the provider cannot forward `dimensions`.
 *
 * Example:
 * ```ts
 * getEmbeddingDimensionSpec("openai", "text-embedding-3-small"); // { defaultDimensions: 1536, ... }
 * getEmbeddingDimensionSpec("siliconflow", "BAAI/bge-m3"); // null
 * ```
 */
export function getEmbeddingDimensionSpec(
  provider: AIProvider,
  model?: string,
): EmbeddingDimensionSpec | null {
  if (!isEmbeddingSupported(provider) || !supportsEmbeddingDimensions(resolveAgentProvider(provider))) {
    return null;
  }

  const modelId = model?.trim() || getDefaultEmbeddingModel(provider);
  const rule = EMBEDDING_DIMENSION_RULES.find((item) => item.pattern.test(modelId));
  return rule ? { defaultDimensions: rule.defaultDimensions, options: rule.options } : null;
}

/**
 * The configured output size when the model accepts it. Undefined means the
 * model's native size; unsupported or native values resolve to undefined.
 */
export function resolveEmbeddingDimensions(config: {
  provider: AIProvider;
  model?: string;
  dimensions?: number;
}): number | undefined {
  const spec = getEmbeddingDimensionSpec(config.provider, config.model);
  return spec && config.dimensions && spec.options.includes(config.dimensions)
    ? config.dimensions
    : undefined;
}

/**
 * Drop `dimensions` from an update when the resulting model cannot use it,
 * e.g. after switching to a fixed-size model.
 */
export function withValidEmbeddingDimensions(
  current: EmbeddingConfig,
  updates: Partial<EmbeddingConfig>,
): Partial<EmbeddingConfig> {
  const next = { ...current, ...updates };
  return resolveEmbeddingDimensions(next) === next.dimensions
    ? updates
    : { ...updates, dimensions: undefined };
}

/**
 * 生成向量索引使用的模型标识（只包含实际生效的维度）。
 */
export function getEmbeddingModelKey(config: {
  provider: AIProvider;
  model?: string;
  dimensions?: number;
}): string {
  const model = config.model || getDefaultEmbeddingModel(config.provider);
  const dimensions = resolveEmbeddingDimensions(config);
  return [config.provider, model, dimensions ? `dim${dimensions}` : null]
    .filter(Boolean)
    .join(":");
}
