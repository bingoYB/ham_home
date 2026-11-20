import { createContext, useContext, useMemo } from 'react';
import { getSafeFaviconUrl } from '@/utils/bookmark-utils';

export const FaviconLoadingContext = createContext(true);

export function useSafeFavicon(url: string, fallbackFavicon?: string | null): string | null {
  const canLoad = useContext(FaviconLoadingContext);
  return useMemo(
    () => (canLoad ? getSafeFaviconUrl(url, fallbackFavicon) : null),
    [canLoad, url, fallbackFavicon],
  );
}
