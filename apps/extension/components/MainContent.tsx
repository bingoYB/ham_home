/**
 * MainContent 主内容区组件
 * 展示书签列表，支持筛选、视图切换和批量操作
 */
import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  LayoutGrid,
  List,
  Tag,
  Trash2,
  X,
  ChevronDown,
  Folder,
  FolderX,
} from 'lucide-react';
import {
  Input,
  Button,
  Badge,
  Checkbox,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Masonry,
  cn,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { CategoryFilterDropdown } from '@/components/common/CategoryTree';
import { BookmarkCard, BookmarkListItem, EditBookmarkDialog } from '@/components/bookmarkListMng';
import { useBookmarkFilter } from '@/hooks/useBookmarkFilter';
import { useBookmarkSelection } from '@/hooks/useBookmarkSelection';
import { useMasonryLayout } from '@/hooks/useMasonryLayout';
import { getCategoryPath, formatDate } from '@/utils/bookmark-utils';
import type { LocalBookmark } from '@/types';

type ViewMode = 'grid' | 'list';

interface MainContentProps {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t, i18n } = useTranslation(['common', 'bookmark']);
  const { bookmarks, categories, allTags, deleteBookmark, refreshBookmarks } = useBookmarks();

  // 筛选逻辑
  const {
    searchQuery,
    selectedTags,
    selectedCategory,
    hasFilters,
    filteredBookmarks,
    setSearchQuery,
    setSelectedCategory,
    toggleTagSelection,
    clearFilters,
    clearSelectedTags,
  } = useBookmarkFilter(bookmarks);

  // 批量选择逻辑
  const {
    selectedIds,
    toggleSelect,
    toggleSelectAll,
    removeFromSelection,
    deselectAll,
  } = useBookmarkSelection();

  // 瀑布流布局
  const { containerRef: masonryContainerRef, config: masonryConfig } = useMasonryLayout();

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // 删除确认弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<LocalBookmark | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  // 编辑弹窗状态
  const [editingBookmark, setEditingBookmark] = useState<LocalBookmark | null>(null);

  // 获取分类路径的包装函数
  const getBookmarkCategoryPath = useCallback(
    (categoryId: string | null) =>
      getCategoryPath(categoryId, categories, t('bookmark:bookmark.uncategorized')),
    [categories, t]
  );

  // 格式化日期的包装函数
  const formatBookmarkDate = useCallback(
    (timestamp: number) =>
      formatDate(
        timestamp,
        i18n.language,
        t('common:common.today') || '今天',
        t('common:common.yesterday') || '昨天'
      ),
    [i18n.language, t]
  );

  // 打开书签
  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  // 处理编辑完成
  const handleEditSaved = () => {
    refreshBookmarks();
    setEditingBookmark(null);
  };

  // 删除书签 - 打开确认弹窗
  const handleDelete = (bookmark: LocalBookmark) => {
    setDeleteTarget(bookmark);
  };

  // 确认删除单个书签
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteBookmark(deleteTarget.id);
    removeFromSelection(deleteTarget.id);
    setDeleteTarget(null);
  };

  // 批量删除 - 打开确认弹窗
  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    setShowBatchDeleteDialog(true);
  };

  // 确认批量删除
  const confirmBatchDelete = async () => {
    for (const id of selectedIds) {
      await deleteBookmark(id);
    }
    deselectAll();
    setShowBatchDeleteDialog(false);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* 筛选栏 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 pt-6">
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：搜索框 */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t('bookmark:bookmark.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/50 border-border/50 focus:bg-muted"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* 右侧：筛选和视图切换 */}
          <div className="flex items-center gap-2">
            {/* 标签筛选 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={selectedTags.length > 0 ? 'secondary' : 'outline'}
                  size="sm"
                  className={cn(
                    'gap-2',
                  )}
                >
                  <Tag className="h-4 w-4" />
                  {selectedTags.length > 0
                    ? t('bookmark:bookmark.filter.selectedTags', { count: selectedTags.length })
                    : t('bookmark:bookmark.filter.tags')}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {allTags.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-2">{t('bookmark:tags.empty')}</p>
                    ) : (
                      allTags.map((tag) => (
                        <div
                          key={tag}
                          onClick={() => toggleTagSelection(tag)}
                          className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md hover:bg-muted text-sm text-left cursor-pointer"
                        >
                          <Checkbox checked={selectedTags.includes(tag)} />
                          <span className="truncate">{tag}</span>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                {selectedTags.length > 0 && (
                  <div className="border-t border-border mt-2 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={clearSelectedTags}
                    >
                      {t('bookmark:bookmark.filter.clearFilter')}
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* 分类筛选 */}
            <CategoryFilterDropdown
              categories={categories}
              value={selectedCategory}
              onChange={setSelectedCategory}
            />

            {/* 视图切换 */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title={t('bookmark:bookmark.view.grid')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title={t('bookmark:bookmark.view.list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 筛选状态和批量操作 */}
        {(hasFilters || selectedIds.size > 0) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            {/* 左侧：当前分类和筛选标签 */}
            <div className="flex items-center gap-2 flex-wrap">
              {selectedCategory !== 'all' && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-1 gap-1.5 cursor-pointer group/cat border"
                >
                  {selectedCategory === 'uncategorized' ? (
                    <FolderX className="h-3 w-3" />
                  ) : (
                    <Folder className="h-3 w-3" />
                  )}
                  {selectedCategory === 'uncategorized'
                    ? t('bookmark:bookmark.uncategorized')
                    : categories.find((c) => c.id === selectedCategory)?.name || selectedCategory}
                  <X
                    className="h-3 w-3 opacity-0 group-hover/cat:opacity-100 transition-opacity hover:text-foreground cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory('all');
                    }}
                  />
                </Badge>
              )}
              {selectedTags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-1 gap-1.5 cursor-pointer bg-linear-to-r from-violet-500/90 to-indigo-500/90 dark:from-violet-600/80 dark:to-indigo-600/80 text-white border-0 shadow-sm group/tag"
                >
                  {tag}
                  <X
                    className="h-3 w-3 hover:bg-white/20 rounded-full cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTagSelection(tag);
                    }}
                  />
                </Badge>
              ))}
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground h-6 px-2"
                >
                  <X className="h-3 w-3 mr-1" />
                  {t('bookmark:bookmark.filter.clearFilter')}
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {filteredBookmarks.length} {t('bookmark:bookmark.title')}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {filteredBookmarks.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSelectAll(filteredBookmarks.map((b) => b.id))}
                  className="text-muted-foreground"
                >
                  {selectedIds.size === filteredBookmarks.length
                    ? t('bookmark:bookmark.batch.deselectAll')
                    : t('bookmark:bookmark.batch.selectAll')}
                </Button>
              )}
              {selectedIds.size > 0 && (
                <>
                  <span className="text-sm text-muted-foreground">
                    {t('bookmark:bookmark.batch.selected', { count: selectedIds.size })}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBatchDelete}
                    className="bg-red-500 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-700 dark:text-white"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    {t('bookmark:bookmark.batch.delete')}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 书签列表 */}
      <div ref={masonryContainerRef} className="flex-1 overflow-auto p-6">
        {filteredBookmarks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p className="text-lg">
              {hasFilters ? t('bookmark:bookmark.emptyFilter') : t('bookmark:bookmark.empty')}
            </p>
            {hasFilters && (
              <Button variant="link" onClick={clearFilters} className="mt-2">
                {t('bookmark:bookmark.filter.clearFilter')}
              </Button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <Masonry
            brickId="id"
            bricks={filteredBookmarks}
            gutter={16}
            columnSize={masonryConfig.columnSize}
            columnNum={masonryConfig.cols}
            render={(bookmark) => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                categoryName={getBookmarkCategoryPath(bookmark.categoryId)}
                formattedDate={formatBookmarkDate(bookmark.createdAt)}
                isSelected={selectedIds.has(bookmark.id)}
                onToggleSelect={() => toggleSelect(bookmark.id)}
                onEdit={() => setEditingBookmark(bookmark)}
                onDelete={() => handleDelete(bookmark)}
                columnSize={masonryConfig.columnSize}
                t={t}
              />
            )}
          />
        ) : (
          <div className="space-y-2 w-full min-w-0">
            {filteredBookmarks.map((bookmark) => (
              <BookmarkListItem
                key={bookmark.id}
                bookmark={bookmark}
                categoryName={getBookmarkCategoryPath(bookmark.categoryId)}
                formattedDate={formatBookmarkDate(bookmark.createdAt)}
                isSelected={selectedIds.has(bookmark.id)}
                onToggleSelect={() => toggleSelect(bookmark.id)}
                onOpen={() => openBookmark(bookmark.url)}
                onEdit={() => setEditingBookmark(bookmark)}
                onDelete={() => handleDelete(bookmark)}
                t={t}
              />
            ))}
          </div>
        )}
      </div>

      {/* 编辑弹窗 */}
      {editingBookmark && (
        <EditBookmarkDialog
          bookmark={editingBookmark}
          onSaved={handleEditSaved}
          onClose={() => setEditingBookmark(null)}
        />
      )}

      {/* 单个删除确认弹窗 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bookmark:bookmark.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookmark:bookmark.deleteConfirm', { title: deleteTarget?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量删除确认弹窗 */}
      <AlertDialog open={showBatchDeleteDialog} onOpenChange={setShowBatchDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bookmark:bookmark.batch.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookmark:bookmark.batch.deleteConfirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common:common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBatchDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('common:common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
