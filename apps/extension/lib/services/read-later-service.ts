/**
 * Read later (background only).
 *
 * Read later is a bookmark state: one URL maps to at most one bookmark. Adding a URL
 * that is not bookmarked yet creates a "queue only" bookmark, hidden from library
 * views until the user keeps it; adding a library bookmark only queues it.
 *
 * "Read later & close" fixes the tab first, extracts its content, writes the bookmark
 * and queue state, and only then closes the tab; when writing fails the tab stays.
 * Every add can be undone from the in-page toast.
 */
import { browser, type Browser } from "wxt/browser";
import pLimit from "p-limit";
import { getFavicon } from "@hamhome/utils";
import { isNonBookmarkableUrl } from "@/lib/privacy";
import { containsPrivateContent } from "@/lib/privacy/privacy-detector";
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import { queueBookmarkEmbeddings } from "@/lib/embedding/queue-bookmark-embeddings";
import {
  buildQuickList,
  collectExpiredEntries,
  createReadLaterEntry,
  isEntryPending,
  keepEntryInLibrary,
  markEntryRead,
  markEntryReading,
  removeEntryFromQueue,
  requeueEntry,
} from "@/lib/read-later/read-later.utils";
import { aiCacheStorage } from "@/lib/storage/ai-cache-storage";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { configStorage } from "@/lib/storage/config-storage";
import { readLaterStorage } from "@/lib/storage/read-later-storage";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { TAB_MESSAGES } from "@/lib/tabs/tab-messages";
import type {
  AIConfig,
  AnalysisResult,
  CreateBookmarkInput,
  LocalBookmark,
  ReadLaterAddResult,
  ReadLaterBatchResult,
  ReadLaterEntry,
  ReadLaterSource,
  ReadingSession,
  ReadLaterQuickList,
} from "@/types";
import { pageSnapshotService } from "./page-snapshot-service";
import { tabContentService, type ExtractedTabContent } from "./tab-content-service";
import { tabFeedbackService } from "./tab-feedback-service";
import { tabStatsService } from "./tab-stats-service";
import {
  saveUndoRecord,
  type ClosedTabSnapshot,
  type ReadLaterUndoRecord,
} from "./tab-undo-records";

const SNAPSHOT_TIMEOUT_MS = 10_000;
const EXTRACT_CONCURRENCY = 3;

interface QueueInput {
  url: string;
  title: string;
  description: string;
  markdown: string;
  favicon: string;
  estimatedMinutes?: number;
  isPrivate?: boolean;
  needsEnrichment?: boolean;
  sourceUrl?: string;
  note?: string;
}

interface QueueOutcome {
  input: QueueInput;
  bookmarkId?: string;
  created: boolean;
  alreadyQueued: boolean;
  addedAt?: number;
  previous: ReadLaterEntry | null;
  failed: boolean;
}

function isAIConfigured(config: AIConfig): boolean {
  return config.provider === "ollama" ? !!config.baseUrl : !!config.apiKey;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Readable fallback title for a link without text */
function titleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const path = decodeURIComponent(parsed.pathname).replace(/\/$/, "");
    return path && path !== "/" ? `${parsed.hostname}${path}` : parsed.hostname;
  } catch {
    return url;
  }
}

function toQueueInput(content: ExtractedTabContent): QueueInput {
  return {
    url: content.url,
    title: content.title || content.url,
    description: content.isPrivate ? "" : content.description,
    markdown: content.isPrivate ? "" : content.markdown,
    favicon: content.favicon || getFavicon(content.url),
    estimatedMinutes: content.estimatedMinutes,
    isPrivate: content.isPrivate,
  };
}

function snapshotOf(tab: Browser.tabs.Tab): ClosedTabSnapshot {
  return { url: tab.url!, windowId: tab.windowId, index: tab.index, active: tab.active };
}

