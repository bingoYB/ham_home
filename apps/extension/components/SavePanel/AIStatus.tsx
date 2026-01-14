/**
 * AI 状态提示组件
 * 显示 AI 分析的各种状态
 */
import { Sparkles, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@hamhome/ui';

export type AIStatusType = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

interface AIStatusProps {
  status: AIStatusType;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}

export function AIStatus({ status, error, onRetry, className }: AIStatusProps) {
  const { t } = useTranslation();
  
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn('rounded-lg text-xs', className)}>
      {status === 'loading' && (
        <div className="rounded-lg flex items-center gap-1.5 py-1.5 px-2 bg-primary/10 text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t('ai:ai.status.analyzing')}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="rounded-lg flex items-center gap-1.5 py-1.5 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t('ai:ai.status.completed')}</span>
          <button
              onClick={onRetry}
              className="underline hover:no-underline whitespace-nowrap ml-2"
            >
              {t('ai:ai.status.retry')}
            </button>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg flex items-center justify-between py-1.5 px-2 bg-destructive/10 text-destructive">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="truncate">{t('ai:ai.status.failed')}{error ? `: ${error}` : ''}</span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline hover:no-underline whitespace-nowrap ml-2"
            >
              {t('ai:ai.status.retry')}
            </button>
          )}
        </div>
      )}

      {status === 'disabled' && (
        <div className="rounded-lg flex items-center justify-between py-1.5 px-2 bg-muted text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>{t('ai:ai.status.notConfigured')}</span>
          </div>
          <button
            onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('app.html#settings') });
            }}
            className="underline hover:no-underline whitespace-nowrap ml-2"
          >
            {t('ai:ai.status.configure')}
          </button>
        </div>
      )}
    </div>
  );
}

