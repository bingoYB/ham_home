import { describe, expect, it } from "vitest";
import type { LocalCategory, OpenTabInfo } from "@/types";
import {
  TRIAGE_CACHE_TTL_MS,
  buildCategoryOptions,
  buildLocalTriageSuggestions,
  buildTriagePromptItems,
  formatIdleForPrompt,
  getDefaultTriageSelection,
  groupTriageSuggestions,
  matchCategoryOption,
  normalizeTriageItems,
  partitionTriageTabs,
  pickCachedSuggestions,
  pruneTriageCache,
  sanitizeTriageUrl,
  toCacheEntries,
} from "../tab-triage.utils";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

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

function category(id: string, name: string, parentId: string | null = null, order = 0): LocalCategory {
  return { id, name, parentId, order, createdAt: 0 };
}

describe("what AI may see", () => {
  it("removes hashes, credentials and sensitive parameters from URLs", () => {
    expect(
      sanitizeTriageUrl("https://user:pass@example.com/reset?token=abc&page=2&Code=9&utm_source=x#top"),
    ).toBe("https://example.com/reset?page=2");
    expect(sanitizeTriageUrl("https://example.com/")).toBe("https://example.com");
    expect(sanitizeTriageUrl(`https://example.com/${"a".repeat(300)}`).length).toBeLessThanOrEqual(200);
  });

  it("formats idle time compactly", () => {
    expect(formatIdleForPrompt(3 * DAY + HOUR)).toBe("3d");
    expect(formatIdleForPrompt(5 * HOUR)).toBe("5h");
    expect(formatIdleForPrompt(20 * 60 * 1000)).toBe("20m");
  });

  it("keeps pinned, protected, private and non-web tabs to local rules", () => {
    const tabs = [
      tab(1, { displayLastActiveAt: NOW - DAY }),
      tab(2, { pinned: true }),
      tab(3, { protection: ["locked"] }),
      tab(4),
      tab(5, { url: "chrome://newtab/" }),
      tab(6, { displayLastActiveAt: NOW - 9 * DAY }),
      tab(7, { displayLastActiveAt: NOW - 5 * DAY }),
    ];
    const partition = partitionTriageTabs(tabs, new Set([4]), 2);
    // Most idle first, two at most
    expect(partition.aiTabs.map((item) => item.tabId)).toEqual([6, 7]);
    expect(partition.localTabs.map((item) => item.tabId)).toEqual([2, 3, 4, 5]);
    expect(partition.skippedCount).toBe(1);
  });

  it("builds prompt rows with batch ids and no page content", () => {
    const [row] = buildTriagePromptItems(
      [tab(9, { title: "  React   docs ", url: "https://react.dev/learn?session=1", groupTitle: "Work" })],
      NOW,
    );
    expect(row).toEqual({
      id: 1,
      title: "React docs",
      url: "https://react.dev/learn",
      domain: "site9.com",
      idle: "2d",
      group: "Work",
    });
  });
});

describe("local suggestions", () => {
  it("keeps pinned and protected tabs and follows the rules for the rest", () => {
    const suggestions = buildLocalTriageSuggestions(
      [tab(1, { pinned: true }), tab(2, { protection: ["active"] }), tab(3), tab(4), tab(5, { url: "about:blank" })],
      { duplicates: [3, 1], lowValue: [5], readLater: [4], archive: [], workspaces: [] },
    );
    expect(suggestions).toEqual([
      { tabId: 1, destination: "keep", reason: "", local: "pinned" },
      { tabId: 2, destination: "keep", reason: "", local: "protected" },
      { tabId: 3, destination: "close", reason: "", local: "duplicate" },
      { tabId: 4, destination: "readLater", reason: "", local: "article" },
      { tabId: 5, destination: "close", reason: "", local: "lowValue" },
    ]);
  });
});

