import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OpenTabInfo, TabArchiveEntry } from "@/types";
import { createTabLifecycleTools } from "../tab-lifecycle-tools";
import { isAutoApprovedCall } from "../tool-approval-rules";

const mocks = vi.hoisted(() => ({
  getSnapshot: vi.fn(),
  getAllEntries: vi.fn(),
}));

vi.mock("@/lib/services/tab-lifecycle-service", () => ({
  tabLifecycleService: { getSnapshot: mocks.getSnapshot },
}));
vi.mock("@/lib/storage/tab-archive-storage", () => ({
  tabArchiveStorage: { getAllEntries: mocks.getAllEntries },
}));
vi.mock("@/lib/privacy", () => ({
  containsPrivateContent: vi.fn(async (url: string) => ({
    isPrivate: new URL(url).hostname.endsWith("bank.example"),
  })),
}));

const NOW = new Date("2026-10-04T12:00:00").getTime();
const DAY = 24 * 60 * 60 * 1000;

function openTab(tabId: number, url: string, title: string, idleDays: number): OpenTabInfo {
  return {
    tabId,
    windowId: tabId < 10 ? 1 : 2,
    url,
    title,
    active: false,
    displayLastActiveAt: NOW - idleDays * DAY,
    activityEstimated: false,
    protection: [],
    idleState: "idle",
    redundantDuplicate: false,
  } as unknown as OpenTabInfo;
}

function archived(id: string, url: string, domain: string): TabArchiveEntry {
  return {
    id,
    batchId: "batch",
    url,
    normalizedUrl: url,
    title: `Closed ${id}`,
    domain,
    reason: "expired",
    closedAt: NOW - DAY,
    closeCount: 1,
  } as TabArchiveEntry;
}

function tool(name: string) {
  const found = createTabLifecycleTools().find((item) => item.name === name);
  if (!found) throw new Error(`${name} is missing`);
  return found;
}

describe("tab lifecycle agent tools", () => {
  it("asks before closing tabs and keeps reads free", () => {
    const tools = new Map(createTabLifecycleTools().map((tool) => [tool.name, tool]));
    expect(Array.from(tools.keys()).sort()).toEqual([
      "archive_tabs",
      "get_tab_lifecycle_status",
      "list_open_tabs",
      "list_read_later",
      "move_tabs_to_read_later",
      "restore_archived_tabs",
      "search_tab_archive",
      "update_read_later_status",
    ]);
    expect(tools.get("archive_tabs")?.metadata?.riskLevel).toBe("high");
    expect(tools.get("move_tabs_to_read_later")?.metadata?.riskLevel).toBe("high");
    expect(tools.get("list_open_tabs")?.metadata?.readOnly).toBe(true);
    expect(tools.get("restore_archived_tabs")?.metadata?.riskLevel).toBe("medium");
  });

  it("only asks for batch read later updates", () => {
    expect(isAutoApprovedCall("update_read_later_status", { bookmarkIds: ["a"] })).toBe(true);
    expect(isAutoApprovedCall("update_read_later_status", { bookmarkIds: ["a", "b"] })).toBe(false);
    expect(isAutoApprovedCall("archive_tabs", { tabIds: [1] })).toBe(false);
  });
});

describe("what the agent tools send to AI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSnapshot.mockResolvedValue({
      generatedAt: NOW,
      stats: { total: 4 },
      tabs: [
        openTab(1, "https://news.example.com/today", "News", 1),
        openTab(2, "https://bank.example/accounts", "My accounts", 9),
        openTab(3, "chrome://settings/", "Settings", 8),
        openTab(11, "https://github.com/org/repo/issues?token=secret#top", "Issues · org/repo - GitHub", 5),
      ],
    });
  });

  it("lists open tabs least recently used first, without private pages or secrets", async () => {
    const result = (await tool("list_open_tabs").execute({}, {} as never)) as {
      matched: number;
      privateTabsNotShown: number;
      tabs: Array<{ tabId: number; url: string }>;
    };

    expect(result.tabs.map((tab) => tab.tabId)).toEqual([11, 1]);
    expect(result.tabs[0].url).toBe("https://github.com/org/repo/issues");
    expect(result.privateTabsNotShown).toBe(2);
    expect(result.matched).toBe(4);
  });

  it("matches every word of the query, like the tab center search", async () => {
    const result = (await tool("list_open_tabs").execute({ query: "github issues" }, {} as never)) as {
      tabs: Array<{ tabId: number }>;
    };

    expect(result.tabs.map((tab) => tab.tabId)).toEqual([11]);
  });

  it("searches the archive by domain with subdomains, without private pages", async () => {
    mocks.getAllEntries.mockResolvedValue([
      archived("a", "https://www.youtube.com/watch?v=1", "www.youtube.com"),
      archived("b", "https://music.youtube.com/watch?v=2&code=secret", "music.youtube.com"),
      archived("c", "https://example.com/page", "example.com"),
      archived("d", "https://bank.example/youtube.com", "bank.example"),
    ]);

    const result = (await tool("search_tab_archive").execute({ domain: "YouTube.com" }, {} as never)) as {
      results: Array<{ entryId: string; url: string }>;
    };

    expect(result.results.map((item) => item.entryId).sort()).toEqual(["a", "b"]);
    expect(result.results.find((item) => item.entryId === "b")?.url).toBe(
      "https://music.youtube.com/watch?v=2",
    );

    const all = (await tool("search_tab_archive").execute({ query: "closed" }, {} as never)) as {
      privateEntriesNotShown: number;
      results: Array<{ entryId: string }>;
    };
    expect(all.results.map((item) => item.entryId).sort()).toEqual(["a", "b", "c"]);
    expect(all.privateEntriesNotShown).toBe(1);
  });
});
