import { describe, expect, it } from "vitest";
import { resolveEmbeddingModel, resolveLanguageModel } from "./providers";
import type { AiSdkProviderName } from "../core/types";

const languageProviders: AiSdkProviderName[] = [
  "gateway",
  "vercel",
  "openai",
  "openai-compatible",
  "anthropic",
  "google",
  "xai",
  "azure",
  "amazon-bedrock",
  "groq",
  "deepinfra",
  "mistral",
  "togetherai",
  "cohere",
  "fireworks",
  "deepseek",
  "cerebras",
  "perplexity",
];

const embeddingProviders: AiSdkProviderName[] = [
  "gateway",
  "openai",
  "openai-compatible",
  "google",
  "azure",
  "amazon-bedrock",
  "deepinfra",
  "mistral",
  "togetherai",
  "cohere",
  "fireworks",
];

describe("AI SDK provider resolvers", () => {
  it.each(languageProviders)("resolves %s language models", async (provider) => {
    await expect(
      resolveLanguageModel({
        provider,
        model: "test-model",
        apiKey: "test-key",
        baseUrl: provider === "openai-compatible" ? "https://example.com/v1" : undefined,
        providerOptions: providerOptionsFor(provider),
      }),
    ).resolves.toBeDefined();
  });

  it.each(embeddingProviders)("resolves %s embedding models", async (provider) => {
    await expect(
      resolveEmbeddingModel({
        provider,
        model: "test-embedding-model",
        apiKey: "test-key",
        baseUrl: provider === "openai-compatible" ? "https://example.com/v1" : undefined,
        providerOptions: providerOptionsFor(provider),
      }),
    ).resolves.toBeDefined();
  });

  it("reports providers that do not expose language or embedding models", async () => {
    await expect(resolveLanguageModel({ provider: "fal", model: "fal-ai/test" })).rejects.toThrow(
      "does not expose an AI SDK language model",
    );
    await expect(resolveEmbeddingModel({ provider: "anthropic", model: "embedding-test" })).rejects.toThrow(
      "does not expose an AI SDK embedding model",
    );
  });

  it("validates OpenAI compatible base URL", async () => {
    await expect(resolveLanguageModel({ provider: "openai-compatible", model: "test-model" })).rejects.toThrow(
      "requires baseUrl",
    );
  });
});

function providerOptionsFor(provider: AiSdkProviderName): Record<string, unknown> | undefined {
  return undefined;
}
