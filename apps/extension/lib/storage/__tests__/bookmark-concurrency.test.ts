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
      removeValue: async () => { state.items.delete(key); },
      watch: () => () => {},
    }),
  });
});

describe('background bookmark writer', () => {
  it('cleans a checked orphan list after moving its bookmark without losing any of 1358 bookmarks', async () => {
    const normalCategories = Array.from({ length: 37 }, (_, i) => ({
      id: `normal-${i}`, name: `Category ${i}`, parentId: null, order: i, createdAt: 1,
    }));
    const orphanCategories = Array.from({ length: 24 }, (_, i) => ({
      id: `orphan-${i}`, name: `Old ${i}`, parentId: 'missing-root', order: i, createdAt: 1,
    }));
    const bookmarks = Array.from({ length: 1358 }, (_, i) => {
      const { content: _content, ...meta } = input(`https://preserve.test/${i}`);
      return { ...meta, id: `bookmark-${i}`, createdAt: 1, updatedAt: 1,
        categoryId: i === 0 ? 'orphan-0' : i < 3 ? null : `normal-${i % 37}` };
    });
    state.items.set('sync:categories', [...normalCategories, ...orphanCategories]);
    state.items.set('local:bookmarks', bookmarks);
    const contents = Object.fromEntries(bookmarks.map((b) => [b.id, `# Full content ${b.id}`]));
    state.items.set('local:bookmarkContents', contents);
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    await client.batchChangeCategory(['bookmark-0'], 'normal-0');
    for (const orphan of orphanCategories) await client.deleteCategory(orphan.id);
    const snapshot = await client.getExportSnapshot();
    expect(snapshot.categories).toEqual(normalCategories);
    expect(snapshot.bookmarks).toHaveLength(1358);
    expect(snapshot.bookmarks.filter((b) => !b.categoryId)).toHaveLength(2);
    expect(snapshot.bookmarks[0]).toMatchObject({ categoryId: 'normal-0', content: contents['bookmark-0'] });
    expect(snapshot.bookmarks.slice(1).map(({ content: _content, ...meta }) => meta)).toEqual(bookmarks.slice(1));
    expect(state.items.get('local:bookmarkContents')).toEqual(contents);
    const tombstones = state.items.get('local:syncTombstones') as { categories: Array<{ id: string }> };
    expect(tombstones.categories.map((c) => c.id).sort()).toEqual(orphanCategories.map((c) => c.id).sort());
  });

  it('preserves legacy category IDs and supports lists larger than the sync item quota', async () => {
    const legacyCategories = Array.from({ length: 56 }, (_, index) => ({
      id: `existing-${index}`, name: `已有分类 ${index}`, parentId: null,
      order: index, createdAt: 1, updatedAt: 1,
    }));
    state.items.set('sync:categories', legacyCategories);
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    const created = await Promise.all(Array.from({ length: 30 }, (_, index) =>
      client.createCategory(`投资与财经 ${index}`),
    ));
    const categories = await client.getCategories();
    expect(categories).toHaveLength(86);
    expect(categories.slice(0, 56)).toEqual(legacyCategories);
    expect(new TextEncoder().encode(JSON.stringify(categories)).byteLength).toBeGreaterThan(8192);
    expect(state.items.get('local:categories')).toEqual(categories);
    await client.createBookmark({ ...input('https://category.test'), categoryId: created[0].id });
    expect((await client.getExportSnapshot()).categories).toEqual(categories);
    expect((await client.getBookmarks())[0].categoryId).toBe(created[0].id);
    await client.clearBookmarkData();
    expect(await client.getCategories()).toEqual([]);
    expect(state.items.has('sync:categories')).toBe(false);
  });

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

  it('preserves concurrent edits and creates when another context batch-deletes bookmarks', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const a = (await newContext()).bookmarkStorage;
    const b = (await newContext()).bookmarkStorage;
    const [first, second, keep] = await a.createBookmarks([
      input('https://batch-delete.test/first'),
      input('https://batch-delete.test/second'),
      input('https://batch-delete.test/keep'),
    ]);

    await Promise.all([
      a.batchDeleteBookmarks([first.id, second.id]),
      b.updateBookmark(keep.id, { title: 'edited concurrently' }),
      b.createBookmark(input('https://batch-delete.test/new')),
    ]);

    expect((await a.getDeletedBookmarks()).map((bookmark) => bookmark.id).sort()).toEqual([first.id, second.id].sort());
    expect(await a.getBookmarkById(first.id)).toMatchObject({ isDeleted: true, content: '正文' });
    expect(await b.getBookmarkById(keep.id)).toMatchObject({ title: 'edited concurrently', content: '正文' });
    expect((await b.getBookmarks()).map((bookmark) => bookmark.url).sort()).toEqual([
      'https://batch-delete.test/keep',
      'https://batch-delete.test/new',
    ]);
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
    expect(backup.readLaterEntries).toEqual([]);
    expect(backup.tabLifecycleSettings).toHaveProperty('updatedAt');
    expect(backup).not.toHaveProperty('tabArchive');
    await client.clearBookmarkData();
    const restoredCategory = await client.createCategory(backup.categories[0].name);
    await client.createBookmarks(backup.bookmarks.map((bookmark: Parameters<typeof toImportedBookmark>[0]) =>
      toImportedBookmark(bookmark, new Map([[category.id, restoredCategory.id]])),
    ));
    expect((await client.getExportSnapshot()).bookmarks[0]).toMatchObject({
      content: '# 标题\n\n完整正文', categoryId: restoredCategory.id, hasSnapshot: false,
    });
  });

  it('keeps read-later data in JSON backups and clears it with the bookmark library', async () => {
    const background = await newContext();
    background.registerBookmarkStorageService();
    const client = (await newContext()).bookmarkStorage;
    const bookmark = await client.createBookmark(input('https://read-later.test'));
    const entry = { bookmarkId: bookmark.id, status: 'unread', queueOnly: true, addedAt: 1, updatedAt: 1, source: 'manual' };
    state.items.set('local:readLaterEntries', { [bookmark.id]: entry });
    const { exportService } = await import('@/lib/services/export-service');
    const backup = await exportService.createExport();
    expect(backup.bookmarks).toHaveLength(1);
    expect(backup.readLaterEntries).toEqual([entry]);
    await client.clearBookmarkData();
    expect((await exportService.createExport()).readLaterEntries).toEqual([]);
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
