/**
 * useBookmarkSearch - 书签搜索筛选 Hook
 * 从 MainContent.tsx 抽象的公共搜索能力
 */
import { useState, useMemo, useCallback } from 'react';
import type { LocalBookmark, LocalCategory } from '@/types';

/**
 * 时间范围筛选类型
 */
export type TimeRangeType = 'all' | 'today' | 'week' | 'month' | 'year' | 'custom';

/**
 * 时间范围配置
 */
export interface TimeRange {
  type: TimeRangeType;
  startDate?: number; // 时间戳
  endDate?: number;   // 时间戳
}

export interface BookmarkSearchState {
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string; // 'all' | 'uncategorized' | categoryId
  timeRange: TimeRange;
}

export interface BookmarkSearchResult {
  // 状态
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string;
  timeRange: TimeRange;
  filteredBookmarks: LocalBookmark[];
  hasFilters: boolean;

  // 操作
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedCategory: (categoryId: string) => void;
  setTimeRange: (range: TimeRange) => void;
  toggleTagSelection: (tag: string) => void;
  clearFilters: () => void;
  clearTagFilters: () => void;
  clearTimeFilter: () => void;
}

export interface UseBookmarkSearchOptions {
  bookmarks: LocalBookmark[];
  categories?: LocalCategory[];
  initialState?: Partial<BookmarkSearchState>;
}

/**
 * 获取时间范围的起止时间戳
 */
function getTimeRangeBounds(range: TimeRange): { start: number; end: number } | null {
  if (range.type === 'all') return null;

  const now = new Date();
  const end = now.getTime();
  let start: number;

  switch (range.type) {
    case 'today': {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      start = today.getTime();
      break;
    }
    case 'week': {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      start = weekAgo.getTime();
      break;
    }
    case 'month': {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      start = monthAgo.getTime();
      break;
    }
    case 'year': {
      const yearAgo = new Date(now);
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      start = yearAgo.getTime();
      break;
    }
    case 'custom': {
      if (range.startDate === undefined || range.endDate === undefined) return null;
      return { start: range.startDate, end: range.endDate };
    }
    default:
      return null;
  }

  return { start, end };
}

/**
 * 书签搜索筛选 Hook
 */
export function useBookmarkSearch({
  bookmarks,
  initialState = {},
}: UseBookmarkSearchOptions): BookmarkSearchResult {
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialState.selectedTags || []);
  const [selectedCategory, setSelectedCategory] = useState(initialState.selectedCategory || 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialState.timeRange || { type: 'all' }
  );

  // 过滤书签
  const filteredBookmarks = useMemo(() => {
    const timeBounds = getTimeRangeBounds(timeRange);

    return bookmarks
      .filter((b) => {
        // 关键词搜索
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesSearch =
            b.title.toLowerCase().includes(query) ||
            b.description.toLowerCase().includes(query) ||
            b.url.toLowerCase().includes(query) ||
            b.tags.some((t) => t.toLowerCase().includes(query));
          if (!matchesSearch) return false;
        }

        // 标签筛选
        if (selectedTags.length > 0) {
          const hasAllTags = selectedTags.every((tag) => b.tags.includes(tag));
          if (!hasAllTags) return false;
        }

        // 分类筛选
        if (selectedCategory !== 'all') {
          if (selectedCategory === 'uncategorized') {
            if (b.categoryId) return false;
          } else if (b.categoryId !== selectedCategory) {
            return false;
          }
        }

        // 时间范围筛选
        if (timeBounds) {
          if (b.createdAt < timeBounds.start || b.createdAt > timeBounds.end) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks, searchQuery, selectedTags, selectedCategory, timeRange]);

  // 切换标签选择
  const toggleTagSelection = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  // 清除所有筛选
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategory('all');
    setTimeRange({ type: 'all' });
  }, []);

  // 清除标签筛选
  const clearTagFilters = useCallback(() => {
    setSelectedTags([]);
  }, []);

  // 清除时间筛选
  const clearTimeFilter = useCallback(() => {
    setTimeRange({ type: 'all' });
  }, []);

  const hasFilters =
    searchQuery !== '' ||
    selectedTags.length > 0 ||
    selectedCategory !== 'all' ||
    timeRange.type !== 'all';

  return {
    searchQuery,
    selectedTags,
    selectedCategory,
    timeRange,
    filteredBookmarks,
    hasFilters,
    setSearchQuery,
    setSelectedTags,
    setSelectedCategory,
    setTimeRange,
    toggleTagSelection,
    clearFilters,
    clearTagFilters,
    clearTimeFilter,
  };
}
