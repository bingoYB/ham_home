/**
 * 书签存储模块
 * 基于 WXT Storage 实现书签和分类的 CRUD 操作
 * 
 * 存储策略：
 * - 书签元数据 (local:bookmarks) - 本地存储，不含 content 字段
 *   注意：不使用 sync 是因为 Chrome sync 存储有 8KB/项 的限制，书签数量多时会超限
 * - 书签内容 (local:bookmarkContents) - 本地存储，存储大体积的 content 字段
 * - 分类 (sync:categories) - 跨设备同步（分类数量较少，不易超限）
 */
import { nanoid } from 'nanoid';
import type {
  LocalBookmark,
  LocalCategory,
  BookmarkQuery,
  CreateBookmarkInput,
  UpdateBookmarkInput,
} from '@/types';

/**
 * 书签元数据类型（不含 content 字段，用于 sync 存储）
 */
type BookmarkMeta = Omit<LocalBookmark, 'content'>;

/**
 * 书签内容映射类型
 */
type BookmarkContentsMap = Record<string, string>;

// 定义存储项
// 书签元数据 - local 本地存储（sync 有 8KB 单项限制，书签数量多时会超限）
const bookmarkMetaItem = storage.defineItem<BookmarkMeta[]>('local:bookmarks', {
  fallback: [],
});

// 书签内容 - local 本地存储（大体积数据）
const bookmarkContentsItem = storage.defineItem<BookmarkContentsMap>('local:bookmarkContents', {
  fallback: {},
});

// 分类 - sync 跨设备同步
const categoriesItem = storage.defineItem<LocalCategory[]>('sync:categories', {
  fallback: [],
});

class BookmarkStorage {
  // ============ 内部方法 ============

  /**
   * 从元数据和内容映射中组装完整书签
   */
  private assembleBookmark(meta: BookmarkMeta, contentsMap: BookmarkContentsMap): LocalBookmark {
    return {
      ...meta,
      content: contentsMap[meta.id],
    };
  }

  /**
   * 从完整书签中分离元数据和内容
   */
  private separateBookmark(bookmark: LocalBookmark): { meta: BookmarkMeta; content?: string } {
    const { content, ...meta } = bookmark;
    return { meta, content };
  }

  // ============ 书签操作 ============

