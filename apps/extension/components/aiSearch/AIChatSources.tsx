/**
 * AIChatSources - AI 引用源列表
 */
import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, cn } from '@hamhome/ui';
import type { Source } from '@/types';

export interface AIChatSourcesProps {
  /** 引用源列表 */
  sources: Source[];
  /** 点击引用回调 */
  onSourceClick: (source: Source) => void;
}

/** 格式化相关度分数为百分比 */
function formatScore(score?: number): string {
  if (score === undefined || score === null) return '';
  return `${Math.round(score * 100)}%`;
}

/** 获取分数对应的颜色 */
function getScoreColor(score?: number): string {
  if (score === undefined || score === null) return 'text-muted-foreground';
  if (score >= 0.7) return 'text-green-600 dark:text-green-400';
  if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-orange-600 dark:text-orange-400';
}

export function AIChatSources({ sources, onSourceClick }: AIChatSourcesProps) {
  const { t } = useTranslation('ai');

  if (sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <p className="text-xs text-muted-foreground mb-2">{t('ai:search.sources')}</p>
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
          <span className="text-xs text-muted-foreground self-center">
            +{sources.length - 5}
          </span>
        )}
      </div>
    </div>
  );
}
