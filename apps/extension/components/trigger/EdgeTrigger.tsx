/**
 * EdgeTrigger - 边缘触发器组件
 * 在屏幕边缘显示一个触发区域，点击后展开书签面板
 */
import { Bookmark } from 'lucide-react';
import { cn } from '@hamhome/ui';
import type { PanelPosition } from '@/types';

export interface EdgeTriggerProps {
  position: PanelPosition;
  visible: boolean;
  onClick: () => void;
}

export function EdgeTrigger({ position, visible, onClick }: EdgeTriggerProps) {
  return (
    <div
      className={cn(
        'fixed top-1/2 -translate-y-1/2 z-[99998]',
        'transition-all duration-300 ease-out',
        position === 'left' ? 'left-0' : 'right-0',
        visible
          ? 'opacity-100 translate-x-0'
          : position === 'left'
            ? 'opacity-0 -translate-x-full'
            : 'opacity-0 translate-x-full'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex items-center justify-center',
          'w-10 h-16',
          'bg-background/95 backdrop-blur-sm',
          'border border-border shadow-lg',
          'hover:bg-muted transition-colors',
          'cursor-pointer',
          position === 'left'
            ? 'rounded-r-lg border-l-0'
            : 'rounded-l-lg border-r-0'
        )}
        title="打开书签面板"
      >
        <Bookmark className="h-5 w-5 text-foreground" />
      </button>
    </div>
  );
}
