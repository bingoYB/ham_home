/**
 * Read later state machine and queue helpers.
 *
 *   unread --open--> reading --mark read--> read
 *   unread / reading --past the expiry period--> expired
 *   read / expired --add again--> unread
 *
 * Any state can be kept to the library (queueOnly -> false) or deleted.
 */
import { compareDedupCandidates, normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import type {
  BookmarkTombstone,
  LocalBookmark,
  ReadLaterEntry,
  ReadLaterEntryMap,
  ReadLaterExpireAfterDays,
  ReadLaterQuickList,
  ReadLaterSort,
  ReadLaterSource,
  ReadLaterStatus,
  ReadLaterView,
} from "@/types";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Queue hint: items expiring within this many days */
export const EXPIRING_SOON_DAYS = 3;
/** Completion rate looks back this far */
export const COMPLETION_WINDOW_DAYS = 30;

/** Chinese characters per minute and English words per minute (rough reference) */
const CJK_CHARS_PER_MINUTE = 400;
const WORDS_PER_MINUTE = 230;

const CJK_PATTERN = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/g;

/** Local reading time estimate; undefined when there is nothing to read */
export function estimateReadingMinutes(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const cjkCount = text.match(CJK_PATTERN)?.length ?? 0;
  const latin = text.replace(CJK_PATTERN, " ");
  const wordCount = latin.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
  if (cjkCount === 0 && wordCount === 0) return undefined;
  const minutes = cjkCount / CJK_CHARS_PER_MINUTE + wordCount / WORDS_PER_MINUTE;
  return Math.max(1, Math.round(minutes));
}

export function isEntryActive(entry: ReadLaterEntry | undefined): entry is ReadLaterEntry {
  return !!entry && entry.removedAt == null;
}

/** Still waiting to be read (counts as unread) */
export function isEntryPending(entry: ReadLaterEntry | undefined): boolean {
  return isEntryActive(entry) && (entry.status === "unread" || entry.status === "reading");
}

export function getEntryView(entry: ReadLaterEntry): ReadLaterView | null {
  if (!isEntryActive(entry)) return null;
  if (entry.status === "read") return "read";
  if (entry.status === "expired") return "expired";
  return "unread";
}

export function getEntryExpiresAt(
  entry: Pick<ReadLaterEntry, "addedAt">,
  expireAfterDays: ReadLaterExpireAfterDays,
): number | undefined {
  return expireAfterDays == null ? undefined : entry.addedAt + expireAfterDays * DAY_MS;
}

/** Whole days left before the entry expires (0 = expires today) */
export function getEntryDaysLeft(
  entry: Pick<ReadLaterEntry, "addedAt">,
  expireAfterDays: ReadLaterExpireAfterDays,
  now: number,
): number | undefined {
  const expiresAt = getEntryExpiresAt(entry, expireAfterDays);
  if (expiresAt == null) return undefined;
  return Math.max(0, Math.ceil((expiresAt - now) / DAY_MS));
}

export function createReadLaterEntry(input: {
  bookmarkId: string;
  queueOnly: boolean;
  source: ReadLaterSource;
  now: number;
  estimatedMinutes?: number;
  note?: string;
  sourceUrl?: string;
  needsEnrichment?: boolean;
}): ReadLaterEntry {
  return {
    bookmarkId: input.bookmarkId,
    status: "unread",
    queueOnly: input.queueOnly,
    source: input.source,
    addedAt: input.now,
    estimatedMinutes: input.estimatedMinutes,
    note: input.note?.trim() || undefined,
    sourceUrl: input.sourceUrl,
    needsEnrichment: input.needsEnrichment || undefined,
    updatedAt: input.now,
  };
}

/** Put an entry (back) at the start of the queue; also renews its expiry */
export function requeueEntry(
  entry: ReadLaterEntry,
  now: number,
  patch: Partial<Pick<ReadLaterEntry, "source" | "estimatedMinutes" | "note">> = {},
): ReadLaterEntry {
  return {
    ...entry,
    ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)),
    status: "unread",
    addedAt: now,
    readAt: undefined,
    expiredAt: undefined,
    openedAt: undefined,
    removedAt: undefined,
    updatedAt: now,
  };
}

