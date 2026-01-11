/**
 * 语言管理 Hook
 * 用于管理应用的语言切换和持久化
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useBookmarks } from '@/contexts/BookmarkContext';
import type { Language } from '@/types';

// localStorage key for i18next (与 i18n config 中的 detection 配置一致)
const I18N_STORAGE_KEY = 'i18nextLng';

/**
 * 语言管理 Hook
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const { appSettings, updateAppSettings } = useBookmarks();
  const [isLoading, setIsLoading] = useState(false);

  // 从多个来源确定当前语言，优先级：appSettings > localStorage > i18n.language > 'en'
  const getCurrentLanguage = useCallback((): Language => {
    // 1. 优先使用 appSettings 中保存的语言
    if (appSettings.language && ['en', 'zh'].includes(appSettings.language)) {
      return appSettings.language as Language;
    }
    // 2. 其次使用 localStorage 中的语言
    const storedLng = localStorage.getItem(I18N_STORAGE_KEY);
    if (storedLng && ['en', 'zh'].includes(storedLng)) {
      return storedLng as Language;
    }
    // 3. 使用 i18n 当前语言
    if (i18n.language && ['en', 'zh'].includes(i18n.language)) {
      return i18n.language as Language;
    }
    // 4. 默认英文
    return 'en';
  }, [appSettings.language, i18n.language]);

  const [language, setLanguage] = useState<Language>(getCurrentLanguage);

  // 初始化时同步语言设置
  useEffect(() => {
    const currentLng = getCurrentLanguage();
    
    // 同步 i18n 语言
    if (currentLng !== i18n.language) {
      void i18n.changeLanguage(currentLng);
    }
    
    // 同步 localStorage
    localStorage.setItem(I18N_STORAGE_KEY, currentLng);
    
    // 更新本地状态
    setLanguage(currentLng);
  }, [appSettings.language]);

  // 切换语言
  const switchLanguage = useCallback(async (lng: Language) => {
    try {
      setIsLoading(true);
      
      // 1. 更新本地状态
      setLanguage(lng);
      
      // 2. 更新 i18n
      await i18n.changeLanguage(lng);
      
      // 3. 同步到 localStorage (i18next 会自动做，但我们确保一致性)
      localStorage.setItem(I18N_STORAGE_KEY, lng);
      
      // 4. 保存到 appSettings (chrome.storage)
      await updateAppSettings({ language: lng });
      
      // 5. 触发自定义事件，便于其他部分监听语言变化
      window.dispatchEvent(
        new CustomEvent('languageChange', { detail: { language: lng } })
      );
    } catch (error) {
      console.error('Failed to switch language:', error);
      // 恢复之前的语言
      const fallbackLng = getCurrentLanguage();
      setLanguage(fallbackLng);
      void i18n.changeLanguage(fallbackLng);
    } finally {
      setIsLoading(false);
    }
  }, [i18n, updateAppSettings, getCurrentLanguage]);

  return {
    language,
    switchLanguage,
    availableLanguages: ['en', 'zh'] as const,
    isLoading,
    currentLanguageName: {
      en: 'English',
      zh: '中文',
    }[language],
  };
}
