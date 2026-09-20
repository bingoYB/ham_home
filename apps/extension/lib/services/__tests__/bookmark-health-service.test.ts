import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getBookmarks: vi.fn(),
  getSubjectIndex: vi.fn(),
  deleteMany: vi.fn(),
  set: vi.fn(),
}));

vi.mock("@/lib/storage/bookmark-storage", () => ({
  bookmarkStorage: { getBookmarks: mocks.getBookmarks },
}));

vi.mock("@/lib/storage/bookmark-clip-storage", () => ({
  bookmarkClipStorage: { getSubjectIndex: mocks.getSubjectIndex },
}));

vi.mock("@/lib/storage/bookmark-health-storage", () => ({
  bookmarkHealthStorage: {
    deleteMany: mocks.deleteMany,
    set: mocks.set,
  },
}));

function bookmark(id: string, url: string) {
  return {
    id,
    url,
    title: `Bookmark ${id}`,
    description: "description",
    categoryId: null,
    tags: [],
    hasSnapshot: false,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("BookmarkHealthService scan scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.deleteMany.mockResolvedValue(undefined);
    mocks.set.mockResolvedValue(undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("checks only ordinary bookmarks and clears stale content records", async () => {
    mocks.getBookmarks.mockResolvedValue([
      bookmark("bookmark", "https://example.com/page"),
      bookmark("image", "https://example.com/image.png"),
      bookmark("text", "https://example.com/page#:~:text=selection"),
    ]);
    mocks.getSubjectIndex.mockResolvedValue({
      image: { type: "image" },
      text: { type: "text" },
    });

    const { BookmarkHealthService } = await import("../bookmark-health-service");
    const records = await new BookmarkHealthService().scan();

    expect(records.map((record) => record.bookmarkId)).toEqual(["bookmark"]);
    expect(records[0]?.issueCodes).toEqual([]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.deleteMany).toHaveBeenCalledWith(["image", "text"]);
  });

  it("does not check a content item requested by id", async () => {
    mocks.getBookmarks.mockResolvedValue([
      bookmark("image", "https://example.com/image.png"),
    ]);
    mocks.getSubjectIndex.mockResolvedValue({ image: { type: "image" } });

    const { BookmarkHealthService } = await import("../bookmark-health-service");
    const records = await new BookmarkHealthService().scan(["image"]);

    expect(records).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
