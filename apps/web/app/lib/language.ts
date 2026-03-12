export const LANGUAGE_STORAGE_KEY = 'hamhome.web.language';

export type SupportedLanguage = 'zh' | 'en';

export function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'zh' || storedLanguage === 'en') {
      return storedLanguage;
    }
  } catch {
    // Ignore storage access errors and fallback to browser language.
  }

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const prefersEnglish = browserLanguages.some((lang) =>
    lang?.toLowerCase().startsWith('en')
  );

  return prefersEnglish ? 'en' : 'zh';
}

export function persistLanguagePreference(language: SupportedLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage access errors.
  }
}
