'use client';

import { useEffect, useState } from 'react';

/** Follows the OS color scheme after mount by toggling the `dark` class on <html>. */
export function useSystemTheme() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  return { isDark, setIsDark };
}
