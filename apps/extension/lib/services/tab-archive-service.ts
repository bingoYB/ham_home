/**
 * Tab archive: the safety net behind every tab HamHome closes.
 *
 * Archive first, close second: entries are committed in one transaction before any
 * tab is closed, and nothing is closed when that write fails. Restoring brings tabs
 * back to their original window (or the current one) and, on Chromium, into their
 * original tab group, or a recreated one with the same title and color.
 */
import { browser, type Browser } from "wxt/browser";
import { nanoid } from "nanoid";
import { getFavicon } from "@hamhome/utils";
import { tabActivityStorage } from "@/lib/storage/tab-activity-storage";
import { tabArchiveStorage } from "@/lib/storage/tab-archive-storage";
import { tabLifecycleConfigStorage } from "@/lib/storage/tab-lifecycle-config-storage";
import { tabSessionStorage } from "@/lib/storage/tab-session-storage";
import { workspaceRestoreSuppressionStorage } from "@/lib/storage/workspace-restore-suppression-storage";
import { BULK_OPEN_SUPPRESSION_MS } from "@/lib/tabs/tab-budget.utils";
import { normalizeTabUrl } from "@/lib/tabs/tab-duplicates.utils";
import {
  getDomainFromUrl,
  selectArchiveEntriesToPurge,
} from "@/lib/tabs/tab-archive.utils";
import { getTabGroupId } from "@/lib/tabs/tab-snapshot.utils";
import { tabStatsService } from "./tab-stats-service";
import type {
  TabArchiveEntry,
  TabArchiveReason,
  TabArchiveResult,
  TabRestoreResult,
} from "@/types";

const CLOSE_RETRY_DELAY_MS = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

interface TabGroupsApi {
  get(groupId: number): Promise<{ id: number; title?: string; color?: string; windowId: number }>;
  update(groupId: number, props: { title?: string; color?: string }): Promise<unknown>;
  group(options: {
    tabIds: number[];
    groupId?: number;
    createProperties?: { windowId?: number };
  }): Promise<number>;
}

