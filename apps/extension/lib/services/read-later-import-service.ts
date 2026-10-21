/**
 * JSON import of read later state and (optionally) the tab archive.
 *
 * Bookmark IDs change on import, so entries are matched to local bookmarks by URL.
 * A bookmark that already was in the local library stays in the library even when
 * the file has it as queue-only.
 */
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import { normalizeReadLaterEntry } from "@/lib/read-later/read-later.utils";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { readLaterStorage } from "@/lib/storage/read-later-storage";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { getDomainFromUrl } from "@/lib/tabs/tab-archive.utils";
import { normalizeTabUrl } from "@/lib/tabs/tab-duplicates.utils";
import type { ReadLaterEntry, TabArchiveEntry, TabArchiveReason } from "@/types";

interface ImportFile {
  bookmarks?: Array<{ id?: string; url?: string }>;
  readLaterEntries?: unknown[];
  tabLifecycleSettings?: unknown;
  tabArchive?: { entries?: unknown[]; batches?: unknown[] };
}

export interface LifecycleImportResult {
  readLater: number;
  archived: number;
  settings: boolean;
}

const REASONS: readonly TabArchiveReason[] = ["expired", "budget", "manual", "duplicate", "triage"];

async function importReadLater(
  data: ImportFile,
  createdBookmarkIds: ReadonlySet<string>,
): Promise<number> {
  if (!Array.isArray(data.readLaterEntries) || !Array.isArray(data.bookmarks)) return 0;
  const urlById = new Map(
    data.bookmarks
      .filter((bookmark) => typeof bookmark.id === "string" && typeof bookmark.url === "string")
      .map((bookmark) => [bookmark.id!, bookmark.url!]),
  );
  const [bookmarks, entries] = await Promise.all([
    bookmarkStorage.getBookmarks(),
    readLaterStorage.getAll(),
  ]);
  const byUrl = new Map(bookmarks.map((bookmark) => [normalizeBookmarkUrl(bookmark.url), bookmark]));
  const now = Date.now();
  const writes: ReadLaterEntry[] = [];

  for (const raw of data.readLaterEntries) {
    const entry = normalizeReadLaterEntry(raw);
    if (!entry) continue;
    const url = urlById.get(entry.bookmarkId);
    const bookmark = url ? byUrl.get(normalizeBookmarkUrl(url)) : undefined;
    if (!bookmark) continue;
    const existing = entries[bookmark.id];
    if (existing && existing.updatedAt >= entry.updatedAt) continue;
    writes.push({
      ...entry,
      bookmarkId: bookmark.id,
      queueOnly: createdBookmarkIds.has(bookmark.id)
        ? entry.queueOnly
        : (existing?.queueOnly ?? false),
      updatedAt: now,
    });
  }
  await readLaterStorage.setMany(writes);
  return writes.length;
}

async function importArchive(data: ImportFile): Promise<number> {
  const rawEntries = data.tabArchive?.entries;
  if (!Array.isArray(rawEntries) || rawEntries.length === 0) return 0;
  const now = Date.now();
  const entries: TabArchiveEntry[] = [];
  for (const raw of rawEntries) {
    if (!raw || typeof raw !== "object") continue;
    const value = raw as Record<string, unknown>;
    if (typeof value.url !== "string" || !value.url) continue;
    const closedAt = typeof value.closedAt === "number" ? value.closedAt : now;
    entries.push({
      id: crypto.randomUUID(),
      batchId: "",
      url: value.url,
      normalizedUrl: normalizeTabUrl(value.url) ?? value.url,
      title: typeof value.title === "string" && value.title ? value.title : value.url,
      domain: getDomainFromUrl(value.url),
      favicon: typeof value.favicon === "string" ? value.favicon : undefined,
      reason: REASONS.includes(value.reason as TabArchiveReason)
        ? (value.reason as TabArchiveReason)
        : "manual",
      lastActiveAt: typeof value.lastActiveAt === "number" ? value.lastActiveAt : closedAt,
      closedAt,
      closeCount: typeof value.closeCount === "number" ? value.closeCount : 1,
    });
  }
  if (entries.length === 0) return 0;
  // Imported tabs land in one batch; they were closed on another device
  const { entries: stored } = await tabArchiveStorage.addBatch(
    { id: crypto.randomUUID(), reason: "manual", createdAt: now, automatic: false },
    entries,
  );
  return stored.length;
}

export async function importLifecycleData(
  data: ImportFile,
  createdBookmarkIds: ReadonlySet<string>,
): Promise<LifecycleImportResult> {
  const readLater = await importReadLater(data, createdBookmarkIds);
  const archived = await importArchive(data);
  let settings = false;
  if (data.tabLifecycleSettings && typeof data.tabLifecycleSettings === "object") {
    const current = await tabLifecycleConfigStorage.getSettings();
    // Automatic closing still needs this device's consent, whatever the file says
    // (turning it off withdraws consent), and an old backup never turns activity
    // tracking back on
    await tabLifecycleConfigStorage.importRawSettings({
      ...(data.tabLifecycleSettings as Record<string, unknown>),
      activityTracking: current.activityTracking,
      updatedAt: Date.now(),
    });
    settings = true;
  }
  return { readLater, archived, settings };
}
