/**
 * MainContent 主内容区组件
 * 展示书签列表，支持筛选、视图切换和批量操作
 */
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  Filter,
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
import { BookmarkCard, BookmarkListItem, EditBookmarkDialog, SnapshotViewer } from '@/components/bookmarkListMng';
import { useSnapshot } from '@/hooks/useSnapshot';
import { FilterDropdownMenu } from '@/components/bookmarkPanel/FilterPopover';
import { CustomFilterDialog } from '@/components/bookmarkPanel/CustomFilterDialog';
import { useBookmarkSearch } from '@/hooks/useBookmarkSearch';
import { useBookmarkSelection } from '@/hooks/useBookmarkSelection';
import { useMasonryLayout } from '@/hooks/useMasonryLayout';
import { getCategoryPath, formatDate } from '@/utils/bookmark-utils';
import { configStorage } from '@/lib/storage/config-storage';
import type { LocalBookmark, CustomFilter, FilterCondition } from '@/types';

type ViewMode = 'grid' | 'list';

interface MainContentProps {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t, i18n } = useTranslation(['common', 'bookmark']);
  const { bookmarks, categories, allTags, deleteBookmark, refreshBookmarks } = useBookmarks();

  // 自定义筛选器状态
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [selectedCustomFilterId, setSelectedCustomFilterId] = useState<string | undefined>();
  const [customFilterDialogOpen, setCustomFilterDialogOpen] = useState(false);

  // 加载自定义筛选器
  useEffect(() => {
    const loadCustomFilters = async () => {
      try {
        const filters = await configStorage.getCustomFilters();
        setCustomFilters(filters);
      } catch (error) {
        console.error('[MainContent] Failed to load custom filters:', error);
      }
    };
    loadCustomFilters();
  }, []);

  // 选中的自定义筛选器
  const selectedCustomFilter = useMemo(() => {
    if (!selectedCustomFilterId) return null;
    return customFilters.find((f) => f.id === selectedCustomFilterId) || null;
  }, [selectedCustomFilterId, customFilters]);

  // 筛选逻辑（使用 useBookmarkSearch 支持时间范围和自定义筛选器）
  const {
    searchQuery,
    selectedTags,
    selectedCategory,
    timeRange,
    hasFilters,
    filteredBookmarks,
    setSearchQuery,
    setSelectedCategory,
    setTimeRange,
    toggleTagSelection,
    clearFilters,
    clearTagFilters,
    clearTimeFilter,
  } = useBookmarkSearch({
    bookmarks,
    categories,
    customFilter: selectedCustomFilter,
  });

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

  // 快照查看状态
  const [snapshotBookmark, setSnapshotBookmark] = useState<LocalBookmark | null>(null);
  const {
    snapshotUrl,
    loading: snapshotLoading,
    error: snapshotError,
    openSnapshot,
    closeSnapshot,
    deleteSnapshot,
  } = useSnapshot();

  // 保存自定义筛选器
  const handleSaveCustomFilter = useCallback(async (name: string, conditions: FilterCondition[]) => {
    const newFilter: CustomFilter = {
      id: `filter_${Date.now()}`,
      name,
      conditions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await configStorage.addCustomFilter(newFilter);
      setCustomFilters((prev) => [...prev, newFilter]);
      setSelectedCustomFilterId(newFilter.id);
    } catch (error) {
      console.error('[MainContent] Failed to save custom filter:', error);
    }
  }, []);

  // 选择自定义筛选器
  const handleSelectCustomFilter = useCallback((filterId: string | null) => {
    setSelectedCustomFilterId(filterId || undefined);
  }, []);

  // 清除筛选器（包括时间筛选和自定义筛选器）
  const handleClearFilter = useCallback(() => {
    clearTimeFilter();
    handleSelectCustomFilter(null);
  }, [clearTimeFilter, handleSelectCustomFilter]);

  // 判断是否有筛选器（时间筛选或自定义筛选器）
  const hasTimeOrCustomFilter = timeRange.type !== 'all' || !!selectedCustomFilterId;

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

  // 查看快照
  const handleViewSnapshot = (bookmark: LocalBookmark) => {
    setSnapshotBookmark(bookmark);
    openSnapshot(bookmark.id);
  };

  // 关闭快照查看器
  const handleCloseSnapshot = () => {
    setSnapshotBookmark(null);
    closeSnapshot();
  };

  // 删除快照
  const handleDeleteSnapshot = async () => {
    if (!snapshotBookmark) return;
    if (!confirm(t('bookmark:bookmark.snapshot.deleteConfirm'))) return;
    
    try {
      await deleteSnapshot(snapshotBookmark.id);
      refreshBookmarks();
      handleCloseSnapshot();
    } catch (err) {
      console.error('[MainContent] Failed to delete snapshot:', err);
    }
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
                      onClick={clearTagFilters}
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

            {/* 筛选器下拉菜单（时间范围和自定义筛选器） */}
            <FilterDropdownMenu
              timeRange={timeRange}
              onTimeRangeChange={setTimeRange}
              customFilters={customFilters}
              selectedCustomFilterId={selectedCustomFilterId}
              onSelectCustomFilter={handleSelectCustomFilter}
              onOpenCustomFilterDialog={() => setCustomFilterDialogOpen(true)}
              onClearFilter={handleClearFilter}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-9 w-9 border border-border',
                  hasTimeOrCustomFilter && 'text-primary bg-primary/10'
                )}
                title={t('bookmark:contentPanel.filter')}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </FilterDropdownMenu>

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
                onOpen={() => openBookmark(bookmark.url)}
                onEdit={() => setEditingBookmark(bookmark)}
                onDelete={() => handleDelete(bookmark)}
                onViewSnapshot={bookmark.hasSnapshot ? () => handleViewSnapshot(bookmark) : undefined}
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
                onViewSnapshot={bookmark.hasSnapshot ? () => handleViewSnapshot(bookmark) : undefined}
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

      {/* 自定义筛选器弹窗 */}
      <CustomFilterDialog
        open={customFilterDialogOpen}
        onOpenChange={setCustomFilterDialogOpen}
        onSave={handleSaveCustomFilter}
      />

      {/* 快照查看器 */}
      <SnapshotViewer
        open={!!snapshotBookmark}
        snapshotUrl={snapshotUrl}
        title={snapshotBookmark?.title || ''}
        loading={snapshotLoading}
        error={snapshotError}
        onClose={handleCloseSnapshot}
        onDelete={handleDeleteSnapshot}
        t={t}
      />
    </div>
  );
}
