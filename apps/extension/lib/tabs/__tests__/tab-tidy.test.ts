import { describe, expect, it } from "vitest";
import type { OpenTabInfo } from "@/types";
import {
  buildTidySuggestions,
  countTidySuggestions,
  isArticleLikeTab,
  isLowValueTab,
} from "../tab-tidy.utils";

const NOW = 1_800_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function tab(tabId: number, patch: Partial<OpenTabInfo> = {}): OpenTabInfo {
  return {
    tabId,
    windowId: 1,
    index: tabId,
    title: `Tab ${tabId}`,
    url: `https://site${tabId}.com/page`,
    normalizedUrl: `https://site${tabId}.com/page`,
    domain: `site${tabId}.com`,
    pinned: false,
    active: false,
    audible: false,
    discarded: false,
    loading: false,
    firstSeenAt: NOW - 30 * DAY,
    lastActiveAt: NOW - 2 * DAY,
    displayLastActiveAt: NOW - 2 * DAY,
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

describe("tidy-up rules", () => {
  it("recognizes low-value and article-like pages", () => {
    expect(isLowValueTab({ url: "https://www.google.com/search?q=react" })).toBe(true);
    expect(isLowValueTab({ url: "https://www.baidu.com/s?wd=react" })).toBe(true);
    expect(isLowValueTab({ url: "https://github.com/login" })).toBe(true);
    expect(isLowValueTab({ url: "chrome://newtab/" })).toBe(true);
    expect(isLowValueTab({ url: "https://github.com/loginator" })).toBe(false);
    expect(isArticleLikeTab({ url: "https://example.com/blog/pricing", title: "Pricing" })).toBe(true);
    expect(isArticleLikeTab({ url: "https://app.example.com/dashboard", title: "Dashboard" })).toBe(false);
  });

  it("gives each tab at most one suggestion, in priority order, never for protected tabs", () => {
    const suggestions = buildTidySuggestions(
      {
        tabs: [
          tab(1, { redundantDuplicate: true, url: "https://site1.com/blog/a" }),
          tab(2, { url: "https://www.google.com/search?q=x" }),
          tab(3, { url: "https://news.site3.com/post/1", stale: true }),
          tab(4, { stale: true }),
          tab(5, { idleState: "expiring", displayLastActiveAt: NOW - 1000 }),
          tab(6, { stale: true, protection: ["pinned"] }),
          tab(7, { url: "https://blog.site7.com/x", displayLastActiveAt: NOW - 1000 }),
        ],
      },
      NOW,
    );
    expect(suggestions.duplicates).toEqual([1]);
    expect(suggestions.lowValue).toEqual([2]);
    expect(suggestions.readLater).toEqual([3]);
    expect(suggestions.archive).toEqual([4, 5]);
  });

  it("suggests folding 5+ idle tabs of a group or domain into a workspace", () => {
    const research = Array.from({ length: 5 }, (_, i) =>
      tab(10 + i, { groupId: 3, groupTitle: "Research", domain: `r${i}.com` }),
    );
    const docs = Array.from({ length: 4 }, (_, i) => tab(20 + i, { domain: "docs.com" }));
    const suggestions = buildTidySuggestions({ tabs: [...research, ...docs] }, NOW);
    expect(suggestions.workspaces).toEqual([
      { key: "group:1:3", name: "Research", tabIds: [10, 11, 12, 13, 14] },
    ]);
    expect(countTidySuggestions(suggestions)).toBe(5);
  });
});
