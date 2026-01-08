/**
 * 书签存储模块
 * 基于 chrome.storage.local 实现书签和分类的 CRUD 操作
 */
import { nanoid } from 'nanoid';
import type {
  LocalBookmark,
  LocalCategory,
  BookmarkQuery,
  CreateBookmarkInput,
  UpdateBookmarkInput,
} from '@/types';

const STORAGE_KEYS = {
  BOOKMARKS: 'bookmarks',
  CATEGORIES: 'categories',
};

class BookmarkStorage {
  // ============ 书签操作 ============

  /**
   * 获取书签列表（支持过滤、排序、分页）
   */
  async getBookmarks(query?: BookmarkQuery): Promise<LocalBookmark[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    let bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];

    // 过滤已删除（除非明确查询已删除）
    if (query?.isDeleted === undefined) {
      bookmarks = bookmarks.filter((b) => !b.isDeleted);
    } else if (query.isDeleted === true) {
      bookmarks = bookmarks.filter((b) => b.isDeleted);
    } else {
      bookmarks = bookmarks.filter((b) => !b.isDeleted);
    }

    // 分类筛选
    if (query?.categoryId !== undefined) {
      bookmarks = bookmarks.filter((b) => b.categoryId === query.categoryId);
    }

    // 标签筛选
    if (query?.tags?.length) {
      bookmarks = bookmarks.filter((b) =>
        query.tags!.some((tag) => b.tags.includes(tag))
      );
    }

