import { describe, expect, it } from "vitest";
import type { LocalBookmark, ReadLaterEntry } from "@/types";
import {
  buildQuickList,
  buildReadLaterItems,
  collectExpiredEntries,
  computeCompletionRate,
  countExpiringSoon,
  createReadLaterEntry,
  estimateReadingMinutes,
  filterLibraryBookmarks,
  getEntryDaysLeft,
  getEntryView,
  keepEntryInLibrary,
  markEntryRead,
  markEntryReading,
  matchesReadLaterQuery,
  mergeReadLaterEntries,
  reconcileEntriesWithBookmarks,
  removeEntryFromQueue,
  requeueEntry,
  sortReadLaterItems,
} from "../read-later.utils";

const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000;

function entry(id: string, patch: Partial<ReadLaterEntry> = {}): ReadLaterEntry {
  return {
    ...createReadLaterEntry({ bookmarkId: id, queueOnly: true, source: "manual", now: NOW - DAY }),
    ...patch,
  };
}

function bookmark(id: string, patch: Partial<LocalBookmark> = {}): LocalBookmark {
  return {
    id,
    url: `https://example.com/${id}`,
    title: `Title ${id}`,
    description: "",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: NOW - DAY,
    updatedAt: NOW - DAY,
    ...patch,
  };
}

describe("reading time", () => {
  it("estimates Chinese by characters and English by words", () => {
    expect(estimateReadingMinutes("字".repeat(800))).toBe(2);
    expect(estimateReadingMinutes(Array(690).fill("word").join(" "))).toBe(3);
    expect(estimateReadingMinutes("短")).toBe(1);
    expect(estimateReadingMinutes("")).toBeUndefined();
    expect(estimateReadingMinutes("   \n ")).toBeUndefined();
  });
});

describe("state machine", () => {
  it("moves unread -> reading -> read and back to unread", () => {
    const reading = markEntryReading(entry("a"), NOW);
    expect(reading).toMatchObject({ status: "reading", openedAt: NOW });
    expect(getEntryView(reading)).toBe("unread");

    const read = markEntryRead(reading, NOW + 1);
    expect(read).toMatchObject({ status: "read", readAt: NOW + 1 });
    expect(getEntryView(read)).toBe("read");

    const again = requeueEntry(read, NOW + 2);
    expect(again).toMatchObject({ status: "unread", addedAt: NOW + 2, readAt: undefined });
  });

  it("keeps the expired state when an expired item is opened", () => {
    const expired = entry("a", { status: "expired", expiredAt: NOW });
    expect(markEntryReading(expired, NOW + 1).status).toBe("expired");
  });

  it("keeping to the library only clears queueOnly", () => {
    const kept = keepEntryInLibrary(entry("a", { status: "read" }), NOW);
    expect(kept).toMatchObject({ queueOnly: false, status: "read" });
  });

  it("removed entries leave every view", () => {
    expect(getEntryView(removeEntryFromQueue(entry("a"), NOW))).toBeNull();
  });
});

describe("expiry", () => {
  it("expires pending items after the period and never deletes them", () => {
    const entries = [
      entry("old", { addedAt: NOW - 31 * DAY }),
      entry("reading", { addedAt: NOW - 31 * DAY, status: "reading" }),
      entry("fresh", { addedAt: NOW - 29 * DAY }),
      entry("read", { addedAt: NOW - 40 * DAY, status: "read" }),
    ];
    const expired = collectExpiredEntries(entries, 30, NOW);
    expect(expired.map((item) => item.bookmarkId)).toEqual(["old", "reading"]);
    expect(expired.every((item) => item.status === "expired" && item.expiredAt === NOW)).toBe(true);
    expect(collectExpiredEntries(entries, null, NOW)).toEqual([]);
  });

  it("re-adding renews the expiry", () => {
    const renewed = requeueEntry(entry("a", { addedAt: NOW - 29 * DAY }), NOW);
    expect(getEntryDaysLeft(renewed, 30, NOW)).toBe(30);
  });

  it("counts items expiring within three days", () => {
    const entries = [
      entry("soon", { addedAt: NOW - 28 * DAY }),
      entry("later", { addedAt: NOW - 10 * DAY }),
      entry("done", { addedAt: NOW - 28 * DAY, status: "read" }),
    ];
    expect(countExpiringSoon(entries, 30, NOW)).toBe(1);
    expect(countExpiringSoon(entries, null, NOW)).toBe(0);
  });

  it("computes the completion rate of the last 30 days", () => {
    const entries = [
      entry("a", { status: "read", readAt: NOW - DAY }),
      entry("b", { status: "read", readAt: NOW - 2 * DAY }),
      entry("c", { status: "expired", expiredAt: NOW - DAY }),
      entry("old", { status: "read", readAt: NOW - 60 * DAY }),
    ];
    expect(computeCompletionRate(entries, NOW)).toEqual({ read: 2, expired: 1, rate: 2 / 3 });
    expect(computeCompletionRate([], NOW).rate).toBeNull();
  });
});

