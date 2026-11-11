import { describe, expect, it } from 'vitest';
import { browserBookmarksToHtml, resolveBookmarkTreeNodes, type BrowserBookmarkTreeNode } from '../browser-bookmark-tree';

const resolve = (children: BrowserBookmarkTreeNode[]) =>
  resolveBookmarkTreeNodes([{ id: 'root', title: '', children }]).bookmarkBarNode;

describe('browserBookmarksToHtml', () => {
  it('escapes quoted bookmarklet URLs as attributes and keeps folders and unnamed links', () => {
    const html = browserBookmarksToHtml([{
      id: 'folder', title: 'Tools & scripts', children: [
        { id: 'unnamed', title: '', url: 'http://blog.bahraniapps.com/gifcam/#download' },
        { id: 'internal', title: 'Settings', url: 'chrome://settings/importData' },
        { id: 'script', title: '<Script>', url: 'javascript:alert("a&b<test>")' },
      ],
    }]);
    expect(html).toContain('<H3>Tools &amp; scripts</H3>');
    expect(html).toContain('HREF="http://blog.bahraniapps.com/gifcam/#download" ADD_DATE=""></A>');
    expect(html).toContain('HREF="chrome://settings/importData"');
    expect(html).toContain('HREF="javascript:alert(&quot;a&amp;b&lt;test&gt;&quot;)"');
    expect(html).toContain('&lt;Script&gt;</A>');
  });
});

describe('resolveBookmarkTreeNodes', () => {
  it.each(['1', 'toolbar_____'])('supports legacy bar %s', (id) => {
    expect(resolve([{ id, title: 'localized' }]).id).toBe(id);
  });
  it('recognizes dynamic IDs by folderType before legacy IDs', () => {
    expect(resolve([
      { id: '1', title: 'Other', folderType: 'other' },
      { id: '42', title: '收藏夹栏', folderType: 'bookmarks-bar' },
    ]).id).toBe('42');
  });
  it('prefers the syncing bar when local and account bars coexist', () => {
    expect(resolve([
      { id: '1', title: '', folderType: 'bookmarks-bar', syncing: false },
      { id: '99', title: '', folderType: 'bookmarks-bar', syncing: true },
    ]).id).toBe('99');
  });
  it('does not guess from titles or positions', () => {
    expect(() => resolve([{ id: '42', title: 'Bookmarks bar' }])).toThrow('bookmark bar node not found');
  });
  it('rejects managed folders and URL nodes', () => {
    expect(() => resolve([
      { id: '1', title: '', unmodifiable: 'managed' },
      { id: '42', title: '', folderType: 'bookmarks-bar', url: 'https://example.com' },
    ])).toThrow('bookmark bar node not found');
  });
  it('rejects an empty tree', () => {
    expect(() => resolveBookmarkTreeNodes([])).toThrow('bookmark tree root not found');
  });
});
