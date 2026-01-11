/**
 * 国际化相关类型定义
 */

/**
 * 支持的语言
 */
export type Language = 'en' | 'zh' | 'ja' | 'ko';

/**
 * 通用文案命名空间
 */
export interface CommonNamespace {
  common: {
    loading: string;
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    close: string;
    confirm: string;
    error: string;
    success: string;
    warning: string;
    search: string;
    empty: string;
    noResults: string;
    back: string;
    next: string;
    [key: string]: string | Record<string, string>;
  };
}

/**
 * 书签相关文案命名空间
 */
export interface BookmarkNamespace {
  bookmark: {
    title: string;
    newBookmark: string;
    addBookmark: string;
    editBookmark: string;
    deleteBookmark: string;
    deleteConfirm: string;
    deleteSuccess: string;
    saveSuccess: string;
    saveFailed: string;
    placeholders: {
      title: string;
      description: string;
      url: string;
      [key: string]: string;
    };
    categories: string;
    uncategorized: string;
    tags: string;
    createdAt: string;
    recent: string;
    all: string;
    search: string;
    [key: string]: string | Record<string, string>;
  };
}

/**
 * 设置相关文案命名空间
 */
export interface SettingsNamespace {
  settings: {
    title: string;
    language: string;
    theme: string;
    themeOptions: {
      light: string;
      dark: string;
      system: string;
      [key: string]: string;
    };
    aiSettings: string;
    aiProvider: string;
    apiKey: string;
    modelName: string;
    importBookmarks: string;
    exportBookmarks: string;
    about: string;
    [key: string]: string | Record<string, string>;
  };
}

/**
 * AI 相关文案命名空间
 */
export interface AINamespace {
  ai: {
    analyzing: string;
    generatingTitle: string;
    generatingDescription: string;
    extractingContent: string;
    suggestedCategory: string;
    suggestedTags: string;
    aiNotEnabled: string;
    error: {
      configNotFound: string;
      apiKeyInvalid: string;
      requestFailed: string;
      [key: string]: string;
    };
    [key: string]: string | Record<string, string>;
  };
}

/**
 * 完整的翻译命名空间
 */
export interface TranslationNamespace
  extends CommonNamespace,
    BookmarkNamespace,
    SettingsNamespace,
    AINamespace {
  [key: string]: any;
}

/**
 * i18n 配置选项
 */
export interface I18nOptions {
  defaultLanguage?: Language;
  fallbackLanguage?: Language;
  debug?: boolean;
  detection?: {
    order?: string[];
    caches?: string[];
  };
  [key: string]: any;
}
