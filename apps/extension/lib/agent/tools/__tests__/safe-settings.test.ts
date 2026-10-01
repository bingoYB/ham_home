import { describe, expect, it } from "vitest";
import type { EmbeddingConfig } from "@/types";
import { constrainEmbeddingDimensions, sanitizeSafeSettingsUpdate } from "../safe-settings";

describe("sanitizeSafeSettingsUpdate", () => {
  it("keeps allowlisted settings and rejects sensitive values", () => {
    const sanitized = sanitizeSafeSettingsUpdate({
      settings: {
        theme: "dark",
        language: "zh",
        autoSaveSnapshot: false,
        autoSaveScreenshot: true,
        screenshotPrivatePagePolicy: "ask",
        bookmarkHealthSchedule: "weekly",
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
      autoSaveScreenshot: true,
      screenshotPrivatePagePolicy: "ask",
      bookmarkHealthSchedule: "weekly",
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
      aiConfig: { provider: "unknown", temperature: 3 },
      embeddingConfig: { dimensions: 0, batchSize: 512 },
    });

    expect(sanitized.settings).toEqual({});
    expect(sanitized.aiConfig).toEqual({});
    expect(sanitized.embeddingConfig).toEqual({});
    expect(sanitized.rejected).toHaveLength(6);
  });
});

describe("constrainEmbeddingDimensions", () => {
  const current: EmbeddingConfig = {
    enabled: true,
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 512,
    batchSize: 16,
  };

  function constrain(embeddingConfig: Record<string, unknown>) {
    return constrainEmbeddingDimensions(sanitizeSafeSettingsUpdate({ embeddingConfig }), current);
  }

  it("accepts sizes the model supports and treats the native size as a reset", () => {
    expect(constrain({ dimensions: 256 }).embeddingConfig).toStrictEqual({ dimensions: 256 });
    expect(constrain({ dimensions: 1536 }).embeddingConfig).toStrictEqual({ dimensions: undefined });
  });

  it("rejects unsupported sizes and keeps the current one", () => {
    const result = constrain({ dimensions: 300, batchSize: 32 });

    expect(result.embeddingConfig).toStrictEqual({ batchSize: 32 });
    expect(result.rejected).toEqual([
      {
        scope: "embeddingConfig",
        key: "dimensions",
        reason: "supported values: 1536, 1024, 768, 512, 256",
      },
    ]);
  });

  it("clears the size when the update switches to a fixed-size model", () => {
    const result = constrain({ provider: "siliconflow", model: "BAAI/bge-m3" });

    expect(result.embeddingConfig).toStrictEqual({
      provider: "siliconflow",
      model: "BAAI/bge-m3",
      dimensions: undefined,
    });
    expect(result.rejected).toEqual([]);
  });

  it("leaves updates without embedding changes untouched", () => {
    const update = sanitizeSafeSettingsUpdate({ settings: { theme: "dark" } });

    expect(constrainEmbeddingDimensions(update, current)).toBe(update);
  });
});
