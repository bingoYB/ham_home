import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalBookmark, ReadLaterEntry } from "@/types";

const mocks = vi.hoisted(() => ({
  getBookmarkByUrl: vi.fn(),
  createBookmark: vi.fn(),
  updateBookmark: vi.fn(),
  getEntry: vi.fn(),
  keep: vi.fn(),
}));

vi.mock("@/lib/storage", () => ({
  bookmarkStorage: {
    getBookmarkByUrl: mocks.getBookmarkByUrl,
    createBookmark: mocks.createBookmark,
    updateBookmark: mocks.updateBookmark,
  },
}));
vi.mock("@/lib/storage/read-later-storage", () => ({
  readLaterStorage: { get: mocks.getEntry },
}));
vi.mock("@/lib/services/read-later-service", () => ({
  readLaterService: { keep: mocks.keep },
}));

import { createBookmarkManagementTools } from "../bookmark-management-tools";

const queued = { id: "b1", url: "https://example.com/post", hasSnapshot: true } as LocalBookmark;
const input = {
  url: "https://example.com/post",
  title: "Post",
  description: "About the post",
  tags: ["reading"],
  categoryId: "dev",
};

function createBookmarkTool() {
  const tool = createBookmarkManagementTools().find((item) => item.name === "create_bookmark");
  if (!tool) throw new Error("create_bookmark is missing");
  return tool;
}

describe("create_bookmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateBookmark.mockImplementation(async (id: string, data: object) => ({ ...queued, ...data, id }));
    mocks.createBookmark.mockImplementation(async (data: object) => ({ id: "new", ...data }));
  });

  it("moves a URL that is only in the read later queue into the library", async () => {
    mocks.getBookmarkByUrl.mockResolvedValue(queued);
    mocks.getEntry.mockResolvedValue({ bookmarkId: "b1", queueOnly: true } as ReadLaterEntry);

    await createBookmarkTool().execute(input, {} as never);

    expect(mocks.createBookmark).not.toHaveBeenCalled();
    expect(mocks.updateBookmark).toHaveBeenCalledWith("b1", {
      title: "Post",
      description: "About the post",
      tags: ["reading"],
      categoryId: "dev",
    });
    expect(mocks.keep).toHaveBeenCalledWith(["b1"]);
  });

  it("still creates new bookmarks as before", async () => {
    mocks.getBookmarkByUrl.mockResolvedValue(null);

    await createBookmarkTool().execute(input, {} as never);

    expect(mocks.createBookmark).toHaveBeenCalledWith({ ...input, hasSnapshot: false });
    expect(mocks.keep).not.toHaveBeenCalled();
  });

  it("leaves library bookmarks to the duplicate check", async () => {
    mocks.getBookmarkByUrl.mockResolvedValue(queued);
    mocks.getEntry.mockResolvedValue({ bookmarkId: "b1", queueOnly: false } as ReadLaterEntry);

    await createBookmarkTool().execute(input, {} as never);

    expect(mocks.createBookmark).toHaveBeenCalled();
    expect(mocks.updateBookmark).not.toHaveBeenCalled();
  });
});
