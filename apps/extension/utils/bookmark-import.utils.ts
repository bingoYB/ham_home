import type { CreateBookmarkInput } from '@/types';

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

/** JSON backups keep Markdown; local-only snapshot references are not portable. */
export function toImportedBookmark(bookmark: ImportedBookmark, categoryIds: ReadonlyMap<string, string>): CreateBookmarkInput {
  return {
    url: bookmark.url,
    title: bookmark.title,
    description: bookmark.description || bookmark.summary || '',
    content: typeof bookmark.content === 'string' ? bookmark.content : undefined,
    categoryId: bookmark.categoryId ? (categoryIds.get(bookmark.categoryId) ?? null) : null,
    tags: bookmark.tags || [],
    favicon: bookmark.favicon || '',
    hasSnapshot: false,
  };
}
