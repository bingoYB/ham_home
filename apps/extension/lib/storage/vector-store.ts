/**
 * 向量存储模块
 * 使用 IndexedDB 存储书签的 embedding 向量
 */
import type { BookmarkEmbedding } from '@/types';
import { createLogger } from '@hamhome/utils';

const logger = createLogger({ namespace: 'VectorStore' });

const DB_NAME = 'HamHomeVectors';
const STORE_NAME = 'bookmarkEmbeddings';
const DB_VERSION = 1;

/**
 * 向量存储统计信息
 */
export interface VectorStoreStats {
  /** 总向量数 */
  count: number;
  /** 按模型分组的向量数 */
  countByModel: Record<string, number>;
  /** 估算存储大小（字节） */
  estimatedSize: number;
}

class VectorStore {
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
        reject(new Error('Failed to open VectorStore IndexedDB'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 创建对象存储（如果不存在）
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'bookmarkId' });
          // 创建索引以支持快速查询
          store.createIndex('modelKey', 'modelKey', { unique: false });
          store.createIndex('checksum', 'checksum', { unique: false });
          store.createIndex('bookmarkId_modelKey', ['bookmarkId', 'modelKey'], { unique: true });
        }
      };
    });

    await this.initPromise;
    return this.db!;
  }

  /**
   * 保存书签向量
   */
  async saveEmbedding(embedding: BookmarkEmbedding): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);

      const request = store.put(embedding);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to save embedding'));
        };
        request.onsuccess = () => {
          logger.debug('Saved embedding', { bookmarkId: embedding.bookmarkId, dim: embedding.dim });
          resolve();
        };
      });
    } catch (error) {
      logger.error('Failed to save embedding', error);
      throw error;
    }
  }

  /**
   * 批量保存书签向量
   */
  async saveEmbeddings(embeddings: BookmarkEmbedding[]): Promise<void> {
    if (embeddings.length === 0) return;

    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        transaction.onerror = () => {
          reject(new Error('Failed to save embeddings batch'));
        };
        transaction.oncomplete = () => {
          logger.debug('Saved embeddings batch', { count: embeddings.length });
          resolve();
        };

        for (const embedding of embeddings) {
          store.put(embedding);
        }
      });
    } catch (error) {
      logger.error('Failed to save embeddings batch', error);
      throw error;
    }
  }

  /**
   * 获取书签向量
   */
  async getEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);

      const request = store.get(bookmarkId);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to get embedding'));
        };
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest<BookmarkEmbedding | undefined>).result;
          resolve(result ?? null);
        };
      });
    } catch (error) {
      logger.error('Failed to get embedding', error);
      return null;
    }
  }

  /**
   * 批量获取书签向量
   */
  async getEmbeddings(bookmarkIds: string[]): Promise<Map<string, BookmarkEmbedding>> {
    const result = new Map<string, BookmarkEmbedding>();

    if (bookmarkIds.length === 0) return result;

    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);

      const promises = bookmarkIds.map(id => {
        return new Promise<void>((resolve) => {
          const request = store.get(id);
          request.onsuccess = (event) => {
            const embedding = (event.target as IDBRequest<BookmarkEmbedding | undefined>).result;
            if (embedding) {
              result.set(id, embedding);
            }
            resolve();
          };
          request.onerror = () => resolve();
        });
      });

      await Promise.all(promises);
      return result;
    } catch (error) {
      logger.error('Failed to get embeddings batch', error);
      return result;
    }
  }

  /**
   * 获取指定模型的所有向量
   */
  async getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
      const index = store.index('modelKey');

      const request = index.getAll(modelKey);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to get embeddings by model'));
        };
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest<BookmarkEmbedding[]>).result;
          resolve(result);
        };
      });
    } catch (error) {
      logger.error('Failed to get embeddings by model', error);
      return [];
    }
  }

  /**
   * 获取所有向量（用于语义搜索）
   */
  async getAllEmbeddings(): Promise<BookmarkEmbedding[]> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);

      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to get all embeddings'));
        };
        request.onsuccess = (event) => {
          const result = (event.target as IDBRequest<BookmarkEmbedding[]>).result;
          resolve(result);
        };
      });
    } catch (error) {
      logger.error('Failed to get all embeddings', error);
      return [];
    }
  }

  /**
   * 检查书签是否需要重新生成向量（checksum 不匹配）
   */
  async needsUpdate(bookmarkId: string, newChecksum: string): Promise<boolean> {
    const existing = await this.getEmbedding(bookmarkId);
    if (!existing) return true;
    return existing.checksum !== newChecksum;
  }

  /**
   * 删除书签向量
   */
  async deleteEmbedding(bookmarkId: string): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);

      const request = store.delete(bookmarkId);

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to delete embedding'));
        };
        request.onsuccess = () => {
          logger.debug('Deleted embedding', { bookmarkId });
          resolve();
        };
      });
    } catch (error) {
      logger.error('Failed to delete embedding', error);
    }
  }

  /**
   * 批量删除书签向量
   */
  async deleteEmbeddings(bookmarkIds: string[]): Promise<void> {
    if (bookmarkIds.length === 0) return;

    try {
      const db = await this.initDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      return new Promise((resolve, reject) => {
        transaction.onerror = () => {
          reject(new Error('Failed to delete embeddings batch'));
        };
        transaction.oncomplete = () => {
          logger.debug('Deleted embeddings batch', { count: bookmarkIds.length });
          resolve();
        };

        for (const id of bookmarkIds) {
          store.delete(id);
        }
      });
    } catch (error) {
      logger.error('Failed to delete embeddings batch', error);
    }
  }

  /**
   * 删除指定模型的所有向量（用于重建索引）
   */
  async deleteByModel(modelKey: string): Promise<number> {
    try {
      const embeddings = await this.getEmbeddingsByModel(modelKey);
      const ids = embeddings.map(e => e.bookmarkId);
      await this.deleteEmbeddings(ids);
      return ids.length;
    } catch (error) {
      logger.error('Failed to delete by model', error);
      return 0;
    }
  }

  /**
   * 清空所有向量
   */
  async clearAll(): Promise<void> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME);

      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onerror = () => {
          reject(new Error('Failed to clear all embeddings'));
        };
        request.onsuccess = () => {
          logger.info('Cleared all embeddings');
          resolve();
        };
      });
    } catch (error) {
      logger.error('Failed to clear all embeddings', error);
    }
  }

  /**
   * 获取存储统计信息
   */
  async getStats(): Promise<VectorStoreStats> {
    try {
      const db = await this.initDB();
      const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);

      const embeddings = await new Promise<BookmarkEmbedding[]>((resolve, reject) => {
        const request = store.getAll();
        request.onerror = () => reject(new Error('Failed to get stats'));
        request.onsuccess = (event) => {
          resolve((event.target as IDBRequest<BookmarkEmbedding[]>).result);
        };
      });

      const countByModel: Record<string, number> = {};
      let estimatedSize = 0;

      for (const embedding of embeddings) {
        countByModel[embedding.modelKey] = (countByModel[embedding.modelKey] || 0) + 1;
        // 估算大小：向量维度 * 4 bytes (Float32) + 元数据
        estimatedSize += embedding.dim * 4 + 200; // 200 bytes 用于元数据
      }

      return {
        count: embeddings.length,
        countByModel,
        estimatedSize,
      };
    } catch (error) {
      logger.error('Failed to get stats', error);
      return { count: 0, countByModel: {}, estimatedSize: 0 };
    }
  }

  /**
   * 获取没有向量的书签 ID 列表
   */
  async getMissingBookmarkIds(allBookmarkIds: string[]): Promise<string[]> {
    const existingEmbeddings = await this.getEmbeddings(allBookmarkIds);
    return allBookmarkIds.filter(id => !existingEmbeddings.has(id));
  }
}

export const vectorStore = new VectorStore();