describe("checking the AI answer", () => {
  const categories = buildCategoryOptions([
    category("dev", "前端"),
    category("react", "React", "dev"),
    category("travel", "旅行", null, 1),
  ]);

  it("builds category paths and matches by path or unique leaf", () => {
    expect(categories.map((option) => option.path)).toEqual(["前端", "前端 / React", "旅行"]);
    expect(matchCategoryOption("前端/React", categories)?.id).toBe("react");
    expect(matchCategoryOption("react", categories)?.id).toBe("react");
    expect(matchCategoryOption("不存在", categories)).toBeUndefined();
  });

  it("drops unknown ids, duplicates and destinations, and completes names", () => {
    const batch = [tab(11, { groupTitle: "Kyoto" }), tab(12), tab(13)];
    const suggestions = normalizeTriageItems(
      [
        { id: 1, destination: "workspace", reason: "旅行规划", workspace: null },
        { id: 2, destination: "bookmark", reason: "参考文档", category: "前端 / React" },
        { id: 2, destination: "close", reason: "duplicate answer" },
        { id: 3, destination: "archive-it", reason: "bad destination" },
        { id: 9, destination: "close", reason: "unknown tab" },
      ],
      batch,
      categories,
    );
    expect(suggestions).toEqual([
      { tabId: 11, destination: "workspace", reason: "旅行规划", workspaceName: "Kyoto" },
      { tabId: 12, destination: "bookmark", reason: "参考文档", categoryId: "react", categoryName: "前端 / React" },
    ]);
  });

  it("leaves bookmarks uncategorized when the category does not exist", () => {
    const [suggestion] = normalizeTriageItems(
      [{ id: 1, destination: "bookmark", reason: "", category: "新分类" }],
      [tab(1)],
      categories,
    );
    expect(suggestion).toEqual({ tabId: 1, destination: "bookmark", reason: "" });
  });
});

describe("cache", () => {
  const tabs = [tab(1, { url: "https://a.com/x?token=1" }), tab(2, { url: "https://b.com/y" })];

  it("reuses fresh answers in the same language by cleaned URL", () => {
    const cache = toCacheEntries(
      [
        { tabId: 1, destination: "readLater", reason: "长文" },
        { tabId: 2, destination: "keep", reason: "", local: "private" },
      ],
      tabs,
      NOW - HOUR,
      "zh",
    );
    expect(Object.keys(cache)).toEqual(["https://a.com/x"]);

    const hit = pickCachedSuggestions(tabs, cache, NOW, "zh", []);
    expect(hit.cached).toEqual([{ tabId: 1, destination: "readLater", reason: "长文" }]);
    expect(hit.misses.map((item) => item.tabId)).toEqual([2]);

    expect(pickCachedSuggestions(tabs, cache, NOW, "en", []).cached).toEqual([]);
    expect(pickCachedSuggestions(tabs, cache, NOW - HOUR + TRIAGE_CACHE_TTL_MS, "zh", []).cached).toEqual([]);
  });

  it("drops expired entries and keeps the newest", () => {
    const entry = (at: number) => ({ destination: "keep" as const, reason: "", at, language: "zh" });
    const pruned = pruneTriageCache(
      { old: entry(NOW - TRIAGE_CACHE_TTL_MS), a: entry(NOW - 3 * HOUR), b: entry(NOW - HOUR), c: entry(NOW - 2 * HOUR) },
      NOW,
      2,
    );
    expect(Object.keys(pruned)).toEqual(["b", "c"]);
  });
});

describe("grouping and selection", () => {
  it("groups by destination in a fixed order and preselects all but local keeps", () => {
    const suggestions = [
      { tabId: 1, destination: "close" as const, reason: "" },
      { tabId: 2, destination: "keep" as const, reason: "", local: "pinned" as const },
      { tabId: 3, destination: "workspace" as const, reason: "", workspaceName: "竞品调研" },
      { tabId: 4, destination: "workspace" as const, reason: "", workspaceName: "京都旅行" },
      { tabId: 5, destination: "keep" as const, reason: "在用" },
    ];
    const groups = groupTriageSuggestions(suggestions);
    expect(groups.map((group) => group.destination)).toEqual(["keep", "workspace", "close"]);
    expect(groups[0].suggestions.map((item) => item.tabId)).toEqual([5, 2]);
    expect(groups[1].suggestions.map((item) => item.workspaceName)).toEqual(["京都旅行", "竞品调研"]);
    expect([...getDefaultTriageSelection(suggestions)].sort()).toEqual([1, 3, 4, 5]);
  });
});
