import { z } from 'zod';

/**
 * AI 配置接口
 */
export interface AIClientConfig {
  provider: 'openai' | 'anthropic' | 'ollama' | 'custom' | 'workers-ai';
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 书签分析结果 Schema
 */
export const BookmarkAnalysisSchema = z.object({
  title: z.string().describe('优化后的标题，简洁明了'),
  summary: z.string().max(200).describe('一句话摘要，不超过200字'),
  category: z.string().describe('推荐分类名称'),
  tags: z.array(z.string()).max(5).describe('相关标签，最多5个'),
});

export type BookmarkAnalysisResult = z.infer<typeof BookmarkAnalysisSchema>;

/**
 * AI 分析输入
 */
export interface AnalyzeBookmarkInput {
  url: string;
  title: string;
  content: string;
}

/**
 * AI 客户端接口
 */
export interface AIClient {
  analyzeBookmark(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult>;
}

