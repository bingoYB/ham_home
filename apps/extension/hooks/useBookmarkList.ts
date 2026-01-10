/**
 * useBookmarkList Hook
 * 书签列表的业务逻辑层（包含批量操作）
 */
import { useState, useEffect, useCallback } from 'react';
import { bookmarkStorage } from '@/lib/storage';
import type { LocalBookmark, LocalCategory } from '@/types';

interface UseBookmarkListResult {
  // 数据状态
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  loading: boolean;

  // 搜索相关
  searchInput: string;
  setSearchInput: (value: string) => void;

  // 批量操作相关
  batchMode: boolean;
  selectedIds: Set<string>;
  batchProcessing: boolean;

  // 操作
  refresh: () => Promise<void>;
  deleteBookmark: (bookmark: LocalBookmark) => Promise<void>;
  toggleBatchMode: () => void;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  batchDelete: () => Promise<void>;
  batchAddTags: () => Promise<void>;
  batchChangeCategory: (categoryId: string) => Promise<void>;
}

export function useBookmarkList(): UseBookmarkListResult {
  // 数据状态
  const [bookmarks, setBookmarks] = useState<LocalBookmark[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // 搜索状态
  const [searchInput, setSearchInput] = useState('');

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  /**
   * 加载书签列表
   */
  const loadBookmarks = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await bookmarkStorage.getBookmarks({
        search: search || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      setBookmarks(result);
    } catch (err) {
      console.error('[useBookmarkList] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 加载分类列表
   */
  const loadCategories = useCallback(async () => {
    const cats = await bookmarkStorage.getCategories();
    setCategories(cats);
  }, []);

  // 初始加载
  useEffect(() => {
    loadBookmarks();
    loadCategories();
  }, [loadBookmarks, loadCategories]);

  // 搜索变化时重新加载
  useEffect(() => {
    const timer = setTimeout(() => {
      loadBookmarks(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput, loadBookmarks]);

  /**
   * 刷新书签列表
   */
  const refresh = useCallback(async () => {
    await loadBookmarks(searchInput);
  }, [loadBookmarks, searchInput]);

  /**
   * 删除单个书签
   */
  const deleteBookmark = useCallback(
    async (bookmark: LocalBookmark) => {
      if (!confirm(`确定要删除"${bookmark.title}"吗？`)) return;

      try {
        await bookmarkStorage.deleteBookmark(bookmark.id);
        setBookmarks((prev) => prev.filter((b) => b.id !== bookmark.id));
      } catch {
        alert('删除失败');
      }
    },
    []
  );

  // ========== 批量操作相关 ==========

  /**
   * 切换批量模式
   */
  const toggleBatchMode = useCallback(() => {
    setBatchMode((prev) => !prev);
    setSelectedIds(new Set());
  }, []);

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === bookmarks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookmarks.map((b) => b.id)));
    }
  }, [selectedIds.size, bookmarks]);

  /**
   * 切换单个书签的选中状态
   */
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  /**
   * 批量删除
   */
  const batchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;

    if (!confirm(`确定要删除选中的 ${selectedIds.size} 个书签吗？`)) return;

    setBatchProcessing(true);
    try {
      await bookmarkStorage.batchOperate({
        operation: 'delete',
        bookmarkIds: Array.from(selectedIds),
        permanent: false,
      });
      setSelectedIds(new Set());
      setBatchMode(false);
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '批量删除失败');
    } finally {
      setBatchProcessing(false);
    }
  }, [selectedIds, refresh]);

  /**
   * 批量添加标签
   */
  const batchAddTags = useCallback(async () => {
    const tagsInput = prompt('请输入要添加的标签（用逗号分隔）：');
    if (!tagsInput) return;

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t);
    if (tags.length === 0) return;

    setBatchProcessing(true);
    try {
      await bookmarkStorage.batchOperate({
        operation: 'addTags',
        bookmarkIds: Array.from(selectedIds),
        tags,
      });
      setSelectedIds(new Set());
      setBatchMode(false);
      await refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : '批量添加标签失败');
    } finally {
      setBatchProcessing(false);
    }
  }, [selectedIds, refresh]);

  /**
   * 批量更改分类
   */
  const batchChangeCategory = useCallback(
    async (categoryId: string) => {
      if (selectedIds.size === 0) return;

      setBatchProcessing(true);
      try {
        await bookmarkStorage.batchOperate({
          operation: 'changeCategory',
          bookmarkIds: Array.from(selectedIds),
          categoryId: categoryId === 'uncategorized' ? null : categoryId,
        });
        setSelectedIds(new Set());
        await refresh();
      } catch (error) {
        alert(error instanceof Error ? error.message : '批量更改分类失败');
      } finally {
        setBatchProcessing(false);
      }
    },
    [selectedIds, refresh]
  );

  return {
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
  };
}

