/**
 * Embedding 客户端封装
 * 基于 OpenAI-compatible Embedding 能力
 */
import { createEmbeddingClient, type EmbeddingClient } from "@hamhome/agent";
import {
  EMBEDDING_PROVIDER_DEFAULTS,
  EXTENSION_AGENT_PROVIDERS,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
  isEmbeddingSupported as checkSupported,
  resolveAgentProvider,
  resolveEmbeddingDimensions,
} from "@/lib/agent";
import type { EmbeddingConfig } from '@/types';
import { configStorage } from '@/lib/storage';
import { createLogger } from '@hamhome/utils';

const logger = createLogger({ namespace: 'ExtensionEmbedding' });

/**
 * 判断 provider 是否支持 embedding
 */
export function isEmbeddingSupported(provider: EmbeddingConfig['provider']): boolean {
  return checkSupported(provider);
}

/**
 * 限流错误
 */
export class EmbeddingRateLimitError extends Error {
  retryAfterSeconds?: number;

  constructor(message: string, retryAfterSeconds?: number) {
    super(message);
    this.name = 'EmbeddingRateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * Create the SDK embedding client for a stored embedding config.
 */
function createClientForConfig(config: EmbeddingConfig): EmbeddingClient {
  return createEmbeddingClient({
    providers: EXTENSION_AGENT_PROVIDERS,
    provider: resolveAgentProvider(config.provider),
    apiKey: config.provider === "ollama" ? undefined : config.apiKey,
    baseUrl: config.baseUrl || EMBEDDING_PROVIDER_DEFAULTS[config.provider]?.baseUrl,
    model: config.model || getDefaultEmbeddingModel(config.provider),
    dimensions: resolveEmbeddingDimensions(config),
  });
}

/**
 * Extension Embedding 客户端
 * 封装配置加载和错误处理
 */
class ExtensionEmbeddingClient {
  private config: EmbeddingConfig | null = null;
  private client: EmbeddingClient | null = null;

  /**
   * 加载配置
   */
  async loadConfig(): Promise<EmbeddingConfig> {
    this.config = await configStorage.getEmbeddingConfig();
    this.client = null; // 重置客户端
    return this.config;
  }

  /**
   * 获取当前配置
   */
  getConfig(): EmbeddingConfig | null {
    return this.config;
  }

  /**
   * 检查是否已配置且启用
   */
  isEnabled(): boolean {
    if (!this.config || !this.config.enabled) return false;

    // Ollama 不需要 API Key
    if (this.config.provider === 'ollama') {
      return true;
    }

    return !!this.config.apiKey;
  }

  /**
   * 检查 provider 是否支持 embedding
   */
  isProviderSupported(): boolean {
    if (!this.config) return false;
    return isEmbeddingSupported(this.config.provider);
  }

  /**
   * 获取或创建客户端
   */
  private getClient(): EmbeddingClient {
    if (!this.config) throw new Error('EmbeddingClient not configured');
    this.client ??= createClientForConfig(this.config);
    return this.client;
  }

  /**
   * 获取模型标识（用于向量存储）
   */
  getModelKey(): string {
    if (!this.config) throw new Error('EmbeddingClient not configured');
    return getEmbeddingModelKey({
      provider: this.config.provider,
      model: this.config.model,
      dimensions: this.config.dimensions,
    });
  }

  /**
   * 生成单个文本的 embedding
   */
  async embed(text: string): Promise<number[]> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isEnabled()) {
      throw new Error('Embedding service is not enabled or configured');
    }

    if (!this.isProviderSupported()) {
      throw new Error(`Provider ${this.config?.provider} does not support embedding`);
    }

    try {
      return await this.getClient().embed(text);
    } catch (error) {
      // 检测限流错误
      if (this.isRateLimitError(error)) {
        throw new EmbeddingRateLimitError('Rate limit exceeded', this.extractRetryAfter(error));
      }
      throw error;
    }
  }

  /**
   * 批量生成 embedding
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isEnabled()) {
      throw new Error('Embedding service is not enabled or configured');
    }

    if (!this.isProviderSupported()) {
      throw new Error(`Provider ${this.config?.provider} does not support embedding`);
    }

    try {
      return await this.getClient().embedMany(texts);
    } catch (error) {
      // 检测限流错误
      if (this.isRateLimitError(error)) {
        throw new EmbeddingRateLimitError('Rate limit exceeded', this.extractRetryAfter(error));
      }
      throw error;
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isEnabled()) {
      return { success: false, error: 'Embedding service is not enabled or configured' };
    }

    if (!this.isProviderSupported()) {
      return { success: false, error: `Provider ${this.config?.provider} does not support embedding` };
    }

    try {
      const result = await this.getClient().testConnection();
      return {
        success: result.success,
        error: result.success ? undefined : result.error || result.message,
        dimensions: result.dimensions,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 检测是否为限流错误
   */
  private isRateLimitError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return message.includes('rate limit') || message.includes('429') || message.includes('too many requests');
    }
    return false;
  }

  /**
   * 从错误中提取重试时间
   */
  private extractRetryAfter(error: unknown): number | undefined {
    if (error instanceof Error) {
      const match = error.message.match(/retry after (\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return undefined;
  }
}

// 导出单例
export const embeddingClient = new ExtensionEmbeddingClient();
