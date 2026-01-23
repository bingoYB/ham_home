/**
 * useSnapshot Hook
 * 快照操作的业务逻辑层
 */
import { useState, useCallback } from 'react';
import { snapshotStorage, bookmarkStorage } from '@/lib/storage';
import { getBackgroundService } from '@/lib/services';
import type { Snapshot } from '@/types';

interface UseSnapshotResult {
  /** 当前查看的快照 URL */
  snapshotUrl: string | null;
  /** 是否正在加载 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 打开快照查看器 */
  openSnapshot: (bookmarkId: string) => Promise<void>;
  /** 关闭快照查看器 */
  closeSnapshot: () => void;
  /** 检查书签是否有快照 */
  hasSnapshot: (bookmarkId: string) => Promise<boolean>;
  /** 手动保存当前页面快照 */
  saveSnapshot: (bookmarkId: string) => Promise<boolean>;
  /** 删除快照 */
  deleteSnapshot: (bookmarkId: string) => Promise<void>;
  /** 获取存储使用情况 */
  getStorageUsage: () => Promise<{ count: number; totalSize: number }>;
}

export function useSnapshot(): UseSnapshotResult {
  const [snapshotUrl, setSnapshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 打开快照查看器
   */
  const openSnapshot = useCallback(async (bookmarkId: string) => {
    setLoading(true);
    setError(null);

    try {
      const url = await snapshotStorage.getSnapshotAsUrl(bookmarkId);
      if (url) {
        setSnapshotUrl(url);
      } else {
        setError('快照不存在');
      }
    } catch (err) {
      console.error('[useSnapshot] Failed to open snapshot:', err);
      setError(err instanceof Error ? err.message : '加载快照失败');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 关闭快照查看器
   */
  const closeSnapshot = useCallback(() => {
    if (snapshotUrl) {
      URL.revokeObjectURL(snapshotUrl);
    }
    setSnapshotUrl(null);
    setError(null);
  }, [snapshotUrl]);

  /**
   * 检查书签是否有快照
   */
  const hasSnapshot = useCallback(async (bookmarkId: string): Promise<boolean> => {
    try {
      const snapshot = await snapshotStorage.getSnapshot(bookmarkId);
      return snapshot !== null;
    } catch {
      return false;
    }
  }, []);

  /**
   * 手动保存当前页面快照
   */
  const saveSnapshot = useCallback(async (bookmarkId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // 获取页面 HTML (通过 proxy-service)
      const backgroundService = getBackgroundService();
      const html = await backgroundService.getPageHtml();

      if (!html) {
        setError('无法获取页面内容');
        return false;
      }

      await snapshotStorage.saveSnapshot(bookmarkId, html);
      await bookmarkStorage.updateBookmark(bookmarkId, {
        hasSnapshot: true,
      });

      return true;
    } catch (err) {
      console.error('[useSnapshot] Failed to save snapshot:', err);
      setError(err instanceof Error ? err.message : '保存快照失败');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 删除快照
   */
  const deleteSnapshot = useCallback(async (bookmarkId: string) => {
    try {
      await snapshotStorage.deleteSnapshot(bookmarkId);
      await bookmarkStorage.updateBookmark(bookmarkId, {
        hasSnapshot: false,
      });
    } catch (err) {
      console.error('[useSnapshot] Failed to delete snapshot:', err);
      throw err;
    }
  }, []);

  /**
   * 获取存储使用情况
   */
  const getStorageUsage = useCallback(async () => {
    return snapshotStorage.getStorageUsage();
  }, []);

  return {
    snapshotUrl,
    loading,
    error,
    openSnapshot,
    closeSnapshot,
    hasSnapshot,
    saveSnapshot,
    deleteSnapshot,
    getStorageUsage,
  };
}
