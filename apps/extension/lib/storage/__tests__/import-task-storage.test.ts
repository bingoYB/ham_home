import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportFailure } from '@/types/bookmark-import';

const items = new Map<string, unknown>();
const failure: ImportFailure = {
  title: 'Failed article', url: 'https://example.com', stage: 'ai', code: 'aiFailed', message: 'Request timed out',
};
const taskInput = {
  source: 'file' as const,
  options: { preserveFolders: false, enableAIAnalysis: true, fetchPageContent: false },
  bookmarksToImport: [{ title: 'Article', url: 'https://example.com', parentCategoryId: null }],
  categoriesCreated: 0,
};

beforeEach(() => {
  vi.resetModules();
  items.clear();
  vi.stubGlobal('storage', {
    defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
      getValue: async () => structuredClone(items.get(key) ?? fallback),
      setValue: async (value: unknown) => { items.set(key, structuredClone(value)); },
    }),
  });
});

describe('import failure reports in task snapshots', () => {
  it('restores per-bookmark failure details after a new page loads the running task', async () => {
    const { importTaskStorage } = await import('../import-task-storage');
    await importTaskStorage.createHtmlTask(taskInput);
    await importTaskStorage.updateHtmlProgress((progress) => ({ ...progress, failures: [failure] }));
    vi.resetModules();
    const nextPage = (await import('../import-task-storage')).importTaskStorage;
    expect((await nextPage.getHtmlTask())?.progress.failures).toEqual([failure]);
  });

  it('keeps failure reasons on a stopped task and clears them when a fresh task starts', async () => {
    const { importTaskStorage } = await import('../import-task-storage');
    await importTaskStorage.createHtmlTask(taskInput);
    await importTaskStorage.markHtmlTaskFailed('Storage error', [failure]);
    expect((await importTaskStorage.getHtmlTask())?.progress).toMatchObject({ status: 'failed', failures: [failure] });
    await importTaskStorage.clearHtmlTask();
    await importTaskStorage.createHtmlTask(taskInput);
    expect((await importTaskStorage.getHtmlTask())?.progress.failures).toEqual([]);
  });
});
