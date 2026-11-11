import type { CreateBookmarkInput } from '@/types';
import type { ImportFailure, ImportFailureCode } from '@/types/bookmark-import';

export interface ImportedBookmark {
  url: string;
  title: string;
  description?: string;
  summary?: string;
  content?: string;
  categoryId?: string | null;
  tags?: string[];
  favicon?: string;
}

/** Browsers allow empty bookmark names. Keep the link usable without fetching its page. */
export function getImportedBookmarkTitle(url: string, title: unknown): string {
  return typeof title === 'string' && title.trim() ? title.trim() : url;
}

/** Page extraction and AI analysis apply to web pages, not browser pages or bookmarklets. */
export function canAnalyzeImportedBookmark(url: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** JSON backups keep Markdown; local-only snapshot references are not portable. */
export function toImportedBookmark(bookmark: ImportedBookmark, categoryIds?: ReadonlyMap<string, string>): CreateBookmarkInput {
  return {
    url: bookmark.url,
    title: getImportedBookmarkTitle(bookmark.url, bookmark.title),
    description: bookmark.description || bookmark.summary || '',
    content: typeof bookmark.content === 'string' ? bookmark.content : undefined,
    categoryId: bookmark.categoryId
      ? (categoryIds ? (categoryIds.get(bookmark.categoryId) ?? null) : bookmark.categoryId)
      : null,
    tags: bookmark.tags || [],
    favicon: bookmark.favicon || '',
    hasSnapshot: false,
  };
}

export function getImportErrorMessage(error: unknown): string | undefined {
  if (error instanceof Error) return error.message || undefined;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message || undefined;
  }
  return typeof error === 'string' && error.trim() ? error : undefined;
}

export function getBookmarkImportFailure(row: unknown): ImportFailure | undefined {
  const value = row && typeof row === 'object' ? row as Partial<ImportedBookmark> : null;
  const title = typeof value?.title === 'string' ? value.title : '';
  const url = typeof value?.url === 'string' ? value.url : '';
  let code: ImportFailureCode | undefined;
  if (!value) code = 'invalidBookmark';
  else if (!url.trim()) code = 'missingUrl';
  else {
    try {
      new URL(url);
    } catch { code = 'invalidUrl'; }
  }
  return code ? { title, url, stage: 'import', code } : undefined;
}

/** Validate rows independently so one malformed bookmark cannot abort the entire file. */
export function prepareImportedBookmarks(
  rows: readonly unknown[],
  categoryIds?: ReadonlyMap<string, string>,
): { bookmarks: CreateBookmarkInput[]; failures: ImportFailure[] } {
  const bookmarks: CreateBookmarkInput[] = [];
  const failures: ImportFailure[] = [];
  for (const row of rows) {
    const failure = getBookmarkImportFailure(row);
    if (failure) failures.push(failure);
    else bookmarks.push(toImportedBookmark(row as ImportedBookmark, categoryIds));
  }
  return { bookmarks, failures };
}
