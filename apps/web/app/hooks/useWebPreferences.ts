'use client';

import { usePathname } from 'next/navigation';
import { switchLanguagePath } from '@/app/lib/site';
import { useSystemTheme } from '@/app/hooks/useSystemTheme';
import {
  persistLanguagePreference,
  type SupportedLanguage,
} from '@/app/lib/language';

export function useWebPreferences(language: SupportedLanguage = 'zh') {
  const pathname = usePathname();
  const { isDark, setIsDark } = useSystemTheme();
  const alternateLanguage: SupportedLanguage = language === 'en' ? 'zh' : 'en';

  const toggleTheme = (e?: React.MouseEvent) => {
    const newIsDark = !isDark;
    const root = document.documentElement;

    if (!document.startViewTransition) {
      setIsDark(newIsDark);
      root.classList.toggle('dark', newIsDark);
      return;
    }

    const clickX = e?.clientX ?? window.innerWidth / 2;
    const clickY = e?.clientY ?? window.innerHeight / 2;
    const maxRadius = Math.hypot(
      Math.max(clickX, window.innerWidth - clickX),
      Math.max(clickY, window.innerHeight - clickY)
    );

    root.style.setProperty('--theme-transition-x', `${clickX}px`);
    root.style.setProperty('--theme-transition-y', `${clickY}px`);
    root.style.setProperty('--theme-transition-radius', `${maxRadius}px`);

    const transition = document.startViewTransition(() => {
      setIsDark(newIsDark);
      root.classList.toggle('dark', newIsDark);
    });

    transition.finished.then(() => {
      root.style.removeProperty('--theme-transition-x');
      root.style.removeProperty('--theme-transition-y');
      root.style.removeProperty('--theme-transition-radius');
    });
  };

  return {
    isDark,
    isEn: language === 'en',
    language,
    toggleTheme,
    // Rendered as a real link, so the other language version is discoverable without JavaScript.
    languageSwitchHref: switchLanguagePath(pathname, alternateLanguage),
    // Only an explicit switch is stored, so legacy routes can still suggest the visitor's language.
    rememberLanguageSwitch: () => persistLanguagePreference(alternateLanguage),
  };
}
