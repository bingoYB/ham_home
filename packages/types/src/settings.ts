/**
 * 用户设置
 */
export interface Settings {
  autoSaveSnapshot: boolean;
  defaultCategory: string | null;
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  shortcut: string;
}

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string;
  exportedAt: number;
  bookmarks: unknown[];
  categories: unknown[];
  settings?: Settings;
}

/**
 * 导入结果
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
}

