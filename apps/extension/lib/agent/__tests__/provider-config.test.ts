import { describe, expect, it } from "vitest";
import type { EmbeddingConfig } from "@/types";
import {
  getDefaultBaseUrl,
  getDefaultEmbeddingModel,
  getDefaultModel,
  getEmbeddingDimensionSpec,
  getEmbeddingModelKey,
  isEmbeddingSupported,
  normalizeProviderBaseUrl,
  requiresApiKey,
  resolveAgentProvider,
  resolveEmbeddingDimensions,
  withValidEmbeddingDimensions,
} from "../provider-config";

describe("provider-config", () => {
  it("maps native providers to Browser Agent SDK providers", () => {
    expect(resolveAgentProvider("openai")).toBe("openai");
    expect(resolveAgentProvider("anthropic")).toBe("anthropic");
    expect(resolveAgentProvider("deepseek")).toBe("deepseek");
  });

  it("maps OpenAI-compatible providers without keeping old runtime coupling", () => {
    expect(resolveAgentProvider("moonshot")).toBe("openai-compatible");
    expect(resolveAgentProvider("siliconflow")).toBe("openai-compatible");
    expect(resolveAgentProvider("ollama")).toBe("openai-compatible");
    expect(resolveAgentProvider("custom")).toBe("openai-compatible");
  });

  it("exposes model, base url, api-key, and embedding defaults", () => {
    expect(getDefaultModel("openai")).toBe("gpt-4o-mini");
    expect(getDefaultBaseUrl("ollama")).toBe("http://localhost:11434/v1");
    expect(requiresApiKey("ollama")).toBe(false);
    expect(isEmbeddingSupported("zhipu")).toBe(true);
    expect(getDefaultEmbeddingModel("openai")).toBe("text-embedding-3-small");
    expect(
      getEmbeddingModelKey({
        provider: "openai",
        model: "text-embedding-3-small",
        dimensions: 512,
      }),
    ).toBe("openai:text-embedding-3-small:dim512");
  });

  it("normalizes base urls into the form the AI SDK providers expect", () => {
    expect(getDefaultBaseUrl("anthropic")).toBe("https://api.anthropic.com/v1");
    // Legacy configs stored the bare Anthropic host, which would hit /messages instead of /v1/messages.
    expect(normalizeProviderBaseUrl("anthropic", "https://api.anthropic.com")).toBe(
      "https://api.anthropic.com/v1",
    );
    expect(normalizeProviderBaseUrl("anthropic", "https://proxy.example.com/v1/")).toBe(
      "https://proxy.example.com/v1",
    );
    expect(normalizeProviderBaseUrl("openai", " https://api.openai.com/v1/ ")).toBe(
      "https://api.openai.com/v1",
    );
    expect(normalizeProviderBaseUrl("custom", "   ")).toBeUndefined();
  });

  it("knows which embedding models accept a custom vector size", () => {
    expect(getEmbeddingDimensionSpec("openai", "text-embedding-3-small")).toEqual({
      defaultDimensions: 1536,
      options: [1024, 768, 512, 256],
    });
    // Defaults to the provider's default model when the model is empty.
    expect(getEmbeddingDimensionSpec("google", "")).toMatchObject({ defaultDimensions: 768 });
    expect(getEmbeddingDimensionSpec("zhipu", "embedding-3")).toMatchObject({ defaultDimensions: 2048 });
    expect(getEmbeddingDimensionSpec("siliconflow", "Qwen/Qwen3-Embedding-8B")).toMatchObject({
      defaultDimensions: 4096,
    });
    expect(getEmbeddingDimensionSpec("custom", "openai/text-embedding-3-large")).toMatchObject({
      defaultDimensions: 3072,
    });

    expect(getEmbeddingDimensionSpec("openai", "text-embedding-ada-002")).toBeNull();
    expect(getEmbeddingDimensionSpec("siliconflow", "BAAI/bge-m3")).toBeNull();
    expect(getEmbeddingDimensionSpec("ollama", "nomic-embed-text")).toBeNull();
    // The SDK does not forward dimensions for Mistral, whatever the model.
    expect(getEmbeddingDimensionSpec("mistral", "text-embedding-3-small")).toBeNull();
    expect(getEmbeddingDimensionSpec("anthropic", "text-embedding-3-small")).toBeNull();
  });

  it("only uses sizes the model accepts", () => {
    const openai = { provider: "openai" as const, model: "text-embedding-3-small" };

    expect(resolveEmbeddingDimensions({ ...openai, dimensions: 512 })).toBe(512);
    expect(resolveEmbeddingDimensions({ ...openai, dimensions: 1536 })).toBeUndefined();
    expect(resolveEmbeddingDimensions({ ...openai, dimensions: 300 })).toBeUndefined();
    expect(
      resolveEmbeddingDimensions({ provider: "siliconflow", model: "BAAI/bge-m3", dimensions: 512 }),
    ).toBeUndefined();
    expect(getEmbeddingModelKey({ ...openai, dimensions: 1536 })).toBe("openai:text-embedding-3-small");
  });

  it("clears the vector size when switching to a model that cannot use it", () => {
    const current: EmbeddingConfig = {
      enabled: true,
      provider: "openai",
      model: "text-embedding-3-small",
      dimensions: 512,
      batchSize: 16,
    };

    expect(withValidEmbeddingDimensions(current, { model: "text-embedding-3-large" })).toStrictEqual({
      model: "text-embedding-3-large",
    });
    expect(withValidEmbeddingDimensions(current, { model: "text-embedding-ada-002" })).toStrictEqual({
      model: "text-embedding-ada-002",
      dimensions: undefined,
    });
  });
});
