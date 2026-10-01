import { afterEach, describe, expect, it, vi } from "vitest";
import type { BookmarkEmbedding } from "@/types";
import { vectorStore } from "../vector-store";

const MODEL_KEY = "openai:text-embedding-3-small";

const storedEmbedding: BookmarkEmbedding = {
  bookmarkId: "b1",
  modelKey: MODEL_KEY,
  dim: 3,
  vector: new Float32Array([0.1, 0.2, 0.3]).buffer,
  checksum: "abc",
  createdAt: 1,
  updatedAt: 1,
};

describe("vectorStore.needsUpdate", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("re-embeds when the text, the model, or the dimensions change", async () => {
    vi.spyOn(vectorStore, "getEmbedding").mockResolvedValue(storedEmbedding);

    await expect(vectorStore.needsUpdate("b1", "abc", MODEL_KEY)).resolves.toBe(false);
    await expect(vectorStore.needsUpdate("b1", "changed", MODEL_KEY)).resolves.toBe(true);
    await expect(
      vectorStore.needsUpdate("b1", "abc", "openai:text-embedding-3-large"),
    ).resolves.toBe(true);
    await expect(vectorStore.needsUpdate("b1", "abc", `${MODEL_KEY}:dim512`)).resolves.toBe(true);
  });

  it("embeds bookmarks without a stored vector", async () => {
    vi.spyOn(vectorStore, "getEmbedding").mockResolvedValue(null);

    await expect(vectorStore.needsUpdate("b2", "abc", MODEL_KEY)).resolves.toBe(true);
  });
});
