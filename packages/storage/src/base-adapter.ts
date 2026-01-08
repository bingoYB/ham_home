import type { Bookmark, Category, BookmarkQuery, ExportData, ImportResult } from '@hamhome/types';
import type { StorageAdapter } from './types';

/**
 * 基础存储适配器 (抽象类)
 * 提供默认实现，子类可覆盖
 */
export abstract class BaseStorageAdapter implements StorageAdapter {
  abstract getBookmarks(query?: BookmarkQuery): Promise<Bookmark[]>;
  abstract getBookmarkById(id: string): Promise<Bookmark | null>;
  abstract createBookmark(data: Omit<Bookmark, 'id' | 'createdAt' | 'updatedAt'>): Promise<Bookmark>;
  abstract updateBookmark(id: string, data: Partial<Bookmark>): Promise<Bookmark>;
  abstract deleteBookmark(id: string, permanent?: boolean): Promise<void>;
  abstract getCategories(): Promise<Category[]>;
  abstract createCategory(name: string, parentId?: string | null): Promise<Category>;
  abstract updateCategory(id: string, data: Partial<Category>): Promise<Category>;
  abstract deleteCategory(id: string): Promise<void>;

  async getBookmarkByUrl(url: string): Promise<Bookmark | null> {
    const bookmarks = await this.getBookmarks();
    return bookmarks.find(b => b.url === url) || null;
  }

  async getTags(): Promise<string[]> {
    const bookmarks = await this.getBookmarks();
    const tagSet = new Set<string>();
    bookmarks.forEach(b => b.tags.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  async searchBookmarks(query: string): Promise<Bookmark[]> {
    return this.getBookmarks({ search: query });
  }

  async exportAll(): Promise<ExportData> {
    const bookmarks = await this.getBookmarks();
    const categories = await this.getCategories();
    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      bookmarks,
      categories,
    };
  }

  abstract importData(data: ExportData): Promise<ImportResult>;
}

