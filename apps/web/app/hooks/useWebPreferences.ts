'use client';

import { useEffect, useState } from 'react';
import {
  persistLanguagePreference,
  resolveInitialLanguage,
  type SupportedLanguage,
} from '@/app/lib/language';

export function useWebPreferences() {
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('zh');
  const [isLanguageReady, setIsLanguageReady] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

  useEffect(() => {
    const initialLanguage = resolveInitialLanguage();
    setLanguage(initialLanguage);
    setIsLanguageReady(true);
  }, []);

  useEffect(() => {
    if (!isLanguageReady) {
      return;
    }

    persistLanguagePreference(language);
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }, [language, isLanguageReady]);

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

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'));
  };

  return {
    isDark,
    isEn: language === 'en',
    language,
    toggleTheme,
    toggleLanguage,
  };
}
