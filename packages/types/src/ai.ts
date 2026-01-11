/**
 * AI 配置
 */
export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom' | 'workers-ai';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;
  presetTags?: string[];     // 预设标签列表（用于自动匹配书签）
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

