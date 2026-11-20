import { useLayoutEffect, useState } from 'react';
import { watchWebsiteTheme } from '@/lib/services/website-theme';
import type { PanelPosition } from '@/types';
import type { WebsiteTheme } from '@/utils/website-theme.utils';

export function useWebsiteTheme(visible: boolean, position: PanelPosition) {
  const [websiteTheme, setWebsiteTheme] = useState<WebsiteTheme>('light');

  useLayoutEffect(() => {
    if (visible) return watchWebsiteTheme(position, setWebsiteTheme);
  }, [visible, position]);

  return { websiteTheme };
}
