import { describe, expect, it, vi } from "vitest";
import { allProviders, anthropicProvider, openaiProvider } from "./provider-definitions";
import { resolveEmbeddingModel, resolveLanguageModel } from "./providers";
import type { AiSdkProviderDefinition, AiSdkProviderName } from "../core/types";

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
        providers: allProviders,
        provider,
        model: "test-model",
        apiKey: "test-key",
        baseUrl: provider === "openai-compatible" ? "https://example.com/v1" : undefined,
      }),
    ).resolves.toBeDefined();
  });

  it.each(embeddingProviders)("resolves %s embedding models", async (provider) => {
    await expect(
      resolveEmbeddingModel({
        providers: allProviders,
        provider,
        model: "test-embedding-model",
        apiKey: "test-key",
        baseUrl: provider === "openai-compatible" ? "https://example.com/v1" : undefined,
      }),
    ).resolves.toBeDefined();
  });

  it("declares exactly the built-in providers and their model kinds", () => {
    expect(allProviders.map((definition) => definition.name)).toEqual(languageProviders);
    expect(allProviders.filter((definition) => definition.supports.embedding).map((definition) => definition.name)).toEqual(
      embeddingProviders,
    );
  });

  it("rejects providers that are not registered", async () => {
    await expect(resolveLanguageModel({ provider: "openai", model: "gpt-test" })).rejects.toThrow(
      'Provider "openai" is not registered. Import its definition from "@hamhome/agent/providers"',
    );
    await expect(
      resolveEmbeddingModel({ providers: [openaiProvider], provider: "google", model: "embedding-test" }),
    ).rejects.toThrow('Provider "google" is not registered');
    // Without a provider name the gateway is used, which must be registered too.
    await expect(resolveLanguageModel({ providers: [openaiProvider], model: "gpt-test" })).rejects.toThrow(
      'Provider "gateway" is not registered',
    );
  });

  it("does not need a registered provider for model instances", async () => {
    const model = { specificationVersion: "v3" } as never;

    await expect(resolveLanguageModel({ provider: "openai", model })).resolves.toBe(model);
    await expect(resolveEmbeddingModel({ provider: "openai", model })).resolves.toBe(model);
  });

  it("reports providers that do not expose embedding models", async () => {
    await expect(
      resolveEmbeddingModel({ providers: [anthropicProvider], provider: "anthropic", model: "embedding-test" }),
    ).rejects.toThrow("does not expose an AI SDK embedding model");
  });

  it("passes merged factory options to a custom provider definition", async () => {
    const languageModel = { modelId: "custom-model" };
    const create = vi.fn(() => ({ languageModel: () => languageModel }));
    const custom: AiSdkProviderDefinition = { name: "openai", supports: { language: true, embedding: false }, create };

    const resolved = await resolveLanguageModel({
      providers: [custom],
      provider: "openai",
      model: "custom-model",
      tokenProvider: async () => "token-from-provider",
      baseUrl: "https://proxy.example.com/v1",
      providerOptions: { headers: { "x-app": "hamhome" } },
    });

    expect(resolved).toBe(languageModel);
    expect(create).toHaveBeenCalledWith({
      headers: { "x-app": "hamhome" },
      apiKey: "token-from-provider",
      baseURL: "https://proxy.example.com/v1",
    });
  });

  it("validates OpenAI compatible base URL", async () => {
    await expect(
      resolveLanguageModel({ providers: allProviders, provider: "openai-compatible", model: "test-model" }),
    ).rejects.toThrow("requires baseUrl");
  });
});
