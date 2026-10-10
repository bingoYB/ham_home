/**
 * Tab archive helpers: retention, merging re-archived URLs, grouping and search.
 */
import type {
  TabArchiveBatch,
  TabArchiveEntry,
  TabArchiveReason,
  TabArchiveRecentSummary,
  TabArchiveRetentionDays,
} from "@/types";
import { DAY_MS } from "./tab-idle.utils";
import { toLocalDateKey } from "./usage-days.utils";

export const ARCHIVE_MAX_ENTRIES = 10_000;
export const ARCHIVE_RETENTION_OPTIONS: readonly TabArchiveRetentionDays[] = [
  30,
  90,
  180,
  null,
];
/** Automatic batches stay undoable from the popup for this long */
export const RECENT_AUTO_BATCH_MS = 24 * 60 * 60 * 1000;
/** Most tabs a single sweep archives; the rest wait for the next run */
export const SWEEP_MAX_ARCHIVE = 30;

export const ARCHIVE_REASONS: readonly TabArchiveReason[] = [
  "expired",
  "budget",
  "manual",
  "duplicate",
  "triage",
];

/**
 * IDs to purge: entries past the retention period, then the oldest ones above the cap.
 */
export function selectArchiveEntriesToPurge(
  entries: ReadonlyArray<Pick<TabArchiveEntry, "id" | "closedAt">>,
  retentionDays: TabArchiveRetentionDays,
  now: number,
  maxEntries = ARCHIVE_MAX_ENTRIES,
): string[] {
  const purge = new Set<string>();
  if (retentionDays != null) {
    const cutoff = now - retentionDays * DAY_MS;
    for (const entry of entries) {
      if (entry.closedAt < cutoff) purge.add(entry.id);
    }
  }

  const remaining = entries
    .filter((entry) => !purge.has(entry.id))
    .sort((a, b) => b.closedAt - a.closedAt);
  for (const entry of remaining.slice(maxEntries)) purge.add(entry.id);
  return Array.from(purge);
}

/**
 * Archiving a URL that is already archived updates the existing entry instead of
 * adding another one; it moves to the new batch and its close count goes up.
 */
export function mergeArchiveEntry(
  existing: TabArchiveEntry | undefined,
  incoming: TabArchiveEntry,
): TabArchiveEntry {
  if (!existing) return incoming;
  return {
    ...incoming,
    id: existing.id,
    firstSeenAt:
      existing.firstSeenAt != null && incoming.firstSeenAt != null
        ? Math.min(existing.firstSeenAt, incoming.firstSeenAt)
        : (incoming.firstSeenAt ?? existing.firstSeenAt),
    favicon: incoming.favicon || existing.favicon,
    title: incoming.title || existing.title,
    closeCount: existing.closeCount + 1,
  };
}

export type ArchiveDateGroup = "today" | "yesterday" | "week" | "earlier";

export const ARCHIVE_DATE_GROUPS: readonly ArchiveDateGroup[] = [
  "today",
  "yesterday",
  "week",
  "earlier",
];

export function getArchiveDateGroup(closedAt: number, now: number): ArchiveDateGroup {
  const today = toLocalDateKey(now);
  const key = toLocalDateKey(closedAt);
  if (key >= today) return "today";
  if (key === toLocalDateKey(now - DAY_MS)) return "yesterday";
  if (now - closedAt < 7 * DAY_MS) return "week";
  return "earlier";
}

export function buildArchiveSearchText(entry: Pick<TabArchiveEntry, "title" | "url">): string {
  return `${entry.title}\n${entry.url}`.toLowerCase();
}

export interface ArchiveFilter {
  query?: string;
  reason?: TabArchiveReason | "all";
  domain?: string | "all";
  dateGroup?: ArchiveDateGroup | "all";
}

/** Entries with a precomputed lowercase haystack, so searching 10k entries stays fast */
export interface IndexedArchiveEntry {
  entry: TabArchiveEntry;
  haystack: string;
  dateGroup: ArchiveDateGroup;
}