class ReadLaterService {
  /**
   * Bookmark and queue a list of URLs in one bookmark write.
   * Existing bookmarks are queued (or reported as already queued), new URLs become
   * queue-only bookmarks.
   */
  private async queueMany(
    inputs: readonly QueueInput[],
    source: ReadLaterSource,
  ): Promise<QueueOutcome[]> {
    const now = Date.now();
    const [bookmarks, entries] = await Promise.all([
      bookmarkStorage.getBookmarks(),
      readLaterStorage.getAll(),
    ]);
    const byUrl = new Map(bookmarks.map((bookmark) => [normalizeBookmarkUrl(bookmark.url), bookmark]));

    const toCreate: CreateBookmarkInput[] = [];
    for (const input of inputs) {
      if (byUrl.has(normalizeBookmarkUrl(input.url))) continue;
      toCreate.push({
        url: input.url,
        title: input.title,
        description: input.description,
        content: input.markdown || undefined,
        categoryId: null,
        tags: [],
        favicon: input.favicon,
        hasSnapshot: false,
      });
    }
    const created = await bookmarkStorage.createBookmarks(toCreate);
    const createdIds = new Set(created.map((bookmark) => bookmark.id));
    for (const bookmark of created) byUrl.set(normalizeBookmarkUrl(bookmark.url), bookmark);

    const writes: ReadLaterEntry[] = [];
    const handled = new Set<string>();
    const outcomes = inputs.map((input): QueueOutcome => {
      const bookmark = byUrl.get(normalizeBookmarkUrl(input.url));
      if (!bookmark) {
        return { input, created: false, alreadyQueued: false, previous: null, failed: true };
      }
      const existing = entries[bookmark.id];
      const isNew = createdIds.has(bookmark.id) && !handled.has(bookmark.id);
      if (handled.has(bookmark.id) || isEntryPending(existing)) {
        handled.add(bookmark.id);
        return {
          input,
          bookmarkId: bookmark.id,
          created: false,
          alreadyQueued: true,
          addedAt: existing?.addedAt ?? now,
          previous: existing ?? null,
          failed: false,
        };
      }
      handled.add(bookmark.id);

      const entry = existing
        ? requeueEntry(existing, now, {
            source,
            estimatedMinutes: input.estimatedMinutes ?? existing.estimatedMinutes,
            note: input.note,
          })
        : createReadLaterEntry({
            bookmarkId: bookmark.id,
            // Bookmarks that already were in the library stay in the library
            queueOnly: isNew,
            source,
            now,
            estimatedMinutes: input.estimatedMinutes,
            note: input.note,
            sourceUrl: input.sourceUrl,
            needsEnrichment: input.needsEnrichment,
          });
      writes.push(entry);
      return {
        input,
        bookmarkId: bookmark.id,
        created: isNew,
        alreadyQueued: false,
        addedAt: now,
        previous: existing ?? null,
        failed: false,
      };
    });

    await readLaterStorage.setMany(writes);
    if (source !== "import") tabStatsService.count("readLaterAdded", writes.length);
    void queueBookmarkEmbeddings(Array.from(createdIds)).catch(() => undefined);
    return outcomes;
  }

  /** "Read later & close" for one tab: popup, shortcut and page context menu */
  async addTab(
    tabId: number,
    options: {
      source?: ReadLaterSource;
      note?: string;
      closeTab?: boolean;
      showFeedback?: boolean;
    } = {},
  ): Promise<ReadLaterAddResult> {
    // Fix the tab, URL and title at trigger time, before anything else happens
    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab?.id || !tab.url) return { ok: false, error: "tab-missing" };
    if (tab.incognito || isNonBookmarkableUrl(tab.url)) return { ok: false, error: "unsupported" };

    const settings = await tabLifecycleConfigStorage.getSettings();
    const content = (await tabContentService.extract(tab.id)) ?? {
      url: tab.url,
      title: tab.title || tab.url,
      description: "",
      markdown: "",
      favicon: getFavicon(tab.url),
      isReaderable: false,
      isPrivate: false,
      partial: true,
    };

    let outcome: QueueOutcome;
    try {
      [outcome] = await this.queueMany(
        [{ ...toQueueInput(content), note: options.note }],
        options.source ?? "manual",
      );
    } catch (error) {
      console.warn("[ReadLater] Failed to queue tab:", error);
      return { ok: false, error: "write-failed" };
    }
    if (outcome.failed || !outcome.bookmarkId) return { ok: false, error: "write-failed" };
    const bookmarkId = outcome.bookmarkId;