export function markEntryReading(entry: ReadLaterEntry, now: number): ReadLaterEntry {
  if (entry.status === "read") return { ...entry, openedAt: now, updatedAt: now };
  return {
    ...entry,
    status: entry.status === "expired" ? "expired" : "reading",
    openedAt: now,
    updatedAt: now,
  };
}

export function markEntryRead(entry: ReadLaterEntry, now: number): ReadLaterEntry {
  return { ...entry, status: "read", readAt: now, updatedAt: now };
}

export function keepEntryInLibrary(entry: ReadLaterEntry, now: number): ReadLaterEntry {
  return { ...entry, queueOnly: false, updatedAt: now };
}

export function removeEntryFromQueue(entry: ReadLaterEntry, now: number): ReadLaterEntry {
  return { ...entry, removedAt: now, updatedAt: now };
}

/** Pending entries past the expiry period become expired; nothing is deleted */
export function collectExpiredEntries(
  entries: readonly ReadLaterEntry[],
  expireAfterDays: ReadLaterExpireAfterDays,
  now: number,
): ReadLaterEntry[] {
  if (expireAfterDays == null) return [];
  const limit = expireAfterDays * DAY_MS;
  return entries
    .filter((entry) => isEntryPending(entry) && now - entry.addedAt >= limit)
    .map((entry) => ({ ...entry, status: "expired" as ReadLaterStatus, expiredAt: now, updatedAt: now }));
}

export function countExpiringSoon(
  entries: readonly ReadLaterEntry[],
  expireAfterDays: ReadLaterExpireAfterDays,
  now: number,
  withinDays = EXPIRING_SOON_DAYS,
): number {
  if (expireAfterDays == null) return 0;
  return entries.filter((entry) => {
    if (!isEntryPending(entry)) return false;
    const expiresAt = getEntryExpiresAt(entry, expireAfterDays)!;
    return expiresAt > now && expiresAt - now <= withinDays * DAY_MS;
  }).length;
}

/** read / (read + expired) over the last 30 days; null when there is nothing yet */
export function computeCompletionRate(
  entries: readonly ReadLaterEntry[],
  now: number,
  windowDays = COMPLETION_WINDOW_DAYS,
): { read: number; expired: number; rate: number | null } {
  const since = now - windowDays * DAY_MS;
  let read = 0;
  let expired = 0;
  for (const entry of entries) {
    if (!isEntryActive(entry)) continue;
    if (entry.status === "read" && (entry.readAt ?? 0) >= since) read += 1;
    if (entry.status === "expired" && (entry.expiredAt ?? 0) >= since) expired += 1;
  }
  const total = read + expired;
  return { read, expired, rate: total > 0 ? read / total : null };
}

/** Bookmarks that are only in the read later queue */
export function getQueueOnlyIds(entries: ReadLaterEntryMap): Set<string> {
  const ids = new Set<string>();
  for (const entry of Object.values(entries)) {
    if (entry.queueOnly) ids.add(entry.bookmarkId);
  }
  return ids;
}

/**
 * Library views (all bookmarks, categories, tags, health center, HTML export,
 * browser bookmark write-back) never show queue-only items.
 */
export function filterLibraryBookmarks<T extends Pick<LocalBookmark, "id">>(
  bookmarks: readonly T[],
  entries: ReadLaterEntryMap,
): T[] {
  const queueOnly = getQueueOnlyIds(entries);
  if (queueOnly.size === 0) return bookmarks as T[];
  return bookmarks.filter((bookmark) => !queueOnly.has(bookmark.id));
}

export interface ReadLaterItem {
  entry: ReadLaterEntry;
  bookmark: LocalBookmark;
  domain: string;
}

export function getItemDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** Join entries with their live bookmarks; trashed or missing bookmarks are left out */
export function buildReadLaterItems(
  entries: ReadLaterEntryMap,
  bookmarks: readonly LocalBookmark[],
): ReadLaterItem[] {
  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const items: ReadLaterItem[] = [];
  for (const entry of Object.values(entries)) {
    if (!isEntryActive(entry)) continue;
    const bookmark = byId.get(entry.bookmarkId);
    if (!bookmark || bookmark.isDeleted) continue;
    items.push({ entry, bookmark, domain: getItemDomain(bookmark.url) });
  }
  return items;
}

