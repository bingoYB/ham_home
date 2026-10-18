/**
 * useScrollToTopOnChange - jumps a scroll container back to the top whenever
 * `resetKey` changes (never on the first render).
 * Use it when the content under the container is replaced wholesale, e.g. a
 * different filter or category, so the user does not land on a clamped mid or
 * bottom offset of the new, shorter list.
 */
import { useEffect, useRef } from 'react';

export function useScrollToTopOnChange(
  getScrollElement: () => HTMLElement | null,
  resetKey: string,
): void {
  const lastKey = useRef(resetKey);

  useEffect(() => {
    if (lastKey.current === resetKey) return;
    lastKey.current = resetKey;
    getScrollElement()?.scrollTo({ top: 0 });
  }, [getScrollElement, resetKey]);
}