/** Chromium tab groups; null where the API (or the permission) is missing */
function getTabGroupsApi(): TabGroupsApi | null {
  const api = browser as unknown as {
    tabGroups?: Pick<TabGroupsApi, "get" | "update">;
    tabs: { group?: TabGroupsApi["group"] };
  };
  const tabGroups = api.tabGroups;
  const group = api.tabs.group;
  if (!tabGroups?.get || typeof group !== "function") return null;
  return {
    get: (groupId) => tabGroups.get(groupId),
    update: (groupId, props) => tabGroups.update(groupId, props),
    group: (options) => group.call(api.tabs, options),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pickFavicon(tab: Browser.tabs.Tab, url: string): string | undefined {
  const icon = tab.favIconUrl;
  if (icon && /^https?:\/\//i.test(icon)) return icon;
  return getFavicon(url) || undefined;
}

export interface ArchiveTabsOptions {
  /** Created by the sweep or auto make room */
  automatic?: boolean;
  /**
   * Re-check protection right before closing (automatic runs): tabs that became the
   * current tab, pinned or locked in the meantime are skipped.
   */
  skipProtected?: boolean;
}

class TabArchiveService {
  async archiveTabs(
    tabIds: readonly number[],
    reason: TabArchiveReason,
    options: ArchiveTabsOptions = {},
  ): Promise<TabArchiveResult> {
    const unique = Array.from(new Set(tabIds));
    const [tabs, records, busy] = await Promise.all([
      Promise.all(unique.map((id) => browser.tabs.get(id).catch(() => null))),
      tabActivityStorage.getMap(),
      tabSessionStorage.getBusyTabIds(),
    ]);

    const closable = tabs.filter((tab): tab is Browser.tabs.Tab & { id: number } => {
      if (!tab?.id || !tab.url || tab.incognito) return false;
      // Pinned tabs are never closed, whoever asks
      if (tab.pinned) return false;
      if (options.skipProtected) {
        if (tab.active || tab.audible || busy.has(tab.id)) return false;
        if (records.get(tab.id)?.locked) return false;
      }
      return true;
    });
    const skipped = unique.length - closable.length;
    if (closable.length === 0) return { ok: true, archived: 0, skipped };

    const now = Date.now();
    const batchId = nanoid();
    const groups = await this.readGroups(closable);
    const entries: TabArchiveEntry[] = closable.map((tab) => {
      const url = tab.url!;
      const record = records.get(tab.id);
      const groupId = getTabGroupId(tab);
      const group = groupId != null ? groups.get(groupId) : undefined;
      return {
        id: nanoid(),
        batchId,
        url,
        normalizedUrl: normalizeTabUrl(url) ?? url,
        title: tab.title || url,
        domain: getDomainFromUrl(url),
        favicon: pickFavicon(tab, url),
        reason,
        firstSeenAt: record?.firstSeenAt,
        lastActiveAt: Math.min(record?.lastActiveAt ?? now, now),
        closedAt: now,
        closeCount: 1,
        origin: {
          windowId: tab.windowId,
          index: tab.index,
          groupId,
          groupTitle: group?.title,
          groupColor: group?.color,
        },
      };
    });

    let stored: TabArchiveEntry[];
    try {
      ({ entries: stored } = await tabArchiveStorage.addBatch(
        { id: batchId, reason, createdAt: now, automatic: !!options.automatic },
        entries,
      ));
    } catch (error) {
      // Nothing was archived, so nothing gets closed
      return {
        ok: false,
        archived: 0,
        skipped: unique.length,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    const stillOpen = await this.closeTabs(closable.map((tab) => tab.id));
    if (stillOpen.length > 0) {
      // A tab that could not be closed must not show up in the archive as closed
      const openUrls = new Set(
        closable
          .filter((tab) => stillOpen.includes(tab.id))
          .map((tab) => normalizeTabUrl(tab.url) ?? tab.url),
      );
      const orphanIds = stored
        .filter((entry) => entry.closeCount === 1 && openUrls.has(entry.normalizedUrl))
        .map((entry) => entry.id);
      await tabArchiveStorage.deleteEntries(orphanIds);
    }

    const archived = closable.length - stillOpen.length;
    tabStatsService.count(options.automatic ? "autoArchived" : "manualArchived", archived);
    return {
      ok: true,
      batchId: archived > 0 ? batchId : undefined,
      archived,
      skipped: skipped + stillOpen.length,
    };
  }

  /** Close tabs, retrying once (Chrome refuses while the user drags a tab) */
  private async closeTabs(tabIds: number[]): Promise<number[]> {
    try {
      await browser.tabs.remove(tabIds);
    } catch {
      await Promise.allSettled(tabIds.map((id) => browser.tabs.remove(id)));
    }
    let stillOpen = await this.filterExisting(tabIds);
    if (stillOpen.length > 0) {
      await sleep(CLOSE_RETRY_DELAY_MS);
      await Promise.allSettled(stillOpen.map((id) => browser.tabs.remove(id)));
      stillOpen = await this.filterExisting(stillOpen);
    }
    return stillOpen;
  }

  private async filterExisting(tabIds: number[]): Promise<number[]> {
    const tabs = await Promise.all(tabIds.map((id) => browser.tabs.get(id).catch(() => null)));
    return tabs.filter((tab): tab is Browser.tabs.Tab & { id: number } => !!tab?.id).map((tab) => tab.id);
  }

  private async readGroups(
    tabs: readonly Browser.tabs.Tab[],
  ): Promise<Map<number, { title?: string; color?: string }>> {
    const api = getTabGroupsApi();
    const groups = new Map<number, { title?: string; color?: string }>();
    if (!api) return groups;
    const ids = Array.from(
      new Set(tabs.map((tab) => getTabGroupId(tab)).filter((id): id is number => id != null)),
    );
    await Promise.all(
      ids.map(async (id) => {
        try {
          const group = await api.get(id);
          groups.set(id, { title: group.title, color: group.color });
        } catch {
          // group already gone
        }
      }),
    );
    return groups;
  }

  /**
   * Reopen archived tabs and remove them from the archive.
   * `activate` focuses the (last) restored tab, for restoring a single entry.
   */
  async restoreEntries(
    entryIds: readonly string[],
    options: { activate?: boolean } = {},
  ): Promise<TabRestoreResult> {
    const entries = await tabArchiveStorage.getEntries(entryIds);
    if (entries.length === 0) return { restored: 0, failed: 0 };

    const fallbackWindowId = await this.getFallbackWindowId();
    const windowCache = new Map<number, boolean>();
    const isUsableWindow = async (windowId: number) => {
      if (!windowCache.has(windowId)) {
        const window = await browser.windows.get(windowId).catch(() => null);
        windowCache.set(windowId, !!window && window.type === "normal" && !window.incognito);
      }
      return windowCache.get(windowId)!;
    };

    const ordered = [...entries].sort(
      (a, b) =>
        (a.origin?.windowId ?? 0) - (b.origin?.windowId ?? 0) ||
        (a.origin?.index ?? 0) - (b.origin?.index ?? 0),
    );

    await workspaceRestoreSuppressionStorage.suppressUrls(ordered.map((entry) => entry.url));
    // Restored tabs must not trigger budget nudges or make room right away
    await tabSessionStorage.markBulkOpened([], Date.now() + BULK_OPEN_SUPPRESSION_MS);

    const restored: Array<{ entry: TabArchiveEntry; tab: Browser.tabs.Tab }> = [];
    let failed = 0;
    for (const entry of ordered) {
      const originWindow = entry.origin?.windowId;
      const windowId =
        originWindow != null && (await isUsableWindow(originWindow))
          ? originWindow
          : fallbackWindowId;
      try {
        const tab = await browser.tabs.create({
          url: entry.url,
          active: false,
          ...(windowId != null ? { windowId } : {}),
          ...(windowId === originWindow && entry.origin ? { index: entry.origin.index } : {}),
        });
        restored.push({ entry, tab });
      } catch {
        failed += 1;
      }
    }

    const tabIds = restored
      .map(({ tab }) => tab.id)
      .filter((id): id is number => typeof id === "number");
    await Promise.all([
      workspaceRestoreSuppressionStorage.suppressTabIds(tabIds),
      tabSessionStorage.markBulkOpened(tabIds, Date.now() + BULK_OPEN_SUPPRESSION_MS),
    ]);
    await this.restoreGroups(restored);
    await tabArchiveStorage.deleteEntries(restored.map(({ entry }) => entry.id));
    tabStatsService.count("restored", restored.length);

    const last = restored[restored.length - 1]?.tab;
    if (options.activate && last?.id != null) {
      await browser.tabs.update(last.id, { active: true }).catch(() => undefined);
      if (last.windowId != null) {
        await browser.windows.update(last.windowId, { focused: true }).catch(() => undefined);
      }
    }

    return { restored: restored.length, failed };
  }

  async restoreBatches(batchIds: readonly string[]): Promise<TabRestoreResult> {
    const entryIds: string[] = [];
    for (const batchId of batchIds) {
      const entries = await tabArchiveStorage.getEntriesByBatch(batchId);
      entryIds.push(...entries.map((entry) => entry.id));
    }
    return this.restoreEntries(entryIds);
  }

  private async getFallbackWindowId(): Promise<number | undefined> {
    const focused = await tabSessionStorage.getLastFocusedWindow();
    if (focused != null) {
      const window = await browser.windows.get(focused).catch(() => null);
      if (window && window.type === "normal" && !window.incognito) return focused;
    }
    const window = await browser.windows
      .getLastFocused({ windowTypes: ["normal"] })
      .catch(() => null);
    return window?.id;
  }

  /** Put restored tabs back into their group, or recreate it by title and color */
  private async restoreGroups(
    restored: ReadonlyArray<{ entry: TabArchiveEntry; tab: Browser.tabs.Tab }>,
  ): Promise<void> {
    const api = getTabGroupsApi();
    if (!api) return;

    const byGroup = new Map<string, { entry: TabArchiveEntry; tabIds: number[]; windowId: number }>();
    for (const { entry, tab } of restored) {
      if (!entry.origin?.groupTitle && entry.origin?.groupId == null) continue;
      if (tab.id == null || tab.windowId == null) continue;
      const key = `${tab.windowId}:${entry.origin.groupId ?? ""}:${entry.origin.groupTitle ?? ""}`;
      const group = byGroup.get(key) ?? { entry, tabIds: [], windowId: tab.windowId };
      group.tabIds.push(tab.id);
      byGroup.set(key, group);
    }

    for (const { entry, tabIds, windowId } of byGroup.values()) {
      const origin = entry.origin!;
      try {
        let existingGroupId: number | undefined;
        if (origin.groupId != null) {
          const group = await api.get(origin.groupId).catch(() => null);
          if (group && group.windowId === windowId && (group.title ?? "") === (origin.groupTitle ?? "")) {
            existingGroupId = group.id;
          }
        }
        if (existingGroupId != null) {
          await api.group({ tabIds, groupId: existingGroupId });
          continue;
        }
        if (!origin.groupTitle && !origin.groupColor) continue;
        const groupId = await api.group({ tabIds, createProperties: { windowId } });
        await api.update(groupId, {
          title: origin.groupTitle,
          ...(origin.groupColor ? { color: origin.groupColor } : {}),
        });
      } catch (error) {
        console.warn("[TabArchive] Failed to restore tab group:", error);
      }
    }
  }

  async deleteEntries(entryIds: readonly string[]): Promise<void> {
    await tabArchiveStorage.deleteEntries(entryIds);
  }

  async clear(): Promise<void> {
    await tabArchiveStorage.clear();
  }

  /** Daily retention: drop entries past the retention period and above 10,000 */
  async runRetention(now = Date.now()): Promise<number> {
    const [settings, entries] = await Promise.all([
      tabLifecycleConfigStorage.getSettings(),
      tabArchiveStorage.getAllEntries(),
    ]);
    const purge = selectArchiveEntriesToPurge(entries, settings.archive.retentionDays, now);
    if (purge.length > 0) await tabArchiveStorage.deleteEntries(purge);
    await tabArchiveStorage.pruneEmptyBatches(now - DAY_MS);
    return purge.length;
  }
}

export const tabArchiveService = new TabArchiveService();
