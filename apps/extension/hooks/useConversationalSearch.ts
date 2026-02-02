/**
 * useConversationalSearch - AI 对话式搜索 Hook
 * 封装 AI 对话状态机与检索逻辑
 */
import { useState, useCallback, useRef } from 'react';
import type {
  AISearchStatus,
  Source,
  ConversationState,
  ChatMessage,
  Suggestion,
  SuggestionActionType,
} from '@/types';
import { chatSearchAgent, createInitialState } from '@/lib/search';

/**
 * 建议操作处理器类型
 */
export type SuggestionActionHandler = (
  action: SuggestionActionType,
  payload?: Record<string, unknown>,
  bookmarkIds?: string[],
) => void;

/**
 * useConversationalSearch 返回类型
 */
export interface UseConversationalSearchReturn {
  /** 查询文本 */
  query: string;
  /** 设置查询 */
  setQuery: (query: string) => void;
  /** 对话历史 */
  messages: ChatMessage[];
  /** 当前正在生成的回答 */
  currentAnswer: string;
  /** AI 状态 */
  status: AISearchStatus;
  /** 错误信息 */
  error: string | null;
  /** 当前回答的引用源 */
  results: Source[];
  /** 后续建议 */
  suggestions: Suggestion[];
  /** 高亮的书签 ID */
  highlightedBookmarkId: string | null;
  /** 设置高亮书签 */
  setHighlightedBookmarkId: (id: string | null) => void;
  /** 执行搜索 */
  handleSearch: () => Promise<void>;
  /** 清除对话 */
  clearConversation: () => void;
  /** 关闭对话窗口 */
  closeChat: () => void;
  /** 对话窗口是否打开 */
  isChatOpen: boolean;
  /** 当前结果的书签 ID 列表（用于批量操作） */
  resultBookmarkIds: string[];
}

/**
 * 模拟流式输出效果 - 使用 requestAnimationFrame
 */
async function simulateStreamingOutput(
  text: string,
  setAnswer: (answer: string) => void
): Promise<void> {
  const charsPerFrame = 3; // 每帧输出的字符数
  let index = 0;

  return new Promise((resolve) => {
    function tick() {
      const end = Math.min(index + charsPerFrame, text.length);
      setAnswer(text.slice(0, end));
      index = end;

      if (index < text.length) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(tick);
  });
}

/**
 * AI 对话式搜索 Hook
 */
export function useConversationalSearch(): UseConversationalSearchReturn {
  // 查询文本
  const [query, setQuery] = useState('');
  
  // AI 状态
  const [status, setStatus] = useState<AISearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // 对话历史
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  
  // 当前正在生成的回答
  const [currentAnswer, setCurrentAnswer] = useState('');
  
  // 当前回答的引用源
  const [results, setResults] = useState<Source[]>([]);
  
  // 后续建议
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  
  // 高亮的书签 ID
  const [highlightedBookmarkId, setHighlightedBookmarkId] = useState<string | null>(null);
  
  // 对话窗口是否打开
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  // 当前结果的书签 ID 列表
  const [resultBookmarkIds, setResultBookmarkIds] = useState<string[]>([]);
  
  // 对话状态（用于多轮对话）
  const conversationStateRef = useRef<ConversationState>(createInitialState());

  // 执行搜索
  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;

    // 添加用户消息到历史
    const userMessage: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    
    // 打开对话窗口并开始搜索
    setIsChatOpen(true);
    setStatus('thinking');
    setError(null);
    setCurrentAnswer('');
    
    try {
      // 调用 chatSearchAgent 执行完整的对话式搜索
      setStatus('searching');
      
      const { response, bookmarks: resultBookmarks, searchResult, newState } = await chatSearchAgent.search(
        query,
        conversationStateRef.current
      );
      
      // 更新对话状态
      conversationStateRef.current = newState;
      
      // 构建 searchResult 分数映射
      const scoreMap = new Map(
        searchResult.items.map((item) => [
          item.bookmarkId,
          {
            score: item.score,
            keywordScore: item.keywordScore,
            semanticScore: item.semanticScore,
            matchReason: item.matchReason,
          },
        ])
      );
      
      // 将 bookmarkId 列表转换为 Source 列表（包含分数信息）
      const sources: Source[] = resultBookmarks.map((bookmark, index) => {
        const scoreInfo = scoreMap.get(bookmark.id);
        return {
          index: index + 1,
          bookmarkId: bookmark.id,
          title: bookmark.title,
          url: bookmark.url,
          score: scoreInfo?.score,
          keywordScore: scoreInfo?.keywordScore,
          semanticScore: scoreInfo?.semanticScore,
          matchReason: scoreInfo?.matchReason,
        };
      });
      
      setResults(sources);
      
      // 设置结果书签 ID 列表（用于批量操作）
      setResultBookmarkIds(resultBookmarks.map((b) => b.id));
      
      // 设置 AI 回答（模拟流式输出效果）
      setStatus('writing');
      await simulateStreamingOutput(response.answer, setCurrentAnswer);
      
      // 将 AI 回答添加到历史
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: Date.now(),
        sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // 设置后续建议
      setSuggestions(response.nextSuggestions);
      
      // 清空当前回答（已添加到历史）
      setCurrentAnswer('');
      
      // 清空查询输入
      setQuery('');
      
      setStatus('done');
    } catch (err) {
      console.error('[useConversationalSearch] Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setStatus('error');
    }
  }, [query]);

  // 清除对话
  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentAnswer('');
    setResults([]);
    setSuggestions([]);
    setResultBookmarkIds([]);
    setStatus('idle');
    setError(null);
    setHighlightedBookmarkId(null);
    setQuery('');
    // 重置对话状态
    conversationStateRef.current = createInitialState();
  }, []);

  // 关闭对话窗口
  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    clearConversation();
  }, [clearConversation]);

  return {
    query,
    setQuery,
    messages,
    currentAnswer,
    status,
    error,
    results,
    suggestions,
    highlightedBookmarkId,
    setHighlightedBookmarkId,
    handleSearch,
    clearConversation,
    closeChat,
    isChatOpen,
    resultBookmarkIds,
  };
}