describe("library visibility", () => {
  it("hides queue-only bookmarks from library views only", () => {
    const bookmarks = [bookmark("queued"), bookmark("kept"), bookmark("plain")];
    const entries = {
      queued: entry("queued"),
      kept: keepEntryInLibrary(entry("kept"), NOW),
    };
    expect(filterLibraryBookmarks(bookmarks, entries).map((item) => item.id)).toEqual(["kept", "plain"]);
    expect(filterLibraryBookmarks(bookmarks, {})).toBe(bookmarks);
  });

  it("builds items only for live bookmarks", () => {
    const items = buildReadLaterItems(
      { a: entry("a"), b: entry("b"), c: entry("c"), d: removeEntryFromQueue(entry("d"), NOW) },
      [bookmark("a"), bookmark("b", { isDeleted: true }), bookmark("d")],
    );
    expect(items.map((item) => item.entry.bookmarkId)).toEqual(["a"]);
    expect(items[0].domain).toBe("example.com");
  });

  it("sorts and searches items", () => {
    const items = buildReadLaterItems(
      {
        a: entry("a", { addedAt: NOW - 3 * DAY, estimatedMinutes: 9 }),
        b: entry("b", { addedAt: NOW - 1 * DAY, estimatedMinutes: 2, note: "pricing idea" }),
        c: entry("c", { addedAt: NOW - 2 * DAY }),
      },
      [bookmark("a"), bookmark("b"), bookmark("c")],
    );
    const ids = (sort: Parameters<typeof sortReadLaterItems>[1]) =>
      sortReadLaterItems(items, sort).map((item) => item.entry.bookmarkId);
    expect(ids("newest")).toEqual(["b", "c", "a"]);
    expect(ids("oldest")).toEqual(["a", "c", "b"]);
    expect(ids("shortest")).toEqual(["b", "a", "c"]);
    expect(ids("expiring")).toEqual(["a", "c", "b"]);
    expect(items.filter((item) => matchesReadLaterQuery(item, "pricing")).map((item) => item.entry.bookmarkId)).toEqual(["b"]);
  });

  it("lists the newest unread items for the edge panel", () => {
    const list = buildQuickList(
      {
        a: entry("a", { addedAt: NOW - 3 * DAY }),
        b: markEntryReading(entry("b", { addedAt: NOW - 1 * DAY, estimatedMinutes: 4 }), NOW),
        c: entry("c", { addedAt: NOW - 2 * DAY }),
        read: markEntryRead(entry("read"), NOW),
        expired: entry("expired", { status: "expired", expiredAt: NOW }),
      },
      [bookmark("a"), bookmark("b"), bookmark("c", { title: "" }), bookmark("read"), bookmark("expired")],
      2,
    );
    expect(list.unreadCount).toBe(3);
    expect(list.items.map((item) => item.bookmarkId)).toEqual(["b", "c"]);
    expect(list.items[0]).toMatchObject({ reading: true, estimatedMinutes: 4 });
    // A link added unopened has no title yet: fall back to its URL
    expect(list.items[1].title).toBe("https://example.com/c");
  });
});

