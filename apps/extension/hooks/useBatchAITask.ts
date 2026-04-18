import { useState, useEffect, useCallback, useRef } from 'react';
import { aiTaskStorage } from '@/lib/storage/ai-task-storage';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { bookmarkAnalysisService } from '@/lib/agent';
import type { BatchAITask, BatchAITaskProgress } from '@/lib/storage/ai-task-storage';
import { useBookmarks } from '@/contexts/BookmarkContext';

export function useBatchAITask() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchAITaskProgress | null>(null);
  const [lastResult, setLastResult] = useState<{ success: number; failed: number } | null>(null);
  const { bookmarks, refreshBookmarks, refreshCategories, pauseWatchers, resumeWatchers } = useBookmarks();
  const isResuming = useRef(false);

  const runTask = useCallback(async (task: BatchAITask) => {
    setIsProcessing(true);
    setProgress(task.progress);
    pauseWatchers();

    try {
      let { currentIndex, processed, success, failed } = task.progress;
      const total = task.payload.total;
      const bookmarkIds = task.payload.bookmarkIds;

      let currentCategories = await bookmarkStorage.getCategories();
      let currentTags = await bookmarkStorage.getAllTags();

      const BATCH_SIZE = 3;

      for (let i = currentIndex; i < total; i += BATCH_SIZE) {
        // Check if task is still valid in storage
        const currentTask = await aiTaskStorage.getTask();
        if (!currentTask || currentTask.progress.status === 'failed') {
          break; // Appears cancelled or failed
        }

        const batchIds = bookmarkIds.slice(i, i + BATCH_SIZE);
        
        // Wait for next bookmarks if they are not in cache (though we pass a lot from localBookmarks)
        // Actually, we can fetch directly from storage to be safe
        const batchBookmarks = await Promise.all(
          batchIds.map(id => bookmarkStorage.getBookmarkById(id))
        );

        const promises = batchBookmarks.map(async (bm) => {
          if (!bm) return { status: 'failed' };
          try {
            const aiResult = await bookmarkAnalysisService.analyzeBookmarkForLibrary({
              url: bm.url,
              title: bm.title,
              currentCategories,
              existingTags: currentTags,
              shouldFetchPageContent: true,
            });
            
            // 检测 AI 是否真正返回了有效结果（空结果表示失败）
            const hasValidResult = aiResult.description || aiResult.categoryId || (aiResult.tags && aiResult.tags.length > 0);
            if (!hasValidResult) {
              return { status: 'failed' };
            }

            // Build updates safely
            const updates: any = {};
            if (aiResult.description) updates.description = aiResult.description;
            if (aiResult.categoryId) updates.categoryId = aiResult.categoryId;
            if (aiResult.tags && aiResult.tags.length > 0) updates.tags = aiResult.tags;
             
            if (Object.keys(updates).length > 0) {
              await bookmarkStorage.updateBookmark(bm.id, updates);
            }

            // 更新上下文
            if (aiResult.newCategories.length > 0) {
              currentCategories = await bookmarkStorage.getCategories();
            }
            if (aiResult.tags.some(t => !currentTags.includes(t))) {
              currentTags = await bookmarkStorage.getAllTags();
            }

            return { status: 'success' };
          } catch (error) {
            console.error(`[BatchAITask] Failed to process ${bm?.id}`, error);
            return { status: 'failed' };
          }
        });

        const results = await Promise.all(promises);
        
        const successCount = results.filter(r => r.status === 'success').length;
        const failedCount = results.filter(r => r.status === 'failed').length;

        processed += batchIds.length;
        success += successCount;
        failed += failedCount;
        currentIndex = i + batchIds.length;

        const updatedProgress = await aiTaskStorage.updateProgress(p => ({
          ...p,
          currentIndex,
          processed,
          success,
          failed,
        }));
        
        if (updatedProgress) {
          setProgress(updatedProgress);
        }
      }

      await aiTaskStorage.clearTask();
      setProgress(null);
      setLastResult({ success, failed });
    } catch (error) {
      console.error('[BatchAITask] error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await aiTaskStorage.markTaskFailed(errorMessage);
      setProgress(prev => prev ? { ...prev, status: 'failed', error: errorMessage } : null);
    } finally {
      resumeWatchers();
      await refreshBookmarks();
      await refreshCategories();
      setIsProcessing(false);
    }
  }, [pauseWatchers, resumeWatchers, refreshBookmarks, refreshCategories]);

  useEffect(() => {
    const resumePendingTask = async () => {
      if (isResuming.current) return;
      isResuming.current = true;

      const task = await aiTaskStorage.getTask();
      if (!task) return;

      if (task.progress.status === 'failed') {
        await aiTaskStorage.clearTask();
        return;
      }

      if (task.progress.status === 'running') {
        void runTask(task);
      }
    };
    
    resumePendingTask();
  }, [runTask]);

  const startTask = async (bookmarkIds: string[]) => {
    if (isProcessing) return;
    const task = await aiTaskStorage.createTask(bookmarkIds);
    await runTask(task);
  };

  const cancelTask = async () => {
    await aiTaskStorage.clearTask();
    setProgress(null);
    setIsProcessing(false);
  };

  return {
    isProcessing,
    progress,
    lastResult,
    startTask,
    cancelTask
  };
}
