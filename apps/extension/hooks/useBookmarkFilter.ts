/**
 * 书签筛选逻辑 Hook
 */
import { useState, useMemo, useCallback } from 'react';
import type { LocalBookmark } from '@/types';

interface UseBookmarkFilterResult {
  searchQuery: string;
  selectedTags: string[];
  selectedCategory: string;
  hasFilters: boolean;
  filteredBookmarks: LocalBookmark[];
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: string) => void;
  toggleTagSelection: (tag: string) => void;
  clearFilters: () => void;
  clearSelectedTags: () => void;
}

export function useBookmarkFilter(bookmarks: LocalBookmark[]): UseBookmarkFilterResult {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const filteredBookmarks = useMemo(() => {
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

        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [bookmarks, searchQuery, selectedTags, selectedCategory]);

  const toggleTagSelection = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedTags([]);
    setSelectedCategory('all');
  }, []);

  const clearSelectedTags = useCallback(() => {
    setSelectedTags([]);
  }, []);

  const hasFilters = searchQuery !== '' || selectedTags.length > 0 || selectedCategory !== 'all';

  return {
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
  };
}
