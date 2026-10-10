/**
 * Agent tools for open tabs, the tab archive and Read later.
 *
 * Reading is free; restoring archived tabs only opens tabs (they can be closed again).
 * Closing tabs (read later & close, archive) is high risk and needs the user's
 * approval. The agent can never turn on auto archive or making room automatically:
 * those switches only exist in the UI, where they record this device's consent.
 */
import type { AgentTool } from "@hamhome/agent";
import {
  buildReadLaterItems,
  getEntryView,
  sortReadLaterItems,
} from "@/lib/read-later/read-later.utils";
import {
  ARCHIVE_REASONS,
  filterArchiveEntries,
  indexArchiveEntries,
  summarizeRecentAutoBatches,
} from "@/lib/tabs/tab-archive.utils";
import { sortTabsByLeastRecentlyUsed } from "@/lib/tabs/tab-snapshot.utils";
import { sanitizeTriageUrl } from "@/lib/tabs/tab-triage.utils";
import { filterOpenTabs } from "@/lib/tabs/tab-view.utils";
import type { ReadLaterView, TabArchiveReason } from "@/types";

export { isAutoApprovedCall } from "./tool-approval-rules";

/** Services load on first use, so building the tool list stays cheap */
const services = {
  lifecycle: () => import("@/lib/services/tab-lifecycle-service").then((m) => m.tabLifecycleService),
  archive: () => import("@/lib/services/tab-archive-service").then((m) => m.tabArchiveService),
  readLater: () => import("@/lib/services/read-later-service").then((m) => m.readLaterService),
  archiveStorage: () => import("@/lib/storage/tab-archive-storage").then((m) => m.tabArchiveStorage),
  readLaterStorage: () => import("@/lib/storage/read-later-storage").then((m) => m.readLaterStorage),
  bookmarkStorage: () => import("@/lib/storage/bookmark-storage").then((m) => m.bookmarkStorage),
};

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LIST = 200;

function asRecord(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : {};
}

