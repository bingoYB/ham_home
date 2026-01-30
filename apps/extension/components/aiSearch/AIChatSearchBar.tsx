/**
 * AIChatSearchBar - AI 搜索输入栏
 */
import { KeyboardEvent, useCallback } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, cn } from '@hamhome/ui';

export interface AIChatSearchBarProps {
  /** 搜索值 */
  query: string;
  /** 是否正在搜索 */
  isSearching: boolean;
  /** 搜索值变化回调 */
  onQueryChange: (value: string) => void;
  /** 提交回调 */
  onSubmit: () => void;
}

export function AIChatSearchBar({
  query,
  isSearching,
  onQueryChange,
  onSubmit,
}: AIChatSearchBarProps) {
  const { t } = useTranslation('ai');

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

  return (
    <div className="w-full flex justify-center">
      <div
        className={cn(
          'w-full',
          'relative flex items-center gap-2',
          'bg-linear-to-r from-indigo-50/80 to-violet-50/80 backdrop-blur-sm',
          'dark:from-indigo-950/40 dark:to-violet-950/40',
          'rounded-xl border border-indigo-200/50 dark:border-indigo-800/50',
          'ring-1 ring-indigo-500/20',
          'px-4 py-2'
        )}
      >
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
  );
}
