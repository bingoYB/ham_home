import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import type { InitOptions } from 'i18next';
import type { Language, TranslationNamespace } from './types';

/**
 * 创建 i18next 实例
 * @param resources 翻译资源
 * @param options 自定义配置选项
 */
export function createI18nInstance(
  resources: Record<Language, TranslationNamespace>,
  options: Partial<InitOptions> = {}
) {
  const defaultOptions: InitOptions = {
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    ns: ['common', 'bookmark', 'settings', 'ai'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React 已处理 XSS
    },
    detection: {
      order: [
        'localStorage',
        'sessionStorage',
        'cookie',
        'navigator',
        'htmlTag',
      ],
      caches: ['localStorage', 'sessionStorage', 'cookie'],
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  i18next
    .use(LanguageDetector)
    .use(initReactI18next)
    .init(mergedOptions);

  return i18next;
}

/**
 * 初始化 i18n
 */
export async function initI18n(
  resources: Record<Language, TranslationNamespace>,
  options?: Partial<InitOptions>
): Promise<void> {
  createI18nInstance(resources, options);
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): Language {
  return (i18next.language as Language) || 'en';
}

/**
 * 改变语言
 */
export async function changeLanguage(lng: Language): Promise<string> {
  return i18next.changeLanguage(lng);
}

/**
 * 获取 i18n 实例
 */
export function getI18nInstance() {
  return i18next;
}

export default i18next;
