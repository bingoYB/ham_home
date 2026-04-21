/**
 * Embedding 模块
 * 基于 @hamhome/agent 的 AI SDK Embedding 能力
 */
import {
  createEmbeddingClient as createAgentEmbeddingClient,
  getEmbeddingModelKey,
} from "@hamhome/agent";
import { createLogger } from "@hamhome/utils";

import {
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  isEmbeddingSupported,
} from "./config/embedding-providers";
import { calculateCosineSimilarity } from "./utils/vector";
import type { AIProvider } from "./types";

const logger = createLogger({ namespace: "Embedding" });

export interface EmbeddingClientConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model: string;
  dimensions?: number;
}

export interface EmbeddingResult {
  embedding: number[];
  tokens: number;
}

export interface EmbeddingBatchResult {
  embeddings: number[][];
  tokens: number;
}

export function createEmbeddingClient(config: EmbeddingClientConfig) {
  const client = createAgentEmbeddingClient({
    provider: config.provider,
    apiKey: config.apiKey,
    baseUrl:
      config.baseUrl || EMBEDDING_PROVIDER_DEFAULTS[config.provider]?.baseUrl,
    model: config.model,
    dimensions: config.dimensions,
  });

  return {
    getModelKey(): string {
      return getEmbeddingModelKey(config);
    },

    async embed(text: string): Promise<EmbeddingResult> {
      logger.debug("Generating embedding", {
        text: text.slice(0, 50),
        provider: config.provider,
        model: config.model,
      });

      try {
        const result = await client.embed(text);

        logger.debug("Embedding generated", {
          dimensions: result.embedding.length,
        });

        return {
          embedding: result.embedding,
          tokens: result.tokens,
        };
      } catch (error) {
        logger.error("Embedding generation failed", error);
        throw error;
      }
    },

    async embedMany(texts: string[]): Promise<EmbeddingBatchResult> {
      if (texts.length === 0) {
        return { embeddings: [], tokens: 0 };
      }

      logger.debug("Generating embeddings batch", {
        count: texts.length,
        provider: config.provider,
        model: config.model,
      });

      try {
        const result = await client.embedMany(texts);

        logger.debug("Embeddings batch generated", {
          count: result.embeddings.length,
          dimensions: result.embeddings[0]?.length,
        });

        return {
          embeddings: result.embeddings,
          tokens: result.tokens,
        };
      } catch (error) {
        logger.error("Embeddings batch generation failed", error);
        throw error;
      }
    },

    async testConnection(): Promise<{
      success: boolean;
      error?: string;
      dimensions?: number;
    }> {
      return client.testConnection();
    },
  };
}

export type EmbeddingClient = ReturnType<typeof createEmbeddingClient>;

export {
  calculateCosineSimilarity,
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  isEmbeddingSupported,
};
