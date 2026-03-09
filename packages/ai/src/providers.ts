import {
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  isEmbeddingSupported,
} from "./config/embedding-providers";
import {
  getDefaultBaseUrl,
  getDefaultModel,
  getProviderModels,
  PROVIDER_DEFAULTS,
  requiresApiKey,
} from "./config/providers";
import type { EmbeddingClientConfig } from "./embedding";

export function getEmbeddingModelKey(config: EmbeddingClientConfig): string {
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[config.provider];
  const actualModel = config.model || defaults?.defaultModel || "unknown";
  const dimension = config.dimensions || "auto";
  return `${config.provider}:${actualModel}:${dimension}:v1`;
}

export {
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultBaseUrl,
  getDefaultEmbeddingModel,
  getDefaultModel,
  getProviderModels,
  isEmbeddingSupported,
  PROVIDER_DEFAULTS,
  requiresApiKey,
};
