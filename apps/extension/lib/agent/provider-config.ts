import type { AIProvider } from "@/types";

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

export const PROVIDER_DEFAULTS: Record<AIProvider, ProviderConfig> = {
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
  AIProvider,
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

export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.models[0] || "gpt-4o-mini";
}

export function getProviderModels(provider: AIProvider): string[] {
  return PROVIDER_DEFAULTS[provider]?.models || ["gpt-4o-mini"];
}

export function getDefaultBaseUrl(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.baseUrl || "";
}

export function requiresApiKey(provider: AIProvider): boolean {
  return PROVIDER_DEFAULTS[provider]?.requiresApiKey ?? true;
}

export function isEmbeddingSupported(provider: AIProvider): boolean {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.supportsEmbedding ?? false;
}

export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.defaultModel || "";
}

export function getEmbeddingModelKey(config: {
  provider: AIProvider;
  model?: string;
  dimensions?: number;
}): string {
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[config.provider];
  const actualModel = config.model || defaults?.defaultModel || "unknown";
  const dimension = config.dimensions || "auto";
  return `${config.provider}:${actualModel}:${dimension}:v1`;
}
