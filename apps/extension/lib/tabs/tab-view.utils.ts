/**
 * Open tabs list of the tab center: grouping (window / tab group / domain), sorting
 * (position / most recent / least recently used), filters and search, flattened into
 * rows (group headers + tabs) for the virtual list.
 */
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";
import { IDLE_DISPLAY_MS } from "./tab-idle.utils";

export type OpenTabsGroupBy = "window" | "group" | "domain";
export type OpenTabsSort = "position" | "recent" | "idle";
export type OpenTabsFilter = "idle" | "expiring" | "duplicates" | "protected";

export interface OpenTabsViewOptions {
  groupBy: OpenTabsGroupBy;
  sort: OpenTabsSort;
  /** Tabs matching any selected filter are shown */
  filters: ReadonlySet<OpenTabsFilter>;
  query: string;
  now: number;
}

export type OpenTabsGroupLabel =
  | { kind: "window"; order: number; focused: boolean }
  | { kind: "group"; title: string; color?: string }
  | { kind: "ungrouped" }
  | { kind: "domain"; domain: string };

export type OpenTabsRow =
  | { type: "header"; key: string; label: OpenTabsGroupLabel; count: number; tabIds: number[] }
  | { type: "tab"; key: string; tab: OpenTabInfo };

export function matchesOpenTabFilter(
  tab: OpenTabInfo,
  filter: OpenTabsFilter,
  now: number,
): boolean {
  switch (filter) {
    case "idle":
      return !tab.active && now - tab.displayLastActiveAt >= IDLE_DISPLAY_MS;
    case "expiring":
      return tab.protection.length === 0 && (tab.idleState === "expiring" || tab.idleState === "expired");
    case "duplicates":
      return !!tab.duplicateGroupId;
    case "protected":
      return tab.protection.length > 0;
  }
}

function matchesQuery(tab: OpenTabInfo, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const haystack = `${tab.title}\n${tab.url}`.toLowerCase();
  return terms.every((term) => haystack.includes(term));
}

function compareTabs(sort: OpenTabsSort) {
  return (a: OpenTabInfo, b: OpenTabInfo): number => {
    if (sort === "recent") {
      return Number(b.active) - Number(a.active) || b.displayLastActiveAt - a.displayLastActiveAt;
    }
    if (sort === "idle") {
      return Number(a.active) - Number(b.active) || a.displayLastActiveAt - b.displayLastActiveAt;
    }
    return a.windowId - b.windowId || a.index - b.index;
  };
}

export function filterOpenTabs(
  tabs: readonly OpenTabInfo[],
  options: Pick<OpenTabsViewOptions, "filters" | "query" | "now">,
): OpenTabInfo[] {
  const terms = options.query.toLowerCase().split(/\s+/).filter(Boolean);
  return tabs.filter(
    (tab) =>
      matchesQuery(tab, terms) &&
      (options.filters.size === 0 ||
        Array.from(options.filters).some((filter) => matchesOpenTabFilter(tab, filter, options.now))),
  );
}

export function buildOpenTabsRows(
  snapshot: Pick<OpenTabsSnapshot, "tabs" | "windows">,
  options: OpenTabsViewOptions,
): OpenTabsRow[] {
  const visible = filterOpenTabs(snapshot.tabs, options).sort(compareTabs(options.sort));
  const groups = new Map<string, { label: OpenTabsGroupLabel; order: number; tabs: OpenTabInfo[] }>();
  const windowInfo = new Map(snapshot.windows.map((window) => [window.windowId, window]));

  for (const tab of visible) {
    let key: string;
    let label: OpenTabsGroupLabel;
    let order: number;
    if (options.groupBy === "window") {
      const window = windowInfo.get(tab.windowId);
      key = `window:${tab.windowId}`;
      label = { kind: "window", order: (window?.order ?? 0) + 1, focused: !!window?.focused };
      order = window?.order ?? 0;
    } else if (options.groupBy === "group") {
      key = tab.groupId != null ? `group:${tab.windowId}:${tab.groupId}` : "group:none";
      label =
        tab.groupId != null
          ? { kind: "group", title: tab.groupTitle || "", color: tab.groupColor }
          : { kind: "ungrouped" };
      order = tab.groupId != null ? 0 : 1;
    } else {
      key = `domain:${tab.domain}`;
      label = { kind: "domain", domain: tab.domain };
      order = 0;
    }
    const group = groups.get(key) ?? { label, order, tabs: [] };
    group.tabs.push(tab);
    groups.set(key, group);
  }

  const ordered = Array.from(groups.entries()).sort(([keyA, a], [keyB, b]) => {
    if (a.order !== b.order) return a.order - b.order;
    if (options.groupBy === "domain") return b.tabs.length - a.tabs.length || keyA.localeCompare(keyB);
    return keyA.localeCompare(keyB);
  });

  const rows: OpenTabsRow[] = [];
  for (const [key, group] of ordered) {
    rows.push({
      type: "header",
      key,
      label: group.label,
      count: group.tabs.length,
      tabIds: group.tabs.map((tab) => tab.tabId),
    });
    for (const tab of group.tabs) rows.push({ type: "tab", key: `tab:${tab.tabId}`, tab });
  }
  return rows;
}