function numberList(value: unknown): number[] {
  return Array.isArray(value)
    ? value.map(Number).filter((item) => Number.isInteger(item) && item >= 0)
    : [];
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function clampLimit(value: unknown, fallback: number): number {
  const limit = Number(value);
  return Number.isFinite(limit) ? Math.min(MAX_LIST, Math.max(1, Math.round(limit))) : fallback;
}

/**
 * The first `limit` items whose page may be shown to AI, like AI tidy-up: only web
 * pages, never private ones (mail, banking, sign-in...). Those are counted, not sent.
 */
async function takeShareable<T>(
  items: readonly T[],
  urlOf: (item: T) => string,
  limit: number,
): Promise<{ shared: T[]; privateCount: number }> {
  const { containsPrivateContent } = await import("@/lib/privacy");
  const shared: T[] = [];
  let privateCount = 0;
  for (const item of items) {
    if (shared.length >= limit) break;
    const url = urlOf(item);
    if (/^https?:\/\//i.test(url) && !(await containsPrivateContent(url)).isPrivate) {
      shared.push(item);
    } else {
      privateCount += 1;
    }
  }
  return { shared, privateCount };
}

function idleDays(now: number, since: number): number {
  return Math.floor(Math.max(0, now - since) / DAY_MS);
}

export function createTabLifecycleTools(): AgentTool[] {
  return [
    {
      name: "list_open_tabs",
      description:
        "List open browser tabs, least recently used first, with idle days, protection (pinned, current, locked, playing...), duplicate and archive state. Use filters to narrow down. Private pages (mail, banking, sign-in...) are not shown, only counted.",
      parameters: {
        type: "object",
        properties: {
          minIdleDays: { type: "number", minimum: 0 },
          duplicatesOnly: { type: "boolean" },
          query: { type: "string", description: "Words that must all appear in the title or URL" },
          limit: { type: "integer", minimum: 1, maximum: MAX_LIST },
        },
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute(input) {
        const raw = asRecord(input);
        const snapshot = await (await services.lifecycle()).getSnapshot();
        const minIdle = Number(raw.minIdleDays) || 0;
        const matched = sortTabsByLeastRecentlyUsed(
          filterOpenTabs(snapshot.tabs, {
            filters: new Set(),
            query: typeof raw.query === "string" ? raw.query : "",
            now: snapshot.generatedAt,
          }).filter(
            (tab) =>
              idleDays(snapshot.generatedAt, tab.displayLastActiveAt) >= minIdle &&
              (!raw.duplicatesOnly || !!tab.duplicateGroupId),
          ),
        );
        const { shared, privateCount } = await takeShareable(
          matched,
          (tab) => tab.url,
          clampLimit(raw.limit, 50),
        );
        return {
          total: snapshot.stats.total,
          matched: matched.length,
          privateTabsNotShown: privateCount,
          tabs: shared.map((tab) => ({
            tabId: tab.tabId,
            windowId: tab.windowId,
            title: tab.title,
            url: sanitizeTriageUrl(tab.url),
            idleDays: idleDays(snapshot.generatedAt, tab.displayLastActiveAt),
            idleIsEstimate: tab.activityEstimated,
            protection: tab.protection,
            idleState: tab.idleState,
            duplicateOf: tab.redundantDuplicate ? tab.duplicateGroupId : undefined,
            group: tab.groupTitle,
          })),
        };
      },
    },
    {
      name: "get_tab_lifecycle_status",
      description:
        "Budget usage, tabs archiving soon, duplicates, automatic archiving today and Read later counts.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute() {
        const now = Date.now();
        const [lifecycle, archiveStorage, readLaterStorage, bookmarkStorage] = await Promise.all([
          services.lifecycle(),
          services.archiveStorage(),
          services.readLaterStorage(),
          services.bookmarkStorage(),
        ]);
        const [snapshot, batches, entries, readLater, bookmarks] = await Promise.all([
          lifecycle.getSnapshot(),
          archiveStorage.getAllBatches(),
          archiveStorage.getAllEntries(),
          readLaterStorage.getAll(),
          bookmarkStorage.getBookmarks(),
        ]);
        const items = buildReadLaterItems(readLater, bookmarks);
        const count = (view: ReadLaterView) =>
          items.filter((item) => getEntryView(item.entry) === view).length;
        return {
          budget: snapshot.budget,
          stats: snapshot.stats,
          autoArchive: snapshot.autoArchive,
          pendingConfirmation: snapshot.pendingConfirm.length,
          archivedToday: summarizeRecentAutoBatches(batches, entries, now).count,
          archiveSize: entries.length,
          readLater: { unread: count("unread"), read: count("read"), expired: count("expired") },
        };
      },
    },
    {
      name: "search_tab_archive",
      description:
        "Search tabs HamHome closed (the tab archive) by keyword, domain (subdomains included), reason and age. Private pages are not shown, only counted.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          domain: { type: "string", description: "e.g. github.com; also matches www. and other subdomains" },
          reason: { type: "string", enum: [...ARCHIVE_REASONS] },
          withinDays: { type: "number", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: MAX_LIST },
        },
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute(input) {
        const raw = asRecord(input);
        const now = Date.now();
        const archiveStorage = await services.archiveStorage();
        const indexed = indexArchiveEntries(await archiveStorage.getAllEntries(), now);
        const withinDays = Number(raw.withinDays) || 0;
        const domain =
          typeof raw.domain === "string" ? raw.domain.trim().toLowerCase().replace(/^www\./, "") : "";
        const matched = filterArchiveEntries(indexed, {
          query: typeof raw.query === "string" ? raw.query : "",
          domain: "all",
          reason: ARCHIVE_REASONS.includes(raw.reason as TabArchiveReason)
            ? (raw.reason as TabArchiveReason)
            : "all",
        }).filter(
          (item) =>
            (!domain ||
              item.entry.domain === domain ||
              item.entry.domain.endsWith(`.${domain}`)) &&
            (!withinDays || now - item.entry.closedAt <= withinDays * DAY_MS),
        );
        const { shared, privateCount } = await takeShareable(
          matched,
          (item) => item.entry.url,
          clampLimit(raw.limit, 30),
        );
        return {
          privateEntriesNotShown: privateCount,
          results: shared.map(({ entry }) => ({
            entryId: entry.id,
            title: entry.title,
            url: sanitizeTriageUrl(entry.url),
            reason: entry.reason,
            closedAt: entry.closedAt,
            closeCount: entry.closeCount,
          })),
        };
      },
    },
    {
      name: "restore_archived_tabs",
      description: "Reopen archived tabs (they leave the archive and can be closed again).",
      parameters: {
        type: "object",
        properties: { entryIds: { type: "array", items: { type: "string" }, minItems: 1 } },
        required: ["entryIds"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "medium" },
      async execute(input) {
        return (await services.archive()).restoreEntries(stringList(asRecord(input).entryIds));
      },
    },
    {
      name: "move_tabs_to_read_later",
      description: "Add open tabs to Read later and close them. Requires the user's approval.",
      parameters: {
        type: "object",
        properties: { tabIds: { type: "array", items: { type: "integer" }, minItems: 1 } },
        required: ["tabIds"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "high" },
      async execute(input) {
        return (await services.readLater()).addTabs(numberList(asRecord(input).tabIds), "agent", {
          closeTabs: true,
        });
      },
    },
    {
      name: "archive_tabs",
      description:
        "Archive and close open tabs; they stay searchable and restorable. Pinned tabs are never closed. Requires the user's approval.",
      parameters: {
        type: "object",
        properties: { tabIds: { type: "array", items: { type: "integer" }, minItems: 1 } },
        required: ["tabIds"],
        additionalProperties: false,
      },
      metadata: { readOnly: false, riskLevel: "high" },
      async execute(input) {
        return (await services.archive()).archiveTabs(numberList(asRecord(input).tabIds), "manual");
      },
    },
    {
      name: "list_read_later",
      description: "List Read later items by state (unread, read or expired), newest first.",
      parameters: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["unread", "read", "expired"] },
          limit: { type: "integer", minimum: 1, maximum: MAX_LIST },
        },
        additionalProperties: false,
      },
      metadata: { readOnly: true, riskLevel: "low" },
      async execute(input) {
        const raw = asRecord(input);
        const view = (["unread", "read", "expired"] as const).includes(raw.status as ReadLaterView)
          ? (raw.status as ReadLaterView)
          : "unread";
        const [readLaterStorage, bookmarkStorage] = await Promise.all([
          services.readLaterStorage(),
          services.bookmarkStorage(),
        ]);
        const [entries, bookmarks] = await Promise.all([
          readLaterStorage.getAll(),
          bookmarkStorage.getBookmarks(),
        ]);
        const items = sortReadLaterItems(
          buildReadLaterItems(entries, bookmarks).filter((item) => getEntryView(item.entry) === view),
          "newest",
        ).slice(0, clampLimit(raw.limit, 30));
        return {
          items: items.map(({ entry, bookmark }) => ({
            bookmarkId: entry.bookmarkId,
            title: bookmark.title,
            url: bookmark.url,
            summary: bookmark.description,
            note: entry.note,
            addedAt: entry.addedAt,
            estimatedMinutes: entry.estimatedMinutes,
            inLibrary: !entry.queueOnly,
            status: entry.status,
          })),
        };
      },
    },
    {
      name: "update_read_later_status",
      description:
        "Mark Read later items as read, add them again, or keep them in the library. Changing several items at once asks the user first.",
      parameters: {
        type: "object",
        properties: {
          bookmarkIds: { type: "array", items: { type: "string" }, minItems: 1 },
          action: { type: "string", enum: ["markRead", "requeue", "keep"] },
        },
        required: ["bookmarkIds", "action"],
        additionalProperties: false,
      },
      // Single items run directly; batches are approved in the approval policy
      metadata: { readOnly: false, riskLevel: "high" },
      async execute(input) {
        const raw = asRecord(input);
        const ids = stringList(raw.bookmarkIds);
        const readLaterService = await services.readLater();
        if (raw.action === "markRead") await readLaterService.markRead(ids);
        else if (raw.action === "requeue") await readLaterService.requeue(ids);
        else if (raw.action === "keep") await readLaterService.keep(ids, { classify: ids.length === 1 });
        else return { error: "Unknown action" };
        return { updated: ids.length, action: raw.action };
      },
    },
  ];
}
