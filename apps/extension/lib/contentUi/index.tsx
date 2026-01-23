/**
 * Content Script React 入口
 * 创建 React root 并渲染 App 组件
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { App } from './App';
import { ContentUIProvider } from '../../utils/ContentUIContext';
import i18n from '@/lib/i18n/config';
import { configStorage } from '@/lib/storage';
import type { Language } from '@/types';

// localStorage key for i18next (与 i18n config 中的 detection 配置一致)
const I18N_STORAGE_KEY = 'i18nextLng';

/**
 * 从 storage 同步语言设置到 i18n
 */
async function syncLanguageFromStorage(): Promise<void> {
  try {
    const settings = await configStorage.getSettings();
    if (settings?.language && ['en', 'zh'].includes(settings.language)) {
      const currentLng = i18n.language;
      if (currentLng !== settings.language) {
        await i18n.changeLanguage(settings.language);
        localStorage.setItem(I18N_STORAGE_KEY, settings.language);
      }
    }
  } catch (error) {
    console.warn('[ContentUI] Failed to sync language from storage:', error);
  }
}

/**
 * 监听 storage 的语言变化（使用 WXT Storage watch）
 */
function setupLanguageListener(): () => void {
  return configStorage.watchSettings((settings) => {
    if (settings?.language) {
      const newLng = settings.language as Language;
      if (['en', 'zh'].includes(newLng) && newLng !== i18n.language) {
        i18n.changeLanguage(newLng).catch((error) => {
          console.warn('[ContentUI] Failed to change language:', error);
        });
        localStorage.setItem(I18N_STORAGE_KEY, newLng);
      }
    }
  });
}

export function mountContentUI(container: HTMLElement): () => void {
  const root = ReactDOM.createRoot(container);

  // 初始化时同步语言
  syncLanguageFromStorage().catch((error) => {
    console.warn('[ContentUI] Failed to sync language on mount:', error);
  });

  // 设置语言变化监听器
  const cleanupLanguageListener = setupLanguageListener();

  root.render(
    <React.StrictMode>
      <I18nextProvider i18n={i18n}>
        <ContentUIProvider root={root} container={container}>
          <App />
        </ContentUIProvider>
      </I18nextProvider>
    </React.StrictMode>
  );

  return () => {
    cleanupLanguageListener();
    root.unmount();
  };
}
