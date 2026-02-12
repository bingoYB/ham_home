/**
 * Embedding 任务队列
 * 负责增量生成/重建、失败重试、限流
 */
import type { LocalBookmark, EmbeddingJob, EmbeddingJobStatus, BookmarkEmbedding } from '@/types';
import { embeddingClient, EmbeddingRateLimitError } from './embedding-client';
import { vectorStore } from '@/lib/storage';
import { bookmarkStorage, configStorage } from '@/lib/storage';
import { createLogger } from '@hamhome/utils';

const logger = createLogger({ namespace: 'EmbeddingQueue' });

/**
 * 生成 embedding 输入文本的 hash（用于检测是否需要重新生成）
 */
function generateChecksum(text: string): string {
  // 简单的 hash 算法，足够用于检测变化
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * 构建 embedding 输入文本
 * 只对每条书签生成 1 个向量，输入文本为"稳定、短、可解释"的摘要拼接
 */
function buildEmbeddingText(bookmark: LocalBookmark): string {
  const parts: string[] = [];

  if (bookmark.title) {
    parts.push(`title: ${bookmark.title}`);
  }

  if (bookmark.description) {
    parts.push(`description: ${bookmark.description}`);
  }

  if (bookmark.tags && bookmark.tags.length > 0) {
    parts.push(`tags: ${bookmark.tags.join(', ')}`);
  }

  // URL: 只取域名与路径要点，避免 query 参数噪声
  if (bookmark.url) {
    try {
      const url = new URL(bookmark.url);
      const cleanUrl = `${url.hostname}${url.pathname}`;
      parts.push(`url: ${cleanUrl}`);
    } catch {
      parts.push(`url: ${bookmark.url}`);
    }
  }

  return parts.join('\n');
}

/**
 * 检查 URL 是否匹配隐私域名列表
 */
async function isPrivacyUrl(url: string): Promise<boolean> {
  try {
    const aiConfig = await configStorage.getAIConfig();
    const privacyDomains = aiConfig.privacyDomains || [];

    if (privacyDomains.length === 0) return false;

    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    return privacyDomains.some(domain => {
      const d = domain.toLowerCase();
      return hostname === d || hostname.endsWith(`.${d}`);
    });
  } catch {
    return false;
  }
}

/**
 * 队列配置
 */
interface QueueConfig {
  /** 批量处理大小 */
  batchSize: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 基础重试延迟（毫秒） */
  baseRetryDelay: number;
  /** 请求间隔（毫秒） */
  requestInterval: number;
}

const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  batchSize: 16,
  maxRetries: 3,
  baseRetryDelay: 1000,
  requestInterval: 100,
};

/**
 * Embedding 任务队列类
 */
class EmbeddingQueue {
  private jobs: Map<string, EmbeddingJob> = new Map();
  private isProcessing = false;
  private isPaused = false;
  private config: QueueConfig = DEFAULT_QUEUE_CONFIG;
  private progressCallback?: (progress: QueueProgress) => void;

