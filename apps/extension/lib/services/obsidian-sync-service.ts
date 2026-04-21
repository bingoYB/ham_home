import { browser } from "wxt/browser";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { obsidianSyncStorage } from "@/lib/storage/obsidian-sync-storage";
import { snapshotStorage } from "@/lib/storage/snapshot-storage";
import type {
  LocalBookmark,
  ObsidianBatchSyncResult,
  ObsidianSyncConfig,
  ObsidianSyncResult,
} from "@/types";

const MARKDOWN_TYPE = "text/markdown;charset=utf-8";

class ObsidianSyncService {
  async getConfig(): Promise<ObsidianSyncConfig> {
    return obsidianSyncStorage.getConfig();
  }

  async setConfig(
    config: Partial<ObsidianSyncConfig>,
  ): Promise<ObsidianSyncConfig> {
    return obsidianSyncStorage.setConfig(config);
  }

  async syncBookmark(
    bookmarkId: string,
    options: { skipUnchanged?: boolean } = {},
  ): Promise<ObsidianSyncResult> {
    const config = await obsidianSyncStorage.getConfig();
    if (!config.enabled) {
      return this.fail(bookmarkId, "Obsidian 保存未启用");
    }

    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) {
      return this.fail(bookmarkId, "书签不存在");
    }

    await obsidianSyncStorage.updateState(bookmarkId, {
      status: "syncing",
      error: undefined,
    });

    try {
      const snapshot = await snapshotStorage.getSnapshot(bookmarkId);
      if (!snapshot) {
        return this.fail(bookmarkId, "未找到快照");
      }

      if (snapshot.type !== MARKDOWN_TYPE) {
        return this.fail(bookmarkId, "仅支持同步 Markdown 快照");
      }

      const markdown = await snapshot.html.text();
      const contentHash = await hashText(markdown);
      const state = await obsidianSyncStorage.getState(bookmarkId);

      if (
        options.skipUnchanged !== false &&
        state.status === "synced" &&
        state.contentHash === contentHash
      ) {
        await obsidianSyncStorage.updateState(bookmarkId, {
          status: "synced",
          error: undefined,
        });
        return { bookmarkId, status: "skipped" };
      }

      const filePath = buildObsidianFilePath(config.folderPath, bookmark);
      const fileContent = buildMarkdownFile(bookmark, markdown);
      const blobUrl = URL.createObjectURL(
        new Blob([fileContent], { type: MARKDOWN_TYPE }),
      );

      try {
        await browser.downloads.download({
          url: blobUrl,
          filename: filePath,
          saveAs: false,
          conflictAction: "overwrite",
        });
      } finally {
        URL.revokeObjectURL(blobUrl);
      }

      await obsidianSyncStorage.updateState(bookmarkId, {
        status: "synced",
        lastSyncedAt: Date.now(),
        snapshotUpdatedAt: snapshot.createdAt,
        contentHash,
        error: undefined,
      });

      return { bookmarkId, status: "success", filePath };
    } catch (error) {
      return this.fail(
        bookmarkId,
        error instanceof Error ? error.message : "同步失败",
      );
    }
  }

  async syncBookmarks(bookmarkIds: string[]): Promise<ObsidianBatchSyncResult> {
    const results: ObsidianSyncResult[] = [];
    for (const bookmarkId of bookmarkIds) {
      results.push(await this.syncBookmark(bookmarkId));
    }

    return summarizeBatch(results);
  }

  async autoSyncAfterSave(bookmarkId: string): Promise<ObsidianSyncResult> {
    const config = await obsidianSyncStorage.getConfig();
    if (!config.enabled || !config.autoSyncOnSave) {
      return { bookmarkId, status: "skipped" };
    }
    return this.syncBookmark(bookmarkId, { skipUnchanged: false });
  }

  private async fail(
    bookmarkId: string,
    error: string,
  ): Promise<ObsidianSyncResult> {
    await obsidianSyncStorage.updateState(bookmarkId, {
      status: "failed",
      error,
    });
    return { bookmarkId, status: "failed", error };
  }
}

function summarizeBatch(results: ObsidianSyncResult[]): ObsidianBatchSyncResult {
  return results.reduce<ObsidianBatchSyncResult>(
    (summary, result) => {
      summary.total += 1;
      if (result.status === "success") summary.success += 1;
      if (result.status === "failed") summary.failed += 1;
      if (result.status === "skipped") summary.skipped += 1;
      summary.results.push(result);
      return summary;
    },
    { total: 0, success: 0, failed: 0, skipped: 0, results: [] },
  );
}

function buildMarkdownFile(bookmark: LocalBookmark, markdown: string): string {
  return [
    "---",
    `title: ${JSON.stringify(bookmark.title)}`,
    `url: ${JSON.stringify(bookmark.url)}`,
    `createdAt: ${new Date(bookmark.createdAt).toISOString()}`,
    `updatedAt: ${new Date(bookmark.updatedAt).toISOString()}`,
    `tags: [${bookmark.tags.map((tag) => JSON.stringify(tag)).join(", ")}]`,
    "---",
    "",
    markdown,
    "",
  ].join("\n");
}

function buildObsidianFilePath(
  folderPath: string,
  bookmark: LocalBookmark,
): string {
  const folder = sanitizeFolderPath(folderPath);
  const filename = `${sanitizeFileName(bookmark.title || bookmark.url)}.md`;
  return folder ? `${folder}/${filename}` : filename;
}

function sanitizeFolderPath(path: string): string {
  return path
    .split("/")
    .map((part) => sanitizeFileName(part))
    .filter(Boolean)
    .join("/");
}

function sanitizeFileName(value: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  return (sanitized || "untitled").slice(0, 120);
}

async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const obsidianSyncService = new ObsidianSyncService();
