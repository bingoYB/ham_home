import { describe, expect, it } from "vitest";
import { createEmbeddingClient, cosineSimilarity } from "../index";


// Only run this test if an EMBEDDING_API_KEY is provided
const shouldRun = !!process.env.EMBEDDING_API_KEY;

describe.runIf(shouldRun)("Embedding Integration (Real API)", () => {
  it("can generate embeddings and calculate similarity", async () => {
    const client = createEmbeddingClient({
      provider: "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      apiKey: process.env.EMBEDDING_API_KEY,
      baseUrl: process.env.EMBEDDING_BASE_URL,
    });

    const vector1 = await client.embed("apple");
    const vector2 = await client.embed("orange");
    const vector3 = await client.embed("car");

    expect(vector1.length).toBeGreaterThan(0);
    expect(vector2.length).toBeGreaterThan(0);
    expect(vector3.length).toBeGreaterThan(0);

    const sim12 = cosineSimilarity(vector1, vector2);
    const sim13 = cosineSimilarity(vector1, vector3);

    expect(sim12).toBeGreaterThan(sim13);
  }, 60000);

  it("testConnection verifies embedding service connectivity", async () => {
    const client = createEmbeddingClient({
      provider: "openai",
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
      apiKey: process.env.EMBEDDING_API_KEY,
      baseUrl: process.env.EMBEDDING_BASE_URL,
    });

    const result = await client.testConnection();

    expect(result.success).toBe(true);
    expect(result.message).toContain("Connection successful");
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  }, 60000);
});
