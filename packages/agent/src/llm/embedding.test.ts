import { describe, expect, it } from "vitest";
import { AiSdkEmbeddingClient, cosineSimilarity, rankBySimilarity, type EmbeddingClient, type EmbeddingTestConnectionResult } from "./embedding";

class MockEmbeddingClient implements EmbeddingClient {
  async embed(input: string): Promise<number[]> {
    return input === "query" ? [1, 0] : [0, 1];
  }

  async embedMany(input: string[]): Promise<number[][]> {
    return input.map((item) => (item.includes("match") ? [0.9, 0.1] : [0.1, 0.9]));
  }

  async testConnection(): Promise<EmbeddingTestConnectionResult> {
    try {
      const vector = await this.embed("connection test");
      return {
        success: true,
        message: `Connection successful. Returned vector of dimension ${vector.length}.`,
        latencyMs: 0,
      };
    } catch {
      return { success: false, message: "Failed to connect.", latencyMs: 0 };
    }
  }
}

class FailingEmbeddingClient implements EmbeddingClient {
  async embed(): Promise<number[]> {
    throw new Error("API key invalid");
  }

  async embedMany(): Promise<number[][]> {
    throw new Error("API key invalid");
  }

  async testConnection(): Promise<EmbeddingTestConnectionResult> {
    try {
      await this.embed("connection test");
      return { success: true, message: "ok", latencyMs: 0 };
    } catch (err) {
      return {
        success: false,
        message: "Failed to connect to embedding service.",
        latencyMs: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

describe("embedding utilities", () => {
  it("calculates cosine similarity and validates boundaries", () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBe(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(() => cosineSimilarity([], [])).toThrow("must not be empty");
    expect(() => cosineSimilarity([0, 0], [1, 0])).toThrow("zero vectors");
    expect(() => cosineSimilarity([1], [1, 0])).toThrow("same length");
  });

  it("ranks candidates by similarity and supports mock embedding clients", async () => {
    const client = new MockEmbeddingClient();
    const query = await client.embed("query");
    const candidates = await client.embedMany(["match policy", "other"]);

    expect(rankBySimilarity(query, [
      { embedding: candidates[0], item: "match policy" },
      { embedding: candidates[1], item: "other" },
    ], { topK: 1 })).toEqual([{ item: "match policy", score: expect.any(Number) }]);
  });

  it("testConnection returns success when embedding service is reachable", async () => {
    const client = new MockEmbeddingClient();
    const result = await client.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Connection successful");
    expect(result.latencyMs).toBeTypeOf("number");
  });

  it("testConnection returns failure with error details when service is unreachable", async () => {
    const client = new FailingEmbeddingClient();
    const result = await client.testConnection();

    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed to connect");
    expect(result.error).toBe("API key invalid");
  });

  it("AiSdkEmbeddingClient.testConnection catches errors gracefully", async () => {
    // Use an invalid config to trigger a connection failure
    const client = new AiSdkEmbeddingClient({
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "invalid-key-for-test",
      maxRetries: 0,
    });

    const result = await client.testConnection();
    // Should not throw, should return a structured failure result
    expect(result.success).toBe(false);
    expect(result.latencyMs).toBeTypeOf("number");
    expect(result.error).toBeDefined();
  });
});
