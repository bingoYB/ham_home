import { describe, expect, it } from "vitest";
import { resolveLanguageModel } from "@hamhome/agent";
import type { AIProvider } from "@/types";
import { PROVIDER_DEFAULTS, resolveAgentProvider } from "../provider-config";
import { EXTENSION_AGENT_PROVIDERS } from "../sdk-providers";

const HAMHOME_PROVIDERS = Object.keys(PROVIDER_DEFAULTS) as AIProvider[];

describe("EXTENSION_AGENT_PROVIDERS", () => {
  it("registers every SDK provider that a HamHome provider maps to", () => {
    const registered = new Set(EXTENSION_AGENT_PROVIDERS.map((definition) => definition.name));

    for (const provider of HAMHOME_PROVIDERS) {
      expect(registered, `${provider} -> ${resolveAgentProvider(provider)}`).toContain(resolveAgentProvider(provider));
    }
  });

  it("does not bundle SDK providers that no HamHome provider maps to", () => {
    const used = new Set(HAMHOME_PROVIDERS.map(resolveAgentProvider));

    expect(EXTENSION_AGENT_PROVIDERS.map((definition) => definition.name).filter((name) => !used.has(name))).toEqual([]);
  });

  it("resolves a language model for every HamHome provider", async () => {
    for (const provider of HAMHOME_PROVIDERS) {
      await expect(
        resolveLanguageModel({
          providers: EXTENSION_AGENT_PROVIDERS,
          provider: resolveAgentProvider(provider),
          model: "test-model",
          apiKey: "test-key",
          baseUrl: "https://example.com/v1",
        }),
      ).resolves.toBeDefined();
    }
  });
});