  /**
   * 获取书签列表（支持过滤、排序、分页）
   * @param query 查询参数
   * @param includeContent 是否包含 content 字段（默认 false，节省内存）
   */
  async getBookmarks(query?: BookmarkQuery, includeContent = false): Promise<LocalBookmark[]> {
    const [metaList, contentsMap]: [BookmarkMeta[], BookmarkContentsMap] = await Promise.all([
      bookmarkMetaItem.getValue(),
      includeContent ? bookmarkContentsItem.getValue() : Promise.resolve({}),
    ]);

    let bookmarks: LocalBookmark[] = metaList.map((meta: BookmarkMeta) => 
      this.assembleBookmark(meta, contentsMap)
    );

    // 过滤已删除（除非明确查询已删除）
    if (query?.isDeleted === undefined) {
      bookmarks = bookmarks.filter((b: LocalBookmark) => !b.isDeleted);
    } else if (query.isDeleted === true) {
      bookmarks = bookmarks.filter((b: LocalBookmark) => b.isDeleted);
    } else {
      bookmarks = bookmarks.filter((b: LocalBookmark) => !b.isDeleted);
    }

    // 分类筛选
    if (query?.categoryId !== undefined) {
      bookmarks = bookmarks.filter((b: LocalBookmark) => b.categoryId === query.categoryId);
    }

    // 标签筛选
    if (query?.tags?.length) {
      bookmarks = bookmarks.filter((b: LocalBookmark) =>
        query.tags!.some((tag: string) => b.tags.includes(tag))
      );
    }

    // 搜索
    if (query?.search) {
      const searchLower = query.search.toLowerCase();
      bookmarks = bookmarks.filter(
        (b: LocalBookmark) =>
          b.title.toLowerCase().includes(searchLower) ||
          b.description.toLowerCase().includes(searchLower) ||
          b.url.toLowerCase().includes(searchLower) ||
          b.tags.some((t: string) => t.toLowerCase().includes(searchLower))
      );
    }

    // 排序
    const sortBy = query?.sortBy || 'createdAt';
    const sortOrder = query?.sortOrder || 'desc';
    bookmarks.sort((a: LocalBookmark, b: LocalBookmark) => {
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
   * 根据 ID 获取书签（包含 content）
   */
  async getBookmarkById(id: string): Promise<LocalBookmark | null> {
    const [metaList, contentsMap]: [BookmarkMeta[], BookmarkContentsMap] = await Promise.all([
      bookmarkMetaItem.getValue(),
      bookmarkContentsItem.getValue(),
    ]);

    const meta = metaList.find((b: BookmarkMeta) => b.id === id);
    if (!meta) return null;

    return this.assembleBookmark(meta, contentsMap);
  }

  /**
   * 根据 URL 获取书签
   */
  async getBookmarkByUrl(url: string): Promise<LocalBookmark | null> {
    const [metaList, contentsMap]: [BookmarkMeta[], BookmarkContentsMap] = await Promise.all([
      bookmarkMetaItem.getValue(),
      bookmarkContentsItem.getValue(),
    ]);

    const normalizedUrl = this.normalizeUrl(url);
    const meta = metaList.find(
      (b: BookmarkMeta) => this.normalizeUrl(b.url) === normalizedUrl && !b.isDeleted
    );

    if (!meta) return null;
    return this.assembleBookmark(meta, contentsMap);
  }

  /**
   * 创建书签
   */
  async createBookmark(data: CreateBookmarkInput): Promise<LocalBookmark> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();

    // URL 去重检查
    const normalizedUrl = this.normalizeUrl(data.url);
    const exists = metaList.find(
      (b: BookmarkMeta) => this.normalizeUrl(b.url) === normalizedUrl && !b.isDeleted
    );
    if (exists) {
      throw new Error('该网址已收藏');
    }

    const now = Date.now();
    const id = nanoid();
    
    // 分离 content
    const { content, ...metaData } = data;
    
    const meta: BookmarkMeta = {
      ...metaData,
      id,
      createdAt: now,
      updatedAt: now,
    };

    // 保存元数据
    await bookmarkMetaItem.setValue([...metaList, meta]);

    // 保存内容（如果有）
    if (content) {
      const contentsMap = await bookmarkContentsItem.getValue();
      contentsMap[id] = content;
      await bookmarkContentsItem.setValue(contentsMap);
    }

    return { ...meta, content };
  }

  /**
   * 更新书签
   */
  async updateBookmark(
    id: string,
    data: UpdateBookmarkInput
  ): Promise<LocalBookmark> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();

    const index = metaList.findIndex((b: BookmarkMeta) => b.id === id);
    if (index === -1) {
      throw new Error('书签不存在');
    }

    // 分离 content
    const { content, ...metaUpdate } = data;

    // 更新元数据
    const updatedMeta: BookmarkMeta = {
      ...metaList[index],
      ...metaUpdate,
      updatedAt: Date.now(),
    };

    metaList[index] = updatedMeta;
    await bookmarkMetaItem.setValue(metaList);

    // 更新内容（如果提供了）
    if (content !== undefined) {
      const contentsMap = await bookmarkContentsItem.getValue();
      if (content) {
        contentsMap[id] = content;
      } else {
        delete contentsMap[id];
      }
      await bookmarkContentsItem.setValue(contentsMap);
    }

    // 获取完整书签返回
    const contentsMap = await bookmarkContentsItem.getValue();
    return this.assembleBookmark(updatedMeta, contentsMap);
  }

  /**
   * 删除书签（支持软删除和永久删除）
   */
  async deleteBookmark(id: string, permanent = false): Promise<void> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();

    if (permanent) {
      // 永久删除：同时删除元数据和内容
      await bookmarkMetaItem.setValue(metaList.filter((b: BookmarkMeta) => b.id !== id));
      
      const contentsMap = await bookmarkContentsItem.getValue();
      delete contentsMap[id];
      await bookmarkContentsItem.setValue(contentsMap);
    } else {
      // 软删除：只标记元数据
      const index = metaList.findIndex((b: BookmarkMeta) => b.id === id);
      if (index !== -1) {
        metaList[index].isDeleted = true;
        metaList[index].updatedAt = Date.now();
        await bookmarkMetaItem.setValue(metaList);
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
    return categoriesItem.getValue();
  }

  /**
   * 创建分类
   */
  async createCategory(
    name: string,
    parentId: string | null = null
  ): Promise<LocalCategory> {
    const categories: LocalCategory[] = await categoriesItem.getValue();

    // 同名检查
    if (categories.some((c: LocalCategory) => c.name === name && c.parentId === parentId)) {
      throw new Error('分类名称已存在');
    }

    const category: LocalCategory = {
      id: nanoid(),
      name,
      parentId,
      order: categories.length,
      createdAt: Date.now(),
    };

    await categoriesItem.setValue([...categories, category]);
    return category;
  }

  /**
   * 更新分类
   */
  async updateCategory(
    id: string,
    data: Partial<Omit<LocalCategory, 'id' | 'createdAt'>>
  ): Promise<LocalCategory> {
    const categories: LocalCategory[] = await categoriesItem.getValue();

    const index = categories.findIndex((c: LocalCategory) => c.id === id);
    if (index === -1) {
      throw new Error('分类不存在');
    }

    const updated = { ...categories[index], ...data };
    categories[index] = updated;

    await categoriesItem.setValue(categories);
    return updated;
  }

  /**
   * 删除分类（将该分类下的书签移至"未分类"）
   */
  async deleteCategory(id: string): Promise<void> {
    const [categories, metaList]: [LocalCategory[], BookmarkMeta[]] = await Promise.all([
      categoriesItem.getValue(),
      bookmarkMetaItem.getValue(),
    ]);

    // 将该分类下的书签移至"未分类"
    const updatedMetaList = metaList.map((b: BookmarkMeta) =>
      b.categoryId === id
        ? { ...b, categoryId: null, updatedAt: Date.now() }
        : b
    );

    await Promise.all([
      categoriesItem.setValue(categories.filter((c: LocalCategory) => c.id !== id)),
      bookmarkMetaItem.setValue(updatedMetaList),
    ]);
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

  // ============ 批量操作 ============

  /**
   * 批量删除书签
   */
  async batchDeleteBookmarks(ids: string[], permanent = false): Promise<void> {
    let metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();

    if (permanent) {
      metaList = metaList.filter((b: BookmarkMeta) => !ids.includes(b.id));
      await bookmarkMetaItem.setValue(metaList);

      // 同时删除内容
      const contentsMap = await bookmarkContentsItem.getValue();
      ids.forEach((id) => delete contentsMap[id]);
      await bookmarkContentsItem.setValue(contentsMap);
    } else {
      const now = Date.now();
      metaList = metaList.map((b: BookmarkMeta) =>
        ids.includes(b.id) ? { ...b, isDeleted: true, updatedAt: now } : b
      );
      await bookmarkMetaItem.setValue(metaList);
    }
  }

  /**
   * 批量恢复书签
   */
  async batchRestoreBookmarks(ids: string[]): Promise<void> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();
    const now = Date.now();
    const updated = metaList.map((b: BookmarkMeta) =>
      ids.includes(b.id) ? { ...b, isDeleted: false, updatedAt: now } : b
    );

    await bookmarkMetaItem.setValue(updated);
  }

  /**
   * 批量添加标签
   */
  async batchAddTags(ids: string[], tags: string[]): Promise<void> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();
    const now = Date.now();
    const updated = metaList.map((b: BookmarkMeta) =>
      ids.includes(b.id)
        ? {
            ...b,
            tags: [...new Set([...b.tags, ...tags])],
            updatedAt: now,
          }
        : b
    );

    await bookmarkMetaItem.setValue(updated);
  }

  /**
   * 批量移除标签
   */
  async batchRemoveTags(ids: string[], tags: string[]): Promise<void> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();
    const now = Date.now();
    const updated = metaList.map((b: BookmarkMeta) =>
      ids.includes(b.id)
        ? {
            ...b,
            tags: b.tags.filter((t: string) => !tags.includes(t)),
            updatedAt: now,
          }
        : b
    );

    await bookmarkMetaItem.setValue(updated);
  }

