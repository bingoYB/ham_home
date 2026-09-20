import { describe, expect, it } from "vitest";
import {
  TOMBSTONE_RETENTION_MS,
  TRASH_RETENTION_MS,
  getTrashRemainingDays,
  isTombstoneExpired,
  isTrashExpired,
  mergeTombstones,
  pruneExpiredTombstones,
} from "../bookmark-retention";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe("retention windows", () => {
  it("keeps trashed bookmarks recoverable until the window closes", () => {
    expect(isTrashExpired(NOW - TRASH_RETENTION_MS + DAY, NOW)).toBe(false);
    expect(isTrashExpired(NOW - TRASH_RETENTION_MS, NOW)).toBe(true);
  });

  it("outlives the trash window with the tombstone window", () => {
    expect(TOMBSTONE_RETENTION_MS).toBeGreaterThan(TRASH_RETENTION_MS);
    expect(isTombstoneExpired(NOW - TRASH_RETENTION_MS, NOW)).toBe(false);
    expect(isTombstoneExpired(NOW - TOMBSTONE_RETENTION_MS, NOW)).toBe(true);
  });

  it("reports remaining days without going negative", () => {
    expect(getTrashRemainingDays(NOW, NOW)).toBe(30);
    expect(getTrashRemainingDays(NOW - 29.5 * DAY, NOW)).toBe(1);
    expect(getTrashRemainingDays(NOW - 100 * DAY, NOW)).toBe(0);
  });
});

describe("mergeTombstones", () => {
  it("keeps the earliest deletedAt so the window never slides forward", () => {
    const merged = mergeTombstones(
      [{ id: "a", deletedAt: 200 }],
      [{ id: "a", deletedAt: 100 }, { id: "b", deletedAt: 300 }],
    );

    expect(merged).toHaveLength(2);
    expect(merged.find((item) => item.id === "a")?.deletedAt).toBe(100);
    expect(merged.find((item) => item.id === "b")?.deletedAt).toBe(300);
  });

  it("drops tombstones past the retention window", () => {
    const pruned = pruneExpiredTombstones(
      [
        { id: "fresh", deletedAt: NOW - DAY },
        { id: "stale", deletedAt: NOW - TOMBSTONE_RETENTION_MS - DAY },
      ],
      NOW,
    );

    expect(pruned.map((item) => item.id)).toEqual(["fresh"]);
  });
});

describe("tombstone window start", () => {
  it("outlives a bookmark that sat in the trash for a long time", () => {
    // 墓碑在「彻底删除」时才创建，此刻起算满 90 天，
    // 不会因为书签早就进了回收站而一出生就过期
    const deletedLongAgo = NOW - 300 * DAY;
    expect(isTrashExpired(deletedLongAgo, NOW)).toBe(true);
    expect(isTombstoneExpired(NOW, NOW + DAY)).toBe(false);
  });
});
