/**
 * 语言管理 Hook
 * 用于管理应用的语言切换和持久化
 * 
 * 注意：此 Hook 可独立使用，不依赖 BookmarkContext
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { configStorage } from '@/lib/storage';
import type { Language } from '@/types';

// localStorage key for i18next (与 i18n config 中的 detection 配置一致)
const I18N_STORAGE_KEY = 'i18nextLng';

/**
 * 安全地调用 i18n.changeLanguage
 * 处理 i18n 可能未初始化的情况
 */
async function safeChangeLanguage(i18n: any, lng: Language): Promise<void> {
  if (!i18n) {
    console.warn('[useLanguage] i18n instance is not available');
    return;
  }
  
  // 检查 changeLanguage 方法是否存在
  if (typeof i18n.changeLanguage !== 'function') {
    console.warn('[useLanguage] i18n.changeLanguage is not a function, waiting for i18n to initialize...');
    // 如果 i18n 还未初始化，等待一小段时间后重试
    await new Promise(resolve => setTimeout(resolve, 100));
    if (typeof i18n.changeLanguage === 'function') {
      await i18n.changeLanguage(lng);
    } else {
      console.error('[useLanguage] i18n failed to initialize properly');
    }
    return;
  }
  
  await i18n.changeLanguage(lng);
}

/**
 * 语言管理 Hook
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguage] = useState<Language>('zh');
  const [isLoading, setIsLoading] = useState(false);

  // 从多个来源确定当前语言，优先级：WXT Storage > localStorage > i18n.language > 'zh'
  const loadCurrentLanguage = useCallback(async (): Promise<Language> => {
    try {
      // 1. 优先使用 WXT Storage 中保存的语言
      const settings = await configStorage.getSettings();
      if (settings.language && ['en', 'zh'].includes(settings.language)) {
        return settings.language as Language;
      }
    } catch (error) {
      console.warn('Failed to load language from storage:', error);
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
    
    // 4. 默认中文
    return 'zh';
  }, [i18n.language]);

  // 初始化时加载语言设置
  useEffect(() => {
    const initLanguage = async () => {
      const currentLng = await loadCurrentLanguage();
      
      // 同步 i18n 语言
      if (currentLng !== i18n.language) {
        await safeChangeLanguage(i18n, currentLng);
      }
      
      // 同步 localStorage
      localStorage.setItem(I18N_STORAGE_KEY, currentLng);
      
      // 更新本地状态
      setLanguage(currentLng);
    };
    
    initLanguage();
  }, [i18n, loadCurrentLanguage]);

  // 监听 storage 变化（使用 WXT Storage watch）
  useEffect(() => {
    const unwatch = configStorage.watchSettings((settings) => {
      if (settings?.language) {
        const newLng = settings.language as Language;
        if (['en', 'zh'].includes(newLng) && newLng !== language) {
          setLanguage(newLng);
          safeChangeLanguage(i18n, newLng);
          localStorage.setItem(I18N_STORAGE_KEY, newLng);
        }
      }
    });
    
    return unwatch;
  }, [language, i18n]);

  // 切换语言
  const switchLanguage = useCallback(async (lng: Language) => {
    try {
      setIsLoading(true);
      
      // 1. 更新本地状态
      setLanguage(lng);
      
      // 2. 更新 i18n
      await safeChangeLanguage(i18n, lng);
      
      // 3. 同步到 localStorage (i18next 会自动做，但我们确保一致性)
      localStorage.setItem(I18N_STORAGE_KEY, lng);
      
      // 4. 保存到 WXT Storage
      await configStorage.setSettings({ language: lng });
      
      // 5. 触发自定义事件，便于其他部分监听语言变化
      window.dispatchEvent(
        new CustomEvent('languageChange', { detail: { language: lng } })
      );
    } catch (error) {
      console.error('Failed to switch language:', error);
      // 恢复之前的语言
      const fallbackLng = await loadCurrentLanguage();
      setLanguage(fallbackLng);
      await safeChangeLanguage(i18n, fallbackLng);
    } finally {
      setIsLoading(false);
    }
  }, [i18n, loadCurrentLanguage]);

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