  /**
   * 批量更改分类
   */
  async batchChangeCategory(ids: string[], categoryId: string | null): Promise<void> {
    const metaList: BookmarkMeta[] = await bookmarkMetaItem.getValue();
    const now = Date.now();
    const updated = metaList.map((b: BookmarkMeta) =>
      ids.includes(b.id) ? { ...b, categoryId, updatedAt: now } : b
    );

    await bookmarkMetaItem.setValue(updated);
  }

  /**
   * 统一的批量操作接口
   */
  async batchOperate(params: {
    operation: 'delete' | 'addTags' | 'removeTags' | 'changeCategory' | 'restore';
    bookmarkIds: string[];
    tags?: string[];
    categoryId?: string | null;
    permanent?: boolean;
  }): Promise<{ success: number; failed: number; errors?: string[] }> {
    const { operation, bookmarkIds, tags, categoryId, permanent } = params;

    try {
      switch (operation) {
        case 'delete':
          await this.batchDeleteBookmarks(bookmarkIds, permanent);
          break;
        case 'restore':
          await this.batchRestoreBookmarks(bookmarkIds);
          break;
        case 'addTags':
          if (!tags || tags.length === 0) {
            throw new Error('添加标签需要提供标签列表');
          }
          await this.batchAddTags(bookmarkIds, tags);
          break;
        case 'removeTags':
          if (!tags || tags.length === 0) {
            throw new Error('移除标签需要提供标签列表');
          }
          await this.batchRemoveTags(bookmarkIds, tags);
          break;
        case 'changeCategory':
          await this.batchChangeCategory(bookmarkIds, categoryId ?? null);
          break;
        default:
          throw new Error(`未知的操作类型: ${operation}`);
      }

      return {
        success: bookmarkIds.length,
        failed: 0,
      };
    } catch (error) {
      console.error('[BookmarkStorage] Batch operation failed:', error);
      return {
        success: 0,
        failed: bookmarkIds.length,
        errors: [error instanceof Error ? error.message : '批量操作失败'],
      };
    }
  }

