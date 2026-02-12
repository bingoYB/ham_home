/**
 * AIChatSearchBar - AI 搜索输入栏
 */
import { KeyboardEvent, useCallback, useState } from 'react';
import { Sparkles, Send, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, cn } from '@hamhome/ui';

export interface QuickAction {
  /** 示例标题 */
  title: string;
  /** 示例查询 */
  query: string;
}

export interface AIChatSearchBarProps {
  /** 搜索值 */
  query: string;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 搜索值变化回调 */
  onQueryChange: (value: string) => void;
  /** 提交回调 */
  onSubmit: () => void;
  /** 是否显示快速操作（输入为空且无对话历史时） */
  showQuickActions?: boolean;
}

export function AIChatSearchBar({
  query,
  isSearching,
  onQueryChange,
  onSubmit,
  showQuickActions = false,
}: AIChatSearchBarProps) {
  const { t } = useTranslation('ai');
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
      // 直接触发搜索
      setTimeout(() => {
        onSubmit();
      }, 0);
    },
    [onQueryChange, onSubmit]
  );

  // 预设示例
  const quickActions: QuickAction[] = [
    {
      title: t('ai:search.quickActions.examples.features'),
      query: t('ai:search.quickActions.examples.featuresQuery'),
    },
    {
      title: t('ai:search.quickActions.examples.shortcuts'),
      query: t('ai:search.quickActions.examples.shortcutsQuery'),
    },
    {
      title: t('ai:search.quickActions.examples.semantic'),
      query: t('ai:search.quickActions.examples.semanticQuery'),
    },
  ];

  // 是否显示快速操作：需要 showQuickActions=true、输入为空、且用户未关闭
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
        {/* 快速操作按钮 - 在输入框上方 */}
        {shouldShowQuickActions && (
          <div className="flex items-start gap-2 pb-1">
            {/* 快速操作按钮容器 - 可以换行 */}
            <div className="flex-1 flex flex-wrap gap-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
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

            {/* 关闭按钮 - 固定右侧 */}
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
              title={t('ai:search.quickActions.dismiss')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* 搜索输入区域 */}
        <div className="flex items-center gap-2">
          <Sparkles className="shrink-0 h-5 w-5 text-indigo-500 dark:text-indigo-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ai:search.aiPlaceholder')}
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
            {isSearching ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
