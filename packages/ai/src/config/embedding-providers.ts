import {
  EMBEDDING_PROVIDER_DEFAULTS as AGENT_EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel as getAgentDefaultEmbeddingModel,
  isEmbeddingSupported as checkEmbeddingSupported,
  type EmbeddingProviderConfig,
} from "@hamhome/agent";
import type { AIProvider } from "../types";

export type { EmbeddingProviderConfig };

export const EMBEDDING_PROVIDER_DEFAULTS: Record<
  AIProvider,
  EmbeddingProviderConfig
> = AGENT_EMBEDDING_PROVIDER_DEFAULTS as Record<
  AIProvider,
  EmbeddingProviderConfig
>;

export function isEmbeddingSupported(provider: AIProvider): boolean {
  return checkEmbeddingSupported(provider);
}

export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return getAgentDefaultEmbeddingModel(provider);
}
