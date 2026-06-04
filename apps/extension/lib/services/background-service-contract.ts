import type { ProxyServiceKey } from "@webext-core/proxy-service";
import type { QueueProgress, QueueStatus } from "@/lib/embedding";
import type { VectorStoreStats } from "@/lib/storage/vector-store";
import type {
  SemanticSearchOptions,
  SemanticSearchResult,
} from "@/lib/search/semantic-retriever";
import type { ChatSearchTurnResult } from "@/lib/agent/services/chat-search-service";
import type { GlobalAgentTurnResult } from "@/lib/agent/services/global-agent-service";
import type {
  AnalysisResult,
  BookmarkEmbedding,
  ChatSearchSessionSnapshot,
  ChatSearchSessionSummary,
  ConversationalSearchTurnInput,
  Language,
  LocalBookmark,
  LocalCategory,
  LocalSettings,
  PageContent,
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
  chatSearchRunTurn(
    input: ConversationalSearchTurnInput,
    sessionId?: string,
  ): Promise<ChatSearchTurnResult>;
  chatSearchListSessions(): Promise<ChatSearchSessionSummary[]>;
  chatSearchCreateSession(title?: string): Promise<ChatSearchSessionSnapshot>;
  chatSearchGetSession(sessionId?: string): Promise<ChatSearchSessionSnapshot>;
  chatSearchClearSession(sessionId: string): Promise<ChatSearchSessionSnapshot>;
  chatSearchDeleteSession(sessionId: string): Promise<ChatSearchSessionSummary[]>;
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
  }): Promise<AnalysisResult>;
  translate(text: string, targetLang: Language): Promise<string>;
}

export const BACKGROUND_SERVICE_KEY =
  "BackgroundService" as ProxyServiceKey<IBackgroundService>;

export type { QueueProgress };
