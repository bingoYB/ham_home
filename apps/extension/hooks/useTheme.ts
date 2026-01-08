/**
 * useTheme Hook
 * 管理主题状态，支持 light/dark/system
 */
import { useState, useEffect } from 'react';
import { configStorage } from '@/lib/storage';
import type { LocalSettings } from '@/types';

type Theme = LocalSettings['theme'];

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    // 加载保存的主题设置
    configStorage.getSettings().then((settings) => {
      setTheme(settings.theme);
      applyTheme(settings.theme);
    });

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      configStorage.getSettings().then((settings) => {
        if (settings.theme === 'system') {
          applyTheme('system');
        }
      });
    };
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    await configStorage.setSettings({ theme: newTheme });
  };

  return { theme, setTheme: updateTheme };
}

/**
 * 应用主题到 DOM
 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
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

