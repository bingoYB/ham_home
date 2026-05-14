'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AIChatPanel as SharedAIChatPanel,
  type AIChatLabels,
  type AISearchStatus,
  type ChatMessage,
  type Source,
  type Suggestion,
} from '@hamhome/ui-business/ai-search';
import type { Bookmark } from '@/data/mock-bookmarks';

interface DemoTexts {
  aiAnswer: string;
  close: string;
  aiPlaceholder: string;
  sources: string;
  dismiss: string;
  quickActions: { title: string; query: string }[];
  status: {
    thinking: string;
    searching: string;
    writing: string;
    error: string;
    retry: string;
  };
  answer: {
    noResults: string;
    foundIntro: (query: string, count: number) => string;
    moreResults: (count: number) => string;
  };
  suggestions: {
    viewMore: string;
    filterByTime: string;
    narrowSearch: string;
    copyAllLinks: string;
  };
}

interface AIChatSearchDemoProps {
  bookmarks: Bookmark[];
  isEn: boolean;
  className?: string;
  onSourceClick?: (bookmarkId: string) => void;
}

function getTexts(isEn: boolean): DemoTexts {
  if (isEn) {
    return {
      aiAnswer: 'AI Answer',
      close: 'Close',
      aiPlaceholder: 'Ask AI about your bookmarks...',
      sources: 'Sources',
      dismiss: 'Dismiss',
      quickActions: [
        {
          title: 'View features',
          query: 'What features does this extension have?',
        },
        {
          title: 'Learn shortcuts',
          query: 'What keyboard shortcuts are available?',
        },
        {
          title: 'Semantic search example',
          query: 'Find me bookmarks about frontend development',
        },
      ],
      status: {
        thinking: 'AI is thinking...',
        searching: 'Searching bookmarks...',
        writing: 'Generating answer...',
        error: 'An error occurred',
        retry: 'Retry',
      },
      answer: {
        noResults: 'No related bookmarks found. Please try different keywords or phrasing.',
        foundIntro: (query, count) =>
          `Based on your question "${query}", I found ${count} related bookmarks:`,
        moreResults: (count) =>
          `There are ${count} more related results, you can view them in the list below.`,
      },
      suggestions: {
        viewMore: 'View more related bookmarks',
        filterByTime: 'Filter by time',
        narrowSearch: 'Narrow search scope',
        copyAllLinks: 'Copy all links',
      },
    };
  }

  return {
    aiAnswer: 'AI 回答',
    close: '关闭',
    aiPlaceholder: '用自然语言询问你的书签...',
    sources: '信息来源',
    dismiss: '关闭',
    quickActions: [
      {
        title: '查看插件功能',
        query: '这个插件有哪些功能？',
      },
      {
        title: '了解快捷键',
        query: '有哪些快捷键可以使用？',
      },
      {
        title: '语义搜索示例',
        query: '帮我找到关于前端开发的书签',
      },
    ],
    status: {
      thinking: 'AI 正在思考...',
      searching: '正在检索书签...',
      writing: '正在生成回答...',
      error: '发生错误',
      retry: '重试',
    },
    answer: {
      noResults: '未找到相关书签。请尝试其他关键词或问法。',
      foundIntro: (query, count) => `根据您的问题"${query}"，我找到了 ${count} 个相关书签：`,
      moreResults: (count) => `还有 ${count} 个其他相关结果，您可以在下方列表中查看。`,
    },
    suggestions: {
      viewMore: '查看更多相关书签',
      filterByTime: '按时间筛选',
      narrowSearch: '缩小搜索范围',
      copyAllLinks: '复制所有链接',
    },
  };
}

