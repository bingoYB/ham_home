'use client';

import { Folder, Calendar, MoreHorizontal, Bookmark as BookmarkIcon } from 'lucide-react';
import { Badge, Button } from '@hamhome/ui';
import type { Bookmark, Category } from '@/data/mock-bookmarks';
import { getCategoryName, formatRelativeDate } from '@/data/mock-bookmarks';

interface BookmarkCardDemoProps {
  bookmark: Bookmark;
  categories: Category[];
  isEn: boolean;
}

export function BookmarkCardDemo({ bookmark, categories, isEn }: BookmarkCardDemoProps) {
  const categoryName = getCategoryName(bookmark.categoryId, categories, isEn);
  const formattedDate = formatRelativeDate(bookmark.createdAt, isEn);

  return (
    <div className="group bg-card rounded-2xl border border-border hover:border-border/80 transition-shadow hover:shadow-lg">
      <div className="p-4">
        {/* 顶部：分类、创建时间、更多操作 */}
        <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs">
          {/* 分类 */}
          <div className="flex-1 min-w-0">
            <Badge
              variant="secondary"
              className="text-xs px-2 py-0.5 gap-1 max-w-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
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

          {/* 更多操作 */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>

        {/* 主体内容 */}
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
              <BookmarkIcon className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          {/* 标题和描述 */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
              {bookmark.title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {bookmark.description}
            </p>
          </div>
        </div>

        {/* 底部标签 */}
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
