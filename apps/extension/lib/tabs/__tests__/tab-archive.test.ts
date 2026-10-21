import { describe, expect, it } from "vitest";
import type { TabArchiveBatch, TabArchiveEntry } from "@/types";
import {
  buildArchiveRows,
  filterArchiveEntries,
  getArchiveDateGroup,
  indexArchiveEntries,
  listArchiveDomains,
  mergeArchiveEntry,
  selectArchiveEntriesToPurge,
  summarizeRecentAutoBatches,
} from "../tab-archive.utils";
import { buildTabDuplicateGroups, normalizeTabUrl } from "../tab-duplicates.utils";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date(2026, 5, 10, 15, 0).getTime();

function entry(patch: Partial<TabArchiveEntry> & Pick<TabArchiveEntry, "id">): TabArchiveEntry {
  return {
    batchId: "b1",
    url: `https://example.com/${patch.id}`,
    normalizedUrl: `https://example.com/${patch.id}`,
    title: `Entry ${patch.id}`,
    domain: "example.com",
    reason: "expired",
    lastActiveAt: NOW - 10 * DAY,
    closedAt: NOW - DAY,
    closeCount: 1,
    ...patch,
  };
}

describe("archive retention", () => {
  it("purges entries past the retention period", () => {
    const entries = [
      entry({ id: "old", closedAt: NOW - 91 * DAY }),
      entry({ id: "recent", closedAt: NOW - 89 * DAY }),
    ];
    expect(selectArchiveEntriesToPurge(entries, 90, NOW)).toEqual(["old"]);
  });

  it("keeps everything forever when retention is off, apart from the cap", () => {
    const entries = [
      entry({ id: "a", closedAt: NOW - 3 * DAY }),
      entry({ id: "b", closedAt: NOW - 2 * DAY }),
      entry({ id: "c", closedAt: NOW - 1 * DAY }),
    ];
    expect(selectArchiveEntriesToPurge(entries, null, NOW)).toEqual([]);
    // Oldest go first once the cap is exceeded
    expect(selectArchiveEntriesToPurge(entries, null, NOW, 2)).toEqual(["a"]);
  });
});

describe("mergeArchiveEntry", () => {
  it("keeps one entry per URL and counts closes", () => {
    const existing = entry({ id: "x", batchId: "old", closeCount: 2, firstSeenAt: NOW - 30 * DAY });
    const incoming = entry({ id: "new", batchId: "fresh", closeCount: 1, firstSeenAt: NOW - 5 * DAY, closedAt: NOW });
    expect(mergeArchiveEntry(existing, incoming)).toMatchObject({
      id: "x",
      batchId: "fresh",
      closeCount: 3,
      closedAt: NOW,
      firstSeenAt: NOW - 30 * DAY,
    });
    expect(mergeArchiveEntry(undefined, incoming)).toBe(incoming);
  });
});

describe("archive grouping and search", () => {
  it("groups by local day", () => {
    expect(getArchiveDateGroup(NOW - 60 * 1000, NOW)).toBe("today");
    expect(getArchiveDateGroup(NOW - DAY, NOW)).toBe("yesterday");
    expect(getArchiveDateGroup(NOW - 4 * DAY, NOW)).toBe("week");
    expect(getArchiveDateGroup(NOW - 20 * DAY, NOW)).toBe("earlier");
  });

  it("filters by every term, reason, domain and date group", () => {
    const indexed = indexArchiveEntries(
      [
        entry({ id: "1", title: "Pricing strategy", domain: "blog.com", url: "https://blog.com/pricing" }),
        entry({ id: "2", title: "Pricing page", reason: "budget", url: "https://shop.com/pricing" }),
        entry({ id: "3", title: "Changelog", closedAt: NOW - 30 * DAY }),
      ],
      NOW,
    );
    const ids = (filter: Parameters<typeof filterArchiveEntries>[1]) =>
      filterArchiveEntries(indexed, filter).map((item) => item.entry.id);

    expect(ids({ query: "pricing" })).toEqual(["1", "2"]);
    expect(ids({ query: "pricing blog" })).toEqual(["1"]);
    expect(ids({ query: "shop.com" })).toEqual(["2"]);
    expect(ids({ reason: "budget" })).toEqual(["2"]);
    expect(ids({ domain: "blog.com" })).toEqual(["1"]);
    expect(ids({ dateGroup: "earlier" })).toEqual(["3"]);
  });

  it("searches 10,000 entries within 100ms", () => {
    const entries = Array.from({ length: 10_000 }, (_, i) =>
      entry({ id: String(i), title: `Article number ${i} about topic ${i % 97}`, closedAt: NOW - i * 60_000 }),
    );
    const indexed = indexArchiveEntries(entries, NOW);
    const start = performance.now();
    const result = filterArchiveEntries(indexed, { query: "topic 42" });
    expect(performance.now() - start).toBeLessThan(100);
    expect(result.length).toBeGreaterThan(0);
  });

  it("lists domains by frequency", () => {
    expect(
      listArchiveDomains([
        entry({ id: "1", domain: "a.com" }),
        entry({ id: "2", domain: "b.com" }),
        entry({ id: "3", domain: "b.com" }),
      ]),
    ).toEqual(["b.com", "a.com"]);
  });
});

