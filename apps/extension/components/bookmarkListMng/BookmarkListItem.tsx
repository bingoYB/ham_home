/**
 * 书签列表项组件 - 列表视图
 */
import {
  Link2,
  MoreHorizontal,
  ExternalLink,
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
import type { LocalBookmark } from '@/types';

export interface BookmarkListItemProps {
  bookmark: LocalBookmark;
  categoryName: string;
  formattedDate: string;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

export function BookmarkListItem({
  bookmark,
  categoryName,
  formattedDate,
  isSelected,
  onToggleSelect,
  onOpen,
  onEdit,
  onDelete,
  t,
}: BookmarkListItemProps) {
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
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-[shadow,background-color] hover:shadow-md ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
      }`}
    >
      {/* 选择框 */}
      <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </div>

      {/* 图标 */}
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {bookmark.favicon ? (
          <img
            src={bookmark.favicon}
            alt=""
            className="w-5 h-5 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <Link2 className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* 内容 - 点击打开链接 */}
      <a
        href={bookmark.url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-0 grow min-w-0"
      >
        <h3 className="font-medium text-foreground truncate" title={bookmark.title}>
          {bookmark.title}
        </h3>
        {bookmark.description && (
          <p className="text-xs text-muted-foreground truncate mt-1" title={bookmark.description}>
            {bookmark.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate max-w-[200px]">{hostname}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 truncate max-w-[100px]">{categoryName}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0 whitespace-nowrap">{formattedDate}</span>
        </div>
      </a>

      {/* 标签 - 支持两行展示 */}
      {bookmark.tags.length > 0 && (
        <div className="hidden lg:flex flex-wrap items-center gap-1.5 max-w-[240px] max-h-[52px] overflow-hidden">
          {bookmark.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* 更多操作下拉菜单 */}
      <div className="shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onOpen}>
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.open')}
            </DropdownMenuItem>
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
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t('bookmark:bookmark.delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