    // 搜索
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      bookmarks = bookmarks.filter(
        (b) =>
          b.title.toLowerCase().includes(searchLower) ||
          b.description.toLowerCase().includes(searchLower) ||
          b.url.toLowerCase().includes(searchLower) ||
          b.tags.some((t) => t.toLowerCase().includes(searchLower))
      );
    }

    // 排序
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    bookmarks.sort((a, b) => {
      const aVal = (a[sortBy as keyof LocalBookmark] as number) || 0;
      const bVal = (b[sortBy as keyof LocalBookmark] as number) || 0;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // 分页
    if (query?.offset) bookmarks = bookmarks.slice(query.offset);
    if (query?.limit) bookmarks = bookmarks.slice(0, query.limit);

    return bookmarks;
  }

  /**
   * 根据 ID 获取书签
   */
  async getBookmarkById(id: string): Promise<LocalBookmark | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];
    return bookmarks.find((b) => b.id === id) || null;
  }

  /**
   * 根据 URL 获取书签
   */
  async getBookmarkByUrl(url: string): Promise<LocalBookmark | null> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];
    const normalizedUrl = this.normalizeUrl(url);
    return (
      bookmarks.find(
        (b) => this.normalizeUrl(b.url) === normalizedUrl && !b.isDeleted
      ) || null
    );
  }

  /**
   * 创建书签
   */
  async createBookmark(data: CreateBookmarkInput): Promise<LocalBookmark> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];

    // URL 去重检查
    const normalizedUrl = this.normalizeUrl(data.url);
    const exists = bookmarks.find(
      (b) => this.normalizeUrl(b.url) === normalizedUrl && !b.isDeleted
    );
    if (exists) {
      throw new Error('该网址已收藏');
    }

    const now = Date.now();
    const bookmark: LocalBookmark = {
      ...data,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.BOOKMARKS]: [...bookmarks, bookmark],
    });

    return bookmark;
  }

  /**
   * 更新书签
   */
  async updateBookmark(
    id: string,
    data: UpdateBookmarkInput
  ): Promise<LocalBookmark> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];

    const index = bookmarks.findIndex((b) => b.id === id);
    if (index === -1) {
      throw new Error('书签不存在');
    }

    const updated: LocalBookmark = {
      ...bookmarks[index],
      ...data,
      updatedAt: Date.now(),
    };

    bookmarks[index] = updated;
    await chrome.storage.local.set({ [STORAGE_KEYS.BOOKMARKS]: bookmarks });

    return updated;
  }

  /**
   * 删除书签（支持软删除和永久删除）
   */
  async deleteBookmark(id: string, permanent = false): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.BOOKMARKS);
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];

    if (permanent) {
      // 永久删除
      await chrome.storage.local.set({
        [STORAGE_KEYS.BOOKMARKS]: bookmarks.filter((b) => b.id !== id),
      });
    } else {
      // 软删除
      const index = bookmarks.findIndex((b) => b.id === id);
      if (index !== -1) {
        bookmarks[index].isDeleted = true;
        bookmarks[index].updatedAt = Date.now();
        await chrome.storage.local.set({ [STORAGE_KEYS.BOOKMARKS]: bookmarks });
      }
    }
  }

  /**
   * 恢复已删除的书签
   */
  async restoreBookmark(id: string): Promise<LocalBookmark> {
    return this.updateBookmark(id, { isDeleted: false });
  }

  /**
   * 获取已删除的书签（回收站）
   */
  async getDeletedBookmarks(): Promise<LocalBookmark[]> {
    return this.getBookmarks({ isDeleted: true });
  }

  // ============ 分类操作 ============

  /**
   * 获取所有分类
   */
  async getCategories(): Promise<LocalCategory[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    return result[STORAGE_KEYS.CATEGORIES] || [];
  }

  /**
   * 创建分类
   */
  async createCategory(
    name: string,
    parentId: string | null = null
  ): Promise<LocalCategory> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    const categories: LocalCategory[] = result[STORAGE_KEYS.CATEGORIES] || [];

    // 同名检查
    if (categories.some((c) => c.name === name && c.parentId === parentId)) {
      throw new Error('分类名称已存在');
    }

    const category: LocalCategory = {
      id: nanoid(),
      name,
      parentId,
      order: categories.length,
      createdAt: Date.now(),
    };

    await chrome.storage.local.set({
      [STORAGE_KEYS.CATEGORIES]: [...categories, category],
    });

    return category;
  }

  /**
   * 更新分类
   */
  async updateCategory(
    id: string,
    data: Partial<Omit<LocalCategory, 'id' | 'createdAt'>>
  ): Promise<LocalCategory> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CATEGORIES);
    const categories: LocalCategory[] = result[STORAGE_KEYS.CATEGORIES] || [];

    const index = categories.findIndex((c) => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }

    const updated = { ...categories[index], ...data };
    categories[index] = updated;

    await chrome.storage.local.set({ [STORAGE_KEYS.CATEGORIES]: categories });
    return updated;
  }

  /**
   * 删除分类（将该分类下的书签移至"未分类"）
   */
  async deleteCategory(id: string): Promise<void> {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.CATEGORIES,
      STORAGE_KEYS.BOOKMARKS,
    ]);

    const categories: LocalCategory[] = result[STORAGE_KEYS.CATEGORIES] || [];
    const bookmarks: LocalBookmark[] = result[STORAGE_KEYS.BOOKMARKS] || [];

    // 将该分类下的书签移至"未分类"
    const updatedBookmarks = bookmarks.map((b) =>
      b.categoryId === id
        ? { ...b, categoryId: null, updatedAt: Date.now() }
        : b
    );

    await chrome.storage.local.set({
      [STORAGE_KEYS.CATEGORIES]: categories.filter((c) => c.id !== id),
      [STORAGE_KEYS.BOOKMARKS]: updatedBookmarks,
    });
  }

  // ============ 标签操作 ============

  /**
   * 获取所有已使用的标签
   */
  async getAllTags(): Promise<string[]> {
    const bookmarks = await this.getBookmarks();
    const tagSet = new Set<string>();
    bookmarks.forEach((b) => b.tags.forEach((t) => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }

  // ============ 工具方法 ============

  /**
   * 规范化 URL（移除 tracking 参数，统一格式）
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // 移除 tracking 参数
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'ref',
        'fbclid',
        'gclid',
      ];
      trackingParams.forEach((param) => parsed.searchParams.delete(param));
      // 移除末尾斜杠
      return parsed.toString().replace(/\/$/, '');
    } catch {
      return url;
    }
  }
}

export const bookmarkStorage = new BookmarkStorage();

