/**
 * i18next 配置
 * 适用于 HamHome 浏览器插件
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// 导入英文翻译
import enCommon from '@/locales/en/common.json';
import enBookmark from '@/locales/en/bookmark.json';
import enSettings from '@/locales/en/settings.json';
import enAi from '@/locales/en/ai.json';

// 导入中文翻译
import zhCommon from '@/locales/zh/common.json';
import zhBookmark from '@/locales/zh/bookmark.json';
import zhSettings from '@/locales/zh/settings.json';
import zhAi from '@/locales/zh/ai.json';

const resources = {
  en: {
    common: enCommon,
    bookmark: enBookmark,
    settings: enSettings,
    ai: enAi,
  },
  zh: {
    common: zhCommon,
    bookmark: zhBookmark,
    settings: zhSettings,
    ai: zhAi,
  },
};

// localStorage key
const I18N_STORAGE_KEY = 'i18nextLng';

// 自定义语言检测器，优先从 localStorage 读取
const customLanguageDetector = {
  name: 'customDetector',
  lookup() {
    // 优先从 localStorage 读取
    const storedLng = localStorage.getItem(I18N_STORAGE_KEY);
    if (storedLng && ['en', 'zh'].includes(storedLng)) {
      return storedLng;
    }
    return undefined;
  },
  cacheUserLanguage(lng: string) {
    localStorage.setItem(I18N_STORAGE_KEY, lng);
  },
};

// 创建自定义 LanguageDetector 实例
const languageDetector = new LanguageDetector();
languageDetector.addDetector(customLanguageDetector);

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'bookmark', 'settings', 'ai'],
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React 已处理 XSS 防护
    },
    detection: {
      // 自定义检测器优先
      order: [
        'customDetector',
        'localStorage',
        'navigator',
        'htmlTag',
      ],
      caches: ['localStorage'],
      lookupLocalStorage: I18N_STORAGE_KEY,
    },
    // 缓存用户选择的语言
    saveMissing: false,
  });

// 初始化时从 chrome.storage 同步语言设置
async function syncLanguageFromStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get('settings');
      const settings = result.settings;
      if (settings?.language && ['en', 'zh'].includes(settings.language)) {
        const currentLng = i18n.language;
        if (currentLng !== settings.language) {
          await i18n.changeLanguage(settings.language);
          localStorage.setItem(I18N_STORAGE_KEY, settings.language);
        }
      }
    }
  } catch (error) {
    console.warn('[i18n] Failed to sync language from chrome.storage:', error);
  }
}

// 执行同步
syncLanguageFromStorage();

export default i18n;
