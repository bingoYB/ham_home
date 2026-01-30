/**
 * Background Service - 使用 @webext-core/proxy-service
 * 提供类型安全的 background 方法调用
 */
import { createProxyService, registerService } from '@webext-core/proxy-service';
import type { ProxyServiceKey } from '@webext-core/proxy-service';
import { browser } from 'wxt/browser';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { configStorage } from '@/lib/storage/config-storage';
import { vectorStore } from '@/lib/storage/vector-store';
import { embeddingClient, embeddingQueue } from '@/lib/embedding';
import { semanticRetriever } from '@/lib/search/semantic-retriever';
import type { QueueStatus, QueueProgress } from '@/lib/embedding';
import { getExtensionURL, type ShortcutCommand } from '@/utils/browser-api';
import type { LocalBookmark, LocalCategory, LocalSettings, BookmarkEmbedding } from '@/types';
import type { VectorStoreStats } from '@/lib/storage/vector-store';
import type { SemanticSearchOptions, SemanticSearchResult } from '@/lib/search/semantic-retriever';

/**
 * Background 服务接口
 */
export interface IBackgroundService {
  /** 获取所有书签 */
  getBookmarks(): Promise<LocalBookmark[]>;
  /** 获取所有分类 */
  getCategories(): Promise<LocalCategory[]>;
  /** 获取所有标签 */
  getAllTags(): Promise<string[]>;
  /** 获取设置 */
  getSettings(): Promise<LocalSettings>;
  /** 获取当前页面 HTML */
  getPageHtml(): Promise<string | null>;
  /** 打开设置页面 */
  openOptionsPage(): Promise<void>;
  /** 打开新标签页 */
  openTab(url: string): Promise<void>;

  // ========== Embedding 相关方法 ==========

  /** 获取向量存储统计信息 */
  getVectorStats(): Promise<VectorStoreStats>;
  /** 清空所有向量数据 */
  clearVectorStore(): Promise<void>;
  /** 获取 embedding 队列状态 */
  getEmbeddingQueueStatus(): Promise<QueueStatus>;
  /** 开始重建向量索引 */
  startEmbeddingRebuild(): Promise<{ jobCount: number }>;
  /** 暂停 embedding 队列 */
  pauseEmbeddingQueue(): Promise<void>;
  /** 恢复 embedding 队列 */
  resumeEmbeddingQueue(): Promise<void>;
  /** 停止 embedding 队列 */
  stopEmbeddingQueue(): Promise<void>;
  /** 测试 embedding 连接 */
  testEmbeddingConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }>;
  /** 添加书签到 embedding 队列（保存书签时调用） */
  queueBookmarkEmbedding(bookmarkId: string): Promise<void>;
  /** 批量添加书签到 embedding 队列（导入书签时调用） */
  queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void>;

  // ========== 语义搜索相关方法（用于 content script 调用） ==========

  /** 执行语义搜索（在 background 中执行，确保访问正确的 IndexedDB） */
  semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 检查语义搜索是否可用 */
  isSemanticAvailable(): Promise<boolean>;
  /** 查找相似书签 */
  findSimilarBookmarks(bookmarkId: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult>;
  /** 获取书签的 embedding */
  getBookmarkEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null>;
  /** 获取指定模型的所有 embeddings */
  getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]>;
  /** 获取 embedding 覆盖率统计 */
  getEmbeddingCoverageStats(): Promise<{ total: number; withEmbedding: number; coverage: number }>;

  // ========== 其他方法 ==========

  /** 获取扩展快捷键配置（commands API 只能在 background 中调用） */
  getShortcuts(): Promise<ShortcutCommand[]>;
}

/**
 * Background 服务实现
 * 在 background script 中执行
 */
class BackgroundServiceImpl implements IBackgroundService {
  async getBookmarks(): Promise<LocalBookmark[]> {
    return bookmarkStorage.getBookmarks();
  }

  async getCategories(): Promise<LocalCategory[]> {
    return bookmarkStorage.getCategories();
  }

  async getAllTags(): Promise<string[]> {
    return bookmarkStorage.getAllTags();
  }

  async getSettings(): Promise<LocalSettings> {
    return configStorage.getSettings();
  }

