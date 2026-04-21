import { embed, embedMany } from "ai";
import {
  createEmbeddingModelFromProvider,
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  isEmbeddingSupported,
  type ProviderName,
} from "../agent/providers";

export interface EmbeddingClientConfig {
  provider: ProviderName;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
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

export interface EmbeddingClient {
  getModelKey(): string;
  embed(text: string): Promise<EmbeddingResult>;
  embedMany(texts: string[]): Promise<EmbeddingBatchResult>;
  testConnection(): Promise<{
    success: boolean;
    error?: string;
    dimensions?: number;
  }>;
}

function normalizeProviderName(provider: string): ProviderName {
  return provider as ProviderName;
}

function getEmbeddingProviderOptions(
  provider: ProviderName,
  dimensions?: number,
): Record<string, Record<string, number>> | undefined {
  if (!dimensions) {
    return undefined;
  }

  if (provider === "openai" || provider === "azure") {
    return {
      openai: {
        dimensions,
      },
    };
  }

  if (
    provider === "custom" ||
    provider === "ollama" ||
    provider === "zhipu" ||
    provider === "hunyuan" ||
    provider === "nvidia" ||
    provider === "siliconflow"
  ) {
    return {
      [provider]: {
        dimensions,
      },
    };
  }

  return undefined;
}

function createResolvedEmbeddingModel(config: EmbeddingClientConfig) {
  const provider = normalizeProviderName(config.provider);
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[provider];
  const model = config.model || defaults?.defaultModel;

  if (!model) {
    throw new Error(`Provider "${provider}" does not have a default embedding model.`);
  }

  return createEmbeddingModelFromProvider(provider, {
    apiKey: provider === "ollama" ? undefined : config.apiKey,
    baseURL: config.baseUrl || defaults?.baseUrl || undefined,
    model,
  });
}

export function createEmbeddingClient(
  config: EmbeddingClientConfig,
): EmbeddingClient {
  const provider = normalizeProviderName(config.provider);

  if (!isEmbeddingSupported(provider)) {
    throw new Error(`Provider "${provider}" does not support embeddings.`);
  }

  const model = createResolvedEmbeddingModel(config);
  const providerOptions = getEmbeddingProviderOptions(
    provider,
    config.dimensions,
  );

  return {
    getModelKey(): string {
      return getEmbeddingModelKey({
        provider,
        model: config.model || getDefaultEmbeddingModel(provider),
        dimensions: config.dimensions,
      });
    },

    async embed(text: string): Promise<EmbeddingResult> {
      const result = await embed({
        model,
        value: text,
        ...(providerOptions ? { providerOptions } : {}),
      });

      return {
        embedding: result.embedding,
        tokens: result.usage?.tokens ?? 0,
      };
    },

    async embedMany(texts: string[]): Promise<EmbeddingBatchResult> {
      if (texts.length === 0) {
        return {
          embeddings: [],
          tokens: 0,
        };
      }

      const result = await embedMany({
        model,
        values: texts,
        ...(providerOptions ? { providerOptions } : {}),
      });

      return {
        embeddings: result.embeddings,
        tokens: result.usage?.tokens ?? 0,
      };
    },

    async testConnection() {
      try {
        const result = await embed({
          model,
          value: "test",
          ...(providerOptions ? { providerOptions } : {}),
        });

        return {
          success: true,
          dimensions: result.embedding.length,
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

export {
  EMBEDDING_PROVIDER_DEFAULTS,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  isEmbeddingSupported,
};
