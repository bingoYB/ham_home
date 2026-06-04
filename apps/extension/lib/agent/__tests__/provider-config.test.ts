import { describe, expect, it } from "vitest";
import {
  getDefaultBaseUrl,
  getDefaultEmbeddingModel,
  getDefaultModel,
  getEmbeddingModelKey,
  isEmbeddingSupported,
  requiresApiKey,
  resolveAgentProvider,
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
        dimensions: 1536,
      }),
    ).toBe("openai:text-embedding-3-small:dim1536");
  });
});
