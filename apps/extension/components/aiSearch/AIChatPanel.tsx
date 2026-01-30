/**
 * AIChatPanel - AI 对话面板（合并搜索栏和对话窗口）
 * 使用 sticky 布局吸附在底部
 */
import { useCallback, useRef, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ScrollArea, cn } from '@hamhome/ui';
import type { AISearchStatus, Source, ChatMessage } from '@/types';
import { AIChatSearchBar } from './AIChatSearchBar';
import { AIChatStatusIndicator } from './AIChatStatusIndicator';
import { AIChatSources } from './AIChatSources';
import { AIChatSuggestions } from './AIChatSuggestions';
import { AIChatMessage } from './AIChatMessage';

export interface AIChatPanelProps {
  /** 是否展开对话窗口 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 搜索值 */
  query: string;
  /** 搜索值变化回调 */
  onQueryChange: (val: string) => void;
  /** 搜索提交回调 */
  onSubmit: () => void;
  /** 对话历史 */
  messages: ChatMessage[];
  /** 当前正在生成的回答 */
  currentAnswer: string;
  /** 当前状态 */
  status: AISearchStatus;
  /** 错误信息 */
  error?: string | null;
  /** 当前回答的引用源 */
  sources: Source[];
  /** 点击引用回调 */
  onSourceClick: (bookmarkId: string) => void;
  /** 后续建议 */
  suggestions?: string[];
  /** 后续建议点击回调 */
  onSuggestionClick?: (suggestion: string) => void;
  /** 重试回调 */
  onRetry?: () => void;
  /** 自定义类名 */
  className?: string;
}

export function AIChatPanel({
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
}: AIChatPanelProps) {
  const { t } = useTranslation('ai');
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSearching = status === 'thinking' || status === 'searching' || status === 'writing';

  // 滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentAnswer]);

  // 点击引用 - 转换为 bookmarkId
  const handleSourceClick = useCallback(
    (source: Source) => {
      onSourceClick(source.bookmarkId);
    },
    [onSourceClick]
  );

  // 解析并渲染消息内容（处理引用标记）- 用于当前生成的回答
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
    [sources, handleSourceClick]
  );

  const showCurrentAnswer =
    status === 'thinking' || status === 'searching' || status === 'writing' || status === 'error' || (status === 'done' && !!currentAnswer);

  return (
    <div
      className={cn(
        'sticky bottom-2 z-2 max-w-[720px] m-auto w-full px-4',
        'flex flex-col items-center',
        'rounded-t-xl',
        className
      )}
    >
      {/* 对话窗口（展开时显示） */}
      {isOpen && (
        <div
          className={cn(
            // 布局
            'w-full flex flex-col mb-2',
            // 尺寸
            'max-h-[50vh]',
            // 背景和边框
            'bg-background border border-border rounded-xl shadow-lg',
            // 动画
            'animate-in slide-in-from-bottom-4 fade-in duration-300'
          )}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium">{t('ai:search.aiAnswer')}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
              title={t('ai:search.close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* 对话内容 */}
          <ScrollArea className="flex-1 min-h-0">
            <div ref={scrollRef} className="p-4 space-y-4">
              {/* 历史消息 */}
              {messages.map((message, idx) => (
                <AIChatMessage
                  key={idx}
                  message={message}
                  sources={sources}
                  onSourceClick={handleSourceClick}
                />
              ))}

              {/* 当前正在生成的回答 */}
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
                        <AIChatStatusIndicator status={status} error={error} onRetry={onRetry} />
                      ) : currentAnswer ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          {renderCurrentAnswerContent(currentAnswer)}
                        </div>
                      ) : (
                        <AIChatStatusIndicator status={status} error={error} onRetry={onRetry} />
                      )}
                    </div>
                    {status === 'done' && currentAnswer && (
                      <AIChatSources sources={sources} onSourceClick={handleSourceClick} />
                    )}
                  </div>
                </div>
              )}

              {/* 完成状态显示引用源和建议 */}
              {status === 'done' && !currentAnswer && messages.length > 0 && (
                <>
                  <AIChatSources sources={sources} onSourceClick={handleSourceClick} />
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

      {/* 搜索输入栏（始终显示） */}
      <AIChatSearchBar
        query={query}
        isSearching={isSearching}
        onQueryChange={onQueryChange}
        onSubmit={onSubmit}
      />
    </div>
  );
}
