import { beforeEach, describe, expect, it, vi } from "vitest";
import { TRASH_RETENTION_MS } from "@/lib/bookmarks/bookmark-retention";

const mocks = vi.hoisted(() => ({
  getDeletedBookmarks: vi.fn(),
  purgeBookmarks: vi.fn(),
  pruneExpired: vi.fn(),
}));

vi.mock("@/lib/storage/bookmark-storage", () => ({
  bookmarkStorage: {
    getDeletedBookmarks: mocks.getDeletedBookmarks,
    purgeBookmarks: mocks.purgeBookmarks,
  },
}));

vi.mock("@/lib/storage/bookmark-tombstone-storage", () => ({
  bookmarkTombstoneStorage: { pruneExpired: mocks.pruneExpired },
}));

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

function trashed(id: string, deletedAt?: number, updatedAt = NOW) {
  return { id, deletedAt, updatedAt, isDeleted: true };
}

describe("BookmarkRetentionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pruneExpired.mockResolvedValue(0);
  });

  it("purges only the bookmarks past the trash window", async () => {
    mocks.getDeletedBookmarks.mockResolvedValue([
      trashed("fresh", NOW - DAY),
      trashed("expired", NOW - TRASH_RETENTION_MS - DAY),
    ]);

    const { bookmarkRetentionService } = await import("../bookmark-retention-service");
    const result = await bookmarkRetentionService.sweep(NOW);

    expect(mocks.purgeBookmarks).toHaveBeenCalledWith(["expired"]);
    expect(result.purged).toBe(1);
  });

  it("falls back to updatedAt for records deleted before deletedAt existed", async () => {
    mocks.getDeletedBookmarks.mockResolvedValue([
      trashed("legacy", undefined, NOW - TRASH_RETENTION_MS - DAY),
    ]);

    const { bookmarkRetentionService } = await import("../bookmark-retention-service");
    await bookmarkRetentionService.sweep(NOW);

    expect(mocks.purgeBookmarks).toHaveBeenCalledWith(["legacy"]);
  });

  it("skips the purge write when the trash holds nothing expired", async () => {
    mocks.getDeletedBookmarks.mockResolvedValue([trashed("fresh", NOW)]);
    mocks.pruneExpired.mockResolvedValue(2);

    const { bookmarkRetentionService } = await import("../bookmark-retention-service");
    const result = await bookmarkRetentionService.sweep(NOW);

    expect(mocks.purgeBookmarks).not.toHaveBeenCalled();
    expect(result).toEqual({ purged: 0, prunedTombstones: 2 });
  });
});
