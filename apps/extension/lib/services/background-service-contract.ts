import type { ProxyServiceKey } from "@webext-core/proxy-service";
import type { QueueProgress, QueueStatus } from "@/lib/embedding";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "@/lib/search/semantic-retriever";
import type { GlobalAgentTurnResult } from "@/lib/agent/services/global-agent-service";
import type {
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
} from "@/types";
import type { ShortcutCommand } from "@/utils/browser-api";

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
  globalAgentRunTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
  ): Promise<GlobalAgentTurnResult>;
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
}

export const BACKGROUND_SERVICE_KEY =
  "BackgroundService" as ProxyServiceKey<IBackgroundService>;

export type { QueueProgress };
