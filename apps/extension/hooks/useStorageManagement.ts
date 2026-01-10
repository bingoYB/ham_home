/**
 * useStorageManagement Hook
 * 存储管理的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { snapshotStorage, bookmarkStorage } from '@/lib/storage';
import { exportAsJSON, exportAsHTML } from '@/lib/export';

interface SnapshotUsage {
  count: number;
  totalSize: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

interface UseStorageManagementResult {
  // 状态
  snapshotUsage: SnapshotUsage | null;
  bookmarkCount: number;
  loading: boolean;
  clearing: boolean;
  exporting: 'json' | 'html' | null;

  // 操作
  loadStats: () => Promise<void>;
  clearSnapshots: () => Promise<void>;
  exportJSON: () => Promise<void>;
  exportHTML: () => Promise<void>;
}

export function useStorageManagement(): UseStorageManagementResult {
  const [snapshotUsage, setSnapshotUsage] = useState<SnapshotUsage | null>(null);
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [exporting, setExporting] = useState<'json' | 'html' | null>(null);

  /**
   * 加载存储统计数据
   */
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const [usage, bookmarks] = await Promise.all([
        snapshotStorage.getStorageUsage(),
        bookmarkStorage.getBookmarks(),
      ]);
      setSnapshotUsage(usage);
      setBookmarkCount(bookmarks.length);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  /**
   * 清除所有快照
   */
  const clearSnapshots = useCallback(async () => {
    if (!confirm('确定要清除所有快照吗？此操作不可撤销。')) return;

    setClearing(true);
    try {
      await snapshotStorage.clearAllSnapshots();

      // 更新所有书签的 hasSnapshot 状态
      const bookmarks = await bookmarkStorage.getBookmarks();
      await Promise.all(
        bookmarks
          .filter((b) => b.hasSnapshot)
          .map((b) => bookmarkStorage.updateBookmark(b.id, { hasSnapshot: false }))
      );

      setSnapshotUsage({ count: 0, totalSize: 0 });
      alert('快照已清除');
    } catch (err) {
      console.error('[useStorageManagement] Clear error:', err);
      alert('清除失败');
    } finally {
      setClearing(false);
    }
  }, []);

  /**
   * 导出为 JSON 格式
   */
  const exportJSON = useCallback(async () => {
    setExporting('json');
    try {
      await exportAsJSON();
    } catch (err) {
      console.error('[useStorageManagement] Export JSON error:', err);
      alert('导出失败');
    } finally {
      setExporting(null);
    }
  }, []);

  /**
   * 导出为 HTML 格式
   */
  const exportHTML = useCallback(async () => {
    setExporting('html');
    try {
      await exportAsHTML();
    } catch (err) {
      console.error('[useStorageManagement] Export HTML error:', err);
      alert('导出失败');
    } finally {
      setExporting(null);
    }
  }, []);

  return {
    snapshotUsage,
    bookmarkCount,
    loading,
    clearing,
    exporting,
    loadStats,
    clearSnapshots,
    exportJSON,
    exportHTML,
  };
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ========== 导入书签相关逻辑 ==========

interface UseImportBookmarksResult {
  importing: boolean;
  result: ImportResult | null;
  importFromFile: (file: File) => Promise<void>;
  resetResult: () => void;
}

export function useImportBookmarks(
  onImported?: () => void
): UseImportBookmarksResult {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  /**
   * 从文件导入书签
   */
  const importFromFile = useCallback(
    async (file: File) => {
      setImporting(true);
      setResult(null);

      try {
        const content = await file.text();
        const importResult = await importFromHTML(content);
        setResult(importResult);
        onImported?.();
      } catch (err) {
        console.error('[useImportBookmarks] Error:', err);
        alert('导入失败：' + (err instanceof Error ? err.message : '未知错误'));
      } finally {
        setImporting(false);
      }
    },
    [onImported]
  );

  const resetResult = useCallback(() => {
    setResult(null);
  }, []);

  return {
    importing,
    result,
    importFromFile,
    resetResult,
  };
}

/**
 * 从 HTML 内容解析并导入书签
 */
async function importFromHTML(content: string): Promise<ImportResult> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const links = doc.querySelectorAll('a');

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const link of links) {
    const url = link.getAttribute('href');
    const title = link.textContent?.trim();

    if (!url || !title) {
      failed++;
      continue;
    }

    // 跳过非 http(s) 链接
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      skipped++;
      continue;
    }

    try {
      // 检查是否已存在
      const existing = await bookmarkStorage.getBookmarkByUrl(url);
      if (existing) {
        skipped++;
        continue;
      }

      // 解析时间戳
      const addDate = link.getAttribute('add_date');
      const createdAt = addDate ? parseInt(addDate) * 1000 : Date.now();

      await bookmarkStorage.createBookmark({
        url,
        title,
        description: '',
        categoryId: null,
        tags: [],
        hasSnapshot: false,
      });

      imported++;
    } catch {
      failed++;
    }
  }

  return { imported, skipped, failed };
}

