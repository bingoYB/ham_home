/**
 * Query Planner
 * 将用户自然语言输入解析为结构化检索请求
 */
import type {
  SearchRequest,
  SearchFilters,
  ConversationIntent,
  ConversationState,
  LocalCategory,
} from '@/types';
import { configStorage, bookmarkStorage } from '@/lib/storage';
import { createExtendedAIClient, getDefaultModel } from '@hamhome/ai';
import { createLogger } from '@hamhome/utils';
import { z } from 'zod';

const logger = createLogger({ namespace: 'QueryPlanner' });

/**
 * Search Request Schema（用于 AI 结构化输出）
 */
const SearchRequestSchema = z.object({
  intent: z.enum(['find', 'summarize', 'compare', 'qa']).describe('用户意图'),
  query: z.string().describe('提取的核心查询文本'),
  filters: z.object({
    categoryId: z.string().nullable().optional().describe('分类 ID'),
    tagsAny: z.array(z.string()).optional().describe('标签过滤（任一匹配）'),
    domain: z.string().nullable().optional().describe('域名过滤'),
    timeRangeDays: z.number().nullable().optional().describe('时间范围（天数）'),
    semantic: z.boolean().optional().describe('是否使用语义搜索'),
  }).describe('过滤条件'),
  topK: z.number().min(1).max(50).describe('返回结果数量'),
});

/**
 * Query Planner 系统提示词
 */
function getSystemPrompt(language: 'zh' | 'en'): string {
  if (language === 'en') {
    return `You are a search query parser. Your task is to convert natural language queries into structured search requests.

Rules:
1. Extract the core search query from user input
2. Identify search intent: find (search bookmarks), summarize (summarize results), compare (compare bookmarks), qa (answer questions)
3. Extract filter conditions: category, tags, domain, time range
4. Determine if semantic search should be used (recommended for conceptual/fuzzy queries)
5. Set appropriate topK based on intent (find: 20, summarize: 10, compare: 5, qa: 15)

Time range keywords:
- "recent", "lately", "this week" -> 7 days
- "this month" -> 30 days
- "this year" -> 365 days

Output JSON only, no explanations.`;
  }
  
  return `你是一个搜索查询解析器。你的任务是将自然语言查询转换为结构化搜索请求。

规则：
1. 从用户输入中提取核心搜索查询
2. 识别搜索意图：find（搜索书签）、summarize（总结结果）、compare（对比书签）、qa（回答问题）
3. 提取过滤条件：分类、标签、域名、时间范围
4. 判断是否应该使用语义搜索（推荐用于概念性/模糊查询）
5. 根据意图设置合适的 topK（find: 20, summarize: 10, compare: 5, qa: 15）

时间范围关键词：
- "最近"、"近期"、"这周" -> 7 天
- "这个月"、"本月" -> 30 天
- "今年"、"这一年" -> 365 天

只输出 JSON，不需要解释。`;
}

/**
 * 构建用户提示词
 */
function buildUserPrompt(
  userInput: string,
  context: {
    categories?: LocalCategory[];
    existingTags?: string[];
    conversationState?: ConversationState;
  }
): string {
  const parts: string[] = [];
  
  parts.push(`用户输入: "${userInput}"`);
  
  if (context.categories && context.categories.length > 0) {
    const categoryList = context.categories.map(c => `${c.id}: ${c.name}`).join(', ');
    parts.push(`可用分类: ${categoryList}`);
  }
  
  if (context.existingTags && context.existingTags.length > 0) {
    parts.push(`已有标签: ${context.existingTags.slice(0, 20).join(', ')}`);
  }
  
  if (context.conversationState) {
    parts.push(`当前对话状态:`);
    parts.push(`- 已有查询: ${context.conversationState.query}`);
    parts.push(`- 已有过滤: ${JSON.stringify(context.conversationState.filters)}`);
    parts.push(`- 已展示结果数: ${context.conversationState.seenBookmarkIds.length}`);
  }
  
  return parts.join('\n');
}

/**
 * 基于规则的简单解析（备用方案）
 */
