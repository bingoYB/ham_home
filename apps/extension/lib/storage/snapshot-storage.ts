/**
 * 快照存储模块
 * 基于 IndexedDB 存储网页快照（HTML）
 */
import type { Snapshot } from '@/types';

const DB_NAME = 'hamhome-snapshots';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';

class SnapshotStorage {
  private db: IDBDatabase | null = null;

  /**
   * 获取或初始化数据库连接
   */
  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('bookmarkId', 'bookmarkId', { unique: true });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  /**
   * 保存快照
   */
  async saveSnapshot(bookmarkId: string, html: string): Promise<Snapshot> {
    const db = await this.getDB();
    const blob = new Blob([html], { type: 'text/html' });

    const snapshot: Snapshot = {
      id: crypto.randomUUID(),
      bookmarkId,
      html: blob,
      size: blob.size,
      createdAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      // 先删除已存在的快照
      const index = store.index('bookmarkId');
      const getRequest = index.get(bookmarkId);

      getRequest.onsuccess = () => {
        if (getRequest.result) {
          store.delete(getRequest.result.id);
        }

        const addRequest = store.add(snapshot);
        addRequest.onsuccess = () => resolve(snapshot);
        addRequest.onerror = () => reject(addRequest.error);
      };

      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  /**
   * 获取快照
   */
  async getSnapshot(bookmarkId: string): Promise<Snapshot | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('bookmarkId');
      const request = index.get(bookmarkId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取快照并返回 Blob URL（用于在新标签页中打开）
   */
  async getSnapshotAsUrl(bookmarkId: string): Promise<string | null> {
    const snapshot = await this.getSnapshot(bookmarkId);
    if (!snapshot) return null;
    return URL.createObjectURL(snapshot.html);
  }

  /**
   * 删除快照
   */
  async deleteSnapshot(bookmarkId: string): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('bookmarkId');
      const request = index.get(bookmarkId);

      request.onsuccess = () => {
        if (request.result) {
          store.delete(request.result.id);
        }
        resolve();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 获取存储使用情况
   */
  async getStorageUsage(): Promise<{ count: number; totalSize: number }> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const snapshots: Snapshot[] = request.result || [];
        resolve({
          count: snapshots.length,
          totalSize: snapshots.reduce((sum, s) => sum + s.size, 0),
        });
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * 清除所有快照
   */
  async clearAllSnapshots(): Promise<void> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const snapshotStorage = new SnapshotStorage();

