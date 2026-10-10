import { describe, expect, it } from "vitest";
import type { OpenTabInfo } from "@/types";
import { buildOpenTabsRows, filterOpenTabs } from "../tab-view.utils";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function tab(tabId: number, patch: Partial<OpenTabInfo> = {}): OpenTabInfo {
  return {
    tabId,
    windowId: 1,
    index: tabId,
    title: `Tab ${tabId}`,
    url: `https://site${tabId}.com/`,
    normalizedUrl: `https://site${tabId}.com`,
    domain: `site${tabId}.com`,
    pinned: false,
    active: false,
    audible: false,
    discarded: false,
    loading: false,
    firstSeenAt: NOW - 10 * DAY,
    lastActiveAt: NOW - DAY,
    displayLastActiveAt: NOW - DAY,
    activityEstimated: false,
    locked: false,
    protection: [],
    idleState: "idle",
    stale: false,
    redundantDuplicate: false,
    bulkOpened: false,
    ...patch,
  };
}

const windows = [
  { windowId: 1, order: 0, focused: true, tabCount: 2, countedTabCount: 2 },
  { windowId: 2, order: 1, focused: false, tabCount: 1, countedTabCount: 1 },
];

describe("open tabs view", () => {
  it("groups by window and keeps tab order by position", () => {
    const rows = buildOpenTabsRows(
      { tabs: [tab(3, { windowId: 2 }), tab(2), tab(1)], windows },
      { groupBy: "window", sort: "position", filters: new Set(), query: "", now: NOW },
    );
    expect(rows.map((row) => (row.type === "header" ? row.key : row.tab.tabId))).toEqual([
      "window:1",
      1,
      2,
      "window:2",
      3,
    ]);
    expect(rows[0]).toMatchObject({ label: { kind: "window", order: 1, focused: true }, count: 2 });
  });

  it("sorts by least recently used with the current tab last", () => {
    const rows = buildOpenTabsRows(
      {
        tabs: [
          tab(1, { displayLastActiveAt: NOW - 1 * DAY }),
          tab(2, { displayLastActiveAt: NOW - 5 * DAY }),
          tab(3, { active: true, displayLastActiveAt: NOW }),
        ],
        windows,
      },
      { groupBy: "window", sort: "idle", filters: new Set(), query: "", now: NOW },
    );
    expect(rows.filter((row) => row.type === "tab").map((row) => row.type === "tab" && row.tab.tabId)).toEqual([2, 1, 3]);
  });

  it("groups by tab group with ungrouped tabs last, and by domain by size", () => {
    const tabs = [
      tab(1, { groupId: 7, groupTitle: "Work" }),
      tab(2),
      tab(3, { domain: "a.com" }),
      tab(4, { domain: "a.com" }),
    ];
    const byGroup = buildOpenTabsRows(
      { tabs, windows },
      { groupBy: "group", sort: "position", filters: new Set(), query: "", now: NOW },
    );
    expect(byGroup.filter((row) => row.type === "header").map((row) => row.type === "header" && row.label.kind)).toEqual([
      "group",
      "ungrouped",
    ]);
    const byDomain = buildOpenTabsRows(
      { tabs, windows },
      { groupBy: "domain", sort: "position", filters: new Set(), query: "", now: NOW },
    );
    expect(byDomain[0]).toMatchObject({ key: "domain:a.com", count: 2 });
  });

  it("shows tabs matching any selected filter, and the search terms", () => {
    const tabs = [
      tab(1, { displayLastActiveAt: NOW - 2 * DAY }),
      tab(2, { displayLastActiveAt: NOW - 60_000, duplicateGroupId: "dup:x" }),
      tab(3, { displayLastActiveAt: NOW - 60_000, protection: ["pinned"], title: "Pricing page" }),
      tab(4, { displayLastActiveAt: NOW - 60_000, idleState: "expiring" }),
    ];
    const ids = (filters: string[], query = "") =>
      filterOpenTabs(tabs, { filters: new Set(filters as never[]), query, now: NOW }).map((item) => item.tabId);
    expect(ids(["idle"])).toEqual([1]);
    expect(ids(["duplicates", "protected"])).toEqual([2, 3]);
    expect(ids(["expiring"])).toEqual([4]);
    expect(ids([], "pricing")).toEqual([3]);
  });
});
