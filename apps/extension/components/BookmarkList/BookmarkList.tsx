/**
 * 书签列表组件
 * UI 层：负责 JSX 渲染、样式布局、事件绑定
 */
import { useState } from 'react';
import {
  Search,
  Loader2,
  BookmarkX,
  CheckSquare,
  Square,
  Trash2,
  Tag,
  FolderInput,
  X,
} from 'lucide-react';
import {
  Input,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from '@hamhome/ui';
import { BookmarkCard } from './BookmarkCard';
import { EditBookmarkDialog } from './EditBookmarkDialog';
import { useBookmarkList } from './useBookmarkList';
import type { LocalBookmark } from '@/types';

interface BookmarkListProps {
  className?: string;
}

export function BookmarkList({ className }: BookmarkListProps) {
  const {
    bookmarks,
    categories,
    loading,
    searchInput,
    setSearchInput,
    batchMode,
    selectedIds,
    batchProcessing,
    refresh,
    deleteBookmark,
    toggleBatchMode,
    toggleSelectAll,
    toggleSelect,
    batchDelete,
    batchAddTags,
    batchChangeCategory,
  } = useBookmarkList();

  // 编辑弹窗状态（UI 交互状态，保留在组件内）
  const [editingBookmark, setEditingBookmark] = useState<LocalBookmark | null>(
    null
  );
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = (bookmark: LocalBookmark) => {
    setEditingBookmark(bookmark);
    setEditDialogOpen(true);
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* 搜索框和批量操作工具栏 */}
      <SearchAndToolbar
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        batchMode={batchMode}
        onToggleBatchMode={toggleBatchMode}
        selectedCount={selectedIds.size}
        totalCount={bookmarks.length}
        categories={categories}
        batchProcessing={batchProcessing}
        onToggleSelectAll={toggleSelectAll}
        onBatchAddTags={batchAddTags}
        onBatchChangeCategory={batchChangeCategory}
        onBatchDelete={batchDelete}
      />

      {/* 列表内容 */}
      <div className="flex-1 overflow-auto p-3">
        {loading ? (
          <LoadingState />
        ) : bookmarks.length === 0 ? (
          <EmptyState hasSearch={!!searchInput} />
        ) : (
          <div className="space-y-2">
            {bookmarks.map((bookmark) => (
              <BookmarkItem
                key={bookmark.id}
                bookmark={bookmark}
                batchMode={batchMode}
                isSelected={selectedIds.has(bookmark.id)}
                onSelect={() => toggleSelect(bookmark.id)}
                onEdit={() => handleEdit(bookmark)}
                onDelete={() => deleteBookmark(bookmark)}
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

// ========== 子组件 ==========

interface SearchAndToolbarProps {
  searchInput: string;
  onSearchChange: (value: string) => void;
  batchMode: boolean;
  onToggleBatchMode: () => void;
  selectedCount: number;
  totalCount: number;
  categories: { id: string; name: string }[];
  batchProcessing: boolean;
  onToggleSelectAll: () => void;
  onBatchAddTags: () => void;
  onBatchChangeCategory: (categoryId: string) => void;
  onBatchDelete: () => void;
}

function SearchAndToolbar({
  searchInput,
  onSearchChange,
  batchMode,
  onToggleBatchMode,
  selectedCount,
  totalCount,
  categories,
  batchProcessing,
  onToggleSelectAll,
  onBatchAddTags,
  onBatchChangeCategory,
  onBatchDelete,
}: SearchAndToolbarProps) {
  return (
    <div className="p-3 border-b space-y-2">
      {/* 搜索框 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索书签..."
            className="pl-8 h-8"
          />
        </div>
        <Button
          variant={batchMode ? 'default' : 'outline'}
          size="sm"
          onClick={onToggleBatchMode}
          className="h-8 px-3"
        >
          {batchMode ? (
            <>
              <X className="h-4 w-4 mr-1" />
              取消
            </>
          ) : (
            <>
              <CheckSquare className="h-4 w-4 mr-1" />
              批量
            </>
          )}
        </Button>
      </div>

      {/* 批量操作工具栏 */}
      {batchMode && (
        <BatchToolbar
          selectedCount={selectedCount}
          totalCount={totalCount}
          categories={categories}
          processing={batchProcessing}
          onToggleSelectAll={onToggleSelectAll}
          onAddTags={onBatchAddTags}
          onChangeCategory={onBatchChangeCategory}
          onDelete={onBatchDelete}
        />
      )}
    </div>
  );
}

interface BatchToolbarProps {
  selectedCount: number;
  totalCount: number;
  categories: { id: string; name: string }[];
  processing: boolean;
  onToggleSelectAll: () => void;
  onAddTags: () => void;
  onChangeCategory: (categoryId: string) => void;
  onDelete: () => void;
}

function BatchToolbar({
  selectedCount,
  totalCount,
  categories,
  processing,
  onToggleSelectAll,
  onAddTags,
  onChangeCategory,
  onDelete,
}: BatchToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950 rounded-md border border-blue-200 dark:border-blue-800">
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleSelectAll}
        className="h-7 px-2 text-xs"
      >
        {selectedCount === totalCount ? (
          <>
            <CheckSquare className="h-3 w-3 mr-1" />
            全不选
          </>
        ) : (
          <>
            <Square className="h-3 w-3 mr-1" />
            全选
          </>
        )}
      </Button>

      <div className="flex-1 text-xs text-muted-foreground">
        已选 {selectedCount} 项
      </div>

      {selectedCount > 0 && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddTags}
            disabled={processing}
            className="h-7 px-2 text-xs"
          >
            <Tag className="h-3 w-3 mr-1" />
            添加标签
          </Button>

          <Select
            value="changeCategory"
            onValueChange={(v) => {
              if (v !== 'changeCategory') {
                onChangeCategory(v);
              }
            }}
            disabled={processing}
          >
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <FolderInput className="h-3 w-3 mr-1" />
              <SelectValue placeholder="更改分类" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="changeCategory">更改分类</SelectItem>
              <SelectItem value="uncategorized">未分类</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={processing}
            className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            {processing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3 mr-1" />
            )}
            删除
          </Button>
        </>
      )}
    </div>
  );
}

interface BookmarkItemProps {
  bookmark: LocalBookmark;
  batchMode: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function BookmarkItem({
  bookmark,
  batchMode,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
}: BookmarkItemProps) {
  return (
    <div
      className={cn(
        'relative',
        batchMode && 'cursor-pointer',
        isSelected && 'ring-2 ring-blue-500 rounded-lg'
      )}
      onClick={() => batchMode && onSelect()}
    >
      {/* 批量模式选择指示器 */}
      {batchMode && (
        <div className="absolute top-2 left-2 z-10">
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-blue-600 bg-white rounded" />
          ) : (
            <Square className="h-5 w-5 text-gray-400 bg-white rounded" />
          )}
        </div>
      )}

      <BookmarkCard
        bookmark={bookmark}
        onEdit={() => !batchMode && onEdit()}
        onDelete={() => !batchMode && onDelete()}
        className={cn(batchMode && 'pointer-events-none')}
      />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin" />
      <span className="text-sm">加载中...</span>
    </div>
  );
}

interface EmptyStateProps {
  hasSearch: boolean;
}

function EmptyState({ hasSearch }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
      <BookmarkX className="h-12 w-12 opacity-50" />
      <div className="text-center">
        <p className="text-sm font-medium">
          {hasSearch ? '没有找到匹配的书签' : '还没有书签'}
        </p>
        <p className="text-xs mt-1">
          {hasSearch ? '试试其他关键词' : '点击"收藏"开始收藏网页'}
        </p>
      </div>
    </div>
  );
}
