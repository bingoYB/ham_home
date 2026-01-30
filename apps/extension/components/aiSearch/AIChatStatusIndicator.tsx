/**
 * AIChatStatusIndicator - AI 状态指示器
 */
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@hamhome/ui';
import type { AISearchStatus } from '@/types';

export interface AIChatStatusIndicatorProps {
  /** 当前状态 */
  status: AISearchStatus;
  /** 错误信息 */
  error?: string | null;
  /** 重试回调 */
  onRetry?: () => void;
}

export function AIChatStatusIndicator({
  status,
  error,
  onRetry,
}: AIChatStatusIndicatorProps) {
  const { t } = useTranslation('ai');

  switch (status) {
    case 'thinking':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('ai:search.status.thinking')}</span>
        </div>
      );
    case 'searching':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('ai:search.status.searching')}</span>
        </div>
      );
    case 'writing':
      return (
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">{t('ai:search.status.writing')}</span>
        </div>
      );
    case 'error':
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm">{error || t('ai:search.status.error')}</span>
          {onRetry && (
            <Button variant="ghost" size="sm" onClick={onRetry} className="h-6 px-2">
              <RefreshCw className="h-3 w-3 mr-1" />
              {t('ai:status.retry')}
            </Button>
          )}
        </div>
      );
    default:
      return null;
  }
}