  /**
   * 设置进度回调
   */
  onProgress(callback: (progress: QueueProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * 添加书签到队列
   */
  async addBookmark(bookmark: LocalBookmark): Promise<void> {
    // 检查是否为隐私域名
    if (await isPrivacyUrl(bookmark.url)) {
      logger.debug('Skipping privacy URL', { bookmarkId: bookmark.id });
      return;
    }

    // 检查是否需要更新
    const embeddingText = buildEmbeddingText(bookmark);
    const checksum = generateChecksum(embeddingText);
    const needsUpdate = await vectorStore.needsUpdate(bookmark.id, checksum);

    if (!needsUpdate) {
      logger.debug('Embedding up to date', { bookmarkId: bookmark.id });
      return;
    }

    const job: EmbeddingJob = {
      bookmarkId: bookmark.id,
      status: 'pending',
      retryCount: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.jobs.set(bookmark.id, job);
    logger.debug('Added job to queue', { bookmarkId: bookmark.id });
  }

  /**
   * 批量添加书签到队列
   */
  async addBookmarks(bookmarks: LocalBookmark[]): Promise<void> {
    for (const bookmark of bookmarks) {
      await this.addBookmark(bookmark);
    }
  }

  /**
   * 添加所有书签到队列（用于重建索引）
   */
  async addAllBookmarks(): Promise<number> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    await this.addBookmarks(bookmarks);
    return this.jobs.size;
  }

  /**
   * 开始处理队列
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Queue is already processing');
      return;
    }

    // 加载配置
    const embeddingConfig = await configStorage.getEmbeddingConfig();
    this.config.batchSize = embeddingConfig.batchSize || DEFAULT_QUEUE_CONFIG.batchSize;

    this.isProcessing = true;
    this.isPaused = false;

    logger.info('Starting queue processing', { jobCount: this.jobs.size });

    await this.processQueue();
  }

  /**
   * 暂停队列
   */
  pause(): void {
    this.isPaused = true;
    logger.info('Queue paused');
  }

  /**
   * 恢复队列
   */
  resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    logger.info('Queue resumed');
    if (this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * 停止队列
   */
  stop(): void {
    this.isProcessing = false;
    this.isPaused = false;
    logger.info('Queue stopped');
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.jobs.clear();
    logger.info('Queue cleared');
  }

  /**
   * 获取队列状态
   */
  getStatus(): QueueStatus {
    const pending = Array.from(this.jobs.values()).filter(j => j.status === 'pending').length;
    const processing = Array.from(this.jobs.values()).filter(j => j.status === 'processing').length;
    const completed = Array.from(this.jobs.values()).filter(j => j.status === 'completed').length;
    const failed = Array.from(this.jobs.values()).filter(j => j.status === 'failed').length;

    return {
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      total: this.jobs.size,
      pending,
      processing,
      completed,
      failed,
    };
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    while (this.isProcessing && !this.isPaused) {
      // 获取待处理的任务
      const pendingJobs = Array.from(this.jobs.values())
        .filter(j => j.status === 'pending')
        .slice(0, this.config.batchSize);

      if (pendingJobs.length === 0) {
        logger.info('Queue processing completed');
        this.isProcessing = false;
        this.notifyProgress();
        return;
      }

      // 批量处理
      await this.processBatch(pendingJobs);

      // 等待一小段时间再处理下一批
      await this.sleep(this.config.requestInterval);
    }
  }

  /**
   * 批量处理任务
   */
  private async processBatch(jobs: EmbeddingJob[]): Promise<void> {
    // 标记为处理中
    for (const job of jobs) {
      job.status = 'processing';
      job.updatedAt = Date.now();
    }

    try {
      // 获取书签信息
      const bookmarkIds = jobs.map(j => j.bookmarkId);
      const bookmarks = await this.getBookmarksByIds(bookmarkIds);

      // 过滤掉找不到的书签
      const validJobs: Array<{ job: EmbeddingJob; bookmark: LocalBookmark; text: string; checksum: string }> = [];

      for (const job of jobs) {
        const bookmark = bookmarks.get(job.bookmarkId);
        if (!bookmark) {
          job.status = 'failed';
          job.error = 'Bookmark not found';
          job.updatedAt = Date.now();
          continue;
        }

        const text = buildEmbeddingText(bookmark);
        const checksum = generateChecksum(text);
        validJobs.push({ job, bookmark, text, checksum });
      }

      if (validJobs.length === 0) {
        this.notifyProgress();
        return;
      }

      // 调用 embedding API
      const texts = validJobs.map(v => v.text);
      const embeddings = await embeddingClient.embedBatch(texts);
      const modelKey = embeddingClient.getModelKey();

      // 保存向量
      const bookmarkEmbeddings: BookmarkEmbedding[] = [];
      const now = Date.now();

      for (let i = 0; i < validJobs.length; i++) {
        const { job, checksum } = validJobs[i];
        const vector = embeddings[i];

        const bookmarkEmbedding: BookmarkEmbedding = {
          bookmarkId: job.bookmarkId,
          modelKey,
          dim: vector.length,
          vector: new Float32Array(vector).buffer,
          checksum,
          createdAt: now,
          updatedAt: now,
        };

        bookmarkEmbeddings.push(bookmarkEmbedding);

        job.status = 'completed';
        job.updatedAt = now;
      }

      await vectorStore.saveEmbeddings(bookmarkEmbeddings);
      logger.debug('Batch processed', { count: bookmarkEmbeddings.length });

    } catch (error) {
      // 处理限流错误
      if (error instanceof EmbeddingRateLimitError) {
        logger.warn('Rate limit hit, pausing queue', { retryAfter: error.retryAfterSeconds });

        // 将任务回退到 pending
        for (const job of jobs) {
          if (job.status === 'processing') {
            job.status = 'pending';
            job.updatedAt = Date.now();
          }
        }

        // 等待后重试
        const waitTime = (error.retryAfterSeconds || 60) * 1000;
        await this.sleep(waitTime);
        return;
      }

      // 处理其他错误
      logger.error('Batch processing failed', error);

      for (const job of jobs) {
        if (job.status === 'processing') {
          job.retryCount++;
          job.error = error instanceof Error ? error.message : String(error);
          job.updatedAt = Date.now();

          if (job.retryCount >= this.config.maxRetries) {
            job.status = 'failed';
          } else {
            job.status = 'pending';
            // 指数退避
            await this.sleep(this.config.baseRetryDelay * Math.pow(2, job.retryCount - 1));
          }
        }
      }
    }

    this.notifyProgress();
  }

  /**
   * 根据 ID 列表获取书签
   */
  private async getBookmarksByIds(ids: string[]): Promise<Map<string, LocalBookmark>> {
    const result = new Map<string, LocalBookmark>();
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });

    for (const bookmark of bookmarks) {
      if (ids.includes(bookmark.id)) {
        result.set(bookmark.id, bookmark);
      }
    }

    return result;
  }

  /**
   * 通知进度
   */
  private notifyProgress(): void {
    if (this.progressCallback) {
      const status = this.getStatus();
      // 当队列为空且不在处理中时，表示已完成（可能是所有书签都已是最新的）
      const percentage = status.total > 0
        ? Math.round((status.completed / status.total) * 100)
        : (!this.isProcessing ? 100 : 0);

      this.progressCallback({
        total: status.total,
        completed: status.completed,
        failed: status.failed,
        percentage,
      });
    }
  }

  /**
   * 延迟
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 队列状态
 */
export interface QueueStatus {
  isProcessing: boolean;
  isPaused: boolean;
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

/**
 * 队列进度
 */
export interface QueueProgress {
  total: number;
  completed: number;
  failed: number;
  percentage: number;
}

// 导出单例
export const embeddingQueue = new EmbeddingQueue();

// 导出工具函数
export { buildEmbeddingText, generateChecksum, isPrivacyUrl };
