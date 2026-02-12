'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Bot,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Folder,
  FolderOpen,
  Globe,
  Keyboard,
  Loader2,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';
import { Badge, Button, Input, ScrollArea, cn } from '@hamhome/ui';
import type { Bookmark } from '@/data/mock-bookmarks';

type AISearchStatus = 'idle' | 'thinking' | 'searching' | 'writing' | 'done' | 'error';

type SuggestionActionType =
  | 'text'
  | 'copyAllLinks'
  | 'batchAddTags'
  | 'batchMoveCategory'
  | 'showMore'
  | 'timeFilter'
  | 'domainFilter'
  | 'categoryFilter'
  | 'semanticOnly'
  | 'keywordOnly'
  | 'findDuplicates'
  | 'navigate';

interface Suggestion {
  label: string;
  action: SuggestionActionType;
  payload?: Record<string, unknown>;
}

interface Source {
  index: number;
  bookmarkId: string;
  title: string;
  url: string;
  score?: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Source[];
}

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

interface AIChatSearchBarProps {
  query: string;
  isSearching: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: () => void;
  showQuickActions?: boolean;
  texts: DemoTexts;
}

interface AIChatStatusIndicatorProps {
  status: AISearchStatus;
  error?: string | null;
  onRetry?: () => void;
  texts: DemoTexts;
}

interface AIChatSourcesProps {
  sources: Source[];
  onSourceClick: (source: Source) => void;
  texts: DemoTexts;
}

interface AIChatMessageProps {
  message: ChatMessage;
  sources?: Source[];
  onSourceClick: (source: Source) => void;
}

interface AIChatSuggestionsProps {
  suggestions: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
}

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  query: string;
  onQueryChange: (val: string) => void;
  onSubmit: () => void;
  messages: ChatMessage[];
  currentAnswer: string;
  status: AISearchStatus;
  error?: string | null;
  sources: Source[];
  onSourceClick: (bookmarkId: string) => void;
  suggestions?: Suggestion[];
  onSuggestionClick?: (suggestion: Suggestion) => void;
  onRetry?: () => void;
  className?: string;
  texts: DemoTexts;
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

function getSuggestionIcon(action: SuggestionActionType) {
  switch (action) {
    case 'copyAllLinks':
      return Copy;
    case 'batchAddTags':
      return Tag;
    case 'batchMoveCategory':
      return FolderOpen;
    case 'showMore':
      return ChevronRight;
    case 'timeFilter':
      return Clock;
    case 'domainFilter':
      return Globe;
    case 'categoryFilter':
      return Folder;
    case 'semanticOnly':
    case 'keywordOnly':
      return Search;
    case 'findDuplicates':
      return Copy;
    case 'navigate':
      return ArrowRight;
    case 'text':
    default:
      return Keyboard;
  }
}

function isDirectAction(action: SuggestionActionType): boolean {
  return [
    'copyAllLinks',
    'batchAddTags',
    'batchMoveCategory',
    'showMore',
    'findDuplicates',
    'navigate',
  ].includes(action);
}

function formatScore(score?: number): string {
  if (score === undefined || score === null) return '';
  return `${Math.round(score * 100)}%`;
}

