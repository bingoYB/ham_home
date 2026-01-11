/**
 * AI 缓存存储模块
 * 使用 IndexedDB 缓存 AI 分析结果，避免重复分析
 * 
 * 场景：
 * - AI 分析过但未保存的页面
 * - 用户再次唤起插件时，直接使用缓存结果，而不是重新分析
 */
import type { AnalysisResult, PageContent } from '@/types';

interface CachedAnalysis {
  id: string;                    // 使用 URL 作为 key
  url: string;
  analysisResult: AnalysisResult;
  createdAt: number;            // 缓存时间戳
  expiresAt: number;            // 过期时间戳（24小时后过期）
}

const DB_NAME = 'HamHomeAICache';
const STORE_NAME = 'analyses';
const DB_VERSION = 1;
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 小时

class AICacheStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化 IndexedDB
   */
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    if (this.initPromise) {
      await this.initPromise;
      return this.db!;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储（如果不存在）
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // 创建索引以支持快速查询
          store.createIndex('url', 'url', { unique: true });
          store.createIndex('expiresAt', 'expiresAt');
        }
      };
    });

    await this.initPromise;
    return this.db!;
  }

  /**
   * 获取缓存的 AI 分析结果
   * @param url 页面 URL
   * @returns 缓存的分析结果，如果不存在或已过期则返回 null
   */
  async getCachedAnalysis(url: string): Promise<AnalysisResult | null> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const index = store.index('url');

      const request = index.get(url);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to get cached analysis'));
        };

        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest<CachedAnalysis | undefined>).result;

          if (!result) {
            resolve(null);
            return;
          }

          // 检查是否过期
          if (result.expiresAt < Date.now()) {
            // 异步删除过期缓存（不阻塞返回）
            this.deleteCachedAnalysis(url).catch(console.error);
            resolve(null);
            return;
          }

          resolve(result.analysisResult);
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to get cached analysis:', error);
      return null;
    }
  }

  /**
   * 保存 AI 分析结果到缓存
   * @param pageContent 页面内容
   * @param analysisResult 分析结果
   */
  async cacheAnalysis(
    pageContent: PageContent,
    analysisResult: AnalysisResult
  ): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME);

      const cachedAnalysis: CachedAnalysis = {
        id: pageContent.url,
        url: pageContent.url,
        analysisResult,
        createdAt: Date.now(),
        expiresAt: Date.now() + CACHE_EXPIRY_TIME,
      };

      const request = store.put(cachedAnalysis);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to cache analysis'));
        };
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to cache analysis:', error);
      // 不抛出错误，缓存失败不应该影响主流程
    }
  }

  /**
   * 删除指定 URL 的缓存
   */
  async deleteCachedAnalysis(url: string): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME);

      const request = store.delete(url);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to delete cached analysis'));
        };
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to delete cached analysis:', error);
    }
  }

  /**
   * 清理所有过期缓存
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const db = await this.initDB();
      const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME);
      const index = store.index('expiresAt');

      let deletedCount = 0;

      return new Promise((resolve, reject) => {
        const range = IDBKeyRange.upperBound(Date.now());
        const request = index.openCursor(range);

        request.onerror = () => {
          reject(new Error('Failed to cleanup expired cache'));
        };

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>).result;
          if (cursor) {
            cursor.delete();
            deletedCount++;
            cursor.continue();
          } else {
            resolve(deletedCount);
          }
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to cleanup expired cache:', error);
      return 0;
    }
  }

  /**
   * 清空所有缓存
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db
        .transaction(STORE_NAME, 'readwrite')
        .objectStore(STORE_NAME);

      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to clear cache'));
        };
        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to clear cache:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{ count: number; size: number }> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        const countRequest = store.count();

        countRequest.onerror = () => {
          reject(new Error('Failed to get cache stats'));
        };

        countRequest.onsuccess = (event) => {
          const count = (event.target as IDBRequest<number>).result;
          // 注：获取 IndexedDB 实际占用大小需要通过 StorageManager API
          // 这里只返回缓存条数
          resolve({ count, size: 0 });
        };
      });
    } catch (error) {
      console.warn('[AICacheStorage] Failed to get cache stats:', error);
      return { count: 0, size: 0 };
    }
  }
}

export const aiCacheStorage = new AICacheStorage();