describe("summarizeRecentAutoBatches", () => {
  const batch = (patch: Partial<TabArchiveBatch> & Pick<TabArchiveBatch, "id">): TabArchiveBatch => ({
    reason: "expired",
    createdAt: NOW - 60_000,
    entryIds: [],
    automatic: true,
    ...patch,
  });

  it("counts archived tabs of automatic batches from the last 24 hours", () => {
    const batches = [
      batch({ id: "auto" }),
      batch({ id: "manual", automatic: false }),
      batch({ id: "undone", undoneAt: NOW }),
      batch({ id: "stale", createdAt: NOW - 2 * DAY }),
    ];
    const entries = [
      { batchId: "auto" },
      { batchId: "auto" },
      { batchId: "manual" },
      { batchId: "stale" },
    ];
    expect(summarizeRecentAutoBatches(batches, entries, NOW)).toEqual({
      batchIds: ["auto"],
      count: 2,
    });
  });

  it("is empty once every tab was restored", () => {
    expect(summarizeRecentAutoBatches([batch({ id: "auto" })], [], NOW)).toEqual({ batchIds: [], count: 0 });
  });
});

describe("duplicate tabs", () => {
  it("normalizes like bookmarks", () => {
    expect(normalizeTabUrl("https://a.com/page/?utm_source=x")).toBe("https://a.com/page");
    expect(normalizeTabUrl("https://a.com/app#inbox")).toBe("https://a.com/app#inbox");
    expect(normalizeTabUrl(undefined)).toBeNull();
  });

  it("keeps the most recently used tab and never closes pinned ones", () => {
    const groups = buildTabDuplicateGroups([
      { tabId: 1, url: "https://a.com/x", lastActiveAt: 100, active: false, pinned: false },
      { tabId: 2, url: "https://a.com/x/", lastActiveAt: 300, active: false, pinned: false },
      { tabId: 3, url: "https://a.com/x?utm_source=feed", lastActiveAt: 200, active: false, pinned: true },
      { tabId: 4, url: "https://b.com", lastActiveAt: 50, active: false, pinned: false },
    ]);
    expect(groups).toHaveLength(1);
    // Pinned ranks above recency for keeping
    expect(groups[0].keepTabId).toBe(3);
    expect(groups[0].redundantTabIds).toEqual([2, 1]);
  });

  it("prefers the current tab of a window", () => {
    const [group] = buildTabDuplicateGroups([
      { tabId: 1, url: "https://a.com", lastActiveAt: 999, active: false, pinned: false },
      { tabId: 2, url: "https://a.com", lastActiveAt: 1, active: true, pinned: false },
    ]);
    expect(group.keepTabId).toBe(2);
    expect(group.redundantTabIds).toEqual([1]);
  });

  it("keeps a protected tab, such as one playing sound, and never marks it redundant", () => {
    const [group] = buildTabDuplicateGroups([
      { tabId: 1, url: "https://a.com", lastActiveAt: 100, active: false, pinned: false, protected: true },
      { tabId: 2, url: "https://a.com", lastActiveAt: 900, active: false, pinned: false },
    ]);
    expect(group.keepTabId).toBe(1);
    expect(group.redundantTabIds).toEqual([2]);

    const [withCurrent] = buildTabDuplicateGroups([
      { tabId: 1, url: "https://a.com", lastActiveAt: 100, active: false, pinned: false, protected: true },
      { tabId: 2, url: "https://a.com", lastActiveAt: 900, active: true, pinned: false, protected: true },
    ]);
    expect(withCurrent.keepTabId).toBe(2);
    expect(withCurrent.redundantTabIds).toEqual([]);
  });
});

describe("buildArchiveRows", () => {
  it("groups entries by day, then by batch", () => {
    const indexed = indexArchiveEntries(
      [
        entry({ id: "a", batchId: "b2", closedAt: NOW - 60_000 }),
        entry({ id: "b", batchId: "b2", closedAt: NOW - 120_000 }),
        entry({ id: "c", batchId: "b1", closedAt: NOW - 180_000 }),
        entry({ id: "d", batchId: "b0", closedAt: NOW - 20 * DAY }),
      ],
      NOW,
    );
    const batches = new Map([
      ["b2", { id: "b2", reason: "expired" as const, createdAt: NOW, entryIds: ["a", "b"], automatic: true }],
    ]);
    const rows = buildArchiveRows(indexed, batches);
    expect(rows.map((row) => row.key)).toEqual([
      "date:today",
      "batch:today:b2",
      "entry:a",
      "entry:b",
      "batch:today:b1",
      "entry:c",
      "date:earlier",
      "batch:earlier:b0",
      "entry:d",
    ]);
    expect(rows[0]).toMatchObject({ count: 3 });
    expect(rows[1]).toMatchObject({ batch: { id: "b2" }, entryIds: ["a", "b"] });
  });
});