    // Optional offline snapshot: closing waits for it, at most 10 seconds
    if (
      settings.readLater.saveSnapshotOnAdd &&
      !outcome.alreadyQueued &&
      !content.isPrivate
    ) {
      const saved = await withTimeout(
        pageSnapshotService.saveSnapshot(bookmarkId, {
          tabId: tab.id,
          markdown: content.isReaderable ? content.markdown : undefined,
          mode: "auto",
        }),
        SNAPSHOT_TIMEOUT_MS,
      );
      if (!saved?.ok) {
        await readLaterStorage.update(bookmarkId, (entry) =>
          entry ? { ...entry, snapshotMissing: true, updatedAt: Date.now() } : undefined,
        );
      }
    }

    const shouldClose = options.closeTab ?? settings.readLater.closeTabOnAdd;
    let closed = false;
    if (shouldClose && !tab.pinned) {
      try {
        await browser.tabs.remove(tab.id);
        closed = true;
      } catch (error) {
        console.warn("[ReadLater] Failed to close tab:", error);
      }
    }

    const undoToken = await saveUndoRecord({
      kind: "readLater",
      createdAt: Date.now(),
      tabs: closed ? [snapshotOf(tab)] : [],
      createdBookmarkIds: outcome.created ? [bookmarkId] : [],
      previousEntries: outcome.created || outcome.alreadyQueued ? {} : { [bookmarkId]: outcome.previous },
    });

    if (options.showFeedback !== false) {
      const feedback = {
        kind: "readLater" as const,
        undoToken,
        bookmarkId,
        title: content.title || tab.title || tab.url,
        alreadyQueued: outcome.alreadyQueued,
        addedAt: outcome.addedAt ?? Date.now(),
        tabKept: !closed,
        noteEditable: true,
      };
      if (closed) void tabFeedbackService.showInActiveTab(tab.windowId, feedback);
      else void tabFeedbackService.show(tab.id, feedback);
    }

    // TL;DR only for pages new to HamHome: library bookmarks keep their description
    if (outcome.created && !content.isPrivate && settings.readLater.autoSummary !== "off") {
      void this.summarize(bookmarkId, content).catch(() => undefined);
    }

