import { useCallback, useRef, useState } from 'react';
import { BookmarkImportWriteError, importBookmarkBatch } from '@/lib/services/bookmark-import-service';
import type { ImportFailure } from '@/types/bookmark-import';

/** Keeps the current run's failure details available even when its last batch throws. */
export function useImportReport() {
  const [failures, setFailures] = useState<ImportFailure[]>([]);
  const failuresRef = useRef<ImportFailure[]>([]);
  const resetFailures = useCallback((initial: ImportFailure[] = []) => {
    failuresRef.current = [...initial];
    setFailures(failuresRef.current);
  }, []);
  const recordFailures = useCallback((items: ImportFailure[]) => {
    if (!items.length) return;
    failuresRef.current = [...failuresRef.current, ...items];
    setFailures(failuresRef.current);
  }, []);
  const getFailures = useCallback(() => [...failuresRef.current], []);
  const importBookmarks = useCallback(async (
    rows: readonly unknown[], categoryIds?: ReadonlyMap<string, string>,
  ) => {
    try {
      const result = await importBookmarkBatch(rows, categoryIds);
      recordFailures(result.failures);
      return result;
    } catch (error) {
      if (error instanceof BookmarkImportWriteError) recordFailures(error.failures);
      throw error;
    }
  }, [recordFailures]);
  return { failures, resetFailures, recordFailures, getFailures, importBookmarks };
}
