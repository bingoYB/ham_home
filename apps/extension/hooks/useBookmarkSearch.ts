/**
 * useBookmarkSearch - 书签搜索筛选 Hook
 * 从 BookmarksPage.tsx 抽象的公共搜索能力
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import type { LocalBookmark, LocalCategory, CustomFilter, FilterCondition } from '@/types';

const SEMANTIC_SEARCH_MIN_SCORE = 0.3;

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
  customFilter?: CustomFilter | null; // 自定义筛选器
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
 * 应用单个筛选条件
 */
function applyFilterCondition(bookmark: LocalBookmark, condition: FilterCondition): boolean {
  const { field, operator, value } = condition;

  // 获取字段值
  let fieldValue: string | number;
  switch (field) {
    case 'title':
      fieldValue = bookmark.title;
      break;
    case 'url':
      fieldValue = bookmark.url;
      break;
    case 'description':
      fieldValue = bookmark.description;
      break;
    case 'tags':
      fieldValue = bookmark.tags.join(' ');
      break;
    case 'createdAt':
      fieldValue = bookmark.createdAt;
      break;
    default:
      return true;
  }

  // 对于字符串字段，转换为小写进行比较
  const isStringField = field !== 'createdAt';
  const compareValue = isStringField ? String(fieldValue).toLowerCase() : fieldValue;
  const compareTarget = isStringField ? value.toLowerCase() : Number(value);

  // 应用操作符
  switch (operator) {
    case 'equals':
      return compareValue === compareTarget;
    case 'notEquals':
      return compareValue !== compareTarget;
    case 'contains':
      return isStringField && String(compareValue).includes(String(compareTarget));
    case 'notContains':
      return isStringField && !String(compareValue).includes(String(compareTarget));
    case 'startsWith':
      return isStringField && String(compareValue).startsWith(String(compareTarget));
    case 'endsWith':
      return isStringField && String(compareValue).endsWith(String(compareTarget));
    case 'greaterThan':
      return !isStringField && Number(compareValue) > Number(compareTarget);
    case 'lessThan':
      return !isStringField && Number(compareValue) < Number(compareTarget);
    default:
      return true;
  }
}

/**
 * 应用自定义筛选器（所有条件必须同时满足 - AND 逻辑）
 */
function applyCustomFilter(bookmark: LocalBookmark, filter: CustomFilter): boolean {
  return filter.conditions.every((condition) => applyFilterCondition(bookmark, condition));
}

function matchesSearchQuery(bookmark: LocalBookmark, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return (
    bookmark.title.toLowerCase().includes(normalizedQuery) ||
    bookmark.description.toLowerCase().includes(normalizedQuery) ||
    bookmark.url.toLowerCase().includes(normalizedQuery) ||
    bookmark.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
  );
}

function matchesBookmarkFilters(
  bookmark: LocalBookmark,
  selectedTags: string[],
  selectedCategory: string,
  timeBounds: { start: number; end: number } | null,
  customFilter: CustomFilter | null,
): boolean {
  if (selectedTags.length > 0) {
    const hasAllTags = selectedTags.every((tag) => bookmark.tags.includes(tag));
    if (!hasAllTags) return false;
  }

  if (selectedCategory !== 'all') {
    if (selectedCategory === 'uncategorized') {
      if (bookmark.categoryId) return false;
    } else if (bookmark.categoryId !== selectedCategory) {
      return false;
    }
  }

  if (timeBounds) {
    if (bookmark.createdAt < timeBounds.start || bookmark.createdAt > timeBounds.end) {
      return false;
    }
  }

  if (customFilter && !applyCustomFilter(bookmark, customFilter)) {
    return false;
  }

  return true;
}

interface MergeBookmarkSearchResultsOptions {
  bookmarks: LocalBookmark[];
  searchQuery: string;
  semanticBookmarkIds: string[];
  selectedTags: string[];
  selectedCategory: string;
  timeRange: TimeRange;
  customFilter: CustomFilter | null;
}

