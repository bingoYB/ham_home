/**
 * Duplicate tab detection.
 *
 * Uses the same URL normalization as bookmarks (tracking parameters and trailing slash
 * removed, hash kept, because single page apps route with it). In every group the tab
 * to keep is the current tab of a window, then a pinned tab, then a protected tab (e.g.
 * playing sound), then the most recently used. Pinned and protected tabs are never
 * redundant.
 */
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";

export interface DuplicateTabInput {
  tabId: number;
  url: string;
  lastActiveAt: number;
  active: boolean;
  pinned: boolean;
  /** Has a protection reason, so it must not be closed as a duplicate */
  protected?: boolean;
}

export interface TabDuplicateGroup {
  id: string;
  normalizedUrl: string;
  /** Members, the kept tab first */
  tabIds: number[];
  keepTabId: number;
  /** Members that may be closed (never the kept or a pinned tab) */
  redundantTabIds: number[];
}

/** Normalized URL used to compare tabs, or null for tabs that never count as duplicates */
export function normalizeTabUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (/^(about:blank|chrome:\/\/newtab|edge:\/\/newtab|about:newtab|about:home)/i.test(url)) {
    return url.split(/[?#]/)[0].toLowerCase();
  }
  return normalizeBookmarkUrl(url);
}

function rankForKeeping(tab: DuplicateTabInput): number {
  if (tab.active) return 3;
  if (tab.pinned) return 2;
  if (tab.protected) return 1;
  return 0;
}

export function buildTabDuplicateGroups(
  tabs: readonly DuplicateTabInput[],
): TabDuplicateGroup[] {
  const groups = new Map<string, DuplicateTabInput[]>();
  for (const tab of tabs) {
    const normalizedUrl = normalizeTabUrl(tab.url);
    if (!normalizedUrl) continue;
    const list = groups.get(normalizedUrl);
    if (list) list.push(tab);
    else groups.set(normalizedUrl, [tab]);
  }

  const result: TabDuplicateGroup[] = [];
  for (const [normalizedUrl, members] of groups) {
    if (members.length < 2) continue;
    const sorted = [...members].sort(
      (a, b) =>
        rankForKeeping(b) - rankForKeeping(a) ||
        b.lastActiveAt - a.lastActiveAt ||
        a.tabId - b.tabId,
    );
    const [keep, ...rest] = sorted;
    result.push({
      id: `dup:${normalizedUrl}`,
      normalizedUrl,
      tabIds: sorted.map((tab) => tab.tabId),
      keepTabId: keep.tabId,
      redundantTabIds: rest.filter((tab) => !tab.pinned && !tab.protected).map((tab) => tab.tabId),
    });
  }
  return result;
}
