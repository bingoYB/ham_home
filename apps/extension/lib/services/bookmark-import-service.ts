import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import type { LocalBookmark } from '@/types';
import type { ImportFailure } from '@/types/bookmark-import';
import { getImportErrorMessage, prepareImportedBookmarks } from '@/utils/bookmark-import.utils';

export class BookmarkImportWriteError extends Error {
  constructor(public readonly failures: ImportFailure[], cause: unknown) {
    super(getImportErrorMessage(cause) ?? 'Failed to save imported bookmarks', { cause });
    this.name = 'BookmarkImportWriteError';
  }
}

export interface BookmarkImportBatchResult {
  created: LocalBookmark[];
  duplicateSkipped: number;
  failures: ImportFailure[];
}

/** Storage owns URL deduplication. A smaller result means duplicates, never write errors. */
export async function importBookmarkBatch(
  rows: readonly unknown[],
  categoryIds?: ReadonlyMap<string, string>,
): Promise<BookmarkImportBatchResult> {
  const { bookmarks, failures } = prepareImportedBookmarks(rows, categoryIds);
  if (bookmarks.length === 0) return { created: [], duplicateSkipped: 0, failures };
  try {
    const created = await bookmarkStorage.createBookmarks(bookmarks);
    return { created, duplicateSkipped: bookmarks.length - created.length, failures };
  } catch (error) {
    // Stop on storage errors instead of repeatedly attempting writes to a failing store.
    throw new BookmarkImportWriteError([
      ...failures,
      ...bookmarks.map(({ title, url }): ImportFailure => ({
        title, url, stage: 'import', code: 'writeFailed', message: getImportErrorMessage(error),
      })),
    ], error);
  }
}
