import type { AIProvider } from "../types";

export interface EmbeddingProviderConfig {
  baseUrl: string;
  defaultModel: string;
  supportsEmbedding: boolean;
}

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

export function isEmbeddingSupported(provider: AIProvider): boolean {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.supportsEmbedding ?? false;
}

export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.defaultModel || "";
}
