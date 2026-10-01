import { beforeEach, describe, expect, it, vi } from "vitest";
import type { LocalBookmark } from "@/types";

const mocks = vi.hoisted(() => ({
  needsUpdate: vi.fn(),
  getConfig: vi.fn(),
  loadConfig: vi.fn(),
  getModelKey: vi.fn(() => "openai:text-embedding-3-large"),
}));

vi.mock("@/lib/storage", () => ({
  vectorStore: { needsUpdate: mocks.needsUpdate },
  bookmarkStorage: {},
  configStorage: { getAIConfig: vi.fn(async () => ({ privacyDomains: [] })) },
}));

vi.mock("../embedding-client", () => ({
  embeddingClient: {
    getConfig: mocks.getConfig,
    loadConfig: mocks.loadConfig,
    getModelKey: mocks.getModelKey,
  },
  EmbeddingRateLimitError: class EmbeddingRateLimitError extends Error {},
}));

const { embeddingQueue } = await import("../embedding-queue");

const bookmark: LocalBookmark = {
  id: "b1",
  url: "https://react.dev/learn",
  title: "React docs",
  description: "Learn React",
  categoryId: null,
  tags: ["react"],
  hasSnapshot: false,
  createdAt: 1,
  updatedAt: 1,
};

describe("embeddingQueue.addBookmark", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    embeddingQueue.clear();
  });

  it("checks staleness against the current embedding model", async () => {
    mocks.getConfig.mockReturnValue(null);
    mocks.needsUpdate.mockResolvedValue(true);

    await embeddingQueue.addBookmark(bookmark);

    expect(mocks.loadConfig).toHaveBeenCalledTimes(1);
    expect(mocks.needsUpdate).toHaveBeenCalledWith(
      "b1",
      expect.any(String),
      "openai:text-embedding-3-large",
    );
    expect(embeddingQueue.getStatus().pending).toBe(1);
  });

  it("skips bookmarks whose vector is up to date", async () => {
    mocks.getConfig.mockReturnValue({ provider: "openai" });
    mocks.needsUpdate.mockResolvedValue(false);

    await embeddingQueue.addBookmark(bookmark);

    expect(mocks.loadConfig).not.toHaveBeenCalled();
    expect(embeddingQueue.getStatus().total).toBe(0);
  });
});