function parseWithRules(userInput: string): SearchRequest {
  const input = userInput.toLowerCase();
  
  // 意图检测
  let intent: ConversationIntent = 'find';
  if (input.includes('总结') || input.includes('summarize') || input.includes('概括')) {
    intent = 'summarize';
  } else if (input.includes('对比') || input.includes('compare') || input.includes('比较')) {
    intent = 'compare';
  } else if (input.includes('什么是') || input.includes('如何') || input.includes('怎么') || 
             input.includes('what') || input.includes('how') || input.includes('why')) {
    intent = 'qa';
  }
  
  // 时间范围检测
  let timeRangeDays: number | null = null;
  if (input.includes('最近') || input.includes('近期') || input.includes('这周') || input.includes('recent')) {
    timeRangeDays = 7;
  } else if (input.includes('这个月') || input.includes('本月') || input.includes('this month')) {
    timeRangeDays = 30;
  } else if (input.includes('今年') || input.includes('这一年') || input.includes('this year')) {
    timeRangeDays = 365;
  }
  
  // 语义搜索判断（概念性查询推荐使用）
  const semantic = intent === 'qa' || 
    input.includes('类似') || 
    input.includes('相关') || 
    input.includes('关于') ||
    input.includes('similar') ||
    input.includes('related') ||
    input.includes('about');
  
  // 清理查询文本
  let query = userInput
    .replace(/最近|近期|这周|这个月|本月|今年|这一年/g, '')
    .replace(/recent|this week|this month|this year/gi, '')
    .replace(/找|搜索|查找|search|find/gi, '')
    .trim();
  
  if (!query) {
    query = userInput;
  }
  
  // 设置 topK
  const topKMap: Record<ConversationIntent, number> = {
    find: 20,
    summarize: 10,
    compare: 5,
    qa: 15,
  };
  
  return {
    intent,
    query,
    filters: {
      timeRangeDays,
      semantic,
    },
    topK: topKMap[intent],
  };
}

/**
 * Query Planner 类
 */
class QueryPlanner {
  /**
   * 解析用户输入为结构化搜索请求
   */
  async parse(
    userInput: string,
    context: {
      categories?: LocalCategory[];
      existingTags?: string[];
      conversationState?: ConversationState;
    } = {}
  ): Promise<SearchRequest> {
    // 尝试使用 AI 解析
    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();
      
      // 检查 AI 是否可用
      if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
        logger.debug('AI not configured, using rule-based parsing');
        return parseWithRules(userInput);
      }
      
      const client = createExtendedAIClient({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.1, // 低温度保证一致性
        maxTokens: 500,
        language: settings.language,
      });
      
      const systemPrompt = getSystemPrompt(settings.language);
      const userPrompt = buildUserPrompt(userInput, context);
      
      logger.debug('Parsing with AI', { userInput: userInput.slice(0, 100) });
      
      const result = await client.generateObject({
        schema: SearchRequestSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });
      
      logger.debug('AI parsing result', { result });
      
      return {
        intent: result.intent,
        query: result.query,
        filters: {
          categoryId: result.filters.categoryId ?? undefined,
          tagsAny: result.filters.tagsAny,
          domain: result.filters.domain ?? undefined,
          timeRangeDays: result.filters.timeRangeDays ?? undefined,
          semantic: result.filters.semantic,
        },
        topK: result.topK,
      };
    } catch (error) {
      logger.warn('AI parsing failed, falling back to rules', error);
      return parseWithRules(userInput);
    }
  }
  
  /**
   * 基于对话状态更新搜索请求
   */
  mergeWithState(
    request: SearchRequest,
    state: ConversationState
  ): SearchRequest {
    // 合并过滤条件（新条件优先）
    const mergedFilters: SearchFilters = {
      ...state.filters,
      ...request.filters,
    };
    
    // 如果新请求没有指定某个过滤条件，保留旧状态的
    if (request.filters.categoryId === undefined && state.filters.categoryId) {
      mergedFilters.categoryId = state.filters.categoryId;
    }
    if (!request.filters.tagsAny?.length && state.filters.tagsAny?.length) {
      mergedFilters.tagsAny = state.filters.tagsAny;
    }
    if (request.filters.domain === undefined && state.filters.domain) {
      mergedFilters.domain = state.filters.domain;
    }
    if (request.filters.timeRangeDays === undefined && state.filters.timeRangeDays) {
      mergedFilters.timeRangeDays = state.filters.timeRangeDays;
    }
    
    return {
      ...request,
      filters: mergedFilters,
    };
  }
  
  /**
   * 快速规则解析（不调用 AI）
   */
  parseQuick(userInput: string): SearchRequest {
    return parseWithRules(userInput);
  }
}

// 导出单例
export const queryPlanner = new QueryPlanner();

// 导出工具函数
export { parseWithRules };