  // ============ 监听变化 ============

  /**
   * 监听书签变化（仅监听元数据变化）
   */
  watchBookmarks(callback: (bookmarks: LocalBookmark[]) => void): () => void {
    return bookmarkMetaItem.watch(async (newValue: BookmarkMeta[] | null) => {
      const metaList = newValue ?? [];
      // 不加载 content 以提高性能
      const bookmarks = metaList.map((meta: BookmarkMeta) => ({
        ...meta,
        content: undefined,
      })) as LocalBookmark[];
      callback(bookmarks);
    });
  }

  /**
   * 监听分类变化
   */
  watchCategories(callback: (categories: LocalCategory[]) => void): () => void {
    return categoriesItem.watch((newValue: LocalCategory[] | null) => {
      callback(newValue ?? []);
    });
  }

  // ============ 内容操作 ============

  /**
   * 获取书签内容
   */
  async getBookmarkContent(bookmarkId: string): Promise<string | undefined> {
    const contentsMap = await bookmarkContentsItem.getValue();
    return contentsMap[bookmarkId];
  }

  /**
   * 设置书签内容
   */
  async setBookmarkContent(bookmarkId: string, content: string): Promise<void> {
    const contentsMap = await bookmarkContentsItem.getValue();
    contentsMap[bookmarkId] = content;
    await bookmarkContentsItem.setValue(contentsMap);
  }

  /**
   * 删除书签内容
   */
  async deleteBookmarkContent(bookmarkId: string): Promise<void> {
    const contentsMap = await bookmarkContentsItem.getValue();
    delete contentsMap[bookmarkId];
    await bookmarkContentsItem.setValue(contentsMap);
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
