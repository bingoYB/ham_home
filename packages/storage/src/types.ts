import type { Bookmark, Category, BookmarkQuery, ExportData, ImportResult } from '@hamhome/types';

/**
 * 存储适配器接口
 */
export interface StorageAdapter {
  // 书签操作
  getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]>;
  getBookmarkById(id: string): Promise<Bookmark | null>;
  getBookmarkByUrl(url: string): Promise<Bookmark | null>;
  createBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark>;
  updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark>;
  deleteBookmark(id: string, permanent?: boolean): Promise<void>;
  
  // 分类操作
  getCategories(): Promise<Category[]>;
  createCategory(name: string, parentId?: string | null): Promise<Category>;
  updateCategory(id: string, data: Partial<Category>): Promise<Category>;
  deleteCategory(id: string): Promise<void>;
  
  // 标签操作
  getTags(): Promise<string[]>;
  
  // 搜索
  searchBookmarks(query: string): Promise<Bookmark[]>;
  
  // 导入/导出
  exportAll(): Promise<ExportData>;
  importData(data: ExportData): Promise<ImportResult>;
}

