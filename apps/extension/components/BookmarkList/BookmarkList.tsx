/**
 * 书签列表组件
 */
import { useState } from 'react';
import { Search, Loader2, BookmarkX } from 'lucide-react';
import { Input, cn } from '@hamhome/ui';
import { useDebounce } from '@hamhome/ui';
import { BookmarkCard } from './BookmarkCard';
import { EditBookmarkDialog } from './EditBookmarkDialog';
import { useBookmarks } from '@/hooks/useBookmarks';
import type { LocalBookmark } from '@/types';

interface BookmarkListProps {
  className?: string;
}

export function BookmarkList({ className }: BookmarkListProps) {
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 300);
  const [editingBookmark, setEditingBookmark] = useState<LocalBookmark | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const { bookmarks, loading, refresh, setQuery, deleteBookmark } = useBookmarks({
    search: debouncedSearch || undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // 搜索变化时更新查询
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    setQuery({
      search: value || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleEdit = (bookmark: LocalBookmark) => {
    setEditingBookmark(bookmark);
    setEditDialogOpen(true);
  };

  const handleDelete = async (bookmark: LocalBookmark) => {
    if (!confirm(`确定要删除"${bookmark.title}"吗？`)) return;

    try {
      await deleteBookmark(bookmark.id);
    } catch {
      alert('删除失败');
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 搜索框 */}
      <div className="p-3 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="搜索书签..."
            className="pl-8 h-8"
          />
        </div>
      </div>

      {/* 列表内容 */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="text-sm">加载中...</span>
          </div>
        ) : bookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
            <BookmarkX className="h-12 w-12 opacity-50" />
            <div className="text-center">
              <p className="text-sm font-medium">
                {searchInput ? '没有找到匹配的书签' : '还没有书签'}
              </p>
              <p className="text-xs mt-1">
                {searchInput ? '试试其他关键词' : '点击"收藏"开始收藏网页'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                onEdit={() => handleEdit(bookmark)}
                onDelete={() => handleDelete(bookmark)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      <EditBookmarkDialog
        bookmark={editingBookmark}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSaved={refresh}
        onDeleted={refresh}
      />
    </div>
  );
}

