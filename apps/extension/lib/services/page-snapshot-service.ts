/**
 * Page snapshot capture (background only).
 *
 * Captures the HTML of a tab (SingleFile when available, plain outerHTML as a
 * fallback) and stores it as the bookmark's offline snapshot. Without a tab ID the
 * active tab of the last focused window is used, as the save panel expects.
 */
import { browser } from "wxt/browser";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { snapshotStorage } from "@/lib/storage/snapshot-storage";
import type { SaveSnapshotBackgroundOptions, SnapshotSaveResult } from "@/types";

async function resolveTabId(tabId?: number): Promise<number | null> {
  if (tabId != null) return tabId;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab?.id ?? null;
}

class PageSnapshotService {
  async getPageHtml(tabId?: number): Promise<string | null> {
    try {
      const targetTabId = await resolveTabId(tabId);
      if (targetTabId == null) return null;

      try {
        const response = (await browser.tabs.sendMessage(targetTabId, {
          type: "EXTRACT_HTML",
        })) as { html?: string } | null;
        if (response?.html) return response.html;
      } catch {
        console.warn(
          "[PageSnapshot] EXTRACT_CLEAN_HTML failed, falling back to executeScript",
        );
      }

      const results = await browser.scripting.executeScript({
        target: { tabId: targetTabId },
        func: () => document.documentElement.outerHTML,
      });
      return results[0]?.result || null;
    } catch (error) {
      console.error("[PageSnapshot] getPageHtml error:", error);
      return null;
    }
  }

  async getPageSingleFileHtml(tabId?: number): Promise<string | null> {
    try {
      const targetTabId = await resolveTabId(tabId);
      if (targetTabId == null) return null;

      return await new Promise<string | null>((resolve) => {
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

        (browser.tabs.sendMessage(targetTabId, {
          type: "EXTRACT_SINGLEFILE_HTML",
          captureId,
        }) as Promise<{ success?: boolean; error?: string } | null>)
          .then(async (response) => {
            if (!response?.success) {
              cleanup();
              console.error("[PageSnapshot] SingleFile start failed:", response?.error);
              resolve(await this.getPageHtml(targetTabId));
            }
          })
          .catch(async (error) => {
            cleanup();
            console.warn("[PageSnapshot] sendMessage failed, falling back", error);
            resolve(await this.getPageHtml(targetTabId));
          });
      });
    } catch (error) {
      console.error("[PageSnapshot] getPageSingleFileHtml critical error:", error);
      return this.getPageHtml(tabId);
    }
  }

  async saveSnapshot(
    bookmarkId: string,
    options: SaveSnapshotBackgroundOptions & { tabId?: number } = {},
  ): Promise<SnapshotSaveResult> {
    try {
      const mode = options.mode ?? (options.markdown ? "markdown" : "html");
      if (mode === "none") return { ok: true, skipped: true };

      const useMarkdown = (mode === "auto" || mode === "markdown") && !!options.markdown;
      if (useMarkdown) {
        await snapshotStorage.saveSnapshot(
          bookmarkId,
          options.markdown!,
          "text/markdown;charset=utf-8",
        );
      } else {
        const html = await this.getPageSingleFileHtml(options.tabId);
        if (!html) return { ok: false, error: "无法获取页面内容" };
        await snapshotStorage.saveSnapshot(bookmarkId, html);
      }

      await bookmarkStorage.updateBookmark(bookmarkId, { hasSnapshot: true });
      return {
        ok: true,
        type: useMarkdown ? "text/markdown;charset=utf-8" : "text/html",
      };
    } catch (error) {
      console.warn("[PageSnapshot] Failed to save snapshot:", error);
      return {
        ok: false,
        error: error instanceof Error ? error.message : "快照保存失败",
      };
    }
  }
}

export const pageSnapshotService = new PageSnapshotService();
