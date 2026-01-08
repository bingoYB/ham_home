/**
 * AI 状态提示组件
 * 显示 AI 分析的各种状态
 */
import { Sparkles, Loader2, AlertCircle, Settings } from 'lucide-react';
import { cn } from '@hamhome/ui';

export type AIStatusType = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

interface AIStatusProps {
  status: AIStatusType;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function AIStatus({ status, error, onRetry, className }: AIStatusProps) {
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn('rounded-md text-sm', className)}>
      {status === 'loading' && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 text-primary">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>AI 正在分析...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex items-center gap-2 p-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <Sparkles className="h-4 w-4" />
          <span>AI 分析完成</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center justify-between p-2 bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="truncate">AI 分析失败{error ? `: ${error}` : ''}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline hover:no-underline whitespace-nowrap ml-2"
            >
              重试
            </button>
          )}
        </div>
      )}

      {status === 'disabled' && (
        <div className="flex items-center justify-between p-2 bg-muted text-muted-foreground">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>AI 未配置，使用手动填写</span>
          </div>
          <button
            onClick={() => chrome.runtime.openOptionsPage()}
            className="underline hover:no-underline whitespace-nowrap ml-2"
          >
            去配置
          </button>
        </div>
      )}
    </div>
  );
}