function getScoreColor(score?: number): string {
  if (score === undefined || score === null) return 'text-muted-foreground';
  if (score >= 0.7) return 'text-green-600 dark:text-green-400';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
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

function AIChatSearchBar({
  query,
  isSearching,
  onQueryChange,
  onSubmit,
  showQuickActions = false,
  texts,
}: AIChatSearchBarProps) {
  const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(true);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && query.trim()) {
        e.preventDefault();
        onSubmit();
      }
    },
    [onSubmit, query]
  );

  const handleSubmit = useCallback(() => {
    if (query.trim() && !isSearching) {
      onSubmit();
    }
  }, [query, isSearching, onSubmit]);

  const handleQuickActionClick = useCallback(
    (actionQuery: string) => {
      onQueryChange(actionQuery);
      setTimeout(() => {
        onSubmit();
      }, 0);
    },
    [onQueryChange, onSubmit]
  );

  const shouldShowQuickActions = showQuickActions && !query.trim() && isQuickActionsVisible;

  return (
    <div className="w-full flex justify-center">
      <div
        className={cn(
          'w-full',
          'relative flex flex-col gap-2',
          'bg-linear-to-r from-indigo-50/80 to-violet-50/80 backdrop-blur-sm',
          'dark:from-indigo-950/40 dark:to-violet-950/40',
          'rounded-xl border border-indigo-200/50 dark:border-indigo-800/50',
          'ring-1 ring-indigo-500/20',
          'px-4 py-2'
        )}
      >
        {shouldShowQuickActions && (
          <div className="flex items-start gap-2 pb-1">
            <div className="flex-1 flex flex-wrap gap-2">
              {texts.quickActions.map((action, index) => (
                <button
                  key={`${action.title}-${index}`}
                  onClick={() => handleQuickActionClick(action.query)}
                  className={cn(
                    'px-2.5 py-1.5 rounded-md',
                    'bg-indigo-100/60 dark:bg-indigo-900/40',
                    'hover:bg-indigo-200 dark:hover:bg-indigo-800',
                    'text-xs font-medium text-indigo-700 dark:text-indigo-300',
                    'border border-indigo-200/40 dark:border-indigo-700/40',
                    'hover:border-indigo-300 dark:hover:border-indigo-600',
                    'hover:shadow-sm',
                    'transition-all duration-200',
                    'whitespace-nowrap',
                    'cursor-pointer'
                  )}
                >
                  {action.title}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsQuickActionsVisible(false)}
              className={cn(
                'shrink-0 p-1.5 rounded-md',
                'text-indigo-400/70 hover:text-indigo-600',
                'dark:text-indigo-500/70 dark:hover:text-indigo-300',
                'hover:bg-indigo-100/50 dark:hover:bg-indigo-900/50',
                'transition-all duration-200',
                'cursor-pointer'
              )}
              title={texts.dismiss}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Sparkles className="shrink-0 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={texts.aiPlaceholder}
            className={cn(
              'flex-1 border-0 bg-transparent! shadow-none h-9',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              'placeholder:text-indigo-400/70 dark:placeholder:text-indigo-500/70'
            )}
            disabled={isSearching}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className={cn(
              'shrink-0 rounded-lg h-8 w-8',
              'text-indigo-600 dark:text-indigo-400',
              'hover:bg-indigo-100 dark:hover:bg-indigo-900/50',
              'disabled:opacity-50'
            )}
            onClick={handleSubmit}
            disabled={!query.trim() || isSearching}
          >
            {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AIChatStatusIndicator({ status, error, onRetry, texts }: AIChatStatusIndicatorProps) {
  switch (status) {
    case 'thinking':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{texts.status.thinking}</span>
        </div>
      );
    case 'searching':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{texts.status.searching}</span>
        </div>
      );
    case 'writing':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{texts.status.writing}</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error || texts.status.error}</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              {texts.status.retry}
            </Button>
          )}
        </div>
      );
    default:
      return null;
  }
}

function AIChatSources({ sources, onSourceClick, texts }: AIChatSourcesProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">{texts.sources}</p>
      <div className="flex flex-wrap gap-1.5">
        {sources.slice(0, 5).map((source) => (
          <button
            key={source.bookmarkId}
            onClick={() => onSourceClick(source)}
            className={cn(
              'flex items-center gap-1 px-2 py-1',
              'text-xs bg-muted/50 hover:bg-muted',
              'rounded-md transition-colors',
              'max-w-[280px]'
            )}
            title={source.url}
          >
            <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
              {source.index}
            </Badge>
            <span className="truncate flex-1">{source.title}</span>
            {source.score !== undefined && (
              <span className={cn('text-[10px] font-medium shrink-0', getScoreColor(source.score))}>
                {formatScore(source.score)}
              </span>
            )}
            <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
          </button>
        ))}
        {sources.length > 5 && (
          <span className="text-xs text-muted-foreground self-center">+{sources.length - 5}</span>
        )}
      </div>
    </div>
  );
}

function AIChatMessage({ message, sources = [], onSourceClick }: AIChatMessageProps) {
  const sourceList = message.sources || sources;

  const renderContent = useCallback(() => {
    return message.content.split('\n').map((line, idx) => {
      const parts = line.split(/(\[\d+\])/g);
      return (
        <p key={idx} className="mb-2 last:mb-0">
          {parts.map((part, partIdx) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
              const sourceIndex = parseInt(match[1], 10);
              const source = sourceList.find((s) => s.index === sourceIndex);
              if (source) {
                return (
                  <button
                    key={partIdx}
                    onClick={() => onSourceClick(source)}
                    className={cn(
                      'inline-flex items-center justify-center',
                      'min-w-5 h-5 px-1 mx-0.5',
                      'text-xs font-medium',
                      'bg-indigo-100 dark:bg-indigo-900/50',
                      'text-indigo-700 dark:text-indigo-300',
                      'rounded hover:bg-indigo-200 dark:hover:bg-indigo-800',
                      'transition-colors cursor-pointer'
                    )}
                    title={source.title}
                  >
                    {sourceIndex}
                  </button>
                );
              }
            }
            return <span key={partIdx}>{part}</span>;
          })}
        </p>
      );
    });
  }, [message.content, onSourceClick, sourceList]);

  return (
    <div className={cn('flex gap-2', message.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center h-7 w-7',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
        )}
      >
        {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2',
          message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">{renderContent()}</div>
      </div>
    </div>
  );
}

