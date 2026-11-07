import { beforeEach, describe, expect, it, vi } from 'vitest';
import { toImportedBookmark } from '@/utils/bookmark-import.utils';

const state = vi.hoisted(() => ({
  items: new Map<string, unknown>(),
  services: new Map<string, Record<string, (...args: unknown[]) => unknown>>(),
  failKey: '',
}));
vi.mock('@webext-core/proxy-service', () => ({
  registerService: (key: string, service: Record<string, (...args: unknown[]) => unknown>) => state.services.set(key, service),
  createProxyService: (key: string) => new Proxy({}, {
    get: (_, method: string) => async (...args: unknown[]) => {
      const result = await state.services.get(key)![method](...structuredClone(args));
      return structuredClone(result);
    },
  }),
}));
vi.mock('../bookmark-screenshot-storage', () => ({ bookmarkScreenshotStorage: { clear: vi.fn(), deleteMany: vi.fn() } }));
vi.mock('../vector-store', () => ({ vectorStore: { deleteEmbeddings: vi.fn() } }));
vi.mock('../snapshot-storage', () => ({ snapshotStorage: { deleteSnapshot: vi.fn() } }));

const input = (url: string, content = '正文') => ({ url, title: url, description: '', tags: [], categoryId: null, hasSnapshot: false, content });

async function newContext() {
  vi.resetModules();
  return import('../bookmark-storage');
}

beforeEach(() => {
  state.items.clear();
  state.services.clear();
  state.failKey = '';
  vi.stubGlobal('storage', {
    defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
      getValue: async () => structuredClone(state.items.get(key) ?? fallback),
      setValue: async (value: unknown) => {
        if (state.failKey === key) { state.failKey = ''; throw new Error('write failed'); }
        state.items.set(key, structuredClone(value));
      },
      watch: () => () => {},
    }),
  });
});

describe('background bookmark writer', () => {
  it('preserves concurrent creates and field edits from separate contexts and the background', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const a = (await newContext()).bookmarkStorage;
    const b = (await newContext()).bookmarkStorage;
    const created = await Promise.all([
      a.createBookmark(input('https://a.test')),
      b.createBookmark(input('https://b.test')),
      background.bookmarkStorage.createBookmark(input('https://c.test')),
    ]);
    expect(await a.getBookmarks()).toHaveLength(3);
    await Promise.all([
      a.updateBookmark(created[0].id, { title: 'new title' }),
      b.updateBookmark(created[0].id, { tags: ['new tag'] }),
    ]);
    expect(await a.getBookmarkById(created[0].id)).toMatchObject({ title: 'new title', tags: ['new tag'], content: '正文' });
    const duplicates = await Promise.allSettled([
      a.createBookmark(input('https://same.test')),
      b.createBookmark(input('https://same.test')),
    ]);
    expect(duplicates.filter(r => r.status === 'fulfilled')).toHaveLength(1);
  });

  it('does not deadlock nested batch operations and recovers after a failed command', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    state.failKey = 'local:bookmarks';
    await expect(client.createBookmark(input('https://failed.test'))).rejects.toThrow('write failed');
    const bookmark = await client.createBookmark(input('https://ok.test'));
    await client.batchOperate({ operation: 'delete', bookmarkIds: [bookmark.id] });
    await client.restoreBookmark(bookmark.id);
    expect(await client.getBookmarks()).toHaveLength(1);
  });

  it('exports persisted Markdown and restores it through the JSON import mapping', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    const category = await client.createCategory('Research');
    await client.createBookmark({ ...input('https://article.test', '# 标题\n\n完整正文'), categoryId: category.id });
    // The list UI deliberately does not load content.
    expect((await client.getBookmarks())[0].content).toBeUndefined();
    const { exportService } = await import('@/lib/services/export-service');
    const backup = JSON.parse(JSON.stringify(await exportService.createExport()));
    await client.clearBookmarkData();
    const restoredCategory = await client.createCategory(backup.categories[0].name);
    await client.createBookmarks(backup.bookmarks.map((bookmark: Parameters<typeof toImportedBookmark>[0]) =>
      toImportedBookmark(bookmark, new Map([[category.id, restoredCategory.id]])),
    ));
    expect((await client.getExportSnapshot()).bookmarks[0]).toMatchObject({
      content: '# 标题\n\n完整正文', categoryId: restoredCategory.id, hasSnapshot: false,
    });
  });

  it('does not apply a stale sync download over an intervening edit or deletion', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    const bookmark = await client.createBookmark(input('https://edited.test', 'original'));
    const snapshot = (await client.getBookmarksForSync())[0];
    await client.updateBookmark(bookmark.id, { title: 'local edit', content: 'local body' });
    await client.importRawBookmarks([{ ...snapshot, title: 'remote edit' }], { [bookmark.id]: 'remote body' }, { [bookmark.id]: snapshot });
    expect(await client.getBookmarkById(bookmark.id)).toMatchObject({ title: 'local edit', content: 'local body' });
    await client.purgeBookmarks([bookmark.id]);
    await client.importRawBookmarks([snapshot], { [bookmark.id]: 'remote body' }, { [bookmark.id]: snapshot });
    expect(await client.getBookmarkById(bookmark.id)).toBeNull();
  });
});
