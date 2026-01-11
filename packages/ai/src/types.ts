import { z } from 'zod';

/**
 * AI 服务提供商类型
 */
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

/**
 * AI 配置接口
 */
export interface AIClientConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 页面元数据（用于 AI 分析输入）
 */
export interface PageMetadataInput {
  description?: string;
  keywords?: string;
  author?: string;
  siteName?: string;
}

/**
 * AI 分析输入（增强版，参考 SmartBookmark）
 */
export interface AnalyzeBookmarkInput {
  url: string;
  title: string;
  content?: string;           // 正文内容（可选，可能提取失败）
  excerpt?: string;           // 摘要
  metadata?: PageMetadataInput; // 页面元数据
  isReaderable?: boolean;     // 是否可读
  // 上下文信息
  presetTags?: string[];      // 预设标签（由用户配置，用于自动匹配书签）
  existingCategories?: string[]; // 用户已有的分类
}

/**
 * 书签分析结果 Schema（整合标题、摘要、分类、标签）
 */
export const BookmarkAnalysisSchema = z.object({
  title: z.string().describe('优化后的标题，简洁明了，不超过50字'),
  summary: z.string().max(200).describe('一句话摘要，概括核心内容，不超过200字'),
  category: z.string().describe('推荐的分类名称，优先从用户已有分类或预设分类中选择'),
  tags: z.array(z.string()).max(5).describe('3-5个相关标签，简洁有辨识度'),
});

export type BookmarkAnalysisResult = z.infer<typeof BookmarkAnalysisSchema>;

/**
 * AI 客户端接口
 */
export interface AIClient {
  analyzeBookmark(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult>;
}

/**
 * 标签推荐 Schema（保留用于单独调用）
 */
export const TagSuggestionSchema = z.object({
  tag: z.string().describe('推荐的标签'),
  reason: z.string().describe('推荐理由'),
});

export const TagSuggestionsSchema = z.array(TagSuggestionSchema).max(5);

export type TagSuggestionResult = z.infer<typeof TagSuggestionSchema>;

/**
 * 分类推荐 Schema（保留用于单独调用）
 */
export const CategorySuggestionSchema = z.object({
  name: z.string().describe('推荐的分类名称'),
  reason: z.string().describe('推荐理由'),
});

export const CategorySuggestionsSchema = z.array(CategorySuggestionSchema).max(3);

export type CategorySuggestionResult = z.infer<typeof CategorySuggestionSchema>;

/**
 * AI 生成分类方案 Schema
 */
export const GeneratedCategorySchema: z.ZodType<any> = z.object({
  name: z.string().describe('分类名称'),
  children: z.lazy(() => z.array(GeneratedCategorySchema)).optional().describe('子分类'),
});

export const GeneratedCategoriesSchema = z.array(GeneratedCategorySchema).max(10);

export interface GeneratedCategory {
  name: string;
  children?: GeneratedCategory[];
}
