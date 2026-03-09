/**
 * Embedding 模块
 * 基于 LangChain Embeddings 提供统一向量能力
 */
import { createLogger } from "@hamhome/utils";

import {
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  isEmbeddingSupported,
} from "./config/embedding-providers";
import { createEmbeddingsModel } from "./factory/embedding-model";
import { getEmbeddingModelKey } from "./providers";
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
  const model = createEmbeddingsModel(config);

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
        const embedding = await model.embedQuery(text);

        logger.debug("Embedding generated", {
          dimensions: embedding.length,
        });

        return {
          embedding,
          tokens: 0,
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
        const embeddings = await model.embedDocuments(texts);

        logger.debug("Embeddings batch generated", {
          count: embeddings.length,
          dimensions: embeddings[0]?.length,
        });

        return {
          embeddings,
          tokens: 0,
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
      try {
        const embedding = await model.embedQuery("test");
        return {
          success: true,
          dimensions: embedding.length,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
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
