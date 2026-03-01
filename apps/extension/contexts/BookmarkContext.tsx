/**
 * BookmarkContext - 书签数据上下文
 * 提供全局的书签数据管理，适配现有 storage API
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { configStorage, DEFAULT_AI_CONFIG, DEFAULT_SETTINGS } from '@/lib/storage/config-storage';
import type { 
  LocalBookmark, 
  LocalCategory, 
  AIConfig, 
  LocalSettings,
  CreateBookmarkInput 
} from '@/types';

// 存储信息类型
interface StorageInfo {
  bookmarkCount: number;
  categoryCount: number;
  tagCount: number;
  storageSize: string;
}

// Context 类型定义
interface BookmarkContextType {
  // 数据状态
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  allTags: string[];
  aiConfig: AIConfig;
  appSettings: LocalSettings;
  storageInfo: StorageInfo;
  loading: boolean;

  // 书签操作
  addBookmark: (data: CreateBookmarkInput) => Promise<LocalBookmark>;
  updateBookmark: (id: string, data: Partial<LocalBookmark>) => Promise<void>;
  deleteBookmark: (id: string, permanent?: boolean) => Promise<void>;
  refreshBookmarks: () => Promise<void>;

  // 分类操作
  addCategory: (name: string, parentId?: string | null) => Promise<LocalCategory>;
  updateCategory: (id: string, data: Partial<LocalCategory>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  refreshCategories: () => Promise<void>;
  bulkAddCategories: (categories: Array<{ id?: string; name: string; parentId: string | null }>) => Promise<void>;

  // 配置操作
  updateAIConfig: (config: Partial<AIConfig>) => Promise<void>;
  updateAppSettings: (settings: Partial<LocalSettings>) => Promise<void>;

  // 数据管理
  clearAllData: () => Promise<void>;
  exportData: (format: 'json' | 'html') => void;

  // 批量导入辅助：暂停/恢复 storage watcher，避免每条写入都触发全量刷新
  pauseWatchers: () => void;
  resumeWatchers: () => void;
}

const BookmarkContext = createContext<BookmarkContextType | undefined>(undefined);

export function BookmarkProvider({ children }: { children: ReactNode }) {
  // 数据状态
  const [bookmarks, setBookmarks] = useState<LocalBookmark[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [aiConfig, setAIConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
  const [appSettings, setAppSettings] = useState<LocalSettings>(DEFAULT_SETTINGS);
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    bookmarkCount: 0,
    categoryCount: 0,
    tagCount: 0,
    storageSize: '0 KB',
  });
  const [loading, setLoading] = useState(true);

  // 暂停 watcher 的引用计数，> 0 时 watcher 回调不执行
  const watcherPausedRef = useRef(0);
  const categoriesRef = useRef<LocalCategory[]>([]);
  categoriesRef.current = categories;

  // 刷新书签数据（复用已加载的书签列表给 getAllTags，避免二次读取）
  const refreshBookmarks = useCallback(async () => {
    try {
      const data = await bookmarkStorage.getBookmarks();
      setBookmarks(data);

      // 复用已加载的书签提取标签，不再内部重新加载
      const tags = await bookmarkStorage.getAllTags(data);
      setAllTags(tags);

      // 更新存储信息
      updateStorageInfo(data, categoriesRef.current);
    } catch (error) {
      console.error('[BookmarkContext] Failed to refresh bookmarks:', error);
    }
  }, []);

  // 刷新分类数据
  const refreshCategories = useCallback(async () => {
    try {
      const data = await bookmarkStorage.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('[BookmarkContext] Failed to refresh categories:', error);
    }
  }, []);

  // 更新存储信息（轻量级估算，不使用 JSON.stringify + Blob）
  const updateStorageInfo = (bms: LocalBookmark[], cats: LocalCategory[]) => {
    const tagSet = new Set<string>();
    bms.forEach(b => b.tags.forEach(t => tagSet.add(t)));

    // 轻量级估算：每条书签按平均字段长度估算约 500 字节
    const estimatedBytes = bms.length * 500 + cats.length * 100;
    const sizeInKB = (estimatedBytes / 1024).toFixed(2);

    setStorageInfo({
      bookmarkCount: bms.length,
      categoryCount: cats.length,
      tagCount: tagSet.size,
      storageSize: `${sizeInKB} KB`,
    });
  };

  // 初始化加载（避免 getAllTags 内部二次加载 getBookmarks）
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [bms, cats, config, settings] = await Promise.all([
          bookmarkStorage.getBookmarks(),
          bookmarkStorage.getCategories(),
          configStorage.getAIConfig(),
          configStorage.getSettings(),
        ]);

        // 复用已加载的 bms 提取标签
        const tags = await bookmarkStorage.getAllTags(bms);

        setBookmarks(bms);
        setCategories(cats);
        setAllTags(tags);
        setAIConfig(config);
        setAppSettings(settings);
        updateStorageInfo(bms, cats);
      } catch (error) {
        console.error('[BookmarkContext] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // 监听 storage 变化（使用 WXT Storage watch）
  // 当 watcherPausedRef > 0 时，跳过回调（批量导入期间暂停）
  useEffect(() => {
    const unwatchBookmarks = bookmarkStorage.watchBookmarks(() => {
      if (watcherPausedRef.current > 0) return;
      refreshBookmarks();
    });
    const unwatchCategories = bookmarkStorage.watchCategories(() => {
      if (watcherPausedRef.current > 0) return;
      refreshCategories();
    });

    return () => {
      unwatchBookmarks();
      unwatchCategories();
    };
  }, [refreshBookmarks, refreshCategories]);

  // 书签操作
  const addBookmark = async (data: CreateBookmarkInput): Promise<LocalBookmark> => {
    const bookmark = await bookmarkStorage.createBookmark(data);
    await refreshBookmarks();
    return bookmark;
  };

  const updateBookmark = async (id: string, data: Partial<LocalBookmark>) => {
    await bookmarkStorage.updateBookmark(id, data);
    await refreshBookmarks();
  };

  const deleteBookmark = async (id: string, permanent = false) => {
    await bookmarkStorage.deleteBookmark(id, permanent);
    await refreshBookmarks();
  };

  // 分类操作
  const addCategory = async (name: string, parentId: string | null = null) => {
    const category = await bookmarkStorage.createCategory(name, parentId);
    await refreshCategories();
    return category;
  };

  const updateCategory = async (id: string, data: Partial<LocalCategory>) => {
    await bookmarkStorage.updateCategory(id, data);
    await refreshCategories();
  };

  const deleteCategory = async (id: string) => {
    await bookmarkStorage.deleteCategory(id);
    await refreshCategories();
    await refreshBookmarks(); // 书签分类可能被清除
  };

  // 批量添加分类
  const bulkAddCategories = async (
    newCategories: Array<{ id?: string; name: string; parentId: string | null }>
  ) => {
    // 创建 ID 映射表（用于处理层级关系）
    const idMap = new Map<string, string>();
    
    // 先添加根分类
    const rootCategories = newCategories.filter(c => !c.parentId);
    for (const cat of rootCategories) {
      try {
        const created = await bookmarkStorage.createCategory(cat.name, null);
        if (cat.id) {
          idMap.set(cat.id, created.id);
        }
      } catch (error) {
        // 忽略重复分类错误
        console.warn('[BookmarkContext] Skip duplicate category:', cat.name);
      }
    }
    
    // 再添加子分类（可能需要多轮处理嵌套结构）
    let remaining = newCategories.filter(c => c.parentId);
    let maxIterations = 10; // 防止无限循环
    
    while (remaining.length > 0 && maxIterations > 0) {
      const stillRemaining: typeof remaining = [];
      
      for (const cat of remaining) {
        const mappedParentId = cat.parentId ? idMap.get(cat.parentId) : null;
        
        if (mappedParentId || !cat.parentId) {
          try {
            const created = await bookmarkStorage.createCategory(cat.name, mappedParentId || null);
            if (cat.id) {
              idMap.set(cat.id, created.id);
            }
          } catch (error) {
            console.warn('[BookmarkContext] Skip duplicate category:', cat.name);
          }
        } else {
          // 父分类还未创建，稍后重试
          stillRemaining.push(cat);
        }
      }
      
      remaining = stillRemaining;
      maxIterations--;
    }
    
    await refreshCategories();
  };

  // 配置操作
  const updateAIConfig = async (config: Partial<AIConfig>) => {
    const updated = await configStorage.setAIConfig(config);
    setAIConfig(updated);
  };

  const updateAppSettings = async (settings: Partial<LocalSettings>) => {
    const updated = await configStorage.setSettings(settings);
    setAppSettings(updated);
  };

  // 批量导入辅助：暂停/恢复 storage watcher
  const pauseWatchers = useCallback(() => {
    watcherPausedRef.current++;
  }, []);

  const resumeWatchers = useCallback(() => {
    watcherPausedRef.current = Math.max(0, watcherPausedRef.current - 1);
  }, []);

  // 清除所有数据（使用 WXT Storage）
  const clearAllData = async () => {
    // 清除 sync 和 local 存储
    await Promise.all([
      storage.removeItem('sync:bookmarks'),
      storage.removeItem('sync:categories'),
      storage.removeItem('sync:aiConfig'),
      storage.removeItem('sync:settings'),
      storage.removeItem('sync:customFilters'),
      storage.removeItem('local:bookmarkContents'),
    ]);
    setBookmarks([]);
    setCategories([]);
    setAllTags([]);
    setAIConfig(DEFAULT_AI_CONFIG);
    setAppSettings(DEFAULT_SETTINGS);
    setStorageInfo({
      bookmarkCount: 0,
      categoryCount: 0,
      tagCount: 0,
      storageSize: '0 KB',
    });
  };

  // 导出数据
  const exportData = (format: 'json' | 'html') => {
    const data = {
      version: '1.0.0',
      exportedAt: Date.now(),
      bookmarks,
      categories,
    };

    if (format === 'json') {
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const filename = `hamhome_bookmarks_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(dataUri, filename);
    } else {
      const htmlContent = generateHtmlExport(bookmarks, categories);
      const dataUri = 'data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent);
      const filename = `hamhome_bookmarks_${new Date().toISOString().split('T')[0]}.html`;
      downloadFile(dataUri, filename);
    }
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarks,
        categories,
        allTags,
        aiConfig,
        appSettings,
        storageInfo,
        loading,
        addBookmark,
        updateBookmark,
        deleteBookmark,
        refreshBookmarks,
        addCategory,
        updateCategory,
        deleteCategory,
        refreshCategories,
        bulkAddCategories,
        updateAIConfig,
        updateAppSettings,
        clearAllData,
        exportData,
        pauseWatchers,
        resumeWatchers,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

// Hook
export function useBookmarks() {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error('useBookmarks must be used within a BookmarkProvider');
  }
  return context;
}

// 辅助函数：下载文件
function downloadFile(dataUri: string, filename: string) {
  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', filename);
  link.click();
}

// 辅助函数：生成 HTML 导出
function generateHtmlExport(bookmarks: LocalBookmark[], categories: LocalCategory[]): string {
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HamHome 书签导出</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; background: #f5f5f5; }
    h1 { color: #333; margin-bottom: 24px; }
    .bookmark { background: white; margin-bottom: 16px; padding: 16px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #1a1a1a; }
    .title a { color: inherit; text-decoration: none; }
    .title a:hover { color: #f59e0b; }
    .url { color: #666; font-size: 12px; margin-bottom: 8px; word-break: break-all; }
    .description { color: #444; font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
    .meta { display: flex; gap: 8px; flex-wrap: wrap; }
    .category { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
    .tag { background: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🐹 HamHome 书签导出</h1>
  ${bookmarks.map(b => `
  <div class="bookmark">
    <div class="title"><a href="${b.url}" target="_blank">${escapeHtml(b.title)}</a></div>
    <div class="url">${escapeHtml(b.url)}</div>
    ${b.description ? `<div class="description">${escapeHtml(b.description)}</div>` : ''}
    <div class="meta">
      ${b.categoryId ? `<span class="category">${escapeHtml(categoryMap.get(b.categoryId) || '未分类')}</span>` : ''}
      ${b.tags.map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}
    </div>
  </div>
  `).join('')}
</body>
</html>`;
}

// 辅助函数：HTML 转义
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

