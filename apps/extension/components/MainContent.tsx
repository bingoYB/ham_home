/**
 * MainContent 主内容区组件
 * 展示书签列表，支持筛选、视图切换和批量操作
 */
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LayoutGrid,
  List,
  Tag,
  Trash2,
  X,
  ChevronDown,
  Folder,
  FolderX,
  Filter,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import {
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
  toast,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { CategoryFilterDropdown } from '@/components/common/CategoryTree';
import { BookmarkCard, BookmarkListItem, EditBookmarkDialog, SnapshotViewer, BatchTagDialog, BatchMoveCategoryDialog } from '@/components/bookmarkListMng';
import { SearchInputArea, AIChatPanel } from '@/components/aiSearch';
import { useSnapshot } from '@/hooks/useSnapshot';
import { FilterDropdownMenu } from '@/components/bookmarkPanel/FilterPopover';
import { CustomFilterDialog } from '@/components/bookmarkPanel/CustomFilterDialog';
import { useBookmarkSearch } from '@/hooks/useBookmarkSearch';
import { useBookmarkSelection } from '@/hooks/useBookmarkSelection';
import { useMasonryLayout } from '@/hooks/useMasonryLayout';
import { useConversationalSearch } from '@/hooks/useConversationalSearch';
import { useVirtualBookmarkList } from '@/hooks/useVirtualBookmarkList';
import { getCategoryPath, formatDate } from '@/utils/bookmark-utils';
import { configStorage } from '@/lib/storage/config-storage';
import type { LocalBookmark, CustomFilter, FilterCondition, Suggestion } from '@/types';

type ViewMode = 'grid' | 'list';

interface MainContentProps {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t, i18n } = useTranslation(['common', 'bookmark', 'ai']);
  const { bookmarks, categories, allTags, deleteBookmark, refreshBookmarks } = useBookmarks();

  // 自定义筛选器状态
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [selectedCustomFilterId, setSelectedCustomFilterId] = useState<string | undefined>();
  const [customFilterDialogOpen, setCustomFilterDialogOpen] = useState(false);

  // 书签卡片引用（用于滚动定位）- grid 视图使用
  const bookmarkRefsForGrid = useRef<Map<string, HTMLElement>>(new Map());

  // 瀑布流组件引用（用于触发重排）
  const masonryRef = useRef<{ relayout: () => void } | null>(null);

  // AI 对话式搜索
  const {
    query: aiQuery,
    setQuery: setAIQuery,
    messages: aiMessages,
    currentAnswer: aiCurrentAnswer,
    status: aiStatus,
    error: aiError,
    results: aiResults,
    suggestions: aiSuggestions,
    highlightedBookmarkId,
    setHighlightedBookmarkId,
    handleSearch: handleAISearch,
    closeChat: closeAIChat,
    isChatOpen: isAIChatOpen,
    resultBookmarkIds: aiResultBookmarkIds,
  } = useConversationalSearch();

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
    filteredBookmarks: keywordFilteredBookmarks,
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

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // 根据 AI 对话是否打开决定显示的书签列表
  const filteredBookmarks = useMemo(() => {
    if (isAIChatOpen && aiResults.length > 0) {
      // AI 对话模式下，在 AI 结果的基础上应用其他筛选条件
      // 创建一个已筛选书签的 Set，用于快速查找
      const filteredBookmarkIds = new Set(keywordFilteredBookmarks.map((b) => b.id));
      
      // 保持 AI 结果的相关性排序，只保留满足其他筛选条件的书签
      return aiResults
        .map((r) => r.bookmarkId)
        .filter((id) => filteredBookmarkIds.has(id))
        .map((id) => bookmarks.find((b) => b.id === id))
        .filter((b): b is LocalBookmark => b !== undefined);
    }
    return keywordFilteredBookmarks;
  }, [isAIChatOpen, aiResults, keywordFilteredBookmarks, bookmarks]);

  // 处理关键词搜索查询变化
  const handleKeywordQueryChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, [setSearchQuery]);

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

  // 虚拟列表（列表视图）
  const {
    parentRef: virtualListParentRef,
    virtualItems,
    totalSize: virtualListTotalSize,
    scrollToBookmark,
    bookmarkRefs: virtualBookmarkRefs,
  } = useVirtualBookmarkList({
    items: filteredBookmarks,
    estimateSize: 104, // 88px content + 16px gap
    overscan: 5,
  });

  // 处理引用点击 - 滚动到对应书签
  const handleSourceClick = useCallback((bookmarkId: string) => {
    setHighlightedBookmarkId(bookmarkId);
    if (viewMode === 'list') {
      // 列表视图使用虚拟列表滚动
      scrollToBookmark(bookmarkId);
    } else {
      // 网格视图使用 ref 滚动
      const element = bookmarkRefsForGrid.current.get(bookmarkId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    // 3秒后清除高亮
    setTimeout(() => setHighlightedBookmarkId(null), 3000);
  }, [setHighlightedBookmarkId, viewMode, scrollToBookmark]);

  // 处理 AI 建议点击
  const handleAISuggestionClick = useCallback(async (suggestion: Suggestion) => {
    const { action, payload, label } = suggestion;

    switch (action) {
      case 'copyAllLinks': {
        // 复制所有链接
        const links = aiResultBookmarkIds
          .map((id) => bookmarks.find((b) => b.id === id)?.url)
          .filter(Boolean)
          .join('\n');

        if (links) {
          await navigator.clipboard.writeText(links);
          toast.success(t('ai:suggestion.copySuccess'), {
            position: "top-center"
          });
        }
        break;
      }

      case 'batchAddTags': {
        // 批量打标签 - 先选中所有 AI 结果书签，再打开弹窗
        for (const id of aiResultBookmarkIds) {
          if (!selectedIds.has(id)) {
            toggleSelect(id);
          }
        }
        setShowBatchTagDialog(true);
        break;
      }

      case 'batchMoveCategory': {
        // 批量移动分类 - 先选中所有 AI 结果书签，再打开弹窗
        for (const id of aiResultBookmarkIds) {
          if (!selectedIds.has(id)) {
            toggleSelect(id);
          }
        }
        setShowBatchMoveCategoryDialog(true);
        break;
      }

      case 'showMore':
      case 'timeFilter':
      case 'domainFilter':
      case 'categoryFilter':
      case 'semanticOnly':
      case 'keywordOnly':
      case 'findDuplicates':
      case 'text':
      default: {
        // 文本类建议 - 放入输入框并搜索
        setAIQuery(label);
        handleAISearch();
        break;
      }
    }
  }, [aiResultBookmarkIds, bookmarks, selectedIds, toggleSelect, setAIQuery, handleAISearch, toast, t]);

  // 删除确认弹窗状态
  const [deleteTarget, setDeleteTarget] = useState<LocalBookmark | null>(null);
  const [showBatchDeleteDialog, setShowBatchDeleteDialog] = useState(false);

  // 批量打标签弹窗状态
  const [showBatchTagDialog, setShowBatchTagDialog] = useState(false);

  // 批量迁移分类弹窗状态
  const [showBatchMoveCategoryDialog, setShowBatchMoveCategoryDialog] = useState(false);

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

  // 批量打标签
  const handleBatchAddTags = async (tags: string[]) => {
    if (tags.length === 0 || selectedIds.size === 0) return;
    try {
      await bookmarkStorage.batchAddTags(Array.from(selectedIds), tags);
      await refreshBookmarks();
      // 瀑布流视图需要重排
      if (viewMode === 'grid' && masonryRef.current) {
        // 延迟一下确保 DOM 更新完成
        setTimeout(() => {
          masonryRef.current?.relayout();
        }, 100);
      }
    } catch (error) {
      console.error('[MainContent] Failed to batch add tags:', error);
      throw error;
    }
  };

  // 批量迁移分类
  const handleBatchMoveCategory = async (categoryId: string | null) => {
    if (selectedIds.size === 0) return;
    try {
      await bookmarkStorage.batchChangeCategory(Array.from(selectedIds), categoryId);
      await refreshBookmarks();
      // 瀑布流视图需要重排
      if (viewMode === 'grid' && masonryRef.current) {
        // 延迟一下确保 DOM 更新完成
        setTimeout(() => {
          masonryRef.current?.relayout();
        }, 100);
      }
    } catch (error) {
      console.error('[MainContent] Failed to batch move category:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col bg-background h-full">
      {/* 筛选栏 */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 pt-6">
        <div className="flex items-start justify-between gap-4">
          {/* 左侧：关键词搜索框 */}
          <div className="w-full max-w-md">
            <SearchInputArea
              value={searchQuery}
              onChange={handleKeywordQueryChange}
            />
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
        {(hasFilters || selectedIds.size > 0 || (isAIChatOpen && aiResults.length > 0)) && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            {/* 左侧：当前分类和筛选标签 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* AI 搜索筛选指示器 */}
              {isAIChatOpen && aiResults.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs px-2 py-1 gap-1.5 cursor-pointer bg-linear-to-r from-blue-500/90 to-cyan-500/90 dark:from-blue-600/80 dark:to-cyan-600/80 text-white border-0 shadow-sm group/ai"
                >
                  <Sparkles className="h-3 w-3" />
                  {t('ai:search.aiFiltered', { count: aiResults.length })}
                  <X
                    className="h-3 w-3 hover:bg-white/20 rounded-full cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      closeAIChat();
                      deselectAll();
                    }}
                  />
                </Badge>
              )}
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
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBatchTagDialog(true)}
                  >
                    <Tag className="h-4 w-4 mr-1" />
                    {t('bookmark:bookmark.batch.addTags')}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowBatchMoveCategoryDialog(true)}
                  >
                    <FolderOpen className="h-4 w-4 mr-1" />
                    {t('bookmark:bookmark.batch.moveCategory')}
                  </Button>
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
      <div
        ref={viewMode === 'grid' ? masonryContainerRef : virtualListParentRef}
        className={cn(
          'flex-1 overflow-auto',
          viewMode === 'grid' ? 'p-6' : 'p-6'
        )}
      >
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
            ref={masonryRef}
            brickId="id"
            bricks={filteredBookmarks}
            gutter={16}
            columnSize={masonryConfig.columnSize}
            columnNum={masonryConfig.cols}
            scrollElement={() => {
              return document.querySelector('#main-content>div');
            }}
            render={(bookmark) => (
              <div
                key={bookmark.id}
                ref={(el) => {
                  if (el) bookmarkRefsForGrid.current.set(bookmark.id, el);
                }}
              >
                <BookmarkCard
                  bookmark={bookmark}
                  categoryName={getBookmarkCategoryPath(bookmark.categoryId)}
                  formattedDate={formatBookmarkDate(bookmark.createdAt)}
                  isSelected={selectedIds.has(bookmark.id)}
                  isHighlighted={highlightedBookmarkId === bookmark.id}
                  onToggleSelect={() => toggleSelect(bookmark.id)}
                  onOpen={() => openBookmark(bookmark.url)}
                  onEdit={() => setEditingBookmark(bookmark)}
                  onDelete={() => handleDelete(bookmark)}
                  onViewSnapshot={bookmark.hasSnapshot ? () => handleViewSnapshot(bookmark) : undefined}
                  columnSize={masonryConfig.columnSize}
                  t={t}
                />
              </div>
            )}
          />
        ) : (
          <div
            className="relative w-full"
            style={{ height: `${virtualListTotalSize}px` }}
          >
            {virtualItems.map((virtualItem) => {
              const bookmark = filteredBookmarks[virtualItem.index];
              if (!bookmark) return null;
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={(el) => {
                    if (el) virtualBookmarkRefs.current.set(bookmark.id, el);
                  }}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${virtualItem.start}px`,
                    height: `${virtualItem.size}px`,
                  }}
                >
                  <BookmarkListItem
                    bookmark={bookmark}
                    categoryName={getBookmarkCategoryPath(bookmark.categoryId)}
                    formattedDate={formatBookmarkDate(bookmark.createdAt)}
                    isSelected={selectedIds.has(bookmark.id)}
                    isHighlighted={highlightedBookmarkId === bookmark.id}
                    onToggleSelect={() => toggleSelect(bookmark.id)}
                    onOpen={() => openBookmark(bookmark.url)}
                    onEdit={() => setEditingBookmark(bookmark)}
                    onDelete={() => handleDelete(bookmark)}
                    onViewSnapshot={bookmark.hasSnapshot ? () => handleViewSnapshot(bookmark) : undefined}
                    t={t}
                  />
                </div>
              );
            })}
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

      {/* 批量打标签弹窗 */}
      <BatchTagDialog
        open={showBatchTagDialog}
        onOpenChange={setShowBatchTagDialog}
        selectedCount={selectedIds.size}
        allTags={allTags}
        onConfirm={handleBatchAddTags}
      />

      {/* 批量迁移分类弹窗 */}
      <BatchMoveCategoryDialog
        open={showBatchMoveCategoryDialog}
        onOpenChange={setShowBatchMoveCategoryDialog}
        selectedCount={selectedIds.size}
        categories={categories}
        onConfirm={handleBatchMoveCategory}
      />

      {/* AI 对话面板（sticky 吸底） */}
      <AIChatPanel
        isOpen={isAIChatOpen}
        onClose={() => {
          closeAIChat();
          deselectAll();
        }}
        query={aiQuery}
        onQueryChange={setAIQuery}
        onSubmit={handleAISearch}
        messages={aiMessages}
        currentAnswer={aiCurrentAnswer}
        status={aiStatus}
        error={aiError}
        sources={aiResults}
        onSourceClick={handleSourceClick}
        suggestions={aiSuggestions}
        onSuggestionClick={handleAISuggestionClick}
        onRetry={handleAISearch}
      />
    </div>
  );
}
