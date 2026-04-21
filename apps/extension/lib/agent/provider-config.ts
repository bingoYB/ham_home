import {
  EMBEDDING_PROVIDER_DEFAULTS as AGENT_EMBEDDING_PROVIDER_DEFAULTS,
  PROVIDER_DEFAULTS as AGENT_PROVIDER_DEFAULTS,
  getDefaultBaseUrl as getAgentDefaultBaseUrl,
  getDefaultEmbeddingModel as getAgentDefaultEmbeddingModel,
  getDefaultModel as getAgentDefaultModel,
  getEmbeddingModelKey as getAgentEmbeddingModelKey,
  getProviderModels as getAgentProviderModels,
  isEmbeddingSupported as checkEmbeddingSupported,
  requiresApiKey as checkRequiresApiKey,
  type EmbeddingProviderConfig,
  type ProviderConfig,
} from "@hamhome/agent";
import type { AIProvider } from "@/types";

export type { EmbeddingProviderConfig, ProviderConfig };

export const PROVIDER_DEFAULTS: Record<AIProvider, ProviderConfig> =
  AGENT_PROVIDER_DEFAULTS as Record<AIProvider, ProviderConfig>;

export const EMBEDDING_PROVIDER_DEFAULTS: Record<
  AIProvider,
  EmbeddingProviderConfig
> = AGENT_EMBEDDING_PROVIDER_DEFAULTS as Record<
  AIProvider,
  EmbeddingProviderConfig
>;

export function getDefaultModel(provider: AIProvider): string {
  return getAgentDefaultModel(provider);
}

export function getProviderModels(provider: AIProvider): string[] {
  return getAgentProviderModels(provider);
}

export function getDefaultBaseUrl(provider: AIProvider): string {
  return getAgentDefaultBaseUrl(provider);
}

export function requiresApiKey(provider: AIProvider): boolean {
  return checkRequiresApiKey(provider);
}

export function isEmbeddingSupported(provider: AIProvider): boolean {
  return checkEmbeddingSupported(provider);
}

export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return getAgentDefaultEmbeddingModel(provider);
}

export function getEmbeddingModelKey(config: {
  provider: AIProvider;
  model?: string;
  dimensions?: number;
}): string {
  return getAgentEmbeddingModelKey(config);
}
