import { useState, useEffect } from 'react';
import { getSafeFaviconUrl } from '@/utils/bookmark-utils';

export function useSafeFavicon(url: string, fallbackFavicon?: string | null): string | null {
  const [safeFavicon, setSafeFavicon] = useState<string | null>(() => {
    // 初始状态判断，如果是 base64 或者是 content ui，直接使用 fallbackFavicon
    if (fallbackFavicon && fallbackFavicon.startsWith('data:image')) {
      return fallbackFavicon;
    }
    const isContentUI = typeof window !== 'undefined' && !window.location.protocol.startsWith('chrome-extension');
    if (isContentUI) {
      return fallbackFavicon || null;
    }
    return null;
  });

  useEffect(() => {
    let isMounted = true;
    
    getSafeFaviconUrl(url, fallbackFavicon).then((res) => {
      if (isMounted) {
        setSafeFavicon(res);
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, [url, fallbackFavicon]);

  return safeFavicon;
}
