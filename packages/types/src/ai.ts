/**
 * AI Provider 类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom' | 'workers-ai';

/**
 * AI 配置
 */
export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  presetTags?: string[];     // 预设标签列表（用于自动匹配书签）
}

/**
 * Embedding 服务配置（独立于文本生成模型）
 */
export interface EmbeddingConfig {
  /** 是否启用语义检索 */
  enabled: boolean;
  /** 服务提供商 */
  provider: AIProvider;
  /** OpenAI-compatible base url */
  baseUrl?: string;
  /** API Key（云端 provider 需要；ollama 可为空） */
  apiKey?: string;
  /** Embedding 模型名（例如 text-embedding-3-small / bge-m3） */
  model: string;
  /** 向量维度（部分 provider 支持指定；不支持则由返回值确定） */
  dimensions?: number;
  /** 批量 embedding 大小（默认 16） */
  batchSize?: number;
}

/**
 * AI 分析结果
 */
export interface BookmarkAnalysis {
  title: string;
  summary: string;
  category: string;
  tags: string[];
}

