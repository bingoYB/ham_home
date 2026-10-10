import { describe, expect, it } from "vitest";
import type { TabActivityRecord } from "@/types";
import {
  collectLockedUrls,
  reconcileActivityRecords,
  type ReconcileTab,
} from "../tab-reconcile.utils";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

function record(patch: Partial<TabActivityRecord> & Pick<TabActivityRecord, "tabId" | "url">): TabActivityRecord {
  return {
    windowId: 1,
    index: 0,
    firstSeenAt: NOW - 100 * HOUR,
    lastActiveAt: NOW - 50 * HOUR,
    ...patch,
  };
}

function tab(patch: Partial<ReconcileTab> & Pick<ReconcileTab, "tabId" | "url">): ReconcileTab {
  return { windowId: 100, index: 0, ...patch };
}

describe("reconcileActivityRecords", () => {
  it("keeps records whose tab ID and URL are still valid", () => {
    const previous = [record({ tabId: 7, url: "https://a.com", lastActiveAt: NOW - 3 * HOUR })];
    const [result] = reconcileActivityRecords(previous, [tab({ tabId: 7, url: "https://a.com", windowId: 1 })], NOW);
    expect(result.lastActiveAt).toBe(NOW - 3 * HOUR);
    expect(result.estimated).toBeUndefined();
  });

  it("matches by URL after a restart changed every tab ID", () => {
    const previous = [
      record({ tabId: 1, url: "https://a.com", windowId: 10, index: 0, lastActiveAt: NOW - 10 * HOUR }),
      record({ tabId: 2, url: "https://b.com", windowId: 10, index: 1, lastActiveAt: NOW - 20 * HOUR }),
    ];
    const current = [
      tab({ tabId: 51, url: "https://b.com", windowId: 900, index: 1 }),
      tab({ tabId: 50, url: "https://a.com", windowId: 900, index: 0 }),
    ];
    const result = reconcileActivityRecords(previous, current, NOW);
    expect(result.map((item) => [item.tabId, item.lastActiveAt])).toEqual([
      [51, NOW - 20 * HOUR],
      [50, NOW - 10 * HOUR],
    ]);
    expect(result.every((item) => item.windowId === 900)).toBe(true);
  });

  it("uses window rank and position for several tabs with the same URL", () => {
    const previous = [
      record({ tabId: 1, url: "https://docs.com", windowId: 10, index: 0, lastActiveAt: NOW - 1 * HOUR }),
      record({ tabId: 2, url: "https://docs.com", windowId: 20, index: 3, lastActiveAt: NOW - 2 * HOUR }),
      record({ tabId: 3, url: "https://docs.com", windowId: 20, index: 5, lastActiveAt: NOW - 3 * HOUR }),
    ];
    const current = [
      tab({ tabId: 101, url: "https://docs.com", windowId: 500, index: 0 }),
      tab({ tabId: 102, url: "https://docs.com", windowId: 600, index: 5 }),
      tab({ tabId: 103, url: "https://docs.com", windowId: 600, index: 4 }),
    ];
    const byId = new Map(
      reconcileActivityRecords(previous, current, NOW).map((item) => [item.tabId, item]),
    );
    expect(byId.get(101)!.lastActiveAt).toBe(NOW - 1 * HOUR);
    // Exact position wins
    expect(byId.get(102)!.lastActiveAt).toBe(NOW - 3 * HOUR);
    // Then the closest remaining record of the same window
    expect(byId.get(103)!.lastActiveAt).toBe(NOW - 2 * HOUR);
  });

  it("falls back to now when a URL changed, and drops unclaimed records", () => {
    const previous = [record({ tabId: 1, url: "https://old.com" })];
    const result = reconcileActivityRecords(previous, [tab({ tabId: 9, url: "https://new.com" })], NOW);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ tabId: 9, lastActiveAt: NOW, firstSeenAt: NOW, estimated: true });
  });

  it("does not let one record be claimed twice", () => {
    const previous = [record({ tabId: 1, url: "https://a.com", lastActiveAt: NOW - 5 * HOUR })];
    const result = reconcileActivityRecords(
      previous,
      [tab({ tabId: 10, url: "https://a.com" }), tab({ tabId: 11, url: "https://a.com", index: 1 })],
      NOW,
    );
    expect(result.filter((item) => item.lastActiveAt === NOW - 5 * HOUR)).toHaveLength(1);
    expect(result.filter((item) => item.lastActiveAt === NOW)).toHaveLength(1);
  });

  it("keeps locks through a restart, by record or by the persisted URL list", () => {
    const previous = [record({ tabId: 1, url: "https://locked.com", locked: true })];
    const result = reconcileActivityRecords(
      previous,
      [
        tab({ tabId: 20, url: "https://locked.com" }),
        tab({ tabId: 21, url: "https://url-locked.com", index: 1 }),
      ],
      NOW,
      new Set(["https://url-locked.com"]),
    );
    expect(result.map((item) => item.locked)).toEqual([true, true]);
    expect(collectLockedUrls(result)).toEqual(["https://locked.com", "https://url-locked.com"]);
  });

  it("clamps timestamps from the future when the clock moved back", () => {
    const previous = [
      record({ tabId: 1, url: "https://a.com", firstSeenAt: NOW + HOUR, lastActiveAt: NOW + 2 * HOUR }),
    ];
    const [result] = reconcileActivityRecords(previous, [tab({ tabId: 1, url: "https://a.com", windowId: 1 })], NOW);
    expect(result.firstSeenAt).toBe(NOW);
    expect(result.lastActiveAt).toBe(NOW);
  });
});
