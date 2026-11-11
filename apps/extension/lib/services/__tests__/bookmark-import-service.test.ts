import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createBookmarks } = vi.hoisted(() => ({ createBookmarks: vi.fn() }));
vi.mock('@/lib/storage/bookmark-storage', () => ({ bookmarkStorage: { createBookmarks } }));

import { BookmarkImportWriteError, importBookmarkBatch } from '../bookmark-import-service';
import { normalizeBookmarkUrl } from '@/lib/bookmarks/bookmark-dedup';

describe('importBookmarkBatch', () => {
  beforeEach(() => {
    createBookmarks.mockReset();
    createBookmarks.mockImplementation(async (bookmarks) => {
      const seen = new Set<string>();
      return bookmarks.filter((bookmark: { url: string }) => {
        const key = normalizeBookmarkUrl(bookmark.url);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).map((bookmark: object, index: number) => ({ ...bookmark, id: String(index) }));
    });
  });

  it('counts duplicates from the same batch as duplicates, with no failures', async () => {
    const result = await importBookmarkBatch([
      { title: 'Original', url: 'https://example.com/' },
      { title: 'Same URL', url: 'https://example.com/?utm_source=import' },
    ]);
    expect(result.created).toHaveLength(1);
    expect(result.duplicateSkipped).toBe(1);
    expect(result.failures).toEqual([]);
  });

  it('reports each malformed row and still saves the valid rows with content and category mapping', async () => {
    const result = await importBookmarkBatch([
      null,
      { title: 'No URL' },
      { title: 'Broken URL', url: 'not a url' },
      { title: 'Valid', url: 'https://example.com', categoryId: 'old', content: '# Article' },
    ], new Map([['old', 'new']]));
    expect(result.failures.map((failure) => failure.code)).toEqual([
      'invalidBookmark', 'missingUrl', 'invalidUrl',
    ]);
    expect(result.created).toEqual([expect.objectContaining({ content: '# Article', categoryId: 'new' })]);
    expect(result.duplicateSkipped).toBe(0);
  });

  it('preserves browser links and local category IDs', async () => {
    const result = await importBookmarkBatch([
      { title: 'Browser settings', url: 'chrome://settings' },
      { title: 'Valid', url: 'https://example.com', categoryId: 'local' },
    ]);
    expect(result.failures).toEqual([]);
    expect(result.created).toHaveLength(2);
    expect(result.created[1].categoryId).toBe('local');
  });

  it.each(['', '   ', undefined])('uses the URL when a bookmark title is %s', async (title) => {
    const url = 'http://blog.bahraniapps.com/gifcam/#download';
    const result = await importBookmarkBatch([{ title, url }]);
    expect(result.created[0]).toMatchObject({ title: url, url });
    expect(result.failures).toEqual([]);
  });

  it.each([
    'chrome://newtab/', 'chrome://kill/', 'chrome://settings/importData',
    'chrome://inspect/#devices', 'edge://favorites/', 'about:blank',
    'view-source:https://example.com/path?utm_source=keep',
    'file:///Users/example/bookmarks.html',
    'javascript:var%20xs%20=%20document.querySelectorAll("a[href]");void(0)//',
  ])('imports %s without changing its URL', async (url) => {
    const result = await importBookmarkBatch([{ url }]);
    expect(result.created[0]).toMatchObject({ url, title: url });
    expect(result.failures).toEqual([]);
  });

  it('does not call storage when every row is invalid', async () => {
    const result = await importBookmarkBatch([null, { title: 'No URL' }]);
    expect(result.failures).toHaveLength(2);
    expect(createBookmarks).not.toHaveBeenCalled();
  });

  it('retains per-bookmark write errors and earlier validation errors when storage rejects', async () => {
    createBookmarks.mockRejectedValue(new Error('QUOTA_BYTES quota exceeded'));
    const error = await importBookmarkBatch([
      null,
      { title: 'One', url: 'https://example.com/one' },
      { title: 'Two', url: 'https://example.com/two' },
    ]).catch((error) => error);
    expect(error).toBeInstanceOf(BookmarkImportWriteError);
    expect(error.failures).toEqual([
      expect.objectContaining({ code: 'invalidBookmark' }),
      expect.objectContaining({ title: 'One', code: 'writeFailed', message: 'QUOTA_BYTES quota exceeded' }),
      expect.objectContaining({ title: 'Two', code: 'writeFailed', message: 'QUOTA_BYTES quota exceeded' }),
    ]);
  });

  it('provides a reason code when the storage error has no readable message', async () => {
    createBookmarks.mockRejectedValue({});
    const error = await importBookmarkBatch([{ title: 'One', url: 'https://example.com' }]).catch((error) => error);
    expect(error.failures[0]).toMatchObject({ code: 'writeFailed', message: undefined });
  });

  it('preserves error messages serialized by the background service', async () => {
    createBookmarks.mockRejectedValue({ message: 'Storage is unavailable' });
    const error = await importBookmarkBatch([{ title: 'One', url: 'https://example.com' }]).catch((error) => error);
    expect(error.failures[0].message).toBe('Storage is unavailable');
  });
});
