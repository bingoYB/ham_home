import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCacheKey,
  clearAllCachedApiModes,
  clearCachedApiMode,
  getCachedApiMode,
  registerApiModePersistence,
  setCachedApiMode,
  type ApiModePersistence,
} from "../src/agent/api-mode-cache";

describe("ApiModeCache", () => {
  beforeEach(() => {
    clearAllCachedApiModes();
  });

  it("should return undefined when cache is empty", async () => {
    const mode = await getCachedApiMode("openai");
    expect(mode).toBeUndefined();
  });

  it("should store and retrieve cached mode", async () => {
    await setCachedApiMode("openai", undefined, "responses");
    const mode = await getCachedApiMode("openai");
    expect(mode).toBe("responses");
  });

  it("should build unique keys per provider+baseURL", () => {
    const key1 = buildCacheKey("openai", "https://api.openai.com/v1");
    const key2 = buildCacheKey("openai", "https://my-proxy.com/v1");
    const key3 = buildCacheKey("openai");

    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
    expect(key1).toBe("openai::https://api.openai.com/v1");
  });

  it("should normalize trailing slashes in baseURL", () => {
    const key1 = buildCacheKey("openai", "https://api.openai.com/v1/");
    const key2 = buildCacheKey("openai", "https://api.openai.com/v1");
    expect(key1).toBe(key2);
  });

  it("should clear specific cache entry", async () => {
    await setCachedApiMode("openai", "https://a.com", "chat");
    await setCachedApiMode("openai", "https://b.com", "responses");

    await clearCachedApiMode("openai", "https://a.com");

    expect(await getCachedApiMode("openai", "https://a.com")).toBeUndefined();
    expect(await getCachedApiMode("openai", "https://b.com")).toBe("responses");
  });

  it("should clear all cache entries", async () => {
    await setCachedApiMode("openai", undefined, "chat");
    await setCachedApiMode("openai", "https://proxy.com", "responses");

    clearAllCachedApiModes();

    expect(await getCachedApiMode("openai")).toBeUndefined();
    expect(await getCachedApiMode("openai", "https://proxy.com")).toBeUndefined();
  });

  it("should load from persistence adapter on first get", async () => {
    const stored: Record<string, any> = {
      "openai::https://api.openai.com/v1": {
        mode: "responses",
        verifiedAt: Date.now(),
      },
    };

    const persistence: ApiModePersistence = {
      load: vi.fn().mockResolvedValue(stored),
      save: vi.fn().mockResolvedValue(undefined),
    };

    registerApiModePersistence(persistence);

    const mode = await getCachedApiMode("openai", "https://api.openai.com/v1");
    expect(mode).toBe("responses");
    expect(persistence.load).toHaveBeenCalledOnce();
  });

  it("should save to persistence adapter on set", async () => {
    const persistence: ApiModePersistence = {
      load: vi.fn().mockResolvedValue({}),
      save: vi.fn().mockResolvedValue(undefined),
    };

    registerApiModePersistence(persistence);
    // Trigger load first
    await getCachedApiMode("openai");

    await setCachedApiMode("openai", undefined, "chat");
    expect(persistence.save).toHaveBeenCalled();
  });

  it("should not crash when persistence fails", async () => {
    const persistence: ApiModePersistence = {
      load: vi.fn().mockRejectedValue(new Error("storage error")),
      save: vi.fn().mockRejectedValue(new Error("write error")),
    };

    registerApiModePersistence(persistence);

    // Should not throw
    const mode = await getCachedApiMode("openai");
    expect(mode).toBeUndefined();

    await setCachedApiMode("openai", undefined, "responses");
    expect(await getCachedApiMode("openai")).toBe("responses");
  });

  it("should ignore expired entries from persistence", async () => {
    const expired: Record<string, any> = {
      "openai::default": {
        mode: "responses",
        verifiedAt: Date.now() - 8 * 24 * 60 * 60 * 1000, // 8 days ago
      },
    };

    const persistence: ApiModePersistence = {
      load: vi.fn().mockResolvedValue(expired),
      save: vi.fn().mockResolvedValue(undefined),
    };

    registerApiModePersistence(persistence);

    const mode = await getCachedApiMode("openai");
    expect(mode).toBeUndefined();
  });

  it("should expire memory cache entries", async () => {
    await setCachedApiMode("openai", undefined, "chat");

    // Mock time advancement
    const originalNow = Date.now;
    Date.now = () => originalNow() + 8 * 24 * 60 * 60 * 1000;

    try {
      const mode = await getCachedApiMode("openai");
      expect(mode).toBeUndefined();
    } finally {
      Date.now = originalNow;
    }
  });
});
