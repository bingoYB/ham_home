/**
 * Chat Search Agent
 * 对话式搜索代理，负责检索编排和回答生成
 */
import type {
  LocalBookmark,
  LocalCategory,
  ConversationState,
  SearchRequest,
  SearchResult,
  ChatSearchResponse,
  ConversationIntent,
  SearchFilters,
} from '@/types';
import { queryPlanner } from './query-planner';
import { hybridRetriever } from './hybrid-retriever';
import { bookmarkStorage, configStorage } from '@/lib/storage';
import { createExtendedAIClient, getDefaultModel } from '@hamhome/ai';
import { createLogger } from '@hamhome/utils';
import { z } from 'zod';

const logger = createLogger({ namespace: 'ChatSearchAgent' });

/**
 * 最大短期记忆轮次
 */
const MAX_SHORT_MEMORY = 6;

/**
 * Answer Response Schema
 */
const AnswerResponseSchema = z.object({
  answer: z.string().max(500).describe('简洁的回答（1-5句话）'),
  nextSuggestions: z.array(z.string()).max(4).describe('建议的下一步操作（2-4个）'),
});

/**
 * 获取 Answer Writer 系统提示词
 */
function getAnswerSystemPrompt(language: 'zh' | 'en'): string {
  if (language === 'en') {
    return `You are a bookmark search assistant. Based on the user's query and search results, generate a concise answer.

Rules:
1. Only answer based on the provided sources, do not fabricate information
2. If no relevant sources found, honestly say "No relevant bookmarks found"
3. Keep answers brief (1-5 sentences)
4. When citing sources, use format [1], [2], etc.
5. Provide 2-4 actionable next step suggestions

Suggestions can be:
- Narrow down: "Only show last 30 days", "Filter by XX category"
- Expand: "Show more results", "Include related topics"
- Actions: "Open the first bookmark", "Compare these two"`;
  }
  
  return `你是一个书签搜索助手。基于用户的查询和搜索结果，生成简洁的回答。

规则：
1. 只基于提供的 sources 回答，不要编造信息
2. 如果没有找到相关结果，诚实地说"未找到相关书签"
3. 回答要简洁（1-5 句话）
4. 引用来源时使用格式 [1], [2] 等
5. 提供 2-4 个可执行的下一步建议

建议可以是：
- 缩小范围："只看最近 30 天"、"限定在 XX 分类"
- 扩大范围："显示更多结果"、"包含相关话题"
- 操作建议："打开第一条书签"、"对比这两个"`;
}

/**
 * 构建 Answer 上下文
 */
function buildAnswerContext(
  query: string,
  bookmarks: LocalBookmark[],
  categories: Map<string, LocalCategory>,
  intent: ConversationIntent
): string {
  const parts: string[] = [];
  
  parts.push(`用户查询: "${query}"`);
  parts.push(`搜索意图: ${intent}`);
  parts.push('');
  parts.push('搜索结果:');
  
  if (bookmarks.length === 0) {
    parts.push('(无结果)');
  } else {
    bookmarks.forEach((bookmark, index) => {
      const categoryName = bookmark.categoryId 
        ? categories.get(bookmark.categoryId)?.name || '未分类'
        : '未分类';
      
      parts.push(`[${index + 1}] ${bookmark.title}`);
      parts.push(`    URL: ${bookmark.url}`);
      parts.push(`    描述: ${bookmark.description.slice(0, 200)}`);
      parts.push(`    分类: ${categoryName}`);
      parts.push(`    标签: ${bookmark.tags.join(', ') || '无'}`);
      parts.push(`    保存时间: ${new Date(bookmark.createdAt).toLocaleDateString()}`);
      parts.push('');
    });
  }
  
  return parts.join('\n');
}

/**
 * 生成默认的下一步建议
 */
