import { OpenAIEmbeddings } from "@langchain/openai";

import { EMBEDDING_PROVIDER_DEFAULTS } from "../config/embedding-providers";
import type { EmbeddingClientConfig } from "../embedding";

export type SupportedEmbeddingsModel = OpenAIEmbeddings<number[]>;

export function createEmbeddingsModel(
  config: EmbeddingClientConfig,
): SupportedEmbeddingsModel {
  const defaults =
    EMBEDDING_PROVIDER_DEFAULTS[config.provider] ||
    EMBEDDING_PROVIDER_DEFAULTS.custom;

  return new OpenAIEmbeddings({
    apiKey: config.provider === "ollama" ? "ollama" : config.apiKey || "",
    model: config.model || defaults.defaultModel,
    dimensions: config.dimensions,
    configuration: config.baseUrl || defaults.baseUrl
      ? {
          baseURL: config.baseUrl || defaults.baseUrl,
        }
      : undefined,
  });
}
