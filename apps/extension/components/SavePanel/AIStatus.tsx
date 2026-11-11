/**
 * AI 状态提示组件
 * 显示 AI 分析的各种状态
 */
import { Sparkles, Loader2, AlertCircle, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn, Tooltip, TooltipContent, TooltipTrigger } from '@hamhome/ui';

export type AIStatusType = 'idle' | 'loading' | 'success' | 'error' | 'disabled';

interface AIStatusProps {
  status: AIStatusType;
  error?: string | null;
  onRetry?: () => void;
  onConfigure?: () => void;
  className?: string;
  portalContainer?: HTMLElement;
}

export function AIStatus({ status, error, onRetry, onConfigure, className, portalContainer }: AIStatusProps) {
  const { t } = useTranslation();
  const errorMessage = error?.trim() || t('ai:status.failed');
  
  if (status === 'idle') {
    return null;
  }

  return (
    <div className={cn('min-w-0 max-w-full rounded-lg text-xs', status === 'error' && 'max-w-[280px]', className)}>
      {status === 'loading' && (
        <div className="rounded-lg flex items-center gap-1.5 py-1.5 px-2 bg-primary/10 text-primary">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{t('ai:status.analyzing')}</span>
        </div>
      )}

      {status === 'success' && (
        <div className="rounded-lg flex items-center gap-1.5 py-1.5 px-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>{t('ai:status.completed')}</span>
          <button
              onClick={onRetry}
              className="underline hover:no-underline whitespace-nowrap ml-2"
            >
              {t('ai:status.retry')}
            </button>
        </div>
      )}

      {status === 'error' && (
        <div className="rounded-lg flex items-start justify-between py-1.5 px-2 bg-destructive/10 text-destructive">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                tabIndex={0}
                aria-label={errorMessage}
                className="flex min-w-0 flex-1 items-start gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 whitespace-pre-wrap [overflow-wrap:anywhere]">{errorMessage}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent
              container={portalContainer}
              side="bottom"
              align="end"
              sideOffset={6}
              className="max-w-[min(360px,calc(100vw-32px))] max-h-[50vh] overflow-y-auto whitespace-pre-wrap [overflow-wrap:anywhere] text-left"
            >
              {errorMessage}
            </TooltipContent>
          </Tooltip>
          {onRetry && (
            <button
              onClick={onRetry}
              className="shrink-0 underline hover:no-underline whitespace-nowrap ml-2"
            >
              {t('ai:status.retry')}
            </button>
          )}
        </div>
      )}

      {status === 'disabled' && (
        <div className="rounded-lg flex items-center justify-between py-1.5 px-2 bg-muted text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            <span>{t('ai:status.notConfigured')}</span>
          </div>
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="underline hover:no-underline whitespace-nowrap ml-2"
            >
              {t('ai:status.configure')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