export function sortReadLaterItems(
  items: readonly ReadLaterItem[],
  sort: ReadLaterSort,
): ReadLaterItem[] {
  const sorted = [...items];
  switch (sort) {
    case "oldest":
      return sorted.sort((a, b) => a.entry.addedAt - b.entry.addedAt);
    case "shortest":
      return sorted.sort(
        (a, b) =>
          (a.entry.estimatedMinutes ?? Number.MAX_SAFE_INTEGER) -
            (b.entry.estimatedMinutes ?? Number.MAX_SAFE_INTEGER) ||
          b.entry.addedAt - a.entry.addedAt,
      );
    case "expiring":
      // Expiry counts from addedAt, so the oldest pending item expires first
      return sorted.sort((a, b) => a.entry.addedAt - b.entry.addedAt);
    case "newest":
    default:
      return sorted.sort((a, b) => b.entry.addedAt - a.entry.addedAt);
  }
}

/** Newest unread items for the edge panel, plus the total unread count */
export function buildQuickList(
  entries: ReadLaterEntryMap,
  bookmarks: readonly LocalBookmark[],
  limit: number,
): ReadLaterQuickList {
  const unread = buildReadLaterItems(entries, bookmarks).filter(
    (item) => getEntryView(item.entry) === "unread",
  );
  return {
    unreadCount: unread.length,
    items: sortReadLaterItems(unread, "newest")
      .slice(0, Math.max(0, limit))
      .map(({ entry, bookmark }) => ({
        bookmarkId: entry.bookmarkId,
        title: bookmark.title || bookmark.url,
        url: bookmark.url,
        favicon: bookmark.favicon,
        addedAt: entry.addedAt,
        estimatedMinutes: entry.estimatedMinutes,
        reading: entry.status === "reading",
      })),
  };
}

export function matchesReadLaterQuery(item: ReadLaterItem, query: string): boolean {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = [
    item.bookmark.title,
    item.bookmark.url,
    item.bookmark.description,
    item.entry.note ?? "",
  ]
    .join("\n")
    .toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

/** Order-independent comparison: parsed sync files and local objects order keys differently */
function sameEntry(a: ReadLaterEntry, b: ReadLaterEntry): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const left = (a as unknown as Record<string, unknown>)[key];
    const right = (b as unknown as Record<string, unknown>)[key];
    if (left !== right && !(left == null && right == null)) return false;
  }
  return true;
}

/**
 * Last-write-wins merge by bookmark ID.
 * Returns the merged map plus which side has to be written.
 */
export function mergeReadLaterEntries(
  local: ReadLaterEntryMap,
  remote: ReadLaterEntryMap,
): { merged: ReadLaterEntryMap; localChanged: boolean; remoteChanged: boolean } {
  const merged: ReadLaterEntryMap = {};
  let localChanged = false;
  let remoteChanged = false;
  const ids = new Set([...Object.keys(local), ...Object.keys(remote)]);

  for (const id of ids) {
    const localEntry = local[id];
    const remoteEntry = remote[id];
    if (!remoteEntry) {
      merged[id] = localEntry;
      remoteChanged = true;
      continue;
    }
    if (!localEntry) {
      merged[id] = remoteEntry;
      localChanged = true;
      continue;
    }
    if (localEntry.updatedAt > remoteEntry.updatedAt) {
      merged[id] = localEntry;
      remoteChanged = true;
    } else if (localEntry.updatedAt < remoteEntry.updatedAt) {
      merged[id] = remoteEntry;
      localChanged = true;
    } else {
      merged[id] = localEntry;
      if (!sameEntry(localEntry, remoteEntry)) remoteChanged = true;
    }
  }
  return { merged, localChanged, remoteChanged };
}

type ReconcileBookmark = Pick<LocalBookmark, "id" | "url" | "isDeleted" | "createdAt">;

/**
 * Align the merged queue with the synced bookmarks:
 * - entries of bookmarks deleted for good (tombstones) are dropped;
 * - when sync merged two bookmarks of the same URL and trashed the one this entry
 *   pointed to, the entry moves to the surviving bookmark, so the item does not
 *   silently disappear from the queue;
 * - when the trashed copy was a library bookmark and the kept one was only queued,
 *   the kept one becomes a library bookmark, so the user's bookmark does not vanish.
 *
 * A URL merge always keeps the earliest created bookmark (buildDuplicateGroups). A
 * live bookmark created after the trashed one is not the kept copy but a new one,
 * e.g. saved after the user deleted the queued item, so it is left alone.
 */
