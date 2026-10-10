'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { persistLanguagePreference, resolvePreferredLanguage } from '@/app/lib/language';
import { switchLanguagePath } from '@/app/lib/site';

interface LegacyLanguageNotice {
  isVisible: boolean;
  englishHref: string;
  chooseEnglish: () => void;
  dismiss: () => void;
}

/**
 * Legacy routes always render Chinese. Instead of redirecting (which would fight the canonical URL),
 * offer English-preferring visitors a link to the matching English page after hydration.
 */
export function useLegacyLanguageNotice(): LegacyLanguageNotice {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(resolvePreferredLanguage() === 'en');
  }, []);

  return {
    isVisible,
    englishHref: switchLanguagePath(pathname, 'en'),
    chooseEnglish: () => persistLanguagePreference('en'),
    dismiss: () => setIsVisible(false),
  };
}
