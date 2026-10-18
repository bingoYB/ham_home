/**
 * 书签批量选择逻辑 Hook
 */
import { useState, useCallback } from 'react';
import { retainVisibleSelection, toggleAllVisible } from '@/utils/bookmark-selection.utils';

export function useBookmarkSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  /** 对当前可见的 id 全选；已全部选中时清空 */
  const toggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => toggleAllVisible(prev, allIds));
  }, []);

  /**
   * 丢弃不在可见列表里的选中项。
   * 筛选 / 搜索条件变化后，被隐藏的书签不能继续留在选中集合里，否则批量操作会作用到看不见的书签。
   */
  const retainOnly = useCallback((visibleIds: readonly string[]) => {
    setSelectedIds((prev) => retainVisibleSelection(prev, visibleIds));
  }, []);

  const removeFromSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  }, []);

  return {
    selectedIds,
    toggleSelect,
    selectAll,
    deselectAll,
    toggleSelectAll,
    retainOnly,
    removeFromSelection,
  };
}
