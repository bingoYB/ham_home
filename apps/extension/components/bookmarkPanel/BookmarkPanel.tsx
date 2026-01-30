/**
 * BookmarkPanel - 书签面板主容器
 * 整合 Header + List，管理面板展开/收起
 */
import { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@hamhome/ui';
import { BookmarkHeader } from './BookmarkHeader';
import { BookmarkListView } from './BookmarkListView';
import { AIChatPanel } from '@/components/aiSearch';
import { useBookmarkSearch } from '@/hooks/useBookmarkSearch';
import { useConversationalSearch } from '@/hooks/useConversationalSearch';
import { nanoid } from 'nanoid';
import { configStorage } from '@/lib/storage/config-storage';
import type { LocalBookmark, LocalCategory, PanelPosition, FilterCondition, CustomFilter } from '@/types';

export interface BookmarkPanelProps {
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  isOpen: boolean;
  position: PanelPosition;
  onClose: () => void;
  onOpenBookmark?: (url: string) => void;
  onOpenSettings?: () => void;
}

export function BookmarkPanel({
  bookmarks,
  categories,
  isOpen,
  position,
  onClose,
  onOpenBookmark,
  onOpenSettings,
}: BookmarkPanelProps) {
  // 自定义筛选器管理
  const [customFilters, setCustomFilters] = useState<CustomFilter[]>([]);
  const [selectedCustomFilterId, setSelectedCustomFilterId] = useState<string | undefined>();

  // 列表项引用（用于滚动定位）
  const bookmarkRefs = useRef<Map<string, HTMLElement>>(new Map());

  const { t } = useTranslation('bookmark');

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
  } = useConversationalSearch();

  // 加载自定义筛选器
  useEffect(() => {
    const loadCustomFilters = async () => {
      try {
        const filters = await configStorage.getCustomFilters();
        setCustomFilters(filters);
      } catch (error) {
        console.error(t('bookmark:contentPanel.loadCustomFiltersFailed'), error);
      }
    };
    loadCustomFilters();
  }, [t]);

  // 获取当前选中的自定义筛选器
  const selectedCustomFilter = useMemo(() => {
    if (!selectedCustomFilterId) return null;
    return customFilters.find((f) => f.id === selectedCustomFilterId) || null;
  }, [selectedCustomFilterId, customFilters]);

  // 搜索筛选
  const {
    searchQuery,
    setSearchQuery,
    selectedTags,
    toggleTagSelection,
    clearTagFilters,
    timeRange,
    setTimeRange,
    clearTimeFilter,
    filteredBookmarks: keywordFilteredBookmarks,
    hasFilters,
  } = useBookmarkSearch({
    bookmarks,
    categories,
    customFilter: selectedCustomFilter,
  });

  // 根据 AI 对话是否打开决定显示的书签列表
  const filteredBookmarks = useMemo(() => {
    if (isAIChatOpen && aiResults.length > 0) {
      // AI 对话模式下，按 AI 结果排序显示
      const aiBookmarkIds = aiResults.map((r) => r.bookmarkId);
      return bookmarks.filter((b) => aiBookmarkIds.includes(b.id));
    }
    return keywordFilteredBookmarks;
  }, [isAIChatOpen, aiResults, bookmarks, keywordFilteredBookmarks]);

  // 处理引用点击 - 滚动到对应书签
  const handleSourceClick = useCallback((bookmarkId: string) => {
    setHighlightedBookmarkId(bookmarkId);
    const element = bookmarkRefs.current.get(bookmarkId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 3秒后清除高亮
      setTimeout(() => setHighlightedBookmarkId(null), 3000);
    }
  }, [setHighlightedBookmarkId]);

  // 提取所有唯一标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  // ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 打开书签
  const handleOpenBookmark = useCallback((url: string) => {
    if (onOpenBookmark) {
      onOpenBookmark(url);
    } else {
      window.open(url, '_blank');
    }
  }, [onOpenBookmark]);

  // 处理遮罩点击 - 阻止事件冒泡到面板
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  }, [onClose]);

  // 阻止面板内部点击冒泡到遮罩
  const handlePanelClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // 保存自定义筛选器
  const handleSaveCustomFilter = useCallback(async (name: string, conditions: FilterCondition[]) => {
    const newFilter: CustomFilter = {
      id: nanoid(),
      name,
      conditions,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    try {
      await configStorage.addCustomFilter(newFilter);
      setCustomFilters((prev) => [...prev, newFilter]);
      // 自动应用新创建的筛选器
      setSelectedCustomFilterId(newFilter.id);
    } catch (error) {
      console.error(t('bookmark:contentPanel.saveCustomFilterFailed'), error);
    }
  }, [t]);

  // 选择自定义筛选器
  const handleSelectCustomFilter = useCallback((filterId: string | null) => {
    setSelectedCustomFilterId(filterId || undefined);
  }, []);

  return (
    <>
      {/* 背景遮罩 - 覆盖整个屏幕 */}
      <div
        className={cn(
          'absolute inset-0 z-1 bg-black/20 backdrop-blur-[2px] w-screen',
          'transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={handleOverlayClick}
      />

      {/* 面板 */}
      <div
        onClick={handlePanelClick}
        className={cn(
          'absolute top-1 bottom-1 z-2',
          'w-[360px] max-w-[90vw]',
          'bg-background border-border shadow-2xl',
          'flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-out',
          "rounded-lg",
          position === 'left'
            ? 'left-1 border-r'
            : 'right-1 border-l',
          isOpen
            ? 'translate-x-0'
            : position === 'left'
              ? '-translate-x-full -left-2'
              : 'translate-x-full -right-2'
        )}
      >
        {/* 头部 */}
        <BookmarkHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          bookmarkCount={bookmarks.length}
          filteredCount={filteredBookmarks.length}
          allTags={allTags}
          selectedTags={selectedTags}
          onToggleTag={toggleTagSelection}
          onClearTagFilter={clearTagFilters}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          onClearTimeFilter={clearTimeFilter}
          customFilters={customFilters}
          selectedCustomFilterId={selectedCustomFilterId}
          onSelectCustomFilter={handleSelectCustomFilter}
          onSaveCustomFilter={handleSaveCustomFilter}
        />

        {/* 列表 - 确保有明确高度限制以启用滚动 */}
        <BookmarkListView
          bookmarks={filteredBookmarks}
          categories={categories}
          searchQuery={searchQuery}
          hasFilters={hasFilters}
          highlightedBookmarkId={highlightedBookmarkId}
          bookmarkRefs={bookmarkRefs}
          onOpenBookmark={handleOpenBookmark}
          className="flex-1 min-h-0 pb-8"
        />

        {/* AI 对话面板（合并搜索栏和对话窗口） */}
        <AIChatPanel
          className='px-2 w-full'
          isOpen={isAIChatOpen}
          onClose={closeAIChat}
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
          onSuggestionClick={(suggestion) => {
            setAIQuery(suggestion);
            handleAISearch();
          }}
          onRetry={handleAISearch}
        />
      </div>
    </>
  );
}
