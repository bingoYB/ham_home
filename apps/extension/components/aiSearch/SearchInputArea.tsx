/**
 * SearchInputArea - 关键词搜索输入组件
 * 纯关键词搜索，AI 搜索使用 AIChatPanel 组件
 */
import { useCallback, KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Input, cn } from '@hamhome/ui';

export interface SearchInputAreaProps {
  /** 搜索值 */
  value: string;
  /** 值变化回调 */
  onChange: (val: string) => void;
  /** 搜索提交回调（可选，按 Enter 触发） */
  onSubmit?: () => void;
  /** 紧凑模式（用于侧边栏） */
  compact?: boolean;
  /** 自定义类名 */
  className?: string;
  /** placeholder 覆盖 */
  placeholder?: string;
}

export function SearchInputArea({
  value,
  onChange,
  onSubmit,
  compact = false,
  className,
  placeholder,
}: SearchInputAreaProps) {
  const { t } = useTranslation('ai');

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.();
      }
    },
    [onSubmit]
  );

  // 清除输入
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <div className="relative flex items-center">
        {/* 搜索图标 */}
        <Search
          className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground',
            compact ? 'h-3.5 w-3.5' : 'h-4 w-4'
          )}
        />

        {/* 搜索输入框 */}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || t('ai:search.keywordPlaceholder')}
          className={cn(
            compact ? 'h-9 pl-9 pr-8' : 'h-10 pl-10 pr-10',
            'bg-muted/50 border-border/50',
            'focus:bg-background'
          )}
        />

        {/* 清除按钮 */}
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2',
              'text-muted-foreground hover:text-foreground transition-colors'
            )}
          >
            <X className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
          </button>
        )}
      </div>
    </div>
  );
}
