import { generateObject, generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { LanguageModelV1 } from 'ai';
import { z } from 'zod';
import type {
  AIClientConfig,
  AnalyzeBookmarkInput,
  BookmarkAnalysisResult,
  AIClient,
  AIProvider,
  AILanguage,
  TagSuggestionResult,
  CategorySuggestionResult,
  GeneratedCategory,
} from './types';
import {
  BookmarkAnalysisSchema,
  TagSuggestionsSchema,
  CategorySuggestionsSchema,
  GeneratedCategoriesSchema,
} from './types';
import { createLogger } from '@hamhome/utils';
const logger = createLogger({ namespace: 'AI' });


/**
 * 全局配置：是否使用分批任务模式
 * - true: 分三个独立 AI 任务并行执行（标题摘要、分类、标签）
 * - false: 单个 AI 任务一次性生成所有内容
 */
export let AI_BATCH_MODE = false;

/**
 * 设置 AI 任务模式
 */
export function setAIBatchMode(enabled: boolean): void {
  AI_BATCH_MODE = enabled;
}

/**
 * 获取当前 AI 任务模式
 */
export function getAIBatchMode(): boolean {
  return AI_BATCH_MODE;
}

/**
 * 系统提示词 - 用于书签分析（完整模式）
 * 参考 SmartBookmark 的提示词设计，强调结构化输出和约束
 */
function getBookmarkAnalysisSystemPrompt(language: AILanguage): string {
  if (language === 'en') {
    return `You are a professional web content analyst skilled at extracting core themes and generating accurate metadata.

Your task is to analyze web content and generate all of the following in one response:
1. title: Optimized title
2. summary: One-sentence summary
3. category: Recommended category
4. tags: Related tags

Please strictly follow the output format requirements.`;
  }
  return `你是一个专业的网页内容分析专家，擅长提取文章的核心主题并生成准确的元数据。

你的任务是分析网页内容，一次性生成以下所有信息：
1. title: 优化后的标题
2. summary: 一句话摘要
3. category: 推荐分类
4. tags: 相关标签

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 生成标题与摘要
 */
function getTitleSummarySystemPrompt(language: AILanguage): string {
  if (language === 'en') {
    return `You are a professional web content analyst skilled at extracting core themes from articles.

Your task is to analyze web content and generate:
1. title: Optimized title
2. summary: One-sentence summary

Please strictly follow the output format requirements.`;
  }
  return `你是一个专业的网页内容分析专家，擅长提取文章的核心主题。

你的任务是分析网页内容，生成：
1. title: 优化后的标题
2. summary: 一句话摘要

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 推荐分类
 */
function getCategorySystemPrompt(language: AILanguage): string {
  if (language === 'en') {
    return `You are a professional information classification expert skilled at matching content to the most appropriate category.

Your task is to analyze web content and recommend the most suitable category.

Please strictly follow the output format requirements.`;
  }
  return `你是一个专业的信息分类专家，擅长为内容匹配最合适的分类。

你的任务是分析网页内容，推荐一个最合适的分类。

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 推荐标签
 */
function getTagsSystemPrompt(language: AILanguage): string {
  if (language === 'en') {
    return `You are a professional keyword extraction expert skilled at generating precise tags for content.

Your task is to analyze web content and generate 3-5 relevant tags.

Please strictly follow the output format requirements.`;
  }
  return `你是一个专业的关键词提取专家，擅长为内容生成精准的标签。

你的任务是分析网页内容，生成3-5个相关标签。

请严格按照输出格式要求返回结果。`;
}

/**
 * Schema - 标题与摘要
 */
const TitleSummarySchema = z.object({
  title: z.string().describe('优化后的标题，简洁明了，不超过50字'),
  summary: z.string().max(200).describe('一句话摘要，概括核心内容，不超过200字'),
});

/**
 * Schema - 分类
 */
const CategorySchema = z.object({
  category: z.string().describe('推荐的分类名称，优先从用户已有分类中选择'),
});

/**
 * Schema - 标签
 */
const TagsSchema = z.object({
  tags: z.array(z.string()).max(5).describe('3-5个相关标签，简洁有辨识度'),
});

/**
 * 智能截断文本（用于 Prompt 构建）
 */
function smartTruncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  
  // 检测是否以中文为主
  const sample = text.slice(0, 100);
  const cjkMatch = sample.match(/[\u4e00-\u9fa5]/g);
  const isCJK = cjkMatch && cjkMatch.length > 30;
  
  if (isCJK) {
    // 中文：在标点处截断
    const truncated = text.slice(0, maxLength);
    const punctuation = /[，。！？；,!?;]/;
    for (let i = truncated.length - 1; i >= maxLength - 50; i--) {
      if (punctuation.test(truncated[i])) {
        return truncated.slice(0, i + 1);
      }
    }
    return truncated;
  } else {
    // 英文：在空格处截断
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.slice(0, lastSpace);
    }
    return truncated;
  }
}

/**
 * 构建结构化的用户提示词
 * 参考 SmartBookmark 的 makeChatPrompt 实现
 */
function buildUserPrompt(input: AnalyzeBookmarkInput, language: AILanguage = 'auto'): string {
  // 清理 URL（去除查询参数和 hash）
  const cleanUrl = input.url
    .replace(/\?.+$/, '')
    .replace(/[#&].*$/, '')
    .replace(/\/+$/, '');

  // 构建结构化的网页信息
  let pageInfo = `title: ${input.title}\nurl: ${cleanUrl}`;
  
  // 添加摘要（优先级高）
  if (input.excerpt) {
    pageInfo += `\nexcerpt: ${smartTruncate(input.excerpt, 300)}`;
  }
  
  // 添加 metadata 中的 keywords（对标签生成很有帮助）
  if (input.metadata?.keywords) {
    pageInfo += `\nkeywords: ${input.metadata.keywords.slice(0, 300)}`;
  }
  
  // 添加正文内容（仅当可读时）
  if (input.content && input.isReaderable !== false) {
    pageInfo += `\ncontent: ${smartTruncate(input.content, 500)}`;
  }
  
  // 添加网站名称
  if (input.metadata?.siteName) {
    pageInfo += `\nsite: ${input.metadata.siteName}`;
  }

  // 构建分类上下文
  let categoryContext = '';
  if (input.existingCategories && input.existingCategories.length > 0) {
    categoryContext = `\n用户已有分类: ${input.existingCategories.join(', ')}`;
  }

  // 构建标签上下文
  let tagContext = '';
  if (input.presetTags && input.presetTags.length > 0) {
    tagContext = `\n预设标签: ${input.presetTags.slice(0, 20).join(', ')}`;
  }

  // 构建已有标签上下文（用于去重）
  let existingTagsContext = '';
  if (input.existingTags && input.existingTags.length > 0) {
    existingTagsContext = `\n用户已有标签: ${input.existingTags.slice(0, 50).join(', ')}`;
  }

  if (language === 'en') {
    return `Please analyze the following web content and generate bookmark metadata:

Page Information:
${pageInfo}
${categoryContext ? categoryContext.replace('用户已有分类:', 'User existing categories:') : ''}
${tagContext ? tagContext.replace('预设标签:', 'Preset tags:') : ''}
${existingTagsContext ? existingTagsContext.replace('用户已有标签:', 'User existing tags:') : ''}

Requirements:
1. title: Optimize the title, keep it concise and clear, preserve core information, max 50 characters
2. summary: One-sentence summary, objectively describe core content, max 200 characters
3. category: Recommend the most suitable category
   - [IMPORTANT] User category structure explanation:
     * Categories use hierarchical structure, format: "Parent > Child > Grandchild"
     * Example: "Technology > Programming > JavaScript" represents 3 levels
     * Return the complete category path (including all levels)
   - [MANDATORY] Must prioritize exact match from user's existing categories:
     * Carefully compare page content with each category's semantics
     * Prefer the most specific subcategory over broad parent categories
     * If multiple categories fit, choose the most precise match
   - [New category rules] Only when no existing category applies:
     * Must extend based on existing category tree structure
     * Analyze existing categories to find the most relevant parent or sibling
     * Add new subcategory under appropriate level
     * Example: If "Technology > Frontend" exists, recommend "Technology > Backend" not standalone "Backend"
4. tags: Generate 3-5 keyword tags
   - Concise: Max 2-3 words each
   - Accurate: Reflect the page's core themes
   - Diverse: Cover site/domain/specific content
   - Prefer selecting from preset tags
   - [IMPORTANT] Avoid semantic duplicates with existing tags:
     * If "Frontend Development" exists, don't generate "Frontend", "Web Dev", etc.
     * If "React" exists, don't generate "ReactJS", "React.js" variants
     * Prefer reusing existing tags, only create new ones for truly new concepts`;
  }

  return `请分析以下网页内容，生成书签元数据：

网页信息：
${pageInfo}
${categoryContext}
${tagContext}
${existingTagsContext}

要求：
1. title: 优化标题，简洁明了，保留核心信息，不超过50字
2. summary: 一句话摘要，客观描述核心内容，使用中文，不超过200字
3. category: 推荐一个最合适的分类
   - 【重要】用户已有分类说明：
     * 分类采用层级结构，格式为 "父分类 > 子分类 > 孙分类"
     * 例如 "技术 > 编程语言 > JavaScript" 表示三级分类
     * 请返回完整的分类路径（包含所有层级）
   - 【强制要求】必须优先从用户已有分类中精确匹配：
     * 仔细对比网页内容与每个分类的语义
     * 优先选择最具体的子分类，而非宽泛的父分类
     * 如果有多个合适的分类，选择最精确匹配的那个
   - 【推荐新分类规则】仅当用户已有分类完全不适用时：
     * 必须基于已有分类树结构扩展
     * 分析已有分类，找到最相关的父分类或同级分类
     * 在合适的层级下添加新的子分类
     * 示例：已有"技术 > 前端"，推荐新分类应为"技术 > 后端"而非独立的"后端"
     * 示例：已有"学习与知识"，推荐新分类应为"学习与知识 > 新子类"而非独立的"新分类"
4. tags: 生成3-5个关键词标签
   - 简洁：中文2-5字，英文不超过2个单词
   - 准确：反映网页核心主题
   - 多样：涵盖网站/领域/具体内容
   - 优先从预设标签中选择
   - 【重要】避免与用户已有标签语义重复：
     * 如已有"前端开发"，则不要生成"前端"、"Web开发"等相近标签
     * 如已有"React"，则不要生成"ReactJS"、"React.js"等变体
     * 优先复用已有标签，仅在确实需要新概念时才生成新标签`;
}

/**
 * 构建标题与摘要的用户提示词
 */
function buildTitleSummaryPrompt(input: AnalyzeBookmarkInput, language: AILanguage = 'auto'): string {
  const cleanUrl = input.url
    .replace(/\?.+$/, '')
    .replace(/[#&].*$/, '')
    .replace(/\/+$/, '');

  let pageInfo = `title: ${input.title}\nurl: ${cleanUrl}`;
  
  if (input.excerpt) {
    pageInfo += `\nexcerpt: ${smartTruncate(input.excerpt, 300)}`;
  }
  
  if (input.content && input.isReaderable !== false) {
    pageInfo += `\ncontent: ${smartTruncate(input.content, 500)}`;
  }
  
  if (input.metadata?.siteName) {
    pageInfo += `\nsite: ${input.metadata.siteName}`;
  }

  if (language === 'en') {
    return `Please analyze the following web content and generate an optimized title and summary:

Page Information:
${pageInfo}

Requirements:
1. title: Optimize the title, keep it concise and clear, preserve core information, max 50 characters
2. summary: One-sentence summary, objectively describe core content, max 200 characters`;
  }

  return `请分析以下网页内容，生成优化的标题和摘要：

网页信息：
${pageInfo}

要求：
1. title: 优化标题，简洁明了，保留核心信息，不超过50字
2. summary: 一句话摘要，客观描述核心内容，不超过200字`;
}

/**
 * 构建分类推荐的用户提示词
 */
function buildCategoryPrompt(input: AnalyzeBookmarkInput, language: AILanguage = 'auto'): string {
  const cleanUrl = input.url
    .replace(/\?.+$/, '')
    .replace(/[#&].*$/, '')
    .replace(/\/+$/, '');

  let pageInfo = `title: ${input.title}\nurl: ${cleanUrl}`;
  
  if (input.excerpt) {
    pageInfo += `\nexcerpt: ${smartTruncate(input.excerpt, 300)}`;
  }
  
  if (input.content && input.isReaderable !== false) {
    pageInfo += `\ncontent: ${smartTruncate(input.content, 300)}`;
  }

  let categoryContext = '';
  if (input.existingCategories && input.existingCategories.length > 0) {
    categoryContext = `\n用户已有分类: ${input.existingCategories.join(', ')}`;
  }

  if (language === 'en') {
    return `Please analyze the following web content and recommend the most suitable category:

Page Information:
${pageInfo}
${categoryContext ? categoryContext.replace('用户已有分类:', 'User existing categories:') : ''}

Requirements:
- [IMPORTANT] User category structure explanation:
  * Categories use hierarchical structure, format: "Parent > Child > Grandchild"
  * Example: "Technology > Programming > JavaScript" represents 3 levels
  * Return the complete category path (including all levels)
- [MANDATORY] Must prioritize exact match from user's existing categories:
  * Carefully compare page content with each category's semantics
  * Prefer the most specific subcategory over broad parent categories
  * If multiple categories fit, choose the most precise match
- [New category rules] Only when no existing category applies:
  * Do not create standalone top-level categories
  * Must extend based on existing category tree structure
  * Analyze existing categories to find the most relevant parent or sibling
  * Add new subcategory under appropriate level`;
  }

  return `请分析以下网页内容，推荐最合适的分类：

网页信息：
${pageInfo}
${categoryContext}

要求：
- 【重要】用户已有分类说明：
  * 分类采用层级结构，格式为 "父分类 > 子分类 > 孙分类"
  * 例如 "技术 > 编程语言 > JavaScript" 表示三级分类
  * 请返回完整的分类路径（包含所有层级）
- 【强制要求】必须优先从用户已有分类中精确匹配：
  * 仔细对比网页内容与每个分类的语义
  * 优先选择最具体的子分类，而非宽泛的父分类
  * 如果有多个合适的分类，选择最精确匹配的那个
- 【推荐新分类规则】仅当用户已有分类完全不适用时：
  * 禁止创建独立的顶级分类
  * 必须基于已有分类树结构扩展
  * 分析已有分类，找到最相关的父分类或同级分类
  * 在合适的层级下添加新的子分类`;
}

/**
 * 构建标签推荐的用户提示词
 */
function buildTagsPrompt(input: AnalyzeBookmarkInput, language: AILanguage = 'auto'): string {
  const cleanUrl = input.url
    .replace(/\?.+$/, '')
    .replace(/[#&].*$/, '')
    .replace(/\/+$/, '');

  let pageInfo = `title: ${input.title}\nurl: ${cleanUrl}`;
  
  if (input.excerpt) {
    pageInfo += `\nexcerpt: ${smartTruncate(input.excerpt, 300)}`;
  }
  
  if (input.metadata?.keywords) {
    pageInfo += `\nkeywords: ${input.metadata.keywords.slice(0, 300)}`;
  }
  
  if (input.content && input.isReaderable !== false) {
    pageInfo += `\ncontent: ${smartTruncate(input.content, 300)}`;
  }

  let tagContext = '';
  if (input.presetTags && input.presetTags.length > 0) {
    tagContext = `\n预设标签: ${input.presetTags.slice(0, 20).join(', ')}`;
  }

  // 构建已有标签上下文（用于去重）
  let existingTagsContext = '';
  if (input.existingTags && input.existingTags.length > 0) {
    existingTagsContext = `\n用户已有标签: ${input.existingTags.slice(0, 50).join(', ')}`;
  }

  if (language === 'en') {
    return `Please analyze the following web content and generate 3-5 relevant tags:

Page Information:
${pageInfo}
${tagContext ? tagContext.replace('预设标签:', 'Preset tags:') : ''}
${existingTagsContext ? existingTagsContext.replace('用户已有标签:', 'User existing tags:') : ''}

Requirements:
- Concise: Max 2-3 words each
- Accurate: Reflect the page's core themes
- Diverse: Cover site/domain/specific content
- Prefer selecting from preset tags
- [IMPORTANT] Avoid semantic duplicates with existing tags:
  * If "Frontend Development" exists, don't generate "Frontend", "Web Dev", etc.
  * Prefer reusing existing tags, only create new ones for truly new concepts`;
  }

  return `请分析以下网页内容，生成3-5个相关标签：

网页信息：
${pageInfo}
${tagContext}
${existingTagsContext}

要求：
- 简洁：中文2-5字，英文不超过2个单词
- 准确：反映网页核心主题
- 多样：涵盖网站/领域/具体内容
- 优先从预设标签中选择
- 【重要】避免与用户已有标签语义重复：
  * 如已有"前端开发"，则不要生成"前端"、"Web开发"等相近标签
  * 优先复用已有标签，仅在确实需要新概念时才生成新标签`;
}

/**
 * 提供商默认配置
 */
interface ProviderConfig {
  baseUrl: string;
  models: string[];
  requiresApiKey: boolean;
}

const PROVIDER_DEFAULTS: Record<string, ProviderConfig> = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
    requiresApiKey: true,
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com',
    models: ['claude-3-5-haiku-latest', 'claude-3-5-sonnet-latest', 'claude-3-opus-latest'],
    requiresApiKey: true,
  },
  google: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    models: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash', 'gemini-1.5-pro'],
    requiresApiKey: true,
  },
  azure: {
    baseUrl: '', // 用户必须提供
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-35-turbo'],
    requiresApiKey: true,
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    requiresApiKey: true,
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    requiresApiKey: true,
  },
  mistral: {
    baseUrl: 'https://api.mistral.ai/v1',
    models: ['mistral-small-latest', 'mistral-medium-latest', 'mistral-large-latest', 'open-mistral-7b'],
    requiresApiKey: true,
  },
  moonshot: {
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
    requiresApiKey: true,
  },
  zhipu: {
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4-long'],
    requiresApiKey: true,
  },
  hunyuan: {
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
    models: ['hunyuan-lite', 'hunyuan-standard', 'hunyuan-pro', 'hunyuan-turbo'],
    requiresApiKey: true,
  },
  nvidia: {
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    models: ['meta/llama-3.1-8b-instruct', 'meta/llama-3.1-70b-instruct', 'nvidia/llama-3.1-nemotron-70b-instruct'],
    requiresApiKey: true,
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen2.5-72B-Instruct', 'deepseek-ai/DeepSeek-V3', 'Pro/deepseek-ai/DeepSeek-R1'],
    requiresApiKey: true,
  },
  ollama: {
    baseUrl: 'http://localhost:11434/v1',
    models: ['llama3.2', 'llama3.1', 'mistral', 'qwen2.5', 'phi3'],
    requiresApiKey: false,
  },
  custom: {
    baseUrl: '',
    models: ['gpt-4o-mini'],
    requiresApiKey: true,
  },
};

/**
 * 创建语言模型实例
 */
function createLanguageModel(config: AIClientConfig): LanguageModelV1 {
  const { provider, apiKey, baseUrl, model } = config;
  const defaults = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.custom;

  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: apiKey || '',
        baseURL: baseUrl || defaults.baseUrl,
      });
      return anthropic(model || defaults.models[0]);
    }

    case 'ollama': {
      // Ollama 兼容 OpenAI API，不需要真实的 API key
      const ollama = createOpenAI({
        baseURL: baseUrl || defaults.baseUrl,
        apiKey: 'ollama',
      });
      return ollama(model || defaults.models[0]);
    }

    // 所有其他提供商都兼容 OpenAI API
    case 'openai':
    case 'google':
    case 'azure':
    case 'deepseek':
    case 'groq':
    case 'mistral':
    case 'moonshot':
    case 'zhipu':
    case 'hunyuan':
    case 'nvidia':
    case 'siliconflow':
    case 'custom':
    default: {
      const openai = createOpenAI({
        apiKey: apiKey || '',
        baseURL: baseUrl || defaults.baseUrl,
      });
      return openai(model || defaults.models[0]);
    }
  }
}

/**
 * Token 使用量类型
 */
interface TokenUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * 日志打印辅助函数
 */
function logRequest(debug: boolean, taskName: string, params: { system?: string; prompt: string }) {
  if (!debug) return;
  logger.info(`[${taskName}] Request:`, {
    system: params.system?.slice(0, 200) + (params.system && params.system.length > 200 ? '...' : ''),
    prompt: params.prompt.slice(0, 500) + (params.prompt.length > 500 ? '...' : ''),
  });
}

function logResponse(debug: boolean, taskName: string, result: unknown, usage?: TokenUsage) {
  if (!debug) return;
  logger.info(`[${taskName}] Response:`, result);
  if (usage) {
    logger.info(`[${taskName}] Token Usage:`, {
      prompt: usage.promptTokens ?? 0,
      completion: usage.completionTokens ?? 0,
      total: usage.totalTokens ?? 0,
    });
  }
}

/**
 * 创建 AI 客户端
 */
export function createAIClient(config: AIClientConfig): AIClient {
  const model = createLanguageModel(config);
  const { temperature = 0.3, maxTokens = 1000, debug = false, language = 'auto' } = config;

  /**
   * 单任务模式：一次性生成所有内容
   */
  async function analyzeBookmarkSingle(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult> {
    const userMessage = buildUserPrompt(input, language);
    const systemPrompt = getBookmarkAnalysisSystemPrompt(language);

    logRequest(debug, 'analyzeBookmarkSingle', {
      system: systemPrompt,
      prompt: userMessage,
    });

    try {
      const { object, usage } = await generateObject({
        model,
        schema: BookmarkAnalysisSchema,
        system: systemPrompt,
        prompt: userMessage,
        temperature,
        maxTokens,
      });

      const result = {
        title: object.title || input.title || '未命名书签',
        summary: object.summary || '',
        category: object.category || '未分类',
        tags: cleanTags(object.tags || []),
      };

      logResponse(debug, 'analyzeBookmarkSingle', result, usage);

      return result;
    } catch (error) {
      logger.error('AI analysis failed:', error);
      return getFallbackResult(input);
    }
  }

  /**
   * 分批任务模式：三个独立 AI 任务并行执行
   */
  async function analyzeBookmarkBatch(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult> {
    const titleSummaryPrompt = buildTitleSummaryPrompt(input, language);
    const categoryPrompt = buildCategoryPrompt(input, language);
    const tagsPrompt = buildTagsPrompt(input, language);
    
    const titleSummarySystemPrompt = getTitleSummarySystemPrompt(language);
    const categorySystemPrompt = getCategorySystemPrompt(language);
    const tagsSystemPrompt = getTagsSystemPrompt(language);

    if(debug) {
      logger.info('AnalyzeBookmarkInput:', input);
      logRequest(debug, 'TitleSummary', { system: titleSummarySystemPrompt, prompt: titleSummaryPrompt });
      logRequest(debug, 'Category', { system: categorySystemPrompt, prompt: categoryPrompt });
      logRequest(debug, 'Tags', { system: tagsSystemPrompt, prompt: tagsPrompt });
    }

    try {
      // 并行执行三个独立任务
      const [titleSummaryResult, categoryResult, tagsResult] = await Promise.all([
        // 任务1：生成标题与摘要
        generateObject({
          model,
          schema: TitleSummarySchema,
          system: titleSummarySystemPrompt,
          prompt: titleSummaryPrompt,
          temperature,
          maxTokens: 400,
        }).then(res => {
          logResponse(debug, 'TitleSummary', res.object, res.usage);
          return res;
        }).catch(error => {
          logger.error('Title/Summary generation failed:', error);
          return { object: { title: input.title || '未命名书签', summary: '' }, usage: undefined };
        }),

        // 任务2：生成推荐分类
        generateObject({
          model,
          schema: CategorySchema,
          system: categorySystemPrompt,
          prompt: categoryPrompt,
          temperature,
          maxTokens: 300,
        }).then(res => {
          logResponse(debug, 'Category', res.object, res.usage);
          return res;
        }).catch(error => {
          logger.error('Category generation failed:', error);
          return { object: { category: '未分类' }, usage: undefined };
        }),

        // 任务3：生成推荐标签
        generateObject({
          model,
          schema: TagsSchema,
          system: tagsSystemPrompt,
          prompt: tagsPrompt,
          temperature,
          maxTokens: 300,
        }).then(res => {
          logResponse(debug, 'Tags', res.object, res.usage);
          return res;
        }).catch(error => {
          logger.error('Tags generation failed:', error);
          return { object: { tags: [] }, usage: undefined };
        }),
      ]);

      const result = {
        title: titleSummaryResult.object.title || input.title || '未命名书签',
        summary: titleSummaryResult.object.summary || '',
        category: categoryResult.object.category || '未分类',
        tags: cleanTags(tagsResult.object.tags || []),
      };

      // 汇总 token 使用量
      if (debug) {
        const totalUsage = {
          promptTokens: (titleSummaryResult.usage?.promptTokens ?? 0) + 
                       (categoryResult.usage?.promptTokens ?? 0) + 
                       (tagsResult.usage?.promptTokens ?? 0),
          completionTokens: (titleSummaryResult.usage?.completionTokens ?? 0) + 
                           (categoryResult.usage?.completionTokens ?? 0) + 
                           (tagsResult.usage?.completionTokens ?? 0),
          totalTokens: (titleSummaryResult.usage?.totalTokens ?? 0) + 
                      (categoryResult.usage?.totalTokens ?? 0) + 
                      (tagsResult.usage?.totalTokens ?? 0),
        };
        logger.info('[analyzeBookmarkBatch] Total Token Usage:', totalUsage);
      }

      return result;
    } catch (error) {
      logger.error('AI batch analysis failed:', error);
      return getFallbackResult(input);
    }
  }

  return {
    async analyzeBookmark(input: AnalyzeBookmarkInput): Promise<BookmarkAnalysisResult> {
      // 根据全局配置决定使用哪种模式
      if (AI_BATCH_MODE) {
        return analyzeBookmarkBatch(input);
      }
      return analyzeBookmarkSingle(input);
    },
  };
}

/**
 * 清理标签（参考 SmartBookmark）
 */
function cleanTags(tags: string[]): string[] {
  return tags
    .map(tag => tag.trim())
    .filter(tag => {
      if (!tag) return false;
      // 计算视觉长度（中文算2个单位）
      let length = 0;
      for (const char of tag) {
        if (/[\u4e00-\u9fa5]/.test(char)) {
          length += 2;
        } else {
          length += 1;
        }
      }
      // 长度在 2-20 之间
      return length >= 2 && length <= 20;
    })
    .filter((tag, index, self) => self.indexOf(tag) === index) // 去重
    .slice(0, 5);
}

/**
 * AI 失败时的降级策略（参考 SmartBookmark 的 getFallbackTags）
 */
function getFallbackResult(input: AnalyzeBookmarkInput): BookmarkAnalysisResult {
  const tags: string[] = [];
  
  // 1. 尝试从 keywords 提取
  if (input.metadata?.keywords) {
    const keywordTags = input.metadata.keywords
      .split(/[,，;；]/)
      .map(t => t.trim())
      .filter(t => t.length >= 1 && t.length <= 20)
      .slice(0, 3);
    tags.push(...keywordTags);
  }
  
  // 2. 从标题提取关键词
  if (tags.length < 3 && input.title) {
    const stopWords = new Set(['的', '了', '和', '与', 'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for']);
    const titleWords = input.title
      .split(/[\s\-\_\,\.\。\，\|]+/)
      .map(w => w.trim())
      .filter(w => w.length >= 2 && w.length <= 20 && !stopWords.has(w.toLowerCase()));
    tags.push(...titleWords.slice(0, 3 - tags.length));
  }
  
  return {
    title: input.title || '未命名书签',
    summary: input.excerpt || input.metadata?.description || '',
    category: '未分类',
    tags: [...new Set(tags)].slice(0, 5),
  };
}

/**
 * 扩展 AI 客户端 - 提供更多功能
 */
export function createExtendedAIClient(config: AIClientConfig) {
  const model = createLanguageModel(config);
  const { temperature = 0.3, maxTokens = 1000, debug = false } = config;
  const baseClient = createAIClient(config);
  const { language = 'zh' } = config;

  return {
    ...baseClient,

    /**
     * 推荐标签
     */
    async suggestTags(input: {
      url: string;
      title: string;
      content: string;
      existingTags: string[];
    }): Promise<TagSuggestionResult[]> {
      const prompt = language === 'en'
        ? `Please recommend 3-5 relevant tags for the following webpage.

URL: ${input.url}
Title: ${input.title}
Content summary: ${input.content.slice(0, 500)}

Requirements:
1. Tags should be concise, accurate, and distinctive
2. Use English for tags, except for proper nouns`
        : `请为以下网页推荐 3-5 个相关标签。

URL: ${input.url}
标题: ${input.title}
内容摘要: ${input.content.slice(0, 500)}

要求:
1. 标签应简洁、准确、有辨识度
2. 标签应该是中文，除非是专有名词（如 React, GitHub）`;

      logRequest(debug, 'suggestTags', { prompt });

      try {
        const { object } = await generateObject({
          model,
          schema: TagSuggestionsSchema,
          prompt,
          temperature,
          maxTokens: 500,
        });

        logResponse(debug, 'suggestTags', object);

        return object;
      } catch (error) {
        logger.error('Tag suggestion failed:', error);
        return [];
      }
    },

    /**
     * 推荐分类
     */
    async suggestCategory(input: {
      url: string;
      title: string;
      content: string;
      userCategories: string[];
    }): Promise<CategorySuggestionResult[]> {
      const prompt = language === 'en'
        ? `Please recommend the most suitable category for the following webpage.

URL: ${input.url}
Title: ${input.title}
Content summary: ${input.content.slice(0, 500)}

User's existing categories: ${input.userCategories.join(', ') || 'None'}

Requirements:
1. Prioritize selecting from user's existing categories
2. Return 1-2 most suitable categories`
        : `请为以下网页推荐最合适的分类。

URL: ${input.url}
标题: ${input.title}
内容摘要: ${input.content.slice(0, 500)}

用户已有分类: ${input.userCategories.join(', ') || '无'}

要求:
1. 优先从用户已有分类中选择
2. 返回 1-2 个最合适的分类`;

      logRequest(debug, 'suggestCategory', { prompt });

      try {
        const { object } = await generateObject({
          model,
          schema: CategorySuggestionsSchema,
          prompt,
          temperature,
          maxTokens: 500,
        });

        logResponse(debug, 'suggestCategory', object);

        return object;
      } catch (error) {
        logger.error('Category suggestion failed:', error);
        return [];
      }
    },

    /**
     * 翻译文本
     */
    async translate(text: string, targetLang: 'zh' | 'en' = 'zh'): Promise<string> {
      const langName = targetLang === 'zh' ? '中文' : 'English';
      const prompt = `请将以下文本翻译成${langName}，只返回翻译结果，不要包含其他内容：

${text}`;

      logRequest(debug, 'translate', { prompt });

      try {
        const { text: result } = await generateText({
          model,
          prompt,
          temperature: 0.3,
          maxTokens: 500,
        });

        logResponse(debug, 'translate', result.trim());

        return result.trim();
      } catch (error) {
        logger.error('Translation failed:', error);
        return text;
      }
    },

    /**
     * 原始文本生成（用于自定义 prompt）
     */
    async generateRaw(prompt: string): Promise<string> {
      logRequest(debug, 'generateRaw', { prompt });

      try {
        const { text } = await generateText({
          model,
          prompt,
          temperature,
          maxTokens,
        });

        logResponse(debug, 'generateRaw', text);

        return text;
      } catch (error) {
        logger.error('Raw generation failed:', error);
        throw error;
      }
    },

    /**
     * 根据用户描述生成分类方案
     */
    async generateCategories(description: string): Promise<GeneratedCategory[]> {
      const prompt = language === 'en'
        ? `You are a professional information architect skilled at designing personalized bookmark categorization systems.

User's description:
${description}

Please generate a personalized bookmark categorization system based on the user's description.

Important: Automatically detect the language used in the user's description and use the exact same language for all category names. For example:
- User describes in English → Category names in English
- User describes in Chinese → Category names in Chinese

Requirements:
1. Moderate number of categories (3-8 top-level categories)
2. Support hierarchical structure (up to 3 levels)
3. Category names should be concise (2-8 words)
4. Categories should not overlap
5. Cover all scenarios described by the user

Output format example:
{
  "categories": [
    {
      "name": "Technology",
      "children": [
        { "name": "Frontend Development" },
        { "name": "Backend Development" }
      ]
    },
    {
      "name": "Design Resources",
      "children": [
        { "name": "UI Design" },
        { "name": "Icon Libraries" }
      ]
    }
  ]
}

Please return in the above JSON format, including the "categories" field.`
        : `你是一个专业的信息架构师，擅长为用户设计个性化的书签分类系统。

用户需求描述：
${description}

请根据用户的描述，生成一套个性化的书签分类系统。

重要：请自动检测用户描述使用的语言（中文、英文、日文等），并使用完全相同的语言输出所有分类名称。例如：
- 用户用中文描述 → 分类名用中文
- 用户用英文描述 → 分类名用英文

要求：
1. 分类数量适中（3-8个一级分类）
2. 支持层级结构（最多3层）
3. 分类名称简洁明了（2-8个字）
4. 分类之间不重叠
5. 覆盖用户描述的所有需求场景

输出格式示例：
{
  "categories": [
    {
      "name": "技术资源",
      "children": [
        { "name": "前端开发" },
        { "name": "后端开发" }
      ]
    },
    {
      "name": "设计素材",
      "children": [
        { "name": "UI设计" },
        { "name": "图标库" }
      ]
    }
  ]
}

请务必按照上述 JSON 格式返回，包含 "categories" 字段。`;

      logRequest(debug, 'generateCategories', { prompt });

      try {
        const { object } = await generateObject({
          model,
          schema: GeneratedCategoriesSchema,
          prompt,
          temperature: 0.5,
          maxTokens: 1500,
        });

        // 从包装对象中提取 categories 数组
        const result = (object as any).categories || [];

        logResponse(debug, 'generateCategories', result);
        
        return result;
      } catch (error) {
        logger.error('Category generation failed:', error);
        throw error;
      }
    },
  };
}

/**
 * 获取默认模型名称（第一个模型）
 */
export function getDefaultModel(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.models[0] || 'gpt-4o-mini';
}

/**
 * 获取提供商支持的所有模型列表
 */
export function getProviderModels(provider: AIProvider): string[] {
  return PROVIDER_DEFAULTS[provider]?.models || ['gpt-4o-mini'];
}

/**
 * 获取提供商默认 Base URL
 */
export function getDefaultBaseUrl(provider: AIProvider): string {
  return PROVIDER_DEFAULTS[provider]?.baseUrl || '';
}

/**
 * 检查提供商是否需要 API Key
 */
export function requiresApiKey(provider: AIProvider): boolean {
  return PROVIDER_DEFAULTS[provider]?.requiresApiKey ?? true;
}
