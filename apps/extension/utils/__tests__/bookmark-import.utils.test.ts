import { describe, expect, it } from 'vitest';
import { canAnalyzeImportedBookmark, getImportedBookmarkTitle } from '../bookmark-import.utils';

describe('bookmark import metadata', () => {
  it('preserves named bookmarks and fills empty names using the full URL', () => {
    const url = 'https://example.com/path#section';
    expect(getImportedBookmarkTitle(url, ' Example ')).toBe('Example');
    for (const title of ['', ' \t\n', undefined, null]) {
      expect(getImportedBookmarkTitle(url, title)).toBe(url);
    }
  });

  it.each(['https://example.com', 'http://example.com', 'HTTPS://example.com'])(
    'allows page analysis for %s', (url) => expect(canAnalyzeImportedBookmark(url)).toBe(true),
  );

  it.each(['chrome://kill/', 'edge://favorites', 'about:blank', 'view-source:https://example.com', 'javascript:alert("hello")', 'file:///tmp/page.html', 'invalid'])(
    'skips page analysis for %s', (url) => expect(canAnalyzeImportedBookmark(url)).toBe(false),
  );
});
