/**
 * BookmarkListItem - 书签列表项组件
 * 显示单个书签，支持点击打开
 */
import { Link2, ExternalLink } from 'lucide-react';
import { cn, HoverCard, HoverCardTrigger, HoverCardPrimitive, buttonVariants } from '@hamhome/ui';
import { useContentUI } from '@/utils/ContentUIContext';
import type { LocalBookmark } from '@/types';

export interface BookmarkListItemProps {
  bookmark: LocalBookmark;
  isHighlighted?: boolean;
}

export function BookmarkListItem({ bookmark, isHighlighted = false }: BookmarkListItemProps) {
  const { container: portalContainer } = useContentUI();

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'group flex items-center gap-3 px-3 py-2.5 w-full justify-start border-0 shadow-none',
            isHighlighted && 'ring-2 ring-indigo-500/50 bg-indigo-50/50 dark:bg-indigo-950/20 animate-pulse rounded-lg'
          )}
        >
          {/* Favicon */}
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0">
            {bookmark.favicon ? (
              <img
                src={bookmark.favicon}
                alt=""
                className="w-5 h-5 rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <Link2 className={cn('h-4 w-4', bookmark.favicon && 'hidden')} />
          </div>

          {/* 标题 */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium truncate leading-tight">
              {bookmark.title}
            </h4>
          </div>

          {/* 打开图标 */}
          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </a>
      </HoverCardTrigger>
      <HoverCardPrimitive.Portal container={portalContainer}>
        <HoverCardPrimitive.Content
          side="right"
          align="start"
          sideOffset={4}
          className={cn(
            'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-md border p-4 shadow-md outline-hidden max-w-xs',
          )}
        >
          <div className="space-y-1">
            <div className="font-medium">{bookmark.title}</div>
            {bookmark.description && (
              <div className="text-xs text-muted-foreground">{bookmark.description}</div>
            )}
            <div className="text-xs text-muted-foreground break-all">{bookmark.url}</div>
          </div>
        </HoverCardPrimitive.Content>
      </HoverCardPrimitive.Portal>
    </HoverCard>
  );
}