function getDefaultSuggestions(
  result: SearchResult,
  request: SearchRequest,
  hasMore: boolean
): string[] {
  const suggestions: string[] = [];
  
  // 基于结果状态
  if (result.items.length === 0) {
    suggestions.push('尝试其他关键词');
    if (request.filters.timeRangeDays) {
      suggestions.push('扩大时间范围');
    }
    if (!request.filters.semantic) {
      suggestions.push('使用语义搜索');
    }
  } else {
    if (hasMore) {
      suggestions.push('显示更多结果');
    }
    if (!request.filters.timeRangeDays) {
      suggestions.push('只看最近 30 天');
    }
    if (result.usedSemantic && result.usedKeyword) {
      suggestions.push('只看关键词匹配');
      suggestions.push('只看语义匹配');
    }
  }
  
  return suggestions.slice(0, 4);
}

/**
 * 创建初始对话状态
 */
export function createInitialState(): ConversationState {
  return {
    intent: 'find',
    query: '',
    filters: {},
    seenBookmarkIds: [],
    shortMemory: [],
  };
}

/**
 * Chat Search Agent 类
 */
class ChatSearchAgent {
  private categories: Map<string, LocalCategory> = new Map();
  
  /**
   * 加载分类数据
   */
  private async loadCategories(): Promise<void> {
    const categoryList = await bookmarkStorage.getCategories();
    this.categories.clear();
    for (const category of categoryList) {
      this.categories.set(category.id, category);
    }
  }
  
  /**
   * 执行对话式搜索
   */
  async search(
    userInput: string,
    state: ConversationState
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    await this.loadCategories();
    
    // 获取上下文
    const existingTags = await this.getExistingTags();
    const categoryList = Array.from(this.categories.values());
    
    // 解析用户输入
    const request = await queryPlanner.parse(userInput, {
      categories: categoryList,
      existingTags,
      conversationState: state.query ? state : undefined,
    });
    
    // 与现有状态合并
    const mergedRequest = state.query 
      ? queryPlanner.mergeWithState(request, state)
      : request;
    
    logger.debug('Search request', { mergedRequest });
    
    // 执行混合搜索
    const searchResult = await hybridRetriever.search(mergedRequest.query, {
      topK: mergedRequest.topK,
      filters: mergedRequest.filters,
      excludeIds: state.seenBookmarkIds,
      enableSemantic: mergedRequest.filters.semantic !== false,
      enableKeyword: true,
    });
    
    // 获取书签详情
    const bookmarkIds = searchResult.items.map(item => item.bookmarkId);
    const bookmarks = await this.getBookmarksByIds(bookmarkIds);
    
    // 按搜索结果顺序排序
    const sortedBookmarks = bookmarkIds
      .map(id => bookmarks.find(b => b.id === id))
      .filter((b): b is LocalBookmark => b !== undefined);
    
    // 生成回答
    const response = await this.generateAnswer(
      mergedRequest.query,
      sortedBookmarks,
      mergedRequest.intent,
      searchResult
    );
    
    // 更新状态
    const newState = this.updateState(state, userInput, response, mergedRequest, bookmarkIds);
    
    return {
      response,
      bookmarks: sortedBookmarks,
      searchResult,
      newState,
    };
  }
  
  /**
   * 生成回答
   */
  private async generateAnswer(
    query: string,
    bookmarks: LocalBookmark[],
    intent: ConversationIntent,
    searchResult: SearchResult
  ): Promise<ChatSearchResponse> {
    // 准备来源列表
    const sources = bookmarks.map(b => b.id);
    
    // 如果没有结果，返回默认回答
    if (bookmarks.length === 0) {
      return {
        answer: '未找到相关书签。您可以尝试其他关键词，或者扩大搜索范围。',
        sources: [],
        nextSuggestions: getDefaultSuggestions(searchResult, { intent, query, filters: {}, topK: 20 }, false),
      };
    }
    
    try {
      const aiConfig = await configStorage.getAIConfig();
      const settings = await configStorage.getSettings();
      
      // 检查 AI 是否可用
      if (!aiConfig.apiKey && aiConfig.provider !== 'ollama') {
        return this.generateRuleBasedAnswer(bookmarks, sources, searchResult);
      }
      
      const client = createExtendedAIClient({
        provider: aiConfig.provider,
        apiKey: aiConfig.apiKey,
        baseUrl: aiConfig.baseUrl,
        model: aiConfig.model || getDefaultModel(aiConfig.provider),
        temperature: 0.3,
        maxTokens: 600,
        language: settings.language,
      });
      
      const systemPrompt = getAnswerSystemPrompt(settings.language);
      const userPrompt = buildAnswerContext(query, bookmarks, this.categories, intent);
      
      logger.debug('Generating answer with AI');
      
      const result = await client.generateObject({
        schema: AnswerResponseSchema,
        system: systemPrompt,
        prompt: userPrompt,
      });
      
      return {
        answer: result.answer,
        sources,
        nextSuggestions: result.nextSuggestions.length > 0 
          ? result.nextSuggestions 
          : getDefaultSuggestions(searchResult, { intent, query, filters: {}, topK: 20 }, bookmarks.length >= 20),
      };
    } catch (error) {
      logger.warn('AI answer generation failed, using rule-based', error);
      return this.generateRuleBasedAnswer(bookmarks, sources, searchResult);
    }
  }
  
