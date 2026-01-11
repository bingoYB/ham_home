/**
 * i18n 初始化函数
 */
import i18n from './config';
import type { Language } from '@/types';

/**
 * 初始化 i18n
 */
export async function initI18n(): Promise<void> {
  await i18n.init?.({ lng: 'en', fallbackLng: 'en' });
}

/**
 * 获取当前语言
 */
export function getCurrentLanguage(): Language {
  return (i18n.language as Language) || 'en';
}

/**
 * 改变语言
 */
export async function changeLanguage(lng: Language): Promise<string> {
  // 保存语言偏好到 localStorage
  localStorage.setItem('i18nextLng', lng);
  return i18n.changeLanguage(lng);
}

/**
 * 获取 i18n 实例
 */
export function getI18nInstance() {
  return i18n;
}

/**
 * 检查语言是否支持
 */
export function isSupportedLanguage(lng: any): lng is Language {
  return ['en', 'zh'].includes(lng);
}