export function indexArchiveEntries(
  entries: readonly TabArchiveEntry[],
  now: number,
): IndexedArchiveEntry[] {
  return [...entries]
    .sort((a, b) => b.closedAt - a.closedAt)
    .map((entry) => ({
      entry,
      haystack: buildArchiveSearchText(entry),
      dateGroup: getArchiveDateGroup(entry.closedAt, now),
    }));
}

export function filterArchiveEntries(
  indexed: readonly IndexedArchiveEntry[],
  filter: ArchiveFilter,
): IndexedArchiveEntry[] {
  const terms = (filter.query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const reason = filter.reason && filter.reason !== "all" ? filter.reason : null;
  const domain = filter.domain && filter.domain !== "all" ? filter.domain : null;
  const dateGroup = filter.dateGroup && filter.dateGroup !== "all" ? filter.dateGroup : null;

  return indexed.filter((item) => {
    if (reason && item.entry.reason !== reason) return false;
    if (domain && item.entry.domain !== domain) return false;
    if (dateGroup && item.dateGroup !== dateGroup) return false;
    return terms.every((term) => item.haystack.includes(term));
  });
}

/** Domains by how often they appear, for the domain filter */
export function listArchiveDomains(entries: readonly TabArchiveEntry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    if (!entry.domain) continue;
    counts.set(entry.domain, (counts.get(entry.domain) ?? 0) + 1);
  }
  return Array.from(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain]) => domain);
}

/** Automatic batches of the last 24 hours that still have archived tabs */
export function summarizeRecentAutoBatches(
  batches: readonly TabArchiveBatch[],
  entries: ReadonlyArray<Pick<TabArchiveEntry, "batchId">>,
  now: number,
): TabArchiveRecentSummary {
  const recent = batches.filter(
    (batch) =>
      batch.automatic && !batch.undoneAt && now - batch.createdAt < RECENT_AUTO_BATCH_MS,
  );
  const ids = new Set(recent.map((batch) => batch.id));
  const count = entries.filter((entry) => ids.has(entry.batchId)).length;
  return {
    batchIds: count > 0 ? recent.map((batch) => batch.id) : [],
    count,
  };
}

/**
 * Whether a tab could be opened again from the archive. Extensions can only reopen web
 * pages: tabs.create refuses file:, data:, view-source: and browser pages (chrome:,
 * privileged about:...), at least in Firefox, so automatic closing leaves those open.
 */
export function canReopenUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

export function getDomainFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname || parsed.protocol.replace(":", "");
  } catch {
    return "";
  }
}

export type ArchiveListRow =
  | { type: "date"; key: string; group: ArchiveDateGroup; count: number }
  | {
      type: "batch";
      key: string;
      batchId: string;
      batch?: TabArchiveBatch;
      entryIds: string[];
    }
  | { type: "entry"; key: string; entry: TabArchiveEntry };

/**
 * Rows of the archive list: Today / Yesterday / This week / Earlier, and inside each
 * group one block per batch (newest first). Expects entries sorted by closedAt desc.
 */
export function buildArchiveRows(
  items: readonly IndexedArchiveEntry[],
  batches: ReadonlyMap<string, TabArchiveBatch>,
): ArchiveListRow[] {
  const byGroup = new Map<ArchiveDateGroup, Map<string, TabArchiveEntry[]>>();
  for (const { entry, dateGroup } of items) {
    const group = byGroup.get(dateGroup) ?? new Map<string, TabArchiveEntry[]>();
    const list = group.get(entry.batchId) ?? [];
    list.push(entry);
    group.set(entry.batchId, list);
    byGroup.set(dateGroup, group);
  }

  const rows: ArchiveListRow[] = [];
  for (const dateGroup of ARCHIVE_DATE_GROUPS) {
    const group = byGroup.get(dateGroup);
    if (!group) continue;
    const count = Array.from(group.values()).reduce((sum, list) => sum + list.length, 0);
    rows.push({ type: "date", key: `date:${dateGroup}`, group: dateGroup, count });
    for (const [batchId, entries] of group) {
      rows.push({
        type: "batch",
        key: `batch:${dateGroup}:${batchId}`,
        batchId,
        batch: batches.get(batchId),
        entryIds: entries.map((entry) => entry.id),
      });
      for (const entry of entries) rows.push({ type: "entry", key: `entry:${entry.id}`, entry });
    }
  }
  return rows;
}
