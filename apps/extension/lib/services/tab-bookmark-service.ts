/**
 * Quick bookmarking for several open or archived tabs at once (tab center, triage).
 *
 * Bookmarks are created from the extracted page content without AI, so batches cost
 * nothing; the library's batch AI analysis can enrich them afterwards. Existing URLs
 * are skipped, never duplicated.
 */
import { browser, type Browser } from "wxt/browser";
import pLimit from "p-limit";
import { getFavicon } from "@hamhome/utils";
import { isNonBookmarkableUrl } from "@/lib/privacy";
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import { queueBookmarkEmbeddings } from "@/lib/embedding/queue-bookmark-embeddings";
import { keepEntryInLibrary } from "@/lib/read-later/read-later.utils";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { readLaterStorage } from "@/lib/storage/read-later-storage";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import type { CreateBookmarkInput, QuickBookmarkResult } from "@/types";
import { tabContentService } from "./tab-content-service";

const EXTRACT_CONCURRENCY = 3;

class TabBookmarkService {
  /** `categoryByTabId` files tabs into existing categories (AI tidy-up suggestions) */
  async bookmarkTabs(
    tabIds: readonly number[],
    options: { categoryByTabId?: Record<number, string> } = {},
  ): Promise<QuickBookmarkResult> {
    const tabs = (await Promise.all(tabIds.map((id) => browser.tabs.get(id).catch(() => null))))
      .filter((tab): tab is Browser.tabs.Tab & { id: number; url: string } =>
        !!tab?.id && !!tab.url && !tab.incognito && !isNonBookmarkableUrl(tab.url),
      );
    const limit = pLimit(EXTRACT_CONCURRENCY);
    const inputs = await Promise.all(
      tabs.map((tab) =>
        limit(async (): Promise<CreateBookmarkInput> => {
          const content = await tabContentService.extract(tab.id);
          return {
            url: content?.url || tab.url,
            title: content?.title || tab.title || tab.url,
            description: content?.isPrivate ? "" : (content?.description ?? ""),
            content: content?.isPrivate ? undefined : content?.markdown || undefined,
            categoryId: options.categoryByTabId?.[tab.id] ?? null,
            tags: [],
            favicon: content?.favicon || getFavicon(tab.url),
            hasSnapshot: false,
          };
        }),
      ),
    );
    return this.create(inputs, tabIds.length - tabs.length);
  }

  /** Archived tabs are not open: only title and URL are used */
  async bookmarkArchiveEntries(entryIds: readonly string[]): Promise<QuickBookmarkResult> {
    const entries = await tabArchiveStorage.getEntries(entryIds);
    return this.create(
      entries.map((entry) => ({
        url: entry.url,
        title: entry.title,
        description: "",
        categoryId: null,
        tags: [],
        favicon: entry.favicon || getFavicon(entry.url),
        hasSnapshot: false,
      })),
      entryIds.length - entries.length,
    );
  }

  private async create(
    inputs: CreateBookmarkInput[],
    failed: number,
  ): Promise<QuickBookmarkResult> {
    const created = await bookmarkStorage.createBookmarks(inputs);
    void queueBookmarkEmbeddings(created.map((bookmark) => bookmark.id)).catch(() => undefined);

    // URLs that were only in the read later queue move into the library
    const createdUrls = new Set(created.map((bookmark) => normalizeBookmarkUrl(bookmark.url)));
    const skippedUrls = new Set(
      inputs
        .map((input) => normalizeBookmarkUrl(input.url))
        .filter((url) => !createdUrls.has(url)),
    );
    if (skippedUrls.size > 0) {
      const existing = (await bookmarkStorage.getBookmarks()).filter((bookmark) =>
        skippedUrls.has(normalizeBookmarkUrl(bookmark.url)),
      );
      const now = Date.now();
      await readLaterStorage.updateMany(
        existing.map((bookmark) => bookmark.id),
        (entry) => (entry?.queueOnly ? keepEntryInLibrary(entry, now) : undefined),
      );
    }

    return { created: created.length, existing: inputs.length - created.length, failed };
  }
}

export const tabBookmarkService = new TabBookmarkService();
