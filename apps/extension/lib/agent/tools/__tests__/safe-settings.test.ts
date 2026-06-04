import { describe, expect, it } from "vitest";
import { sanitizeSafeSettingsUpdate } from "../safe-settings";

describe("sanitizeSafeSettingsUpdate", () => {
  it("keeps allowlisted settings and rejects sensitive values", () => {
    const sanitized = sanitizeSafeSettingsUpdate({
      settings: {
        theme: "dark",
        language: "zh",
        autoSaveSnapshot: false,
        panelPosition: "right",
        shortcut: "Ctrl+X",
      },
      aiConfig: {
        provider: "ollama",
        model: "qwen2.5",
        enableTranslation: true,
        apiKey: "secret",
        baseUrl: "http://localhost:11434/v1",
      },
      embeddingConfig: {
        enabled: true,
        model: "bge-m3",
        batchSize: 32,
        apiKey: "secret",
      },
    });

    expect(sanitized.settings).toEqual({
      theme: "dark",
      language: "zh",
      autoSaveSnapshot: false,
      panelPosition: "right",
    });
    expect(sanitized.aiConfig).toMatchObject({
      provider: "ollama",
      model: "qwen2.5",
      enableTranslation: true,
    });
    expect(sanitized.embeddingConfig).toMatchObject({
      enabled: true,
      model: "bge-m3",
      batchSize: 32,
    });
    expect(sanitized.rejected.map((item) => item.key)).toEqual(
      expect.arrayContaining(["shortcut", "apiKey", "baseUrl"]),
    );
  });

  it("rejects invalid enum and numeric values", () => {
    const sanitized = sanitizeSafeSettingsUpdate({
      settings: { theme: "blue", panelPosition: "top" },
      aiConfig: { provider: "unknown", temperature: 3, maxTokens: -1 },
      embeddingConfig: { dimensions: 0, batchSize: 512 },
    });

    expect(sanitized.settings).toEqual({});
    expect(sanitized.aiConfig).toEqual({});
    expect(sanitized.embeddingConfig).toEqual({});
    expect(sanitized.rejected).toHaveLength(7);
  });
});
