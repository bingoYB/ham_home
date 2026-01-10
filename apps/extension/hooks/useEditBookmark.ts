/**
 * useEditBookmark Hook
 * 编辑书签弹窗的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { bookmarkStorage } from '@/lib/storage';
import type { LocalBookmark, LocalCategory } from '@/types';

interface UseEditBookmarkProps {
  bookmark: LocalBookmark | null;
  open: boolean;
  onSaved?: () => void;
  onDeleted?: () => void;
  onClose?: () => void;
}

interface UseEditBookmarkResult {
  // 表单状态
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];

  // 操作状态
  saving: boolean;
  deleting: boolean;

  // 表单操作
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCategoryId: (value: string | null) => void;
  setTags: (value: string[]) => void;

  // 业务操作
  save: () => Promise<void>;
  deleteBookmark: () => Promise<void>;
}

export function useEditBookmark({
  bookmark,
  open,
  onSaved,
  onDeleted,
  onClose,
}: UseEditBookmarkProps): UseEditBookmarkResult {
  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);

  // 选项数据
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  // 操作状态
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 加载分类和标签
  useEffect(() => {
    if (open) {
      Promise.all([
        bookmarkStorage.getCategories(),
        bookmarkStorage.getAllTags(),
      ]).then(([cats, existingTags]) => {
        setCategories(cats);
        setAllTags(existingTags);
      });
    }
  }, [open]);

  // 填充表单数据
  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title);
      setDescription(bookmark.description);
      setCategoryId(bookmark.categoryId);
      setTags(bookmark.tags);
    }
  }, [bookmark]);

  /**
   * 保存书签
   */
  const save = useCallback(async () => {
    if (!bookmark || !title.trim()) return;

    setSaving(true);
    try {
      await bookmarkStorage.updateBookmark(bookmark.id, {
        title: title.trim(),
        description: description.trim(),
        categoryId,
        tags,
      });
      onSaved?.();
      onClose?.();
    } catch (err) {
      console.error('[useEditBookmark] Save error:', err);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  }, [bookmark, title, description, categoryId, tags, onSaved, onClose]);

  /**
   * 删除书签
   */
  const deleteBookmark = useCallback(async () => {
    if (!bookmark) return;

    if (!confirm('确定要删除这个书签吗？')) return;

    setDeleting(true);
    try {
      await bookmarkStorage.deleteBookmark(bookmark.id);
      onDeleted?.();
      onClose?.();
    } catch (err) {
      console.error('[useEditBookmark] Delete error:', err);
      alert('删除失败');
    } finally {
      setDeleting(false);
    }
  }, [bookmark, onDeleted, onClose]);

  return {
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    saving,
    deleting,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    save,
    deleteBookmark,
  };
}

