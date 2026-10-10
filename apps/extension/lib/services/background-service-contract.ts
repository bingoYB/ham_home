import type { ProxyServiceKey } from "@webext-core/proxy-service";
import type { QueueProgress, QueueStatus } from "@/lib/embedding";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "@/lib/search/semantic-retriever";
import type { GlobalAgentTurnResult } from "@/lib/agent/services/global-agent-service";
import type {
  AgentTurnProgress,
  AnalysisResult,
  ImageClipMetadata,
  BookmarkEmbedding,
  ChatSearchSessionSnapshot,
  ChatSearchSessionSummary,
  ConversationalSearchTurnInput,
  Language,
  LocalBookmark,
  LocalCategory,
  LocalSettings,
  PageContent,
  BookmarkHealthRecord,
  SaveFlowClipContext,
  SaveScreenshotBackgroundOptions,
  ScreenshotCaptureResult,
  SaveSnapshotBackgroundOptions,
  SnapshotSaveResult,
  ReadLaterAddResult,
  ReadLaterBatchResult,
  ReadLaterQuickList,
  ReadLaterSource,
  TabArchiveReason,
  TabArchiveResult,
  TabAutoArchiveSettings,
  TabBudgetOverAction,
  TabLifecycleSettings,
  TabLifecycleSweepSummary,
  TabRestoreResult,
  TabWeeklyOverview,
  QuickBookmarkResult,
} from "@/types";
import type { ShortcutCommand } from "@/utils/browser-api";

export interface ArchiveActionResult extends TabArchiveResult {
  /** For the in-page "Undo" button */
  undoToken?: string;
}

