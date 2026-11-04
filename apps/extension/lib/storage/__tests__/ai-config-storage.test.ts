import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  items: new Map<string, unknown>(),
  failKey: "",
}));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
vi.stubGlobal("storage", {
  defineItem: (key: string, { fallback }: { fallback: unknown }) => ({
    getValue: async () => clone(state.items.get(key) ?? fallback),
    setValue: async (value: unknown) => {
      if (state.failKey === key) {
        state.failKey = "";
        throw new Error("storage failed");
      }
      state.items.set(key, clone(value));
    },
    watch: () => () => undefined,
  }),
});

const { configStorage } = await import("../config-storage");

describe("AI provider connection persistence", () => {
  beforeEach(() => {
    state.items.clear();
    state.failKey = "";
  });

  it("preserves a legacy custom provider when switching away and back", async () => {
    state.items.set("sync:aiConfig", {
      provider: "custom",
      apiKey: "custom-key",
      baseUrl: "http://127.0.0.1:9999/v1",
      model: "custom-model",
      apiMode: "chat",
      smallModelMode: true,
      temperature: 0.1,
      enableTranslation: false,
      enableSmartCategory: true,
      enableTagSuggestion: true,
    });

    const openai = await configStorage.setAIConfig({ provider: "openai" });
    expect(openai).toMatchObject({
      provider: "openai", apiKey: "", baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini", smallModelMode: true, temperature: 0.1,
    });
    expect(openai.apiMode).toBeUndefined();
    expect(state.items.get("local:aiProviderConnections")).toMatchObject({
      custom: { apiKey: "custom-key", baseUrl: "http://127.0.0.1:9999/v1", model: "custom-model", apiMode: "chat" },
    });
    expect(state.items.get("sync:aiConfig")).not.toHaveProperty("aiProviderConnections");

    const restored = await configStorage.setAIConfig({ provider: "custom" });
    expect(restored).toMatchObject({
      provider: "custom", apiKey: "custom-key", baseUrl: "http://127.0.0.1:9999/v1",
      model: "custom-model", apiMode: "chat", smallModelMode: true,
    });
  });

  it("keeps provider credentials separate and preserves deliberately blank fields", async () => {
    await configStorage.setAIConfig({ apiKey: "openai-key", baseUrl: "", model: "my-openai" });
    await configStorage.setAIConfig({ provider: "custom", apiKey: "custom-key", baseUrl: "https://custom.test/v1", model: "custom-model" });
    expect(await configStorage.setAIConfig({ provider: "openai" })).toMatchObject({
      apiKey: "openai-key", baseUrl: "", model: "my-openai",
    });
    expect(await configStorage.setAIConfig({ provider: "ollama" })).toMatchObject({
      apiKey: "", baseUrl: "http://localhost:11434/v1", model: "llama3.2",
    });
    expect(await configStorage.setAIConfig({ provider: "custom" })).toMatchObject({
      apiKey: "custom-key", baseUrl: "https://custom.test/v1", model: "custom-model",
    });
  });

  it("serializes rapid field edits and a provider switch", async () => {
    await configStorage.setAIConfig({ provider: "custom" });
    await Promise.all([
      configStorage.setAIConfig({ apiKey: "key" }),
      configStorage.setAIConfig({ baseUrl: "https://custom.test/v1" }),
      configStorage.setAIConfig({ model: "typed-model" }),
      configStorage.setAIConfig({ provider: "ollama" }),
    ]);
    expect(await configStorage.setAIConfig({ provider: "custom" })).toMatchObject({
      apiKey: "key", baseUrl: "https://custom.test/v1", model: "typed-model",
    });
  });

  it("leaves the active configuration intact when saving a provider fails and allows retry", async () => {
    await configStorage.setAIConfig({ provider: "custom", baseUrl: "https://custom.test", model: "custom-model" });
    state.failKey = "local:aiProviderConnections";
    await expect(configStorage.setAIConfig({ provider: "openai" })).rejects.toThrow("storage failed");
    expect(await configStorage.getAIConfig()).toMatchObject({ provider: "custom", model: "custom-model" });
    expect(await configStorage.setAIConfig({ provider: "openai" })).toMatchObject({ provider: "openai" });
  });

  it("clears remembered connections when AI settings are reset", async () => {
    await configStorage.setAIConfig({ provider: "custom", baseUrl: "https://custom.test", model: "custom-model" });
    await configStorage.setAIConfig({ provider: "openai" });
    await configStorage.resetAIConfig();

    expect(state.items.get("local:aiProviderConnections")).toEqual({});
    expect(await configStorage.setAIConfig({ provider: "custom" })).toMatchObject({
      baseUrl: "", model: "gpt-4o-mini", apiKey: "",
    });
  });
});