  async getPageHtml(): Promise<string | null> {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return null;

      // 注入脚本获取完整 HTML
      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML,
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('[BackgroundService] getPageHtml error:', error);
      return null;
    }
  }

  async openOptionsPage(): Promise<void> {
    await browser.tabs.create({ url: getExtensionURL('app.html#settings') });
  }

  async openTab(url: string): Promise<void> {
    await browser.tabs.create({ url });
  }

  // ========== Embedding 相关方法实现 ==========

  async getVectorStats(): Promise<VectorStoreStats> {
    return vectorStore.getStats();
  }

  async clearVectorStore(): Promise<void> {
    embeddingQueue.stop();
    embeddingQueue.clear();
    await vectorStore.clearAll();
  }

  async getEmbeddingQueueStatus(): Promise<QueueStatus> {
    return embeddingQueue.getStatus();
  }

  async startEmbeddingRebuild(): Promise<{ jobCount: number }> {
    // 加载配置
    await embeddingClient.loadConfig();

    // 清空现有向量
    await vectorStore.clearAll();

    // 清空队列并重新添加所有书签
    embeddingQueue.clear();
    const jobCount = await embeddingQueue.addAllBookmarks();

    // 设置进度回调，通过消息广播给前端
    embeddingQueue.onProgress((progress) => {
      this.broadcastEmbeddingProgress(progress);
    });

    // 开始处理
    await embeddingQueue.start();

    return { jobCount };
  }

  async pauseEmbeddingQueue(): Promise<void> {
    embeddingQueue.pause();
  }

  async resumeEmbeddingQueue(): Promise<void> {
    embeddingQueue.resume();
  }

  async stopEmbeddingQueue(): Promise<void> {
    embeddingQueue.stop();
  }

  async testEmbeddingConnection(): Promise<{ success: boolean; error?: string; dimensions?: number }> {
    await embeddingClient.loadConfig();
    return embeddingClient.testConnection();
  }

  async queueBookmarkEmbedding(bookmarkId: string): Promise<void> {
    // 检查 embedding 是否启用
    const config = await configStorage.getEmbeddingConfig();
    if (!config.enabled) {
      return;
    }

    // 加载 embedding 配置
    await embeddingClient.loadConfig();
    if (!embeddingClient.isEnabled()) {
      return;
    }

    // 获取书签并添加到队列
    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) {
      return;
    }

    await embeddingQueue.addBookmark(bookmark);

    // 如果队列未在处理中，启动处理
    const status = embeddingQueue.getStatus();
    if (!status.isProcessing) {
      await embeddingQueue.start();
    }
  }

  async queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void> {
    if (bookmarkIds.length === 0) {
      return;
    }

    // 检查 embedding 是否启用
    const config = await configStorage.getEmbeddingConfig();
    if (!config.enabled) {
      return;
    }

    // 加载 embedding 配置
    await embeddingClient.loadConfig();
    if (!embeddingClient.isEnabled()) {
      return;
    }

    // 获取所有书签
    const allBookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const bookmarkMap = new Map(allBookmarks.map(b => [b.id, b]));

    // 添加到队列
    for (const id of bookmarkIds) {
      const bookmark = bookmarkMap.get(id);
      if (bookmark) {
        await embeddingQueue.addBookmark(bookmark);
      }
    }

    // 如果队列未在处理中，启动处理
    const status = embeddingQueue.getStatus();
    if (!status.isProcessing) {
      await embeddingQueue.start();
    }
  }

  // ========== 语义搜索相关方法实现 ==========

  async semanticSearch(query: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult> {
    return semanticRetriever.search(query, options);
  }

  async isSemanticAvailable(): Promise<boolean> {
    return semanticRetriever.isAvailable();
  }

  async findSimilarBookmarks(bookmarkId: string, options?: SemanticSearchOptions): Promise<SemanticSearchResult> {
    return semanticRetriever.findSimilar(bookmarkId, options);
  }

  async getBookmarkEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null> {
    return vectorStore.getEmbedding(bookmarkId);
  }

  async getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]> {
    return vectorStore.getEmbeddingsByModel(modelKey);
  }

  async getEmbeddingCoverageStats(): Promise<{ total: number; withEmbedding: number; coverage: number }> {
    return semanticRetriever.getCoverageStats();
  }

  // ========== 其他方法实现 ==========

  async getShortcuts(): Promise<ShortcutCommand[]> {
    try {
      if (!browser?.commands?.getAll) {
        console.warn('[BackgroundService] browser.commands.getAll not available');
        return [];
      }

      const commands = await browser.commands.getAll();

      // 过滤条件：排除内置命令和开发用命令
      const excludeCommands = [
        '_execute_action',
        '_execute_browser_action',
        'reload',
      ];

      return commands
        .filter((cmd) => {
          if (!cmd.name) return false;
          if (excludeCommands.some((exc) => cmd.name!.toLowerCase().includes(exc))) {
            return false;
          }
          return true;
        })
        .map((cmd) => ({
          name: cmd.name || '',
          description: cmd.description || '',
          shortcut: cmd.shortcut || '',
        }));
    } catch (error) {
      console.error('[BackgroundService] Failed to get shortcuts:', error);
      return [];
    }
  }

  /**
   * 广播 embedding 进度给所有监听的页面
   */
  private async broadcastEmbeddingProgress(progress: QueueProgress): Promise<void> {
    try {
      // 发送消息给所有 extension 页面（如 app.html）
      await browser.runtime.sendMessage({
        type: 'EMBEDDING_PROGRESS',
        payload: progress,
      }).catch(() => {
        // 忽略没有监听器的错误
      });
    } catch {
      // 忽略错误
    }
  }
}

/**
 * 服务 key，用于关联注册和调用
 */
const BACKGROUND_SERVICE_KEY = 'BackgroundService' as ProxyServiceKey<IBackgroundService>;

/**
 * 在 background 中注册服务
 */
export function registerBackgroundService(): void {
  registerService(BACKGROUND_SERVICE_KEY, new BackgroundServiceImpl());
}

/**
 * 在任意位置获取服务代理
 */
export function getBackgroundService() {
  return createProxyService<IBackgroundService>(BACKGROUND_SERVICE_KEY);
}
