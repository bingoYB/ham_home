import { useMemo } from 'react';
import { getSafeFaviconUrl } from '@/utils/bookmark-utils';

export function useSafeFavicon(url: string, fallbackFavicon?: string | null): string | null {
  return useMemo(
    () => getSafeFaviconUrl(url, fallbackFavicon),
    [url, fallbackFavicon],
  );
}