    return {
      ok: true,
      bookmarkId,
      created: outcome.created,
      alreadyQueued: outcome.alreadyQueued,
      addedAt: outcome.addedAt,
      closed,
      undoToken,
      error: shouldClose && !closed && !tab.pinned ? "close-failed" : undefined,
    };
  }

  /** Several tabs at once (tab center, triage, nudge); no AI summary unless set to "all" */
  async addTabs(
    tabIds: readonly number[],
    source: ReadLaterSource,
    options: { closeTabs?: boolean } = {},
  ): Promise<ReadLaterBatchResult> {
    const tabs = (await Promise.all(tabIds.map((id) => browser.tabs.get(id).catch(() => null))))
      .filter((tab): tab is Browser.tabs.Tab & { id: number; url: string } =>
        !!tab?.id && !!tab.url && !tab.incognito && !isNonBookmarkableUrl(tab.url),
      );
    const settings = await tabLifecycleConfigStorage.getSettings();
    const limit = pLimit(EXTRACT_CONCURRENCY);
    const contents = await Promise.all(
      tabs.map((tab) =>
        limit(async () => (await tabContentService.extract(tab.id)) ?? null),
      ),
    );

    const pairs = tabs
      .map((tab, index) => ({ tab, content: contents[index] }))
      .filter((pair): pair is { tab: (typeof tabs)[number]; content: ExtractedTabContent } => !!pair.content);
    const outcomes = await this.queueMany(pairs.map(({ content }) => toQueueInput(content)), source);

    const shouldClose = options.closeTabs ?? settings.readLater.closeTabOnAdd;
    const closedTabs: Browser.tabs.Tab[] = [];
    if (shouldClose) {
      const closable = pairs
        .filter((pair, index) => !outcomes[index].failed && !pair.tab.pinned)
        .map(({ tab }) => tab);
      await Promise.allSettled(
        closable.map(async (tab) => {
          await browser.tabs.remove(tab.id);
          closedTabs.push(tab);
        }),
      );
    }

    const previousEntries: Record<string, ReadLaterEntry | null> = {};
    for (const outcome of outcomes) {
      if (outcome.bookmarkId && !outcome.created && !outcome.alreadyQueued) {
        previousEntries[outcome.bookmarkId] = outcome.previous;
      }
    }
    const undoToken = await saveUndoRecord({
      kind: "readLater",
      createdAt: Date.now(),
      tabs: closedTabs.map(snapshotOf),
      createdBookmarkIds: outcomes
        .filter((outcome) => outcome.created && outcome.bookmarkId)
        .map((outcome) => outcome.bookmarkId!),
      previousEntries,
    });

    if (settings.readLater.autoSummary === "all") {
      for (const [index, outcome] of outcomes.entries()) {
        if (outcome.bookmarkId && outcome.created && !pairs[index].content.isPrivate) {
          void this.summarize(outcome.bookmarkId, pairs[index].content).catch(() => undefined);
        }
      }
    }

    return {
      added: outcomes.filter((outcome) => !outcome.failed && !outcome.alreadyQueued).length,
      alreadyQueued: outcomes.filter((outcome) => outcome.alreadyQueued).length,
      failed: tabIds.length - tabs.length + outcomes.filter((outcome) => outcome.failed).length,
      closed: closedTabs.length,
      undoToken,
    };
  }

  /** "Read link later": only the URL, link text and source page; the link is not opened */
  async addLink(input: {
    url: string;
    text?: string;
    sourceTabId?: number;
    sourceUrl?: string;
  }): Promise<ReadLaterAddResult> {
    if (isNonBookmarkableUrl(input.url)) return { ok: false, error: "unsupported" };
    let title = input.text?.trim() ?? "";
    if (!title && input.sourceTabId != null) {
      title = await tabContentService.getContextLinkText(input.sourceTabId, input.url);
    }

    const [outcome] = await this.queueMany(
      [
        {
          url: input.url,
          title: title || titleFromUrl(input.url),
          description: "",
          markdown: "",
          favicon: getFavicon(input.url),
          needsEnrichment: true,
          sourceUrl: input.sourceUrl,
        },
      ],
      "link",
    );
    if (!outcome?.bookmarkId) return { ok: false, error: "write-failed" };

    const undoToken = await saveUndoRecord({
      kind: "readLater",
      createdAt: Date.now(),
      tabs: [],
      createdBookmarkIds: outcome.created ? [outcome.bookmarkId] : [],
      previousEntries:
        outcome.created || outcome.alreadyQueued ? {} : { [outcome.bookmarkId]: outcome.previous },
    });

    const feedback = {
      kind: "readLater" as const,
      undoToken,
      bookmarkId: outcome.bookmarkId,
      title: outcome.input.title,
      alreadyQueued: outcome.alreadyQueued,
      addedAt: outcome.addedAt ?? Date.now(),
      tabKept: true,
      noteEditable: true,
    };
    const shown =
      input.sourceTabId != null && (await tabFeedbackService.show(input.sourceTabId, feedback));
    if (!shown) await tabFeedbackService.showInActiveTab(undefined, feedback);

    return {
      ok: true,
      bookmarkId: outcome.bookmarkId,
      created: outcome.created,
      alreadyQueued: outcome.alreadyQueued,
      addedAt: outcome.addedAt,
      closed: false,
      undoToken,
    };
  }

  /** Archived tabs into the queue (title and URL only); they leave the archive */
  async addArchiveEntries(entryIds: readonly string[]): Promise<ReadLaterBatchResult> {
    const entries = await tabArchiveStorage.getEntries(entryIds);
    const outcomes = await this.queueMany(
      entries.map((entry) => ({
        url: entry.url,
        title: entry.title,
        description: "",
        markdown: "",
        favicon: entry.favicon || getFavicon(entry.url),
        needsEnrichment: true,
      })),
      "archive",
    );
    const queued = entries.filter((_, index) => !outcomes[index].failed).map((entry) => entry.id);
    await tabArchiveStorage.deleteEntries(queued);
    return {
      added: outcomes.filter((outcome) => !outcome.failed && !outcome.alreadyQueued).length,
      alreadyQueued: outcomes.filter((outcome) => outcome.alreadyQueued).length,
      failed: outcomes.filter((outcome) => outcome.failed).length,
      closed: 0,
    };
  }

  /** Queue library bookmarks (no duplicates are created) */
  async addBookmarks(
    bookmarkIds: readonly string[],
    source: ReadLaterSource,
  ): Promise<ReadLaterBatchResult> {
    const now = Date.now();
    const entries = await readLaterStorage.getAll();
    const writes: ReadLaterEntry[] = [];
    let alreadyQueued = 0;
    for (const id of new Set(bookmarkIds)) {
      const entry = entries[id];
      if (isEntryPending(entry)) {
        alreadyQueued += 1;
        continue;
      }
      writes.push(
        entry
          ? requeueEntry(entry, now, { source })
          : createReadLaterEntry({ bookmarkId: id, queueOnly: false, source, now }),
      );
    }
    await readLaterStorage.setMany(writes);
    tabStatsService.count("readLaterAdded", writes.length);
    return { added: writes.length, alreadyQueued, failed: 0, closed: 0 };
  }

  /** Newest unread items for the in-page edge panel */
  async getQuickList(limit: number): Promise<ReadLaterQuickList> {
    const [entries, bookmarks] = await Promise.all([
      readLaterStorage.getAll(),
      bookmarkStorage.getBookmarks(),
    ]);
    return buildQuickList(entries, bookmarks, limit);
  }

  /** Open an item in a new tab and mark it as reading */
  async open(bookmarkId: string): Promise<boolean> {
    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) return false;
    const tab = await browser.tabs.create({ url: bookmark.url, active: true });
    const entry = await readLaterStorage.update(bookmarkId, (current) =>
      current ? markEntryReading(current, Date.now()) : undefined,
    );
    if (tab.id != null && entry?.needsEnrichment) {
      await tabSessionStorage.setEnrichment(tab.id, bookmarkId);
    }
    if (tab.id != null && entry) await tabSessionStorage.setReadingTab(tab.id, bookmarkId);
    return true;
  }

  /** The "finished reading?" bar asks whether its page came from the queue */
  async getReadingSession(tabId: number, pageUrl: string): Promise<ReadingSession | null> {
    const bookmarkId = await tabSessionStorage.getReadingTab(tabId);
    if (!bookmarkId) return null;
    const [bookmark, entry] = await Promise.all([
      bookmarkStorage.getBookmarkById(bookmarkId),
      readLaterStorage.get(bookmarkId),
    ]);
    // Navigated elsewhere, or already handled: no bar
    if (!bookmark || !entry || entry.status === "read" || entry.removedAt != null) return null;
    if (normalizeBookmarkUrl(bookmark.url) !== normalizeBookmarkUrl(pageUrl)) return null;
    return { bookmarkId, title: bookmark.title, url: bookmark.url, queueOnly: entry.queueOnly };
  }

  async endReadingSession(tabId: number): Promise<void> {
    await tabSessionStorage.setReadingTab(tabId, null);
  }

  /** A tab finished loading: fill in links added unopened, offer "finished reading?" */
  async handleTabComplete(tabId: number): Promise<void> {
    await this.enrichFromTab(tabId);
    await this.offerReadingBar(tabId);
  }

  private async offerReadingBar(tabId: number): Promise<void> {
    // Cheap check first: this runs for every tab that finishes loading
    if (!(await tabSessionStorage.getReadingTab(tabId))) return;
    const tab = await browser.tabs.get(tabId).catch(() => null);
    if (!tab?.url) return;
    const session = await this.getReadingSession(tabId, tab.url);
    if (!session) return;
    if (!(await tabContentService.ensureContentScript(tabId))) return;
    await browser.tabs
      .sendMessage(tabId, { type: TAB_MESSAGES.readingSession, session })
      .catch(() => undefined);
  }

  private async enrichFromTab(tabId: number): Promise<void> {
    const bookmarkId = await tabSessionStorage.getEnrichment(tabId);
    if (!bookmarkId) return;
    await tabSessionStorage.setEnrichment(tabId, null);

    const [bookmark, content] = await Promise.all([
      bookmarkStorage.getBookmarkById(bookmarkId),
      tabContentService.extract(tabId),
    ]);
    if (!bookmark || !content || content.partial) return;
    if (normalizeBookmarkUrl(content.url) !== normalizeBookmarkUrl(bookmark.url)) return;

    const looksLikePlaceholder =
      !bookmark.title.trim() || bookmark.title === titleFromUrl(bookmark.url) || bookmark.title === bookmark.url;
    await bookmarkStorage.updateBookmark(bookmarkId, {
      title: looksLikePlaceholder && content.title ? content.title : bookmark.title,
      description: bookmark.description || (content.isPrivate ? "" : content.description),
      content: bookmark.content || (content.isPrivate ? undefined : content.markdown || undefined),
      favicon: bookmark.favicon || content.favicon,
    });
    await readLaterStorage.update(bookmarkId, (entry) =>
      entry
        ? {
            ...entry,
            needsEnrichment: undefined,
            estimatedMinutes: entry.estimatedMinutes ?? content.estimatedMinutes,
            updatedAt: Date.now(),
          }
        : undefined,
    );
  }

  async markRead(bookmarkIds: readonly string[]): Promise<void> {
    const now = Date.now();
    let finished = 0;
    await readLaterStorage.updateMany(bookmarkIds, (entry) => {
      if (!entry) return undefined;
      if (entry.status !== "read") finished += 1;
      return markEntryRead(entry, now);
    });
    tabStatsService.count("readLaterRead", finished);
  }

  /** Add again: back to unread, expiry renewed */
  async requeue(bookmarkIds: readonly string[]): Promise<void> {
    const now = Date.now();
    let added = 0;
    await readLaterStorage.updateMany(bookmarkIds, (entry) => {
      if (!entry) return undefined;
      // Renewing an item that still waits is not a new arrival
      if (!isEntryPending(entry)) added += 1;
      return requeueEntry(entry, now);
    });
    tabStatsService.count("readLaterAdded", added);
  }

  async updateNote(bookmarkId: string, note: string): Promise<void> {
    await readLaterStorage.update(bookmarkId, (entry) =>
      entry ? { ...entry, note: note.trim() || undefined, updatedAt: Date.now() } : undefined,
    );
  }

  /**
   * Keep in the library. With `classify`, AI fills in category, tags and summary
   * where they are still empty (when AI is configured and the page is not private).
   */
  async keep(bookmarkIds: readonly string[], options: { classify?: boolean } = {}): Promise<void> {
    const now = Date.now();
    // Library bookmarks are left alone, so saving one again does not touch its entry
    await readLaterStorage.updateMany(bookmarkIds, (entry) =>
      entry?.queueOnly ? keepEntryInLibrary(entry, now) : undefined,
    );
    if (options.classify) {
      for (const id of bookmarkIds) {
        await this.classify(id).catch((error) => {
          console.warn("[ReadLater] AI classification failed:", error);
        });
      }
    }
  }

  /**
   * Delete from the queue: queue-only items go to the trash (30 days, the queue state
   * comes back with them), library bookmarks only leave the queue.
   */
  async remove(bookmarkIds: readonly string[]): Promise<{ trashed: number; dequeued: number }> {
    const entries = await readLaterStorage.getAll();
    const queueOnly = bookmarkIds.filter((id) => entries[id]?.queueOnly);
    const library = bookmarkIds.filter((id) => entries[id] && !entries[id].queueOnly);
    if (queueOnly.length > 0) await bookmarkStorage.batchDeleteBookmarks(queueOnly);
    const now = Date.now();
    await readLaterStorage.updateMany(library, (entry) =>
      entry ? removeEntryFromQueue(entry, now) : undefined,
    );
    return { trashed: queueOnly.length, dequeued: library.length };
  }

  /** Daily: unread items past the expiry period become expired (never deleted) */
  async runExpiry(now = Date.now()): Promise<number> {
    const [settings, entries] = await Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      readLaterStorage.getAll(),
    ]);
    const expired = collectExpiredEntries(
      Object.values(entries),
      settings.readLater.expireAfterDays,
      now,
    );
    await readLaterStorage.setMany(expired);
    tabStatsService.count("readLaterExpired", expired.length);
    return expired.length;
  }

  /** Undo an add: reopen closed tabs, drop created bookmarks, restore queue state */
  async revert(record: ReadLaterUndoRecord): Promise<void> {
    for (const tab of record.tabs) {
      const windowAvailable =
        tab.windowId != null && !!(await browser.windows.get(tab.windowId).catch(() => null));
      await browser.tabs
        .create({
          url: tab.url,
          active: tab.active ?? true,
          ...(windowAvailable ? { windowId: tab.windowId, index: tab.index } : {}),
        })
        .catch(() => undefined);
    }
    if (record.createdBookmarkIds.length > 0) {
      await bookmarkStorage.purgeBookmarks(record.createdBookmarkIds);
    }
    const now = Date.now();
    for (const [bookmarkId, previous] of Object.entries(record.previousEntries)) {
      await readLaterStorage.update(bookmarkId, (current) => {
        if (previous) return { ...previous, updatedAt: now };
        // It was not queued before: leave the queue (soft, so sync carries it over)
        return current ? removeEntryFromQueue(current, now) : undefined;
      });
    }
  }

  // ============ AI ============

  private async analyze(bookmark: LocalBookmark, content?: ExtractedTabContent): Promise<AnalysisResult | null> {
    const aiConfig = await configStorage.getAIConfig();
    if (!isAIConfigured(aiConfig)) return null;
    if (content?.isPrivate || (await containsPrivateContent(bookmark.url)).isPrivate) return null;

    const cached = await aiCacheStorage.getCachedAnalysis(bookmark.url);
    if (cached) return cached;

    const text = content?.markdown || bookmark.content || "";
    if (!text && !bookmark.description) return null;
    const [{ bookmarkAnalysisService }, categories, existingTags] = await Promise.all([
      import("@/lib/agent/services/bookmark-analysis-service"),
      bookmarkStorage.getCategories(),
      bookmarkStorage.getAllTags(),
    ]);
    const pageContent = {
      url: bookmark.url,
      title: bookmark.title,
      content: text,
      htmlContent: "",
      textContent: text,
      excerpt: bookmark.description,
      favicon: bookmark.favicon ?? "",
      isReaderable: !!text,
    };
    const result = await bookmarkAnalysisService.analyzeBookmark({
      pageContent,
      userCategories: categories,
      existingTags,
    });
    await aiCacheStorage.cacheAnalysis(pageContent, result);
    return result;
  }

  private async translateIfNeeded(text: string, aiConfig: AIConfig): Promise<string> {
    if (!aiConfig.enableTranslation || !text) return text;
    const [{ translationService }, settings] = await Promise.all([
      import("@/lib/agent/services/translation-service"),
      configStorage.getSettings(),
    ]);
    return translationService.translate(text, settings.language);
  }

  /** TL;DR into the bookmark description; read later items are not classified */
  private async summarize(bookmarkId: string, content: ExtractedTabContent): Promise<void> {
    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) return;
    const result = await this.analyze(bookmark, content);
    if (!result?.summary) return;
    const aiConfig = await configStorage.getAIConfig();
    const summary = await this.translateIfNeeded(result.summary, aiConfig);
    const latest = await bookmarkStorage.getBookmarkById(bookmarkId);
    // Keep whatever the user typed in the meantime
    if (!latest || (latest.description && latest.description !== bookmark.description)) return;
    await bookmarkStorage.updateBookmark(bookmarkId, { description: summary });
  }

  private async classify(bookmarkId: string): Promise<void> {
    const bookmark = await bookmarkStorage.getBookmarkById(bookmarkId);
    if (!bookmark) return;
    const aiConfig = await configStorage.getAIConfig();
    if (!aiConfig.enableSmartCategory && !aiConfig.enableTagSuggestion) return;
    const result = await this.analyze(bookmark);
    if (!result) return;

    const [{ matchCategoryByName }, categories] = await Promise.all([
      import("@/lib/agent/category-utils"),
      bookmarkStorage.getCategories(),
    ]);
    const patch: Partial<LocalBookmark> = {};
    if (aiConfig.enableSmartCategory && !bookmark.categoryId && result.category) {
      const match = matchCategoryByName(result.category, categories);
      if (match.matched) patch.categoryId = match.categoryId;
    }
    if (aiConfig.enableTagSuggestion && bookmark.tags.length === 0 && result.tags.length > 0) {
      patch.tags = aiConfig.enableTranslation
        ? await Promise.all(result.tags.map((tag) => this.translateIfNeeded(tag, aiConfig)))
        : result.tags;
    }
    if (!bookmark.description && result.summary) {
      patch.description = await this.translateIfNeeded(result.summary, aiConfig);
    }
    if (Object.keys(patch).length > 0) {
      await bookmarkStorage.updateBookmark(bookmarkId, patch);
    }
  }
}

export const readLaterService = new ReadLaterService();
