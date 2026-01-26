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

/** 切换主题时的动画选项 */
export interface ThemeTransitionOptions {
  /** 点击事件的 X 坐标 */
  x?: number;
  /** 点击事件的 Y 坐标 */
  y?: number;
  /** 是否启用动画（默认 true） */
  enableAnimation?: boolean;
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

  /**
   * 检测是否在 Shadow DOM 环境中
   * View Transitions API 不支持 Shadow DOM，需要禁用动画
   */
  const isInShadowDOM = useCallback(() => {
    if (!targetElement) return false;
    // 检查 targetElement 是否在 Shadow DOM 中
    let node: Node | null = targetElement;
    while (node) {
      if (node instanceof ShadowRoot) return true;
      node = node.parentNode;
    }
    return false;
  }, [targetElement]);

  /**
   * 带动画效果的主题切换
   * 使用 View Transitions API 实现从点击位置扩展的圆形动画
   * 注意：在 Shadow DOM 环境中会自动禁用动画（View Transitions API 不支持）
   */
  const setThemeWithTransition = useCallback(
    async (newTheme: Theme, transitionOptions?: ThemeTransitionOptions) => {
      const { x, y, enableAnimation = true } = transitionOptions || {};
      const target = targetElement || document.documentElement;

      // 如果不支持 View Transitions API、禁用动画、或在 Shadow DOM 中，直接切换
      // View Transitions API 作用于整个文档，无法在 Shadow DOM 中正常工作
      if (!enableAnimation || !document.startViewTransition || isInShadowDOM()) {
        setTheme(newTheme);
        applyThemeToTarget(newTheme);
        await configStorage.setSettings({ theme: newTheme });
        return;
      }

      // 计算圆形动画的最大半径（从点击点到最远角落的距离）
      const clickX = x ?? window.innerWidth / 2;
      const clickY = y ?? window.innerHeight / 2;
      const maxRadius = Math.hypot(
        Math.max(clickX, window.innerWidth - clickX),
        Math.max(clickY, window.innerHeight - clickY)
      );

      // 设置 CSS 变量用于动画
      target.style.setProperty('--theme-transition-x', `${clickX}px`);
      target.style.setProperty('--theme-transition-y', `${clickY}px`);
      target.style.setProperty('--theme-transition-radius', `${maxRadius}px`);

      // 使用 View Transitions API
      const transition = document.startViewTransition(() => {
        setTheme(newTheme);
        applyThemeToTarget(newTheme);
      });

      // 等待动画完成后保存设置
      transition.finished.then(() => {
        target.style.removeProperty('--theme-transition-x');
        target.style.removeProperty('--theme-transition-y');
        target.style.removeProperty('--theme-transition-radius');
      });

      await configStorage.setSettings({ theme: newTheme });
    },
    [targetElement, applyThemeToTarget, isInShadowDOM]
  );

  return { theme, setTheme: updateTheme, setThemeWithTransition };
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

