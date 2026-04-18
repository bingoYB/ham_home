/**
 * Background Service - 使用 @webext-core/proxy-service
 * 提供类型安全的 background 方法调用
 */
import { registerService } from "@webext-core/proxy-service";
import { browser } from "wxt/browser";
import {
  BACKGROUND_SERVICE_KEY,
  type IBackgroundService,
  type QueueProgress,
} from "./background-service-contract";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { configStorage } from "@/lib/storage/config-storage";
import { snapshotStorage } from "@/lib/storage/snapshot-storage";
import { vectorStore } from "@/lib/storage/vector-store";
import { embeddingClient, embeddingQueue } from "@/lib/embedding";
import { semanticRetriever } from "@/lib/search/semantic-retriever";
import { getExtensionURL, type ShortcutCommand } from "@/utils/browser-api";
import type { BookmarkEmbedding } from "@/types";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "@/lib/search/semantic-retriever";

class BackgroundServiceImpl implements IBackgroundService {
  async getBookmarks() {
    return bookmarkStorage.getBookmarks();
  }

  async getCategories() {
    return bookmarkStorage.getCategories();
  }

  async getAllTags() {
    return bookmarkStorage.getAllTags();
  }

  async getSettings() {
    return configStorage.getSettings();
  }

  async getPageHtml(): Promise<string | null> {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return null;

      try {
        const response = (await browser.tabs.sendMessage(tab.id, {
          type: "EXTRACT_HTML",
        })) as { html?: string } | null;

        if (response?.html) {
          return response.html;
        }
      } catch {
        console.warn(
          "[BackgroundService] EXTRACT_CLEAN_HTML failed, falling back to executeScript",
        );
      }

      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML,
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error("[BackgroundService] getPageHtml error:", error);
      return null;
    }
  }

  async getPageSingleFileHtml(): Promise<string | null> {
    try {
      const [tab] = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return null;

      const targetTabId = tab.id;

      return new Promise<string | null>(async (resolve) => {
        const captureId = crypto.randomUUID();
        let chunks: string[] = [];
        let receivedCount = 0;
        let totalChunks = 0;

        const cleanup = () => {
          browser.runtime.onMessage.removeListener(chunkListener);
        };

        const chunkListener = (message: any) => {
          if (
            message.method === "singlefile.chunk" &&
            message.captureId === captureId
          ) {
            if (totalChunks === 0) {
              totalChunks = message.total;
              chunks = new Array(totalChunks);
            }
            if (!chunks[message.index]) {
              chunks[message.index] = message.chunk;
              receivedCount++;

              if (receivedCount === totalChunks) {
                cleanup();
                resolve(chunks.join(""));
              }
            }
            return false;
          }
        };

        browser.runtime.onMessage.addListener(chunkListener);

        try {
          const response = (await browser.tabs.sendMessage(targetTabId, {
            type: "EXTRACT_SINGLEFILE_HTML",
            captureId,
          })) as { success?: boolean; error?: string } | null;

          if (!response?.success) {
            cleanup();
            console.error(
              "[BackgroundService] SingleFile start failed:",
              response?.error,
            );
            resolve(await this.getPageHtml());
          }
        } catch (error) {
          cleanup();
          console.warn(
            "[BackgroundService] sendMessage failed, falling back",
            error,
          );
          resolve(await this.getPageHtml());
        }
      });
    } catch (error) {
      console.error(
        "[BackgroundService] getPageSingleFileHtml critical error:",
        error,
      );
      return this.getPageHtml();
    }
  }

  async saveSnapshotBackground(
    bookmarkId: string,
    markdown?: string,
  ): Promise<void> {
    try {
      if (markdown) {
        await snapshotStorage.saveSnapshot(
          bookmarkId,
          markdown,
          "text/markdown;charset=utf-8",
        );
      } else {
        const html = await this.getPageSingleFileHtml();
        if (html) {
          await snapshotStorage.saveSnapshot(bookmarkId, html);
        }
      }

      await bookmarkStorage.updateBookmark(bookmarkId, {
        hasSnapshot: true,
      });
      console.log(
        `[BackgroundService] Snapshot saved successfully for ${bookmarkId}`,
      );
    } catch (error) {
      console.warn(
        "[BackgroundService] Failed to save snapshot in background:",
        error,
      );
    }
  }

  async openOptionsPage(view: string = "settings"): Promise<void> {
    await browser.tabs.create({ url: getExtensionURL(`app.html#${view}`) });
  }

  async openTab(url: string): Promise<void> {
    await browser.tabs.create({ url });
  }

  async getVectorStats(): Promise<VectorStoreStats> {
    return vectorStore.getStats();
  }

  async clearVectorStore(): Promise<void> {
    embeddingQueue.stop();
    embeddingQueue.clear();
    await vectorStore.clearAll();
  }

  async getEmbeddingQueueStatus() {
    return embeddingQueue.getStatus();
  }

  async startEmbeddingRebuild(): Promise<{ jobCount: number }> {
    await embeddingClient.loadConfig();
    await vectorStore.clearAll();
    embeddingQueue.clear();
    const jobCount = await embeddingQueue.addAllBookmarks();

    embeddingQueue.onProgress((progress) => {
      this.broadcastEmbeddingProgress(progress);
    });

    await embeddingQueue.start();

    return { jobCount };
  }

  async startEmbeddingRebuildIncremental(): Promise<{ jobCount: number }> {
    await embeddingClient.loadConfig();
    embeddingQueue.clear();
    const jobCount = await embeddingQueue.addAllBookmarks();

    embeddingQueue.onProgress((progress) => {
      this.broadcastEmbeddingProgress(progress);
    });

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

  async testEmbeddingConnection(): Promise<{
    success: boolean;
    error?: string;
    dimensions?: number;
  }> {
    await embeddingClient.loadConfig();
    return embeddingClient.testConnection();
  }

  async queueBookmarkEmbedding(bookmarkId: string): Promise<void> {
    const config = await configStorage.getEmbeddingConfig();
    if (!config.enabled) {
      return;
    }

    await embeddingClient.loadConfig();
    if (!embeddingClient.isEnabled()) {
      return;
    }

    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) {
      return;
    }

    await embeddingQueue.addBookmark(bookmark);

    const status = embeddingQueue.getStatus();
    if (!status.isProcessing) {
      await embeddingQueue.start();
    }
  }

  async queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void> {
    if (bookmarkIds.length === 0) {
      return;
    }

    const config = await configStorage.getEmbeddingConfig();
    if (!config.enabled) {
      return;
    }

    await embeddingClient.loadConfig();
    if (!embeddingClient.isEnabled()) {
      return;
    }

    for (const id of bookmarkIds) {
      const bookmark = await bookmarkStorage.getBookmarkById(id);
      if (bookmark) {
        await embeddingQueue.addBookmark(bookmark);
      }
    }

    const status = embeddingQueue.getStatus();
    if (!status.isProcessing) {
      await embeddingQueue.start();
    }
  }

  async semanticSearch(
    query: string,
    options?: SemanticSearchOptions,
  ): Promise<SemanticSearchResult> {
    return semanticRetriever.search(query, options);
  }

  async isSemanticAvailable(): Promise<boolean> {
    return semanticRetriever.isAvailable();
  }

  async findSimilarBookmarks(
    bookmarkId: string,
    options?: SemanticSearchOptions,
  ): Promise<SemanticSearchResult> {
    return semanticRetriever.findSimilar(bookmarkId, options);
  }

  async getBookmarkEmbedding(
    bookmarkId: string,
  ): Promise<BookmarkEmbedding | null> {
    return vectorStore.getEmbedding(bookmarkId);
  }

  async getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]> {
    return vectorStore.getEmbeddingsByModel(modelKey);
  }

  async getEmbeddingCoverageStats(): Promise<{
    total: number;
    withEmbedding: number;
    coverage: number;
  }> {
    return semanticRetriever.getCoverageStats();
  }

  async getShortcuts(): Promise<ShortcutCommand[]> {
    try {
      if (!browser?.commands?.getAll) {
        console.warn(
          "[BackgroundService] browser.commands.getAll not available",
        );
        return [];
      }

      const commands = await browser.commands.getAll();
      const excludeCommands = [
        "_execute_action",
        "_execute_browser_action",
        "reload",
      ];

      return commands
        .filter((cmd) => {
          if (!cmd.name) return false;
          if (
            excludeCommands.some((exc) => cmd.name!.toLowerCase().includes(exc))
          ) {
            return false;
          }
          return true;
        })
        .map((cmd) => ({
          name: cmd.name || "",
          description: cmd.description || "",
          shortcut: cmd.shortcut || "",
        }));
    } catch (error) {
      console.error("[BackgroundService] Failed to get shortcuts:", error);
      return [];
    }
  }

  private async broadcastEmbeddingProgress(
    progress: QueueProgress,
  ): Promise<void> {
    try {
      await browser.runtime
        .sendMessage({
          type: "EMBEDDING_PROGRESS",
          payload: progress,
        })
        .catch(() => {});
    } catch {
      // ignore
    }
  }
}

export function registerBackgroundService(): void {
  registerService(BACKGROUND_SERVICE_KEY, new BackgroundServiceImpl());
}