describe("mergeReadLaterEntries", () => {
  it("is last write wins per bookmark", () => {
    const local = {
      a: entry("a", { status: "read", updatedAt: NOW }),
      b: entry("b", { updatedAt: NOW - 10 }),
      onlyLocal: entry("onlyLocal"),
    };
    const remote = {
      a: entry("a", { status: "unread", updatedAt: NOW - 5 }),
      b: entry("b", { status: "expired", updatedAt: NOW }),
      onlyRemote: entry("onlyRemote"),
    };
    const { merged, localChanged, remoteChanged } = mergeReadLaterEntries(local, remote);
    expect(merged.a.status).toBe("read");
    expect(merged.b.status).toBe("expired");
    expect(Object.keys(merged).sort()).toEqual(["a", "b", "onlyLocal", "onlyRemote"]);
    expect(localChanged).toBe(true);
    expect(remoteChanged).toBe(true);
  });

  it("reports no change when both sides match, regardless of key order", () => {
    const local = { a: entry("a", { note: "x" }) };
    const reordered = { a: Object.fromEntries(Object.entries(local.a).reverse()) as unknown as ReadLaterEntry };
    expect(mergeReadLaterEntries(local, reordered)).toMatchObject({ localChanged: false, remoteChanged: false });
  });
});

describe("reconcileEntriesWithBookmarks", () => {
  it("drops entries of bookmarks deleted for good", () => {
    const { entries, changed } = reconcileEntriesWithBookmarks(
      { gone: entry("gone"), kept: entry("kept") },
      [bookmark("kept")],
      [{ id: "gone", deletedAt: NOW }],
      NOW,
    );
    expect(changed).toBe(true);
    expect(Object.keys(entries)).toEqual(["kept"]);
  });

  it("moves an entry to the surviving bookmark after a URL merge", () => {
    const { entries, changed } = reconcileEntriesWithBookmarks(
      { dup: entry("dup", { note: "why" }) },
      [
        bookmark("dup", { url: "https://same.com/a", isDeleted: true }),
        // A URL merge keeps the earliest created copy
        bookmark("survivor", { url: "https://same.com/a/", createdAt: NOW - 2 * DAY }),
      ],
      [],
      NOW,
    );
    expect(changed).toBe(true);
    expect(entries.survivor).toMatchObject({ bookmarkId: "survivor", queueOnly: false, note: "why" });
    expect(entries.dup.removedAt).toBe(NOW);
  });

  it("does not move a deleted queue item to a bookmark saved after it", () => {
    const input = { deleted: entry("deleted") };
    const { entries, changed } = reconcileEntriesWithBookmarks(
      input,
      [
        bookmark("deleted", { url: "https://same.com/a", isDeleted: true, createdAt: NOW - 3 * DAY }),
        bookmark("saved-later", { url: "https://same.com/a", createdAt: NOW - DAY }),
      ],
      [],
      NOW,
    );
    expect(changed).toBe(false);
    expect(entries).toEqual(input);
  });

  it("keeps the merged bookmark in the library when its library copy was merged away", () => {
    const { entries, changed } = reconcileEntriesWithBookmarks(
      { queued: entry("queued") },
      [
        bookmark("queued", { url: "https://same.com/a", createdAt: NOW - 2 * DAY }),
        bookmark("library", { url: "https://same.com/a", isDeleted: true, createdAt: NOW - DAY }),
      ],
      [],
      NOW,
    );
    expect(changed).toBe(true);
    expect(entries.queued).toMatchObject({ queueOnly: false, status: "unread", updatedAt: NOW });
  });

  it("keeps a queued item queue-only when an older library copy was deleted", () => {
    const input = { queued: entry("queued") };
    const { changed } = reconcileEntriesWithBookmarks(
      input,
      [
        bookmark("library", { url: "https://same.com/a", isDeleted: true, createdAt: NOW - 9 * DAY }),
        bookmark("queued", { url: "https://same.com/a", createdAt: NOW - DAY }),
      ],
      [],
      NOW,
    );
    expect(changed).toBe(false);
  });

  it("leaves entries alone when nothing needs fixing", () => {
    const input = { a: entry("a"), trashed: entry("trashed") };
    const { changed } = reconcileEntriesWithBookmarks(
      input,
      [bookmark("a"), bookmark("trashed", { isDeleted: true })],
      [],
      NOW,
    );
    expect(changed).toBe(false);
  });
});
