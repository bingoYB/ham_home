import { describe, expect, it, vi } from "vitest";
import { allProviders } from "./provider-definitions";
import { AiSdkEmbeddingClient, supportsEmbeddingDimensions } from "./embedding";
import type { EmbeddingClientConfig } from "../core/types";

type CapturedRequest = { url: string; body: Record<string, any> };

function createFetchMock(responseBody: unknown) {
  const requests: CapturedRequest[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url: String(input), body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  return { requests, fetchMock };
}

const openAiEmbeddingResponse = {
  data: [{ embedding: [0.1, 0.2, 0.3], index: 0 }],
  usage: { prompt_tokens: 1, total_tokens: 1 },
};

describe("AiSdkEmbeddingClient request payload", () => {
  it.each([
    ["openai", "https://api.openai.com/v1"],
    ["openai-compatible", "https://embedding.example.com/v1"],
  ] as const)("forwards dimensions to %s embedding requests", async (provider, baseUrl) => {
    const { requests, fetchMock } = createFetchMock(openAiEmbeddingResponse);
    const client = new AiSdkEmbeddingClient({
      provider,
      providers: allProviders,
      baseUrl,
      model: "text-embedding-3-small",
      apiKey: "test-key",
      dimensions: 3,
      providerOptions: { fetch: fetchMock },
    });

    await client.embed("hello");
    await client.embedMany(["a", "b"]);

    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.body.dimensions === 3)).toBe(true);
  });

  it("maps dimensions to outputDimensionality for google", async () => {
    const { requests, fetchMock } = createFetchMock({ embedding: { values: [0.1, 0.2] } });
    const client = new AiSdkEmbeddingClient({
      provider: "google",
      providers: allProviders,
      model: "text-embedding-004",
      apiKey: "test-key",
      dimensions: 2,
      providerOptions: { fetch: fetchMock },
    });

    await client.embed("hello");

    expect(requests[0].body.outputDimensionality).toBe(2);
  });

  it("reports which providers forward dimensions", () => {
    for (const provider of ["openai", "azure", "openai-compatible", "google"] as const) {
      expect(supportsEmbeddingDimensions(provider)).toBe(true);
    }
    expect(supportsEmbeddingDimensions("mistral")).toBe(false);
    expect(supportsEmbeddingDimensions(undefined)).toBe(false);
  });

  it("omits dimensions when not configured and reports vector size on testConnection", async () => {
    const { requests, fetchMock } = createFetchMock(openAiEmbeddingResponse);
    const config: EmbeddingClientConfig = {
      provider: "openai",
      providers: allProviders,
      model: "text-embedding-3-small",
      apiKey: "test-key",
      providerOptions: { fetch: fetchMock },
    };

    const result = await new AiSdkEmbeddingClient(config).testConnection();

    expect(result).toMatchObject({ success: true, dimensions: 3 });
    expect(requests[0].body).not.toHaveProperty("dimensions");
  });
});
