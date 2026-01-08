/**
 * 插件 AI 客户端封装
 * 从本地配置加载 AI 设置，提供统一的 AI 分析接口
 */
import { createAIClient, getDefaultModel } from '@hamhome/ai';
import type { AIClient } from '@hamhome/ai';
import { configStorage } from '@/lib/storage';
import type { AIConfig, AnalysisResult } from '@/types';

class ExtensionAIClient {
  private config: AIConfig | null = null;
  private client: AIClient | null = null;

  /**
   * 加载配置
   */
  async loadConfig(): Promise<AIConfig> {
    this.config = await configStorage.getAIConfig();
    return this.config;
  }

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean {
    if (!this.config) return false;
    if (!this.config.enabled) return false;

    // Ollama 不需要 API Key
    if (this.config.provider === 'ollama') {
      return !!this.config.baseUrl;
    }

    return !!this.config.apiKey;
  }

  /**
   * 分析书签内容
   */
  async analyze(input: {
    url: string;
    title: string;
    content: string;
  }): Promise<AnalysisResult> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.isConfigured()) {
      // AI 未配置，返回默认值
      return {
        title: input.title,
        summary: '',
        category: '',
        tags: [],
      };
    }

    try {
      // 创建或复用客户端
      if (!this.client) {
        this.client = createAIClient({
          provider: this.config!.provider,
          apiKey: this.config!.apiKey,
          baseUrl: this.config!.baseUrl,
          model: this.config!.model || getDefaultModel(this.config!.provider),
          temperature: this.config!.temperature,
          maxTokens: this.config!.maxTokens,
        });
      }

      const result = await this.client.analyzeBookmark(input);
      return result;
    } catch (error) {
      console.error('[ExtensionAIClient] Analysis failed:', error);
      // AI 调用失败，返回默认值，不阻塞用户流程
      return {
        title: input.title,
        summary: '',
        category: '',
        tags: [],
      };
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.config) {
      await this.loadConfig();
    }

    if (!this.config?.apiKey && this.config?.provider !== 'ollama') {
      return { success: false, message: '请先配置 API Key' };
    }

    if (this.config?.provider === 'ollama' && !this.config?.baseUrl) {
      return { success: false, message: '请配置 Ollama 地址' };
    }

    try {
      // 发送简单的测试请求
      const client = createAIClient({
        provider: this.config!.provider,
        apiKey: this.config!.apiKey,
        baseUrl: this.config!.baseUrl,
        model: this.config!.model || getDefaultModel(this.config!.provider),
      });

      await client.analyzeBookmark({
        url: 'https://example.com',
        title: 'Test',
        content: 'This is a test.',
      });

      return { success: true, message: '连接成功' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '连接失败';
      return { success: false, message };
    }
  }

  /**
   * 重置客户端（配置更新后调用）
   */
  reset(): void {
    this.config = null;
    this.client = null;
  }
}

export const aiClient = new ExtensionAIClient();

