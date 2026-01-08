/**
 * 书签卡片组件
 */
import { ExternalLink, Edit2, Trash2, Clock } from 'lucide-react';
import { Badge, Button, cn } from '@hamhome/ui';
import { formatRelativeTime } from '@hamhome/utils';
import type { LocalBookmark } from '@/types';

interface BookmarkCardProps {
  bookmark: LocalBookmark;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}

export function BookmarkCard({
  bookmark,
  onEdit,
  onDelete,
  className,
}: BookmarkCardProps) {
  const handleClick = () => {
    chrome.tabs.create({ url: bookmark.url });
  };

  return (
    <div
      className={cn(
        'group p-3 rounded-lg border hover:border-primary/50 transition-colors cursor-pointer',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex gap-3">
        {/* Favicon */}
        <div className="shrink-0 mt-0.5">
          {bookmark.favicon ? (
            <img
              src={bookmark.favicon}
              alt=""
              className="w-4 h-4 rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-4 h-4 rounded bg-muted flex items-center justify-center">
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm line-clamp-1 group-hover:text-primary transition-colors">
            {bookmark.title}
          </h3>

          {bookmark.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {bookmark.description}
            </p>
          )}

          {/* 标签 */}
          {bookmark.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {bookmark.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
              {bookmark.tags.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  +{bookmark.tags.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* 底部信息 */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>{formatRelativeTime(bookmark.createdAt)}</span>
            </div>

            {/* 操作按钮 */}
            <div
              className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onEdit}
                title="编辑"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                onClick={onDelete}
                title="删除"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