  /**
   * 基于规则生成回答（备用方案）
   */
  private generateRuleBasedAnswer(
    bookmarks: LocalBookmark[],
    sources: string[],
    searchResult: SearchResult
  ): ChatSearchResponse {
    const count = bookmarks.length;
    let answer: string;
    
    if (count === 1) {
      answer = `找到 1 条相关书签：${bookmarks[0].title}`;
    } else if (count <= 5) {
      answer = `找到 ${count} 条相关书签：${bookmarks.map(b => b.title).join('、')}`;
    } else {
      answer = `找到 ${count} 条相关书签。最相关的是：${bookmarks.slice(0, 3).map(b => b.title).join('、')} 等。`;
    }
    
    return {
      answer,
      sources,
      nextSuggestions: getDefaultSuggestions(searchResult, { intent: 'find', query: '', filters: {}, topK: 20 }, count >= 20),
    };
  }
  
  /**
   * 更新对话状态
   */
  private updateState(
    oldState: ConversationState,
    userInput: string,
    response: ChatSearchResponse,
    request: SearchRequest,
    newBookmarkIds: string[]
  ): ConversationState {
    // 更新短期记忆
    const shortMemory = [
      ...oldState.shortMemory,
      { role: 'user' as const, text: userInput },
      { role: 'assistant' as const, text: response.answer },
    ];
    
    // 保持最大轮次
    while (shortMemory.length > MAX_SHORT_MEMORY * 2) {
      shortMemory.shift();
    }
    
    // 更新已展示的书签 ID
    const seenBookmarkIds = [...new Set([...oldState.seenBookmarkIds, ...newBookmarkIds])];
    
    return {
      intent: request.intent,
      query: request.query,
      filters: request.filters,
      seenBookmarkIds,
      shortMemory,
      longMemorySummary: oldState.longMemorySummary,
    };
  }
  
  /**
   * 获取已有标签列表
   */
  private async getExistingTags(): Promise<string[]> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet);
  }
  
  /**
   * 根据 ID 列表获取书签
   */
  private async getBookmarksByIds(ids: string[]): Promise<LocalBookmark[]> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const idSet = new Set(ids);
    return bookmarks.filter(b => idSet.has(b.id));
  }
  
  /**
   * 执行"继续查找"操作
   */
  async continueSearch(state: ConversationState): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    return this.search('继续查找更多', state);
  }
  
  /**
   * 应用建议的过滤条件
   */
  async applyFilter(
    filterUpdate: Partial<SearchFilters>,
    state: ConversationState
  ): Promise<{
    response: ChatSearchResponse;
    bookmarks: LocalBookmark[];
    searchResult: SearchResult;
    newState: ConversationState;
  }> {
    // 更新过滤条件
    const updatedState: ConversationState = {
      ...state,
      filters: { ...state.filters, ...filterUpdate },
      seenBookmarkIds: [], // 重置已展示列表
    };
    
    // 构建描述性查询
    let filterDesc = '';
    if (filterUpdate.timeRangeDays) {
      filterDesc = `最近 ${filterUpdate.timeRangeDays} 天的`;
    }
    if (filterUpdate.categoryId) {
      filterDesc += `该分类下的`;
    }
    
    const newQuery = `${filterDesc}${state.query}`;
    
    return this.search(newQuery, updatedState);
  }
}

// 导出单例
export const chatSearchAgent = new ChatSearchAgent();
