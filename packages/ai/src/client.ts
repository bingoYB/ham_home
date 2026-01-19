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
 * 获取语言指令
 */
function getLanguageInstruction(language: AILanguage): string {
  switch (language) {
    case 'zh':
      return '请使用中文输出所有结果。';
    case 'en':
      return 'Please output all results in English.';
    case 'auto':
    default:
      return '请根据网页内容的主要语言输出结果（中文内容用中文，英文内容用英文）。';
  }
}

/**
 * 系统提示词 - 用于书签分析（完整模式）
 * 参考 SmartBookmark 的提示词设计，强调结构化输出和约束
 */
function getBookmarkAnalysisSystemPrompt(language: AILanguage): string {
  const langInstruction = getLanguageInstruction(language);
  return `你是一个专业的网页内容分析专家，擅长提取文章的核心主题并生成准确的元数据。

你的任务是分析网页内容，一次性生成以下所有信息：
1. title: 优化后的标题
2. summary: 一句话摘要
3. category: 推荐分类
4. tags: 相关标签

${langInstruction}

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 生成标题与摘要
 */
function getTitleSummarySystemPrompt(language: AILanguage): string {
  const langInstruction = getLanguageInstruction(language);
  return `你是一个专业的网页内容分析专家，擅长提取文章的核心主题。

你的任务是分析网页内容，生成：
1. title: 优化后的标题
2. summary: 一句话摘要

${langInstruction}

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 推荐分类
 */
function getCategorySystemPrompt(language: AILanguage): string {
  const langInstruction = getLanguageInstruction(language);
  return `你是一个专业的信息分类专家，擅长为内容匹配最合适的分类。

你的任务是分析网页内容，推荐一个最合适的分类。

${langInstruction}

请严格按照输出格式要求返回结果。`;
}

/**
 * 系统提示词 - 推荐标签
 */
function getTagsSystemPrompt(language: AILanguage): string {
  const langInstruction = getLanguageInstruction(language);
  return `你是一个专业的关键词提取专家，擅长为内容生成精准的标签。

你的任务是分析网页内容，生成3-5个相关标签。

${langInstruction}

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

  return `请分析以下网页内容，生成书签元数据：

网页信息：
${pageInfo}
${categoryContext}
${tagContext}

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
   - 优先从预设标签中选择，避免重复

${getLanguageInstruction(language)}`;
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

  return `请分析以下网页内容，生成优化的标题和摘要：

网页信息：
${pageInfo}

要求：
1. title: 优化标题，简洁明了，保留核心信息，不超过50字
2. summary: 一句话摘要，客观描述核心内容，不超过200字

${getLanguageInstruction(language)}`;
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
  * 在合适的层级下添加新的子分类

${getLanguageInstruction(language)}`;
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

  return `请分析以下网页内容，生成3-5个相关标签：

网页信息：
${pageInfo}
${tagContext}

要求：
- 简洁：中文2-5字，英文不超过2个单词
- 准确：反映网页核心主题
- 多样：涵盖网站/领域/具体内容
- 优先从预设标签中选择，避免重复

${getLanguageInstruction(language)}`;
}

/**
 * 创建语言模型实例
 */
function createLanguageModel(config: AIClientConfig): LanguageModelV1 {
  const { provider, apiKey, baseUrl, model } = config;

  switch (provider) {
    case 'openai':
    case 'custom': {
      const openai = createOpenAI({
        apiKey: apiKey || '',
        baseURL: baseUrl || 'https://api.openai.com/v1',
      });
      return openai(model || 'gpt-3.5-turbo');
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: apiKey || '',
        baseURL: baseUrl,
      });
      return anthropic(model || 'claude-3-haiku-20240307');
    }

    case 'ollama': {
      // Ollama 兼容 OpenAI API
      const ollama = createOpenAI({
        baseURL: baseUrl || 'http://localhost:11434/v1',
        apiKey: 'ollama', // Ollama 不需要真实的 API key
      });
      return ollama(model || 'llama3');
    }

    default:
      throw new Error(`Unsupported provider: ${provider}`);
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
      const prompt = `请为以下网页推荐 3-5 个相关标签。

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
      const prompt = `请为以下网页推荐最合适的分类。

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
      const prompt = `你是一个专业的信息架构师，擅长为用户设计个性化的书签分类系统。

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
 * 获取默认模型名称
 */
export function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case 'openai':
      return 'gpt-3.5-turbo';
    case 'anthropic':
      return 'claude-3-haiku-20240307';
    case 'ollama':
      return 'llama3';
    case 'custom':
      return 'gpt-3.5-turbo';
    default:
      return 'gpt-3.5-turbo';
  }
}
