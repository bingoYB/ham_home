/**
 * Embedding 客户端封装
 * 基于 @hamhome/ai 包的 embedding 能力
 */
import {
  createEmbeddingClient as createClient,
  isEmbeddingSupported as checkSupported,
  getDefaultEmbeddingModel,
  getEmbeddingModelKey,
} from '@hamhome/ai';
import type { EmbeddingClient, EmbeddingClientConfig } from '@hamhome/ai';
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
  private getOrCreateClient(): EmbeddingClient {
    if (!this.client && this.config) {
      const clientConfig: EmbeddingClientConfig = {
        provider: this.config.provider,
        apiKey: this.config.apiKey,
        baseUrl: this.config.baseUrl,
        model: this.config.model || getDefaultEmbeddingModel(this.config.provider),
        dimensions: this.config.dimensions,
      };
      this.client = createClient(clientConfig);
    }
    return this.client!;
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
      const client = this.getOrCreateClient();
      const result = await client.embed(text);
      return result.embedding;
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
      const client = this.getOrCreateClient();
      const result = await client.embedMany(texts);
      return result.embeddings;
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
      const client = this.getOrCreateClient();
      return await client.testConnection();
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
