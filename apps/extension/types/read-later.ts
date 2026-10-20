/**
 * Read later types.
 *
 * Read later is a state of a bookmark, not a separate data silo: the bookmark record
 * keeps url / title / description / content / snapshot, while the queue state lives in
 * local:readLaterEntries and syncs as its own file (bookmarks/read-later.json), so that
 * older clients parsing bookmark metadata cannot strip it.
 */

export type ReadLaterStatus = "unread" | "reading" | "read" | "expired";

export type ReadLaterSource =
  | "manual"
  | "link"
  | "tab-center"
  | "archive"
  | "triage"
  | "agent"
  | "import";

export interface ReadLaterEntry {
  bookmarkId: string;
  status: ReadLaterStatus;
  /** true: only in the queue, hidden from library views until kept */
  queueOnly: boolean;
  source: ReadLaterSource;
  /** Added, or re-added, at; expiry counts from here */
  addedAt: number;
  note?: string;
  estimatedMinutes?: number;
  openedAt?: number;
  readAt?: number;
  expiredAt?: number;
  /** P2 */
  snoozedUntil?: number;
  /** Page the link was found on, for "read link later" */
  sourceUrl?: string;
  /** Title / description / content still need to be filled in on first open */
  needsEnrichment?: boolean;
  /** Snapshot was requested but not saved before the tab closed */
  snapshotMissing?: boolean;
  /** Removed from the queue while the bookmark stays (library bookmarks) */
  removedAt?: number;
  updatedAt: number;
}

export type ReadLaterEntryMap = Record<string, ReadLaterEntry>;

export type ReadLaterView = "unread" | "read" | "expired";

export type ReadLaterSort = "newest" | "oldest" | "shortest" | "expiring";

export interface ReadLaterAddResult {
  ok: boolean;
  bookmarkId?: string;
  /** A new queue-only bookmark was created */
  created?: boolean;
  /** The URL was already in the queue */
  alreadyQueued?: boolean;
  addedAt?: number;
  /** Tab closed after adding */
  closed?: boolean;
  undoToken?: string;
  error?:
    | "unsupported"
    | "tab-missing"
    | "write-failed"
    | "close-failed"
    | string;
}

export interface ReadLaterBatchResult {
  added: number;
  alreadyQueued: number;
  failed: number;
  closed: number;
  undoToken?: string;
}

/** Page content extracted for read later / quick bookmarking (content script -> background) */
export interface ReadingPageContent {
  url: string;
  title: string;
  description: string;
  /** Article body as Markdown, empty when nothing readable was found */
  markdown: string;
  estimatedMinutes?: number;
  favicon: string;
  isReaderable: boolean;
}

/** A page opened from Read later, as the content script sees it */
export interface ReadingSession {
  bookmarkId: string;
  title: string;
  url: string;
  /** Only in the queue, so "keep in library" makes sense */
  queueOnly: boolean;
}

/** Unread item for quick lists outside the app page (in-page edge panel) */
export interface ReadLaterQuickItem {
  bookmarkId: string;
  title: string;
  url: string;
  favicon?: string;
  addedAt: number;
  estimatedMinutes?: number;
  /** Opened from the queue before, not finished yet */
  reading: boolean;
}

export interface ReadLaterQuickList {
  items: ReadLaterQuickItem[];
  /** All unread items, not only the listed ones */
  unreadCount: number;
}
