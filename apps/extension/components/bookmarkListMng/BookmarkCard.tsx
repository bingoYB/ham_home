/**
 * 书签卡片组件 - 网格视图
 */
import {
  Folder,
  Calendar,
  Link2,
  MoreHorizontal,
  Edit,
  Copy,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  Badge,
  Checkbox,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hamhome/ui';
import { CATEGORY_COLOR } from '@/utils/bookmark-utils';
import type { LocalBookmark } from '@/types';

export interface BookmarkCardProps {
  bookmark: LocalBookmark;
  categoryName: string;
  formattedDate: string;
  isSelected: boolean;
  columnSize?: number;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function BookmarkCard({
  bookmark,
  categoryName,
  formattedDate,
  isSelected,
  columnSize = 356,
  onToggleSelect,
  onEdit,
  onDelete,
  t,
}: BookmarkCardProps) {
  const hostname = new URL(bookmark.url).hostname;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: bookmark.title,
        url: bookmark.url,
      });
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      style={{ width: columnSize }}
      className={`group bg-card rounded-2xl border transition-shadow hover:shadow-lg ${
        isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-border/80'
      }`}
    >
      <div className="p-4">
        {/* 顶部：checkbox、分类、创建时间、更多操作 */}
        <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs">
          {/* Checkbox */}
          <div
            className="flex items-center hover:text-foreground transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
          >
            <Checkbox checked={isSelected} className="h-4 w-4" />
          </div>

          {/* 分类 */}
          <div className="flex-1 min-w-0">
            <Badge
              variant="secondary"
              className={`text-xs px-2 py-0.5 gap-1 max-w-full ${CATEGORY_COLOR}`}
              title={categoryName}
            >
              <Folder className="h-3 w-3 shrink-0" />
              <span className="truncate">{categoryName}</span>
            </Badge>
          </div>

          {/* 创建时间 */}
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>

          {/* 更多操作 - 靠右 */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.copyLink')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.share')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('bookmark:bookmark.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 主体内容：点击打开链接 */}
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="block">
          {/* 图标 + 标题描述 */}
          <div className="flex gap-3">
            {/* 左侧图标 */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
              {bookmark.favicon ? (
                <img
                  src={bookmark.favicon}
                  alt=""
                  className="w-6 h-6 rounded"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <Link2 className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* 标题和描述 */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
                {bookmark.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bookmark.description || hostname}
              </p>
            </div>
          </div>
        </a>

        {/* 底部：所有标签 */}
        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
            {bookmark.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
