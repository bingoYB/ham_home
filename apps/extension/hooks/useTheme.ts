/**
 * useTheme Hook
 * 管理主题状态，支持 light/dark/system
 */
import { useState, useEffect, useCallback } from 'react';
import { configStorage } from '@/lib/storage';
import type { LocalSettings } from '@/types';

type Theme = LocalSettings['theme'];

export interface UseThemeOptions {
  /** 可选的目标元素（用于 content UI 环境的 Shadow DOM） */
  targetElement?: HTMLElement | null;
}

export function useTheme(options?: UseThemeOptions) {
  const [theme, setTheme] = useState<Theme>('system');
  const targetElement = options?.targetElement;

  // 应用主题到目标元素
  const applyThemeToTarget = useCallback((newTheme: Theme) => {
    const target = targetElement || document.documentElement;
    applyThemeToElement(target, newTheme);
  }, [targetElement]);

  useEffect(() => {
    // 加载保存的主题设置
    configStorage.getSettings().then((settings) => {
      setTheme(settings.theme);
      applyThemeToTarget(settings.theme);
    });

    // 监听 settings 变化（跨标签页同步）
    const unwatchSettings = configStorage.watchSettings((newSettings) => {
      if (newSettings?.theme) {
        setTheme(newSettings.theme);
        applyThemeToTarget(newSettings.theme);
      }
    });

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      configStorage.getSettings().then((settings) => {
        if (settings.theme === 'system') {
          applyThemeToTarget('system');
        }
      });
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      unwatchSettings();
    };
  }, [applyThemeToTarget]);

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    applyThemeToTarget(newTheme);
    await configStorage.setSettings({ theme: newTheme });
  };

  return { theme, setTheme: updateTheme };
}

/**
 * 应用主题到指定元素
 */
export function applyThemeToElement(element: HTMLElement, theme: Theme): void {
  if (theme === 'dark') {
    element.classList.add('dark');
  } else if (theme === 'light') {
    element.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      element.classList.add('dark');
    } else {
      element.classList.remove('dark');
    }
  }
}

/**
 * 应用主题到 document.documentElement（向后兼容）
 */
export function applyTheme(theme: Theme): void {
  applyThemeToElement(document.documentElement, theme);
}

/**
 * 初始化主题（用于页面加载时立即应用）
 */
export async function initTheme(): Promise<void> {
  try {
    const settings = await configStorage.getSettings();
    applyTheme(settings.theme);
  } catch {
    // 默认跟随系统
    applyTheme('system');
  }
}

