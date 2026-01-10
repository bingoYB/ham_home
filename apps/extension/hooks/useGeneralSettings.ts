/**
 * useGeneralSettings Hook
 * 通用设置的业务逻辑层
 */
import { useState, useEffect, useCallback } from 'react';
import { configStorage, bookmarkStorage } from '@/lib/storage';
import { PRESET_CATEGORIES } from '@/lib/preset-categories';
import type { LocalSettings, LocalCategory } from '@/types';

interface UseGeneralSettingsResult {
  // 状态
  settings: LocalSettings | null;
  loading: boolean;
  userCategories: LocalCategory[];
  importingCategories: boolean;
  importedCount: number;

  // 计算属性
  importedPresetCount: number;
  presetCategoriesCount: number;

  // 操作
  updateSetting: <K extends keyof LocalSettings>(
    key: K,
    value: LocalSettings[K]
  ) => Promise<void>;
  importPresetCategories: () => Promise<void>;
}

/**
 * 应用主题到 DOM
 */
function applyTheme(theme: LocalSettings['theme']) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

export function useGeneralSettings(): UseGeneralSettingsResult {
  const [settings, setSettings] = useState<LocalSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [userCategories, setUserCategories] = useState<LocalCategory[]>([]);
  const [importingCategories, setImportingCategories] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // 加载设置和分类
  useEffect(() => {
    Promise.all([
      configStorage.getSettings(),
      bookmarkStorage.getCategories(),
    ]).then(([s, cats]) => {
      setSettings(s);
      setUserCategories(cats);
      setLoading(false);
    });
  }, []);

  /**
   * 更新单个设置项
   */
  const updateSetting = useCallback(
    async <K extends keyof LocalSettings>(key: K, value: LocalSettings[K]) => {
      if (!settings) return;

      const updated = { ...settings, [key]: value };
      setSettings(updated);
      await configStorage.setSettings({ [key]: value });

      // 如果是主题变化，立即应用
      if (key === 'theme') {
        applyTheme(value as LocalSettings['theme']);
      }
    },
    [settings]
  );

  /**
   * 导入预设分类
   */
  const importPresetCategories = useCallback(async () => {
    setImportingCategories(true);
    setImportedCount(0);

    try {
      let imported = 0;

      for (const presetCat of PRESET_CATEGORIES) {
        // 检查是否已存在同名分类
        const exists = userCategories.some((c) => c.name === presetCat.name);

        if (!exists) {
          await bookmarkStorage.createCategory(presetCat.name);
          imported++;
        }
      }

      setImportedCount(imported);

      // 刷新分类列表
      const updatedCategories = await bookmarkStorage.getCategories();
      setUserCategories(updatedCategories);

      if (imported === 0) {
        alert('所有预设分类已存在，无需导入');
      } else {
        alert(`成功导入 ${imported} 个预设分类`);
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : '导入失败');
    } finally {
      setImportingCategories(false);
    }
  }, [userCategories]);

  // 计算已导入的预设分类数量
  const importedPresetCount = userCategories.filter((uc) =>
    PRESET_CATEGORIES.some((pc) => pc.name === uc.name)
  ).length;

  return {
    settings,
    loading,
    userCategories,
    importingCategories,
    importedCount,
    importedPresetCount,
    presetCategoriesCount: PRESET_CATEGORIES.length,
    updateSetting,
    importPresetCategories,
  };
}

/**
 * 检查分类是否已存在
 */
export function isCategoryImported(
  categoryName: string,
  userCategories: LocalCategory[]
): boolean {
  return userCategories.some((c) => c.name === categoryName);
}

