/**
 * useConversationalSearch - AI 对话式搜索 Hook
 * 封装 AI 对话状态与统一回合执行逻辑
 */
import { useState, useCallback, useRef } from "react";
import type {
  AISearchStatus,
  ChatMessage,
  ConversationalSearchSession,
  ConversationalSearchTurnInput,
  Source,
  Suggestion,
  SuggestionActionType,
} from "@/types";

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
  /** 执行建议动作 */
  handleSuggestion: (suggestion: Suggestion) => Promise<void>;
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
  setAnswer: (answer: string) => void,
): Promise<void> {
  const charsPerFrame = 3;
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

function createInitialSessionState(): ConversationalSearchSession {
  return {
    filters: {},
    seenBookmarkIds: [],
    lastSelectedBookmarkIds: [],
    history: [],
  };
}

/**
 * AI 对话式搜索 Hook
 */
export function useConversationalSearch(): UseConversationalSearchReturn {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<AISearchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [results, setResults] = useState<Source[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [highlightedBookmarkId, setHighlightedBookmarkId] = useState<string | null>(
    null,
  );
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [resultBookmarkIds, setResultBookmarkIds] = useState<string[]>([]);

  const conversationSessionRef = useRef<ConversationalSearchSession>(
    createInitialSessionState(),
  );

  const applyTurn = useCallback(async (input: ConversationalSearchTurnInput) => {
    const displayText =
      input.type === "message"
        ? input.text?.trim() || ""
        : input.suggestion?.label?.trim() || "";

    if (!displayText) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: displayText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsChatOpen(true);
    setStatus("thinking");
    setError(null);
    setCurrentAnswer("");

    try {
      setStatus("searching");

      const { chatSearchAgent } = await import("@/lib/search/chat-search-agent");

      const {
        response,
        bookmarks: resultBookmarks,
        searchResult,
        newState,
      } = await chatSearchAgent.runTurn(
        input,
        conversationSessionRef.current,
      );

      conversationSessionRef.current = newState;

      const scoreMap = new Map(
        searchResult.items.map((item) => [
          item.bookmarkId,
          {
            score: item.score,
            keywordScore: item.keywordScore,
            semanticScore: item.semanticScore,
            matchReason: item.matchReason,
          },
        ]),
      );

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
      setResultBookmarkIds(resultBookmarks.map((bookmark) => bookmark.id));

      setStatus("writing");
      await simulateStreamingOutput(response.answer, setCurrentAnswer);

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.answer,
        timestamp: Date.now(),
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestions(response.nextSuggestions);
      setCurrentAnswer("");
      setQuery("");
      setStatus("done");
    } catch (err) {
      console.error("[useConversationalSearch] Search failed:", err);
      setError(err instanceof Error ? err.message : "Search failed");
      setStatus("error");
    }
  }, []);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    await applyTurn({
      type: "message",
      text: query,
    });
  }, [applyTurn, query]);

  const handleSuggestion = useCallback(
    async (suggestion: Suggestion) => {
      await applyTurn({
        type: "suggestion",
        suggestion: {
          label: suggestion.label,
          action: suggestion.action,
          payload: suggestion.payload,
        },
      });
    },
    [applyTurn],
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentAnswer("");
    setResults([]);
    setSuggestions([]);
    setResultBookmarkIds([]);
    setStatus("idle");
    setError(null);
    setHighlightedBookmarkId(null);
    setQuery("");
    conversationSessionRef.current = createInitialSessionState();
  }, []);

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
    handleSuggestion,
    clearConversation,
    closeChat,
    isChatOpen,
    resultBookmarkIds,
  };
}