function AIChatSuggestions({ suggestions, onSuggestionClick }: AIChatSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => {
          const Icon = getSuggestionIcon(suggestion.action);
          const direct = isDirectAction(suggestion.action);

          return (
            <Button
              key={`${suggestion.label}-${idx}`}
              variant={direct ? 'secondary' : 'outline'}
              size="sm"
              className={cn(
                'h-7 text-xs gap-1.5',
                direct &&
                  'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              )}
              onClick={() => onSuggestionClick?.(suggestion)}
            >
              {direct && <Icon className="h-3 w-3" />}
              {suggestion.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function AIChatPanel({
  isOpen,
  onClose,
  query,
  onQueryChange,
  onSubmit,
  messages,
  currentAnswer,
  status,
  error,
  sources,
  onSourceClick,
  suggestions = [],
  onSuggestionClick,
  onRetry,
  className,
  texts,
}: AIChatPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSearching = status === 'thinking' || status === 'searching' || status === 'writing';

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentAnswer]);

  const handleSourceClick = useCallback(
    (source: Source) => {
      onSourceClick(source.bookmarkId);
    },
    [onSourceClick]
  );

  const renderCurrentAnswerContent = useCallback(
    (content: string) => {
      return content.split('\n').map((line, idx) => {
        const parts = line.split(/(\[\d+\])/g);
        return (
          <p key={idx} className="mb-2 last:mb-0">
            {parts.map((part, partIdx) => {
              const match = part.match(/^\[(\d+)\]$/);
              if (match) {
                const sourceIndex = parseInt(match[1], 10);
                const source = sources.find((s) => s.index === sourceIndex);
                if (source) {
                  return (
                    <button
                      key={partIdx}
                      onClick={() => handleSourceClick(source)}
                      className={cn(
                        'inline-flex items-center justify-center',
                        'min-w-5 h-5 px-1 mx-0.5',
                        'text-xs font-medium',
                        'bg-indigo-100 dark:bg-indigo-900/50',
                        'text-indigo-700 dark:text-indigo-300',
                        'rounded hover:bg-indigo-200 dark:hover:bg-indigo-800',
                        'transition-colors cursor-pointer'
                      )}
                      title={source.title}
                    >
                      {sourceIndex}
                    </button>
                  );
                }
              }
              return <span key={partIdx}>{part}</span>;
            })}
          </p>
        );
      });
    },
    [handleSourceClick, sources]
  );

  const showCurrentAnswer =
    status === 'thinking' ||
    status === 'searching' ||
    status === 'writing' ||
    status === 'error' ||
    (status === 'done' && !!currentAnswer);

  const showQuickActions = !query.trim() && messages.length === 0 && !isOpen;

  return (
    <div
      className={cn(
        'sticky bottom-2 z-2 max-w-[720px] m-auto w-full px-4',
        'flex flex-col items-center',
        'rounded-t-xl',
        className
      )}
    >
      {isOpen && (
        <div
          className={cn(
            'w-full flex flex-col mb-2',
            'max-h-[50vh]',
            'bg-background border border-border rounded-xl shadow-lg',
            'animate-in slide-in-from-bottom-4 fade-in duration-300'
          )}
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium">{texts.aiAnswer}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title={texts.close}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div ref={scrollRef} className="p-4 space-y-4">
              {messages.map((message, idx) => (
                <AIChatMessage key={idx} message={message} sources={sources} onSourceClick={handleSourceClick} />
              ))}

              {showCurrentAnswer && (
                <div className="flex gap-2">
                  <div
                    className={cn(
                      'shrink-0 rounded-full flex items-center justify-center h-7 w-7',
                      'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-lg px-3 py-2 max-w-[80%]">
                      {status === 'error' ? (
                        <AIChatStatusIndicator status={status} error={error} onRetry={onRetry} texts={texts} />
                      ) : currentAnswer ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {renderCurrentAnswerContent(currentAnswer)}
                        </div>
                      ) : (
                        <AIChatStatusIndicator status={status} error={error} onRetry={onRetry} texts={texts} />
                      )}
                    </div>
                    {status === 'done' && currentAnswer && (
                      <AIChatSources sources={sources} onSourceClick={handleSourceClick} texts={texts} />
                    )}
                  </div>
                </div>
              )}

              {status === 'done' && !currentAnswer && messages.length > 0 && (
                <>
                  <AIChatSources sources={sources} onSourceClick={handleSourceClick} texts={texts} />
                  <AIChatSuggestions suggestions={suggestions} onSuggestionClick={onSuggestionClick} />
                </>
              )}

              {status === 'done' && currentAnswer && (
                <AIChatSuggestions suggestions={suggestions} onSuggestionClick={onSuggestionClick} />
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      <AIChatSearchBar
        query={query}
        isSearching={isSearching}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
        showQuickActions={showQuickActions}
        texts={texts}
      />
    </div>
  );
}

export function AIChatSearchDemo({ bookmarks, isEn, className, onSourceClick }: AIChatSearchDemoProps) {
  const texts = useMemo(() => getTexts(isEn), [isEn]);
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
    <AIChatPanel
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
      texts={texts}
    />
  );
}
