/**
 * Background Service - 使用 @webext-core/proxy-service
 * 提供类型安全的 background 方法调用
 */
import { registerService } from "@webext-core/proxy-service";
import { browser } from "wxt/browser";
import {
  BACKGROUND_SERVICE_KEY,
  type ArchiveActionResult,
  type IBackgroundService,
  type QueueProgress,
} from "./background-service-contract";
import { aiCacheStorage } from "@/lib/storage/ai-cache-storage";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { readLaterStorage } from "@/lib/storage/read-later-storage";
import { filterLibraryBookmarks } from "@/lib/read-later/read-later.utils";
import { configStorage } from "@/lib/storage/config-storage";
import { bookmarkHealthService } from "@/lib/services/bookmark-health-service";
import { bookmarkScreenshotService } from "@/lib/services/bookmark-screenshot-service";
import { vectorStore } from "@/lib/storage/vector-store";
import { workspaceService } from "@/lib/services/workspace-service";
import { pageSnapshotService } from "@/lib/services/page-snapshot-service";
import { readLaterService } from "@/lib/services/read-later-service";
import { tabActivityService } from "@/lib/services/tab-activity-service";
import { tabStatsService } from "@/lib/services/tab-stats-service";
import { tabArchiveService } from "@/lib/services/tab-archive-service";
import { tabBadgeService } from "@/lib/services/tab-badge-service";
import { tabBookmarkService } from "@/lib/services/tab-bookmark-service";
import { tabLifecycleService } from "@/lib/services/tab-lifecycle-service";
import { saveUndoRecord } from "@/lib/services/tab-undo-records";
import { tabUndoService } from "@/lib/services/tab-undo-service";
import { queueBookmarkEmbeddings } from "@/lib/embedding/queue-bookmark-embeddings";
import { embeddingClient, embeddingQueue } from "@/lib/embedding";
import { semanticRetriever } from "@/lib/search/semantic-retriever";
import {
  bookmarkAnalysisService,
  clipAnalysisService,
  translationService,
} from "@/lib/agent";
import { inspectClipImageMetadata } from "@/lib/agent/fetch-clip-image";
import { getExtensionURL, type ShortcutCommand } from "@/utils/browser-api";
import {
  globalAgentService,
  type GlobalAgentTurnResult,
} from "@/lib/agent/services/global-agent-service";
import type {
  AnalysisResult,
  BookmarkEmbedding,
  ConversationalSearchTurnInput,
  LocalCategory,
  PageContent,
  BookmarkHealthRecord,
  SaveFlowClipContext,
  ImageClipMetadata,
  SaveScreenshotBackgroundOptions,
  ScreenshotCaptureResult,
  SaveSnapshotBackgroundOptions,
  SnapshotSaveResult,
  ReadLaterSource,
  TabArchiveReason,
  TabAutoArchiveSettings,
  TabBudgetOverAction,
} from "@/types";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "@/lib/search/semantic-retriever";

class BackgroundServiceImpl implements IBackgroundService {
  /** Library bookmarks: queue-only read later items stay out of library views */
  async getBookmarks() {
    const [bookmarks, entries] = await Promise.all([
      bookmarkStorage.getBookmarks(),
      readLaterStorage.getAll(),
    ]);
    return filterLibraryBookmarks(bookmarks, entries);
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
    return pageSnapshotService.getPageHtml();
  }

  async getPageSingleFileHtml(): Promise<string | null> {
    return pageSnapshotService.getPageSingleFileHtml();
  }

  async saveSnapshotBackground(
    bookmarkId: string,
    options: SaveSnapshotBackgroundOptions = {},
  ): Promise<SnapshotSaveResult> {
    return pageSnapshotService.saveSnapshot(bookmarkId, options);
  }

  async saveScreenshotBackground(
    bookmarkId: string,
    options?: SaveScreenshotBackgroundOptions,
  ): Promise<ScreenshotCaptureResult> {
    return bookmarkScreenshotService.captureVisibleTab(bookmarkId, options);
  }

  async scanBookmarkHealth(
    bookmarkIds?: string[],
  ): Promise<BookmarkHealthRecord[]> {
    return bookmarkHealthService.scan(bookmarkIds);
  }

  async openOptionsPage(view: string = "settings"): Promise<void> {
    try {
      const url = browser.runtime.getURL("/app.html") + `#${view}`;
      await browser.tabs.create({ url });
    } catch (error) {
      console.error("[BackgroundService] openOptionsPage error:", error);
    }
  }

  async openTab(url: string): Promise<void> {
    await browser.tabs.create({ url });
  }

  async saveCurrentWindowWorkspace(): Promise<string> {
    const workspace = await workspaceService.saveCurrentWindow();
    return workspace.id;
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
    await queueBookmarkEmbeddings([bookmarkId], { waitForCompletion: true });
  }

  async queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void> {
    await queueBookmarkEmbeddings(bookmarkIds, { waitForCompletion: true });
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

  async globalAgentRunTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
    turnId?: string,
  ): Promise<GlobalAgentTurnResult> {
    return globalAgentService.runTurn(input, sessionId, turnId);
  }

