import { z } from 'zod';

/**
 * AI 服务提供商类型
 * - openai: OpenAI
 * - anthropic: Anthropic Claude
 * - google: Google Gemini
 * - azure: Azure OpenAI
 * - deepseek: DeepSeek
 * - groq: Groq
 * - mistral: Mistral AI
 * - moonshot: Moonshot/Kimi (月之暗面)
 * - zhipu: 智谱AI/GLM
 * - hunyuan: 腾讯混元
 * - nvidia: NVIDIA NIM
 * - siliconflow: SiliconFlow (硅基流动)
 * - ollama: Ollama (本地)
 * - custom: 自定义 OpenAI 兼容 API
 */
export type AIProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google'
  | 'azure'
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'moonshot'
  | 'zhipu'
  | 'hunyuan'
  | 'nvidia'
  | 'siliconflow'
  | 'ollama' 
  | 'custom';

/**
 * AI 配置接口
 */
/**
 * AI 输出语言类型
 */
export type AILanguage = 'zh' | 'en' | 'auto';

export interface AIClientConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** 是否启用调试日志，打印 AI 请求参数和响应 */
  debug?: boolean;
  /** AI 输出语言，默认 'auto' 自动检测 */
  language?: AILanguage;
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
  existingTags?: string[];    // 用户已有的标签（避免生成语义相近的重复标签）
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
  name: z.string().min(2).max(20).describe('分类名称，2-8个字'),
  children: z.lazy(() => z.array(GeneratedCategorySchema)).optional().describe('子分类数组（可选）'),
});

// 包装在对象中，因为有些模型不支持顶层数组
export const GeneratedCategoriesSchema = z.object({
  categories: z.array(GeneratedCategorySchema).min(3).max(10).describe('书签分类数组，包含3-10个一级分类'),
});

export interface GeneratedCategory {
  name: string;
  children?: GeneratedCategory[];
}