export function mergeBookmarkSearchResults({
  bookmarks,
  searchQuery,
  semanticBookmarkIds,
  selectedTags,
  selectedCategory,
  timeRange,
  customFilter,
}: MergeBookmarkSearchResultsOptions): LocalBookmark[] {
  const timeBounds = getTimeRangeBounds(timeRange);
  const baseFilteredBookmarks = bookmarks.filter((bookmark) =>
    matchesBookmarkFilters(
      bookmark,
      selectedTags,
      selectedCategory,
      timeBounds,
      customFilter,
    ),
  );

  const normalizedQuery = searchQuery.trim();
  if (!normalizedQuery) {
    return baseFilteredBookmarks.sort((a, b) => b.createdAt - a.createdAt);
  }

  const keywordMatches = baseFilteredBookmarks
    .filter((bookmark) => matchesSearchQuery(bookmark, normalizedQuery))
    .sort((a, b) => b.createdAt - a.createdAt);
  const keywordIds = new Set(keywordMatches.map((bookmark) => bookmark.id));
  const bookmarkById = new Map(
    baseFilteredBookmarks.map((bookmark) => [bookmark.id, bookmark]),
  );
  const semanticMatches = semanticBookmarkIds
    .filter((id) => !keywordIds.has(id))
    .map((id) => bookmarkById.get(id))
    .filter((bookmark): bookmark is LocalBookmark => Boolean(bookmark));

  return [...keywordMatches, ...semanticMatches];
}

async function searchSemanticBookmarkIds(
  query: string,
  bookmarkCount: number,
): Promise<string[]> {
  const { isContentScriptContext } = await import('@/utils/browser-api');

  if (isContentScriptContext()) {
    const { getBackgroundService } = await import('@/lib/services');
    const bgService = getBackgroundService();
    const result = await bgService.semanticSearch(query, {
      topK: bookmarkCount,
      minScore: SEMANTIC_SEARCH_MIN_SCORE,
    });
    return result.items.map((item) => item.bookmarkId);
  }

  const { semanticRetriever } = await import('@/lib/search/semantic-retriever');
  if (!(await semanticRetriever.isAvailable())) {
    return [];
  }

  const result = await semanticRetriever.search(query, {
    topK: bookmarkCount,
    minScore: SEMANTIC_SEARCH_MIN_SCORE,
  });
  return result.items.map((item) => item.bookmarkId);
}

/**
 * 书签搜索筛选 Hook
 */
export function useBookmarkSearch({
  bookmarks,
  initialState = {},
  customFilter = null,
}: UseBookmarkSearchOptions): BookmarkSearchResult {
  // 筛选状态
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(initialState.selectedTags || []);
  const [selectedCategory, setSelectedCategory] = useState(initialState.selectedCategory || 'all');
  const [timeRange, setTimeRange] = useState<TimeRange>(
    initialState.timeRange || { type: 'all' }
  );
  const [semanticBookmarkIds, setSemanticBookmarkIds] = useState<string[]>([]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSemanticBookmarkIds([]);
      return;
    }

    let cancelled = false;

    async function runSemanticSearch() {
      try {
        const ids = await searchSemanticBookmarkIds(query, bookmarks.length);
        if (!cancelled) {
          setSemanticBookmarkIds(ids);
        }
      } catch (error) {
        console.warn('[useBookmarkSearch] Semantic search failed, fallback to keyword search', error);
        if (!cancelled) {
          setSemanticBookmarkIds([]);
        }
      }
    }

    const timer = window.setTimeout(runSemanticSearch, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [bookmarks.length, searchQuery]);

  const filteredBookmarks = useMemo(() => {
    return mergeBookmarkSearchResults({
      bookmarks,
      searchQuery,
      semanticBookmarkIds,
      selectedTags,
      selectedCategory,
      timeRange,
      customFilter,
    });
  }, [
    bookmarks,
    searchQuery,
    semanticBookmarkIds,
    selectedTags,
    selectedCategory,
    timeRange,
    customFilter,
  ]);

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