  async globalAgentGetTurnProgress(turnId: string) {
    return globalAgentService.getTurnProgress(turnId);
  }

  async globalAgentCancelTurn(turnId: string) {
    return globalAgentService.cancelTurn(turnId);
  }

  async globalAgentResolveApproval(approvalId: string, approved: boolean) {
    return globalAgentService.resolveApproval(approvalId, approved);
  }

  async globalAgentListSessions() {
    return globalAgentService.listSessions();
  }

  async globalAgentCreateSession(title?: string) {
    return globalAgentService.createSession(title);
  }

  async globalAgentGetSession(sessionId?: string) {
    return globalAgentService.getSession(sessionId);
  }

  async globalAgentClearSession(sessionId: string) {
    return globalAgentService.clearSession(sessionId);
  }

  async globalAgentDeleteSession(sessionId: string) {
    return globalAgentService.deleteSession(sessionId);
  }

  /**
   * AI 分析书签
   * 缓存读写统一在 background 中完成：调用方可能是 content script，
   * 其 IndexedDB 属于所在站点的 origin，直接读写会导致缓存无法命中且污染站点存储
   */
  async analyzeBookmark(options: {
    pageContent: PageContent;
    userCategories?: LocalCategory[];
    existingTags?: string[];
    skipCache?: boolean;
  }): Promise<AnalysisResult> {
    const { skipCache = false, ...analysisOptions } = options;

    if (!skipCache) {
      const cached = await aiCacheStorage.getCachedAnalysis(
        analysisOptions.pageContent.url,
      );
      if (cached) {
        return cached;
      }
    }

    const result = await bookmarkAnalysisService.analyzeBookmark(analysisOptions);
    await aiCacheStorage.cacheAnalysis(analysisOptions.pageContent, result);
    return result;
  }

  /**
   * AI 分析剪藏。
   * 图片剪藏需要抓取跨域原图并转成多模态附件，只有 background 有这个权限，
   * 因此不论调用方是 popup 还是 content script，都在此统一执行。
   */
  async analyzeClip(options: {
    clip: SaveFlowClipContext;
    cacheKey: string;
    source?: { url?: string; title?: string; excerpt?: string };
    userCategories?: LocalCategory[];
    existingTags?: string[];
    skipCache?: boolean;
  }): Promise<AnalysisResult> {
    const { skipCache = false, cacheKey, ...analysisOptions } = options;
    // 图片提示词和输出结构会独立演进，版本化缓存键避免复用缺少主色的旧结果。
    const resolvedCacheKey =
      options.clip.type === "image" ? `clip-image-v2:${cacheKey}` : cacheKey;

    if (!skipCache) {
      const cached = await aiCacheStorage.getCachedAnalysis(resolvedCacheKey);
      if (cached) {
        return cached;
      }
    }

    const result =
      options.clip.type === "image"
        ? await clipAnalysisService.analyzeImageClip(analysisOptions)
        : await clipAnalysisService.analyzeHighlightClip(analysisOptions);

    await aiCacheStorage.cacheAnalysisByUrl(resolvedCacheKey, result);
    return result;
  }

  async inspectClipImage(url: string): Promise<ImageClipMetadata> {
    return inspectClipImageMetadata(url);
  }

