/**
 * AIChatQuickActions - AI 聊天快速操作组件
 * 展示预设示例，帮助用户了解如何使用 AI 搜索
 */
import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@hamhome/ui';

export interface QuickAction {
  /** 示例标题 */
  title: string;
  /** 示例查询 */
  query: string;
  /** 图标类名 */
  icon?: string;
}

export interface AIChatQuickActionsProps {
  /** 点击示例回调 */
  onActionClick: (query: string) => void;
  /** 自定义类名 */
  className?: string;
}

export function AIChatQuickActions({ onActionClick, className }: AIChatQuickActionsProps) {
  const { t } = useTranslation('ai');
  const [isVisible, setIsVisible] = useState(true);

  // 如果用户关闭了，则不显示
  if (!isVisible) return null;

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

  return (
    <div className={cn('w-full mb-2', className)}>
      <div
        className={cn(
          'w-full p-3 rounded-xl',
          'bg-linear-to-r from-indigo-50/80 to-violet-50/80 backdrop-blur-sm',
          'dark:from-indigo-950/40 dark:to-violet-950/40',
          'border border-indigo-200/50 dark:border-indigo-800/50',
          'ring-1 ring-indigo-500/20'
        )}
      >
        {/* 快速操作按钮 */}
        <div className="flex flex-wrap items-center gap-2">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => onActionClick(action.query)}
              className={cn(
                'px-2.5 py-1.5 rounded-md',
                'bg-white/80 dark:bg-slate-900/80',
                'hover:bg-white dark:hover:bg-slate-900',
                'text-xs text-indigo-700 dark:text-indigo-300',
                'transition-colors duration-200',
                'whitespace-nowrap',
                'border border-indigo-200/30 dark:border-indigo-700/30'
              )}
            >
              {action.title}
            </button>
          ))}
          
          {/* 关闭按钮 */}
          <button
            onClick={() => setIsVisible(false)}
            className={cn(
              'p-1.5 rounded-md ml-auto',
              'text-indigo-400 hover:text-indigo-600 dark:text-indigo-500 dark:hover:text-indigo-300',
              'hover:bg-white/50 dark:hover:bg-slate-900/50',
              'transition-colors'
            )}
            title={t('ai:search.quickActions.dismiss')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
