import { browser } from "wxt/browser";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { obsidianSyncStorage } from "@/lib/storage/obsidian-sync-storage";
import type {
  LocalBookmark,
  ObsidianBatchSyncResult,
  ObsidianSyncBookmarkOptions,
  ObsidianSyncResult,
} from "@/types";

const DEFAULT_OBSIDIAN_FOLDER_PATH = "HamHome";
const CLIPBOARD_FALLBACK_MESSAGE =
  "HamHome 已将笔记内容复制到剪贴板。如果 Obsidian 无法读取剪贴板，请回到 HamHome 后重试。";

class ObsidianSyncService {
  async syncBookmark(
    bookmarkId: string,
    options: ObsidianSyncBookmarkOptions = {},
  ): Promise<ObsidianSyncResult> {
    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) {
      return this.fail(bookmarkId, "书签不存在");
    }

    await obsidianSyncStorage.updateState(bookmarkId, {
      status: "syncing",
      error: undefined,
    });

    try {
      const markdown = resolveBookmarkMarkdown(bookmark, options.markdown);
      if (!markdown) {
        return this.fail(bookmarkId, "没有可同步的笔记内容");
      }

      const notePath = buildObsidianNotePath(
        DEFAULT_OBSIDIAN_FOLDER_PATH,
        bookmark,
      );
      const fileContent = buildMarkdownFile(bookmark, markdown);
      const contentHash = await hashText(fileContent);
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

      const copied = await copyToClipboard(fileContent);
      const obsidianUrl = buildObsidianUrl({
        notePath,
        useClipboard: copied,
        content: copied ? CLIPBOARD_FALLBACK_MESSAGE : fileContent,
      });

      await openObsidianUrl(obsidianUrl);

      await obsidianSyncStorage.updateState(bookmarkId, {
        status: "synced",
        lastSyncedAt: Date.now(),
        sourceUpdatedAt: options.sourceUpdatedAt ?? bookmark.updatedAt,
        contentHash,
        error: undefined,
      });

      return { bookmarkId, status: "success", filePath: `${notePath}.md` };
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

function resolveBookmarkMarkdown(
  bookmark: LocalBookmark,
  markdown?: string,
): string | null {
  const content = markdown?.trim() || bookmark.content?.trim();
  if (content) return content;

  const fallback: string[] = [];
  const description = bookmark.description?.trim();
  if (description) {
    fallback.push(description);
  }
  const url = bookmark.url?.trim();
  const title = bookmark.title?.trim() || url;
  if (!title) return null;

  fallback.push(url ? `[${title}](${url})` : title);
  return fallback.join("\n\n");
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

function buildObsidianNotePath(
  folderPath: string,
  bookmark: LocalBookmark,
): string {
  const folder = sanitizeFolderPath(folderPath);
  const filename = sanitizeFileName(bookmark.title || bookmark.url);
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

async function copyToClipboard(content: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(content);
    return true;
  } catch (error) {
    console.warn("[ObsidianSyncService] Clipboard write failed:", error);
    return false;
  }
}

function buildObsidianUrl({
  notePath,
  useClipboard,
  content,
}: {
  notePath: string;
  useClipboard: boolean;
  content: string;
}): string {
  let url = `obsidian://new?file=${encodeURIComponent(notePath)}&overwrite=true`;
  if (useClipboard) {
    url += "&clipboard";
  }
  url += `&content=${encodeURIComponent(content)}`;
  return url;
}

async function openObsidianUrl(url: string): Promise<void> {
  const [activeTab] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (activeTab?.id) {
    await browser.tabs.update(activeTab.id, { url });
    return;
  }

  await browser.tabs.create({ url, active: true });
}

async function hashText(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const obsidianSyncService = new ObsidianSyncService();
