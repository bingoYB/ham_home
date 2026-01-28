/**
 * Embedding 模块
 * 基于 @ai-sdk 提供 embedding 生成能力
 */
import { embed, embedMany, cosineSimilarity } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { EmbeddingModelV1 } from '@ai-sdk/provider';
import { createLogger } from '@hamhome/utils';
import type { AIProvider } from './types';

const logger = createLogger({ namespace: 'Embedding' });

/**
 * Embedding 配置
 */
export interface EmbeddingClientConfig {
  /** 服务提供商 */
  provider: AIProvider;
  /** API Key */
  apiKey?: string;
  /** Base URL */
  baseUrl?: string;
  /** Embedding 模型名 */
  model: string;
  /** 向量维度（部分 provider 支持） */
  dimensions?: number;
}

/**
 * Embedding 结果
 */
export interface EmbeddingResult {
  /** 向量 */
  embedding: number[];
  /** token 使用量 */
  tokens: number;
}

/**
 * 批量 Embedding 结果
 */
export interface EmbeddingBatchResult {
  /** 向量列表 */
  embeddings: number[][];
  /** token 使用量 */
  tokens: number;
}

/**
 * Provider 默认 Embedding 配置
 */
const EMBEDDING_PROVIDER_DEFAULTS: Record<AIProvider, {
  baseUrl: string;
  defaultModel: string;
  supportsEmbedding: boolean;
}> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'text-embedding-3-small',
    supportsEmbedding: true,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    defaultModel: '',
    supportsEmbedding: false, // Anthropic 不提供 embedding
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'text-embedding-004',
    supportsEmbedding: true,
  },
  azure: {
    baseUrl: '',
    defaultModel: 'text-embedding-ada-002',
    supportsEmbedding: true,
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: '',
    supportsEmbedding: false, // DeepSeek 不提供 embedding
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: '',
    supportsEmbedding: false, // Groq 不提供 embedding
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-embed',
    supportsEmbedding: true,
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.cn/v1',
    defaultModel: '',
    supportsEmbedding: false, // Moonshot 不提供 embedding
  },
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    defaultModel: 'embedding-3',
    supportsEmbedding: true,
  },
  hunyuan: {
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    defaultModel: 'hunyuan-embedding',
    supportsEmbedding: true,
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'nvidia/embed-qa-4',
    supportsEmbedding: true,
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    defaultModel: 'BAAI/bge-m3',
    supportsEmbedding: true,
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'nomic-embed-text',
    supportsEmbedding: true,
  },
  custom: {
    baseUrl: '',
    defaultModel: 'text-embedding-3-small',
    supportsEmbedding: true,
  },
};

/**
 * 检查 provider 是否支持 embedding
 */
export function isEmbeddingSupported(provider: AIProvider): boolean {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.supportsEmbedding ?? false;
}

/**
 * 获取 provider 的默认 embedding 模型
 */
export function getDefaultEmbeddingModel(provider: AIProvider): string {
  return EMBEDDING_PROVIDER_DEFAULTS[provider]?.defaultModel || '';
}

/**
 * 创建 Embedding 模型实例
 */
function createEmbeddingModel(config: EmbeddingClientConfig): EmbeddingModelV1<string> {
  const { provider, apiKey, baseUrl, model, dimensions } = config;
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[provider] || EMBEDDING_PROVIDER_DEFAULTS.custom;

  // 目前所有支持 embedding 的 provider 都兼容 OpenAI API
  const openai = createOpenAI({
    apiKey: provider === 'ollama' ? 'ollama' : (apiKey || ''),
    baseURL: baseUrl || defaults.baseUrl,
  });

  // 创建 embedding 模型
  const embeddingModel = openai.textEmbeddingModel(model || defaults.defaultModel, {
    dimensions,
  });

  return embeddingModel;
}

/**
 * 生成模型标识（用于向量存储）
 */
export function getEmbeddingModelKey(config: EmbeddingClientConfig): string {
  const { provider, model, dimensions } = config;
  const defaults = EMBEDDING_PROVIDER_DEFAULTS[provider];
  const actualModel = model || defaults?.defaultModel || 'unknown';
  const dim = dimensions || 'auto';
  return `${provider}:${actualModel}:${dim}:v1`;
}

/**
 * 创建 Embedding 客户端
 */
export function createEmbeddingClient(config: EmbeddingClientConfig) {
  const model = createEmbeddingModel(config);

  return {
    /**
     * 获取模型标识
     */
    getModelKey(): string {
      return getEmbeddingModelKey(config);
    },

    /**
     * 生成单个文本的 embedding
     */
    async embed(text: string): Promise<EmbeddingResult> {
      logger.debug('Generating embedding', { text: text.slice(0, 50) });

      try {
        const result = await embed({
          model,
          value: text,
        });

        logger.debug('Embedding generated', {
          dimensions: result.embedding.length,
          tokens: result.usage.tokens,
        });

        return {
          embedding: result.embedding,
          tokens: result.usage.tokens,
        };
      } catch (error) {
        logger.error('Embedding generation failed', error);
        throw error;
      }
    },

    /**
     * 批量生成 embedding
     */
    async embedMany(texts: string[]): Promise<EmbeddingBatchResult> {
      if (texts.length === 0) {
        return { embeddings: [], tokens: 0 };
      }

      logger.debug('Generating embeddings batch', { count: texts.length });

      try {
        const result = await embedMany({
          model,
          values: texts,
        });

        logger.debug('Embeddings batch generated', {
          count: result.embeddings.length,
          dimensions: result.embeddings[0]?.length,
          tokens: result.usage.tokens,
        });

        return {
          embeddings: result.embeddings,
          tokens: result.usage.tokens,
        };
      } catch (error) {
        logger.error('Embeddings batch generation failed', error);
        throw error;
      }
    },

    /**
     * 测试连接
     */
    async testConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }> {
      try {
        const result = await embed({
          model,
          value: 'test',
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

/**
 * 计算两个向量的 cosine 相似度（使用 @ai-sdk 提供的函数）
 */
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  return cosineSimilarity(a, b);
}

/**
 * Embedding 客户端类型
 */
export type EmbeddingClient = ReturnType<typeof createEmbeddingClient>;