export function reconcileEntriesWithBookmarks(
  entries: ReadLaterEntryMap,
  bookmarks: ReadonlyArray<ReconcileBookmark>,
  tombstones: readonly BookmarkTombstone[],
  now: number,
): { entries: ReadLaterEntryMap; changed: boolean } {
  const tombstoned = new Set(tombstones.map((tombstone) => tombstone.id));
  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const liveByUrl = new Map<string, ReconcileBookmark>();
  for (const bookmark of bookmarks) {
    if (!bookmark.isDeleted) liveByUrl.set(normalizeBookmarkUrl(bookmark.url), bookmark);
  }
  /** The live bookmark a URL merge kept instead of this trashed one, if any */
  const keptCopyOf = (trashed: ReconcileBookmark): ReconcileBookmark | undefined => {
    const survivor = liveByUrl.get(normalizeBookmarkUrl(trashed.url));
    return survivor && survivor.id !== trashed.id && compareDedupCandidates(survivor, trashed) < 0
      ? survivor
      : undefined;
  };

  const next: ReadLaterEntryMap = { ...entries };
  let changed = false;

  for (const [id, entry] of Object.entries(entries)) {
    if (tombstoned.has(id)) {
      delete next[id];
      changed = true;
      continue;
    }
    if (!isEntryActive(entry)) continue;
    const bookmark = byId.get(id);
    if (!bookmark?.isDeleted) continue;

    const survivor = keptCopyOf(bookmark);
    if (!survivor || isEntryActive(next[survivor.id])) continue;
    next[survivor.id] = {
      ...entry,
      bookmarkId: survivor.id,
      // The survivor had no queue state, so it is a library bookmark
      queueOnly: false,
      updatedAt: now,
    };
    next[id] = removeEntryFromQueue(entry, now);
    changed = true;
  }

  for (const bookmark of bookmarks) {
    if (!bookmark.isDeleted || tombstoned.has(bookmark.id)) continue;
    const own = next[bookmark.id];
    // The trashed copy was only queued itself, so nothing was in the library
    if (isEntryActive(own) && own.queueOnly) continue;
    const survivor = keptCopyOf(bookmark);
    const kept = survivor ? next[survivor.id] : undefined;
    if (!survivor || !isEntryActive(kept) || !kept.queueOnly) continue;
    next[survivor.id] = keepEntryInLibrary(kept, now);
    changed = true;
  }

  return { entries: next, changed };
}

const STATUSES: readonly ReadLaterStatus[] = ["unread", "reading", "read", "expired"];
const SOURCES: readonly ReadLaterSource[] = [
  "manual",
  "link",
  "tab-center",
  "archive",
  "triage",
  "agent",
  "import",
];

/** Validate an entry from an import file; null when it is not usable */
export function normalizeReadLaterEntry(raw: unknown): ReadLaterEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (typeof value.bookmarkId !== "string" || !value.bookmarkId) return null;
  const number = (key: string) =>
    typeof value[key] === "number" && Number.isFinite(value[key]) ? (value[key] as number) : undefined;
  const addedAt = number("addedAt");
  if (addedAt == null) return null;
  const status = STATUSES.includes(value.status as ReadLaterStatus)
    ? (value.status as ReadLaterStatus)
    : "unread";
  return {
    bookmarkId: value.bookmarkId,
    status,
    queueOnly: value.queueOnly === true,
    source: SOURCES.includes(value.source as ReadLaterSource)
      ? (value.source as ReadLaterSource)
      : "import",
    addedAt,
    note: typeof value.note === "string" && value.note.trim() ? value.note.trim() : undefined,
    estimatedMinutes: number("estimatedMinutes"),
    openedAt: number("openedAt"),
    readAt: number("readAt"),
    expiredAt: number("expiredAt"),
    sourceUrl: typeof value.sourceUrl === "string" ? value.sourceUrl : undefined,
    needsEnrichment: value.needsEnrichment === true || undefined,
    removedAt: number("removedAt"),
    updatedAt: number("updatedAt") ?? addedAt,
  };
}