  async openProtocolUrl(url: string): Promise<void> {
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

  async translate(text: string, targetLang: "zh" | "en"): Promise<string> {
    return translationService.translate(text, targetLang);
  }

  // ============ Read later ============

  async readLaterTab(
    tabId: number,
    options?: { source?: ReadLaterSource; note?: string; closeTab?: boolean },
  ) {
    return readLaterService.addTab(tabId, options);
  }

  async readLaterTabs(
    tabIds: number[],
    source: ReadLaterSource,
    options?: { closeTabs?: boolean },
  ) {
    return readLaterService.addTabs(tabIds, source, options);
  }

  async readLaterArchiveEntries(entryIds: string[]) {
    return readLaterService.addArchiveEntries(entryIds);
  }

  async readLaterBookmarks(bookmarkIds: string[]) {
    return readLaterService.addBookmarks(bookmarkIds, "manual");
  }

  async getReadLaterQuickList(limit = 8) {
    return readLaterService.getQuickList(Math.min(20, Math.max(1, limit)));
  }

  async readLaterOpen(bookmarkId: string) {
    return readLaterService.open(bookmarkId);
  }

  async readLaterMarkRead(bookmarkIds: string[]) {
    return readLaterService.markRead(bookmarkIds);
  }

  async readLaterRequeue(bookmarkIds: string[]) {
    return readLaterService.requeue(bookmarkIds);
  }

  async readLaterKeep(bookmarkIds: string[], classify: boolean) {
    return readLaterService.keep(bookmarkIds, { classify });
  }

  async readLaterRemove(bookmarkIds: string[]) {
    return readLaterService.remove(bookmarkIds);
  }

  async readLaterUpdateNote(bookmarkId: string, note: string) {
    return readLaterService.updateNote(bookmarkId, note);
  }

  // ============ Tab archive & tab center ============

  private async withUndo(
    result: Awaited<ReturnType<typeof tabArchiveService.archiveTabs>>,
  ): Promise<ArchiveActionResult> {
    if (!result.batchId) return result;
    const undoToken = await saveUndoRecord({
      kind: "archive",
      batchId: result.batchId,
      createdAt: Date.now(),
    });
    return { ...result, undoToken };
  }

  async archiveTabs(tabIds: number[], reason: TabArchiveReason) {
    const automatic = reason === "expired" || reason === "budget";
    // Tidy-up suggestions were made earlier: tabs protected since then stay open
    const ids =
      reason === "triage" ? await tabLifecycleService.filterStillArchivable(tabIds) : tabIds;
    const result = await tabArchiveService.archiveTabs(ids, reason, {
      skipProtected: automatic,
    });
    tabBadgeService.scheduleRefresh();
    return this.withUndo({
      ...result,
      skipped: result.skipped + new Set(tabIds).size - ids.length,
    });
  }

  async closeDuplicateTabs(tabIds?: number[]) {
    const snapshot = await tabLifecycleService.getSnapshot();
    const scope = tabIds ? new Set(tabIds) : null;
    // Redundant duplicates are never protected; unsubmitted input is checked here
    const redundant = await tabLifecycleService.filterStillArchivable(
      snapshot.tabs
        .filter((tab) => tab.redundantDuplicate && (!scope || scope.has(tab.tabId)))
        .map((tab) => tab.tabId),
      { snapshot },
    );
    const result = await tabArchiveService.archiveTabs(redundant, "duplicate");
    tabBadgeService.scheduleRefresh();
    return this.withUndo(result);
  }

  async closeTabsWithoutRecord(tabIds: number[]) {
    const tabs = await Promise.all(tabIds.map((id) => browser.tabs.get(id).catch(() => null)));
    const closable = tabs
      .filter((tab) => tab?.id != null && !tab.pinned)
      .map((tab) => tab!.id!);
    if (closable.length > 0) await browser.tabs.remove(closable);
    return closable.length;
  }

  async restoreArchiveEntries(entryIds: string[], activate = false) {
    return tabArchiveService.restoreEntries(entryIds, { activate });
  }

  async restoreArchiveBatches(batchIds: string[]) {
    return tabArchiveService.restoreBatches(batchIds);
  }

  async deleteArchiveEntries(entryIds: string[]) {
    return tabArchiveService.deleteEntries(entryIds);
  }

  async clearTabArchive() {
    return tabArchiveService.clear();
  }

  async bookmarkTabs(tabIds: number[], options?: { categoryByTabId?: Record<number, string> }) {
    return tabBookmarkService.bookmarkTabs(tabIds, options);
  }

  async bookmarkArchiveEntries(entryIds: string[]) {
    return tabBookmarkService.bookmarkArchiveEntries(entryIds);
  }

  async setTabsLocked(tabIds: number[], locked: boolean) {
    return tabActivityService.setLocked(tabIds, locked);
  }

  async renewTabs(tabIds: number[]) {
    return tabActivityService.renew(tabIds);
  }

  async getTabWeeklyOverview() {
    return tabStatsService.getWeeklyOverview();
  }

  async focusTab(tabId: number) {
    return tabLifecycleService.focusTab(tabId);
  }

  async undoTabAction(token: string) {
    return tabUndoService.undo(token);
  }

  // ============ Lifecycle settings & budget ============

  async dismissBudgetNudge(mode: "today" | "hour") {
    return tabLifecycleService.dismissBudgetNudge(mode);
  }

  async resumeBudgetNudge() {
    return tabLifecycleService.resumeBudgetNudge();
  }

  async confirmPendingArchive(tabIds?: number[]) {
    return tabLifecycleService.confirmPendingArchive(tabIds);
  }

  async keepPendingArchive(tabIds?: number[]) {
    return tabLifecycleService.keepPendingArchive(tabIds);
  }

  async setAutoArchiveEnabled(enabled: boolean, patch?: Partial<TabAutoArchiveSettings>) {
    return tabLifecycleService.setAutoArchiveEnabled(enabled, patch);
  }

  async setOverBudgetAction(action: TabBudgetOverAction) {
    const settings = await tabLifecycleService.setOverBudgetAction(action);
    tabBadgeService.scheduleRefresh();
    return settings;
  }

  async acceptSyncedTabConsent(kind: "autoArchive" | "autoMakeRoom") {
    return tabLifecycleService.acceptSyncedConsent(kind);
  }

  async setTabActivityTracking(enabled: boolean) {
    return tabLifecycleService.setActivityTracking(enabled);
  }

  async completeTabCenterOnboarding() {
    return tabLifecycleService.completeOnboarding();
  }

  async runTabLifecycleSweep() {
    return tabLifecycleService.runSweep();
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
