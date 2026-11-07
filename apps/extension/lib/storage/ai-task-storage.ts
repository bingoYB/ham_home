import { nanoid } from 'nanoid';
import type { BookmarkOrganizeMode } from '@/lib/agent/services/bookmark-analysis-service';

export interface BatchAITaskPayload {
  id: string;
  bookmarkIds: string[];
  mode?: BookmarkOrganizeMode;
  total: number;
  createdAt: number;
}

export interface BatchAITaskProgress {
  taskId: string;
  status: 'running' | 'failed';
  currentIndex: number;
  processed: number;
  success: number;
  failed: number;
  total: number;
  error?: string;
  updatedAt: number;
}

export interface BatchAITask {
  payload: BatchAITaskPayload;
  progress: BatchAITaskProgress;
}

const batchAITaskPayloadItem = storage.defineItem<BatchAITaskPayload | null>('local:batchAITaskPayload', {
  fallback: null,
});

const batchAITaskProgressItem = storage.defineItem<BatchAITaskProgress | null>('local:batchAITaskProgress', {
  fallback: null,
});

class AiTaskStorage {
  async createTask(bookmarkIds: string[], mode: BookmarkOrganizeMode = "all"): Promise<BatchAITask> {
    const now = Date.now();
    const id = nanoid();

    const payload: BatchAITaskPayload = {
      id,
      bookmarkIds,
      mode,
      total: bookmarkIds.length,
      createdAt: now,
    };

    const progress: BatchAITaskProgress = {
      taskId: id,
      status: 'running',
      currentIndex: 0,
      processed: 0,
      success: 0,
      failed: 0,
      total: bookmarkIds.length,
      updatedAt: now,
    };

    await Promise.all([
      batchAITaskPayloadItem.setValue(payload),
      batchAITaskProgressItem.setValue(progress),
    ]);

    return { payload, progress };
  }

  async getTask(): Promise<BatchAITask | null> {
    const [payload, progress] = await Promise.all([
      batchAITaskPayloadItem.getValue(),
      batchAITaskProgressItem.getValue(),
    ]);

    if (!payload || !progress) {
      return null;
    }

    if (progress.taskId !== payload.id) {
      await this.clearTask();
      return null;
    }

    return { payload, progress };
  }

  async updateProgress(
    updater: (progress: BatchAITaskProgress) => BatchAITaskProgress
  ): Promise<BatchAITaskProgress | null> {
    const progress = await batchAITaskProgressItem.getValue();
    if (!progress) return null;

    const updated = updater(progress);
    await batchAITaskProgressItem.setValue({
      ...updated,
      updatedAt: Date.now(),
    });

    return updated;
  }

  async markTaskFailed(error: string): Promise<void> {
    await this.updateProgress((progress) => ({
      ...progress,
      status: 'failed',
      error,
    }));
  }

  async clearTask(): Promise<void> {
    await Promise.all([
      batchAITaskPayloadItem.setValue(null),
      batchAITaskProgressItem.setValue(null),
    ]);
  }
}

export const aiTaskStorage = new AiTaskStorage();
