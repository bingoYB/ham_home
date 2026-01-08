/**
 * useBookmarks Hook
 * 加载和管理书签列表
 */
import { useState, useEffect, useCallback } from 'react';
import { bookmarkStorage } from '@/lib/storage';
import type { LocalBookmark, BookmarkQuery } from '@/types';

interface UseBookmarksResult {
  bookmarks: LocalBookmark[];
  loading: boolean;
  error: string | null;
  query: BookmarkQuery;
  setQuery: (query: BookmarkQuery) => void;
  refresh: () => Promise<void>;
  deleteBookmark: (id: string) => Promise<void>;
}

export function useBookmarks(initialQuery?: BookmarkQuery): UseBookmarksResult {
  const [bookmarks, setBookmarks] = useState<LocalBookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<BookmarkQuery>(initialQuery || {});

  const fetchBookmarks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await bookmarkStorage.getBookmarks(query);
      setBookmarks(result);
    } catch (err) {
      console.error('[useBookmarks] Error:', err);
      setError('加载书签失败');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  const deleteBookmark = async (id: string) => {
    try {
      await bookmarkStorage.deleteBookmark(id);
      // 更新本地状态
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      console.error('[useBookmarks] Delete error:', err);
      throw err;
    }
  };

  return {
    bookmarks,
    loading,
    error,
    query,
    setQuery,
    refresh: fetchBookmarks,
    deleteBookmark,
  };
}

