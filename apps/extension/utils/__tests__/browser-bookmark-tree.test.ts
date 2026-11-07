import { describe, expect, it } from 'vitest';
import { resolveBookmarkTreeNodes, type BrowserBookmarkTreeNode } from '../browser-bookmark-tree';

const resolve = (children: BrowserBookmarkTreeNode[]) =>
  resolveBookmarkTreeNodes([{ id: 'root', title: '', children }]).bookmarkBarNode;

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