export interface IBackgroundService {
  getBookmarks(): Promise<LocalBookmark[]>;
  getCategories(): Promise<LocalCategory[]>;
  getAllTags(): Promise<string[]>;
  getSettings(): Promise<LocalSettings>;
  getPageHtml(): Promise<string | null>;
  getPageSingleFileHtml(): Promise<string | null>;
  openOptionsPage(view?: string): Promise<void>;
  openTab(url: string): Promise<void>;
  saveCurrentWindowWorkspace(): Promise<string>;
  saveSnapshotBackground(
    bookmarkId: string,
    options?: SaveSnapshotBackgroundOptions,
  ): Promise<SnapshotSaveResult>;
  saveScreenshotBackground(
    bookmarkId: string,
    options?: SaveScreenshotBackgroundOptions,
  ): Promise<ScreenshotCaptureResult>;
  scanBookmarkHealth(bookmarkIds?: string[]): Promise<BookmarkHealthRecord[]>;
  getVectorStats(): Promise<VectorStoreStats>;
  clearVectorStore(): Promise<void>;
  getEmbeddingQueueStatus(): Promise<QueueStatus>;
  startEmbeddingRebuild(): Promise<{ jobCount: number }>;
  startEmbeddingRebuildIncremental(): Promise<{ jobCount: number }>;
  pauseEmbeddingQueue(): Promise<void>;
  resumeEmbeddingQueue(): Promise<void>;
  stopEmbeddingQueue(): Promise<void>;
  testEmbeddingConnection(): Promise<{
    success: boolean;
    error?: string;
    dimensions?: number;
  }>;
  queueBookmarkEmbedding(bookmarkId: string): Promise<void>;
  queueBookmarksEmbedding(bookmarkIds: string[]): Promise<void>;
  semanticSearch(
    query: string,
    options?: SemanticSearchOptions,
  ): Promise<SemanticSearchResult>;
  isSemanticAvailable(): Promise<boolean>;
  findSimilarBookmarks(
    bookmarkId: string,
    options?: SemanticSearchOptions,
  ): Promise<SemanticSearchResult>;
  getBookmarkEmbedding(bookmarkId: string): Promise<BookmarkEmbedding | null>;
  getEmbeddingsByModel(modelKey: string): Promise<BookmarkEmbedding[]>;
  getEmbeddingCoverageStats(): Promise<{
    total: number;
    withEmbedding: number;
    coverage: number;
  }>;
  getShortcuts(): Promise<ShortcutCommand[]>;
  /**
   * Run one global agent turn. Pass `turnId` so the UI can poll its progress
   * and approvals for high-risk tool calls; without it those calls are rejected.
   */
  globalAgentRunTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
    turnId?: string,
  ): Promise<GlobalAgentTurnResult>;
  /** Live steps, streamed answer and pending approval of a running turn; null once it finished. */
  globalAgentGetTurnProgress(turnId: string): Promise<AgentTurnProgress | null>;
  /** Stop a running turn; nothing of it is saved. False when it is not running. */
  globalAgentCancelTurn(turnId: string): Promise<boolean>;
  /** Approve or reject a pending tool call; false when it already expired. */
  globalAgentResolveApproval(approvalId: string, approved: boolean): Promise<boolean>;
  globalAgentListSessions(): Promise<ChatSearchSessionSummary[]>;
  globalAgentCreateSession(title?: string): Promise<ChatSearchSessionSnapshot>;
  globalAgentGetSession(sessionId?: string): Promise<ChatSearchSessionSnapshot>;
  globalAgentClearSession(sessionId: string): Promise<ChatSearchSessionSnapshot>;
  globalAgentDeleteSession(sessionId: string): Promise<ChatSearchSessionSummary[]>;
  analyzeBookmark(options: {
    pageContent: PageContent;
    userCategories?: LocalCategory[];
    existingTags?: string[];
    /** 跳过缓存强制重新分析（重试场景） */
    skipCache?: boolean;
  }): Promise<AnalysisResult>;
  /**
   * AI 分析剪藏（图片 / 选中文字）。
   * 与整页书签分析分开：图片走多模态，文字以选中片段为主体，
   * 图片抓取需要 background 的跨域权限，因此必须在此执行。
   */
  analyzeClip(options: {
    clip: SaveFlowClipContext;
    /** 剪藏书签的地址，用作分析缓存的键 */
    cacheKey: string;
    source?: { url?: string; title?: string; excerpt?: string };
    userCategories?: LocalCategory[];
    existingTags?: string[];
    /** 跳过缓存强制重新分析（重试场景） */
    skipCache?: boolean;
  }): Promise<AnalysisResult>;
  /** 读取图片剪藏原图的尺寸、大小和格式，不触发 AI。 */
  inspectClipImage(url: string): Promise<ImageClipMetadata>;
  translate(text: string, targetLang: Language): Promise<string>;
  /**
   * 在浏览器中打开外部协议链接（如 obsidian://）
   * content script 没有 tabs 权限，需要由 background 代为执行
   */
  openProtocolUrl(url: string): Promise<void>;

  // ============ Read later ============
  /** Read later & close (closing follows the setting unless `closeTab` is given) */
  readLaterTab(
    tabId: number,
    options?: { source?: ReadLaterSource; note?: string; closeTab?: boolean },
  ): Promise<ReadLaterAddResult>;
  readLaterTabs(
    tabIds: number[],
    source: ReadLaterSource,
    options?: { closeTabs?: boolean },
  ): Promise<ReadLaterBatchResult>;
  readLaterArchiveEntries(entryIds: string[]): Promise<ReadLaterBatchResult>;
  readLaterBookmarks(bookmarkIds: string[]): Promise<ReadLaterBatchResult>;
  /** Newest unread items for the in-page edge panel */
  getReadLaterQuickList(limit?: number): Promise<ReadLaterQuickList>;
  /** Open in a new tab and mark as reading */
  readLaterOpen(bookmarkId: string): Promise<boolean>;
  readLaterMarkRead(bookmarkIds: string[]): Promise<void>;
  /** Add again: unread, expiry renewed */
  readLaterRequeue(bookmarkIds: string[]): Promise<void>;
  /** Keep in the library; `classify` lets AI fill in category and tags */
  readLaterKeep(bookmarkIds: string[], classify: boolean): Promise<void>;
  /** Queue-only items go to the trash, library bookmarks only leave the queue */
  readLaterRemove(bookmarkIds: string[]): Promise<{ trashed: number; dequeued: number }>;
  readLaterUpdateNote(bookmarkId: string, note: string): Promise<void>;

  // ============ Tab archive & tab center ============
  /** Archive first, then close; protected tabs are skipped for automatic reasons */
  archiveTabs(tabIds: number[], reason: TabArchiveReason): Promise<ArchiveActionResult>;
  /** Close duplicates (archived), keeping the most recently used tab of each group */
  closeDuplicateTabs(tabIds?: number[]): Promise<ArchiveActionResult>;
  /** "Close without keeping a record" */
  closeTabsWithoutRecord(tabIds: number[]): Promise<number>;
  restoreArchiveEntries(entryIds: string[], activate?: boolean): Promise<TabRestoreResult>;
  restoreArchiveBatches(batchIds: string[]): Promise<TabRestoreResult>;
  deleteArchiveEntries(entryIds: string[]): Promise<void>;
  clearTabArchive(): Promise<void>;
  /** `categoryByTabId` files tabs into existing categories */
  bookmarkTabs(
    tabIds: number[],
    options?: { categoryByTabId?: Record<number, string> },
  ): Promise<QuickBookmarkResult>;
  bookmarkArchiveEntries(entryIds: string[]): Promise<QuickBookmarkResult>;
  setTabsLocked(tabIds: number[], locked: boolean): Promise<void>;
  /** Reset the idle timer */
  renewTabs(tabIds: number[]): Promise<void>;
  /** Local stats of the last 7 days against the week before (this device only) */
  getTabWeeklyOverview(): Promise<TabWeeklyOverview>;
  focusTab(tabId: number): Promise<void>;
  /** Undo from an in-page toast; false when the token expired */
  undoTabAction(token: string): Promise<boolean>;

  // ============ Lifecycle settings & budget ============
  dismissBudgetNudge(mode: "today" | "hour"): Promise<void>;
  resumeBudgetNudge(): Promise<void>;
  confirmPendingArchive(tabIds?: number[]): Promise<number>;
  keepPendingArchive(tabIds?: number[]): Promise<void>;
  /** Turning auto archive on records consent for this device; never retroactive */
  setAutoArchiveEnabled(
    enabled: boolean,
    patch?: Partial<TabAutoArchiveSettings>,
  ): Promise<TabLifecycleSettings>;
  /** "auto-archive" (make room automatically) also needs this device's consent */
  setOverBudgetAction(action: TabBudgetOverAction): Promise<TabLifecycleSettings>;
  acceptSyncedTabConsent(kind: "autoArchive" | "autoMakeRoom"): Promise<void>;
  setTabActivityTracking(enabled: boolean): Promise<void>;
  completeTabCenterOnboarding(): Promise<void>;
  runTabLifecycleSweep(): Promise<TabLifecycleSweepSummary>;
}

export const BACKGROUND_SERVICE_KEY =
  "BackgroundService" as ProxyServiceKey<IBackgroundService>;

export type { QueueProgress };
