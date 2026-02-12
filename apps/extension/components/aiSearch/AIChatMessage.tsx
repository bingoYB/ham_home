/**
 * AIChatMessage - AI 消息组件
 */
import { useCallback } from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@hamhome/ui';
import type { ChatMessage, Source } from '@/types';

export interface AIChatMessageProps {
  /** 消息内容 */
  message: ChatMessage;
  /** 引用源列表（用于解析引用标记） */
  sources?: Source[];
  /** 点击引用回调 */
  onSourceClick: (source: Source) => void;
}

export function AIChatMessage({
  message,
  sources = [],
  onSourceClick,
}: AIChatMessageProps) {
  const sourceList = message.sources || sources;

  const renderContent = useCallback(() => {
    return message.content.split('\n').map((line, idx) => {
      const parts = line.split(/(\[\d+\])/g);
      return (
        <p key={idx} className="mb-2 last:mb-0">
          {parts.map((part, partIdx) => {
            const match = part.match(/^\[(\d+)\]$/);
            if (match) {
              const sourceIndex = parseInt(match[1], 10);
              const source = sourceList.find((s) => s.index === sourceIndex);
              if (source) {
                return (
                  <button
                    key={partIdx}
                    onClick={() => onSourceClick(source)}
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
  }, [message.content, sourceList, onSourceClick]);

  return (
    <div
      className={cn(
        'flex gap-2',
        message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <div
        className={cn(
          'shrink-0 rounded-full flex items-center justify-center h-7 w-7',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
        )}
      >
        {message.role === 'user' ? (
          <User className="h-4 w-4" />
        ) : (
          <Bot className="h-4 w-4" />
        )}
      </div>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