async function simulateStreamingOutput(
  text: string,
  setAnswer: (answer: string) => void
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

export function AIChatSearchDemo({ bookmarks, isEn, className, onSourceClick }: AIChatSearchDemoProps) {
  const texts = useMemo(() => getTexts(isEn), [isEn]);
  const aiChatLabels = useMemo<AIChatLabels>(
    () => ({
      aiAnswer: texts.aiAnswer,
      close: texts.close,
      aiPlaceholder: texts.aiPlaceholder,
      sources: texts.sources,
      retry: texts.status.retry,
      dismissQuickActions: texts.dismiss,
      status: {
        thinking: texts.status.thinking,
        searching: texts.status.searching,
        writing: texts.status.writing,
        error: texts.status.error,
      },
      quickActions: texts.quickActions,
    }),
    [texts]
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<AISearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [results, setResults] = useState<Source[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [resultBookmarkIds, setResultBookmarkIds] = useState<string[]>([]);
  const lastQueryRef = useRef('');
  const queryRef = useRef('');

  const setQueryValue = useCallback((value: string) => {
    queryRef.current = value;
    setQuery(value);
  }, []);

  const findRelatedBookmarks = useCallback(
    (searchQuery: string) => {
      const keywords = searchQuery
        .toLowerCase()
        .split(/[\s,，。？！?]+/)
        .filter(Boolean);

      if (keywords.length === 0) return [];

      return bookmarks
        .map((bookmark) => {
          const haystack = `${bookmark.title} ${bookmark.description} ${bookmark.tags.join(' ')}`.toLowerCase();
          const score = keywords.reduce((sum, keyword) => {
            if (!keyword) return sum;
            return sum + (haystack.includes(keyword) ? 1 : 0);
          }, 0);
          return {
            bookmark,
            score: score / keywords.length,
          };
        })
        .filter((item) => item.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.bookmark.createdAt - a.bookmark.createdAt;
        })
        .slice(0, 8);
    },
    [bookmarks]
  );

  const buildAnswer = useCallback(
    (searchQuery: string, matchedItems: Array<{ bookmark: Bookmark; score: number }>) => {
      if (matchedItems.length === 0) return texts.answer.noResults;
      const topItems = matchedItems.slice(0, 5);
      const lines = topItems.map((item, index) => `[${index + 1}] ${item.bookmark.title}`);

      const extraCount = Math.max(0, matchedItems.length - topItems.length);
      const result: string[] = [texts.answer.foundIntro(searchQuery, topItems.length), ...lines];

      if (extraCount > 0) {
        result.push(texts.answer.moreResults(extraCount));
      }

      return result.join('\n');
    },
    [texts]
  );

  const buildSuggestions = useCallback(
    (hasResults: boolean): Suggestion[] => {
      if (!hasResults) {
        return [
          {
            label: texts.suggestions.narrowSearch,
            action: 'text',
            payload: {
              query: isEn ? 'Find bookmarks by specific keyword' : '按更具体的关键词搜索书签',
            },
          },
        ];
      }

      return [
        { label: texts.suggestions.viewMore, action: 'showMore' },
        { label: texts.suggestions.filterByTime, action: 'timeFilter' },
        { label: texts.suggestions.narrowSearch, action: 'text' },
        { label: texts.suggestions.copyAllLinks, action: 'copyAllLinks' },
      ];
    },
    [isEn, texts]
  );

  const clearConversation = useCallback(() => {
    setMessages([]);
    setCurrentAnswer('');
    setResults([]);
    setSuggestions([]);
    setResultBookmarkIds([]);
    setStatus('idle');
    setError(null);
    queryRef.current = '';
    setQuery('');
    lastQueryRef.current = '';
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    clearConversation();
  }, [clearConversation]);

  const handleSearch = useCallback(async () => {
    const searchQuery = (queryRef.current || query).trim();
    if (!searchQuery) return;
    lastQueryRef.current = searchQuery;

    const userMessage: ChatMessage = {
      role: 'user',
      content: searchQuery,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsChatOpen(true);
    setStatus('thinking');
    setError(null);
    setCurrentAnswer('');

    try {
      setStatus('searching');

      await new Promise((resolve) => setTimeout(resolve, 120));
      const matchedItems = findRelatedBookmarks(searchQuery);
      const sourceItems = matchedItems.slice(0, 5);

      const sources: Source[] = sourceItems.map((item, index) => ({
        index: index + 1,
        bookmarkId: item.bookmark.id,
        title: item.bookmark.title,
        url: item.bookmark.url,
        score: item.score,
      }));

      const answer = buildAnswer(searchQuery, matchedItems);

      setResults(sources);
      setResultBookmarkIds(matchedItems.map((item) => item.bookmark.id));
      setStatus('writing');

      await simulateStreamingOutput(answer, setCurrentAnswer);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: answer,
        timestamp: Date.now(),
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setSuggestions(buildSuggestions(sources.length > 0));
      setCurrentAnswer('');
      queryRef.current = '';
      setQuery('');
      setStatus('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : texts.status.error);
      setStatus('error');
    }
  }, [buildAnswer, buildSuggestions, findRelatedBookmarks, query, texts.status.error]);

  const handleSourceClickInternal = useCallback(
    (bookmarkId: string) => {
      onSourceClick?.(bookmarkId);
    },
    [onSourceClick]
  );

  const handleSuggestionClick = useCallback(
    async (suggestion: Suggestion) => {
      switch (suggestion.action) {
        case 'copyAllLinks': {
          const links = resultBookmarkIds
            .map((id) => bookmarks.find((bookmark) => bookmark.id === id)?.url)
            .filter(Boolean)
            .join('\n');

          if (!links) return;
          try {
            await navigator.clipboard.writeText(links);
          } catch {
            // Ignore clipboard errors in demo mode.
          }
          break;
        }
        case 'timeFilter': {
          const nextQuery = isEn
            ? `${lastQueryRef.current} in the last 30 days`
            : `${lastQueryRef.current} 最近30天`;
          setQueryValue(nextQuery);
          setTimeout(() => {
            void handleSearch();
          }, 0);
          break;
        }
        case 'showMore': {
          const nextQuery = isEn ? `${lastQueryRef.current} more` : `${lastQueryRef.current} 更多`;
          setQueryValue(nextQuery);
          setTimeout(() => {
            void handleSearch();
          }, 0);
          break;
        }
        case 'text':
        case 'domainFilter':
        case 'categoryFilter':
        case 'semanticOnly':
        case 'keywordOnly':
        case 'findDuplicates':
        case 'navigate':
        case 'batchAddTags':
        case 'batchMoveCategory': {
          const payloadQuery =
            typeof suggestion.payload?.query === 'string' ? suggestion.payload.query : suggestion.label;
          setQueryValue(payloadQuery);
          setTimeout(() => {
            void handleSearch();
          }, 0);
          break;
        }
        default:
          break;
      }
    },
    [bookmarks, handleSearch, isEn, resultBookmarkIds, setQueryValue]
  );

  return (
    <SharedAIChatPanel
      className={className}
      isOpen={isChatOpen}
      onClose={closeChat}
      query={query}
      onQueryChange={setQueryValue}
      onSubmit={() => {
        void handleSearch();
      }}
      messages={messages}
      currentAnswer={currentAnswer}
      status={status}
      error={error}
      sources={results}
      onSourceClick={handleSourceClickInternal}
      suggestions={suggestions}
      onSuggestionClick={handleSuggestionClick}
      onRetry={() => {
        void handleSearch();
      }}
      labels={aiChatLabels}
    />
  );
}
