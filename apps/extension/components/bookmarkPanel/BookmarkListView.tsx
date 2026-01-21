/**
 * BookmarkListView - 书签列表视图组件
 * 展示书签列表，支持滚动、空状态和分类树视图
 */
import { Bookmark, SearchX } from 'lucide-react';
import { cn } from '@hamhome/ui';
import { CategoryTreeView } from './CategoryTreeView';
import type { LocalBookmark, LocalCategory } from '@/types';

export interface BookmarkListViewProps {
  bookmarks: LocalBookmark[];
  categories?: LocalCategory[];
  emptyText?: string;
  searchQuery?: string;
  hasFilters?: boolean;
  onOpenBookmark?: (url: string) => void;
  className?: string;
}

export function BookmarkListView({
  bookmarks,
  categories = [],
  emptyText = '暂无书签',
  searchQuery,
  hasFilters,
  onOpenBookmark,
  className,
}: BookmarkListViewProps) {
  // 空状态
  if (bookmarks.length === 0) {
    return (
      <div className={cn('flex flex-col items-center justify-center h-full py-12', className)}>
        {searchQuery || hasFilters ? (
          <>
            <SearchX className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">未找到匹配的书签</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              尝试调整筛选条件
            </p>
          </>
        ) : (
          <>
            <Bookmark className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">{emptyText}</p>
          </>
        )}
      </div>
    );
  }

  // 使用分类树视图展示
  return (
    <CategoryTreeView
      bookmarks={bookmarks}
      categories={categories}
      onOpenBookmark={onOpenBookmark}
      className={cn('bookmark-list-view', className)}
    />
  );
}
