import { nanoid } from 'nanoid';

export interface ImportTaskOptions {
  preserveFolders: boolean;
  enableAIAnalysis: boolean;
  fetchPageContent: boolean;
}

export interface BookmarkToImport {
  url: string;
  title: string;
  parentCategoryId: string | null;
}

export interface HtmlImportTaskPayload {
  id: string;
  source: 'file' | 'browser';
  options: ImportTaskOptions;
  bookmarksToImport: BookmarkToImport[];
  total: number;
  createdAt: number;
}

export interface HtmlImportTaskProgress {
  taskId: string;
  status: 'running' | 'failed';
  currentIndex: number;
  imported: number;
  skipped: number;
  duplicateSkipped: number;
  categoriesCreated: number;
  aiProcessed: number;
  importedBookmarkIds: string[];
  error?: string;
  updatedAt: number;
}

export interface HtmlImportTask {
  payload: HtmlImportTaskPayload;
  progress: HtmlImportTaskProgress;
}

const htmlImportTaskPayloadItem = storage.defineItem<HtmlImportTaskPayload | null>('local:htmlImportTaskPayload', {
  fallback: null,
});

const htmlImportTaskProgressItem = storage.defineItem<HtmlImportTaskProgress | null>('local:htmlImportTaskProgress', {
  fallback: null,
});

class ImportTaskStorage {
  async createHtmlTask(input: {
    source: 'file' | 'browser';
    options: ImportTaskOptions;
    bookmarksToImport: BookmarkToImport[];
    categoriesCreated: number;
  }): Promise<HtmlImportTask> {
    const now = Date.now();
    const id = nanoid();

    const payload: HtmlImportTaskPayload = {
      id,
      source: input.source,
      options: input.options,
      bookmarksToImport: input.bookmarksToImport,
      total: input.bookmarksToImport.length,
      createdAt: now,
    };

    const progress: HtmlImportTaskProgress = {
      taskId: id,
      status: 'running',
      currentIndex: 0,
      imported: 0,
      skipped: 0,
      duplicateSkipped: 0,
      categoriesCreated: input.categoriesCreated,
      aiProcessed: 0,
      importedBookmarkIds: [],
      updatedAt: now,
    };

    await Promise.all([
      htmlImportTaskPayloadItem.setValue(payload),
      htmlImportTaskProgressItem.setValue(progress),
    ]);

    return { payload, progress };
  }

  async getHtmlTask(): Promise<HtmlImportTask | null> {
    const [payload, progress] = await Promise.all([
      htmlImportTaskPayloadItem.getValue(),
      htmlImportTaskProgressItem.getValue(),
    ]);

    if (!payload || !progress) {
      return null;
    }

    if (progress.taskId !== payload.id) {
      await this.clearHtmlTask();
      return null;
    }

    return { payload, progress };
  }

  async updateHtmlProgress(
    updater: (progress: HtmlImportTaskProgress) => HtmlImportTaskProgress
  ): Promise<HtmlImportTaskProgress | null> {
    const progress = await htmlImportTaskProgressItem.getValue();
    if (!progress) return null;

    const updated = updater(progress);
    await htmlImportTaskProgressItem.setValue({
      ...updated,
      updatedAt: Date.now(),
    });

    return updated;
  }

  async markHtmlTaskFailed(error: string): Promise<void> {
    await this.updateHtmlProgress((progress) => ({
      ...progress,
      status: 'failed',
      error,
    }));
  }

  async clearHtmlTask(): Promise<void> {
    await Promise.all([
      htmlImportTaskPayloadItem.setValue(null),
      htmlImportTaskProgressItem.setValue(null),
    ]);
  }
}

export const importTaskStorage = new ImportTaskStorage();
