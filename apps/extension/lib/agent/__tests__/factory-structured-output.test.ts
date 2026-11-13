import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    provider: "ollama",
    baseUrl: "http://localhost:11434/v1",
    model: "test-model",
    apiKey: "",
    temperature: 0,
    smallModelMode: false,
    enableTranslation: false,
    enableSmartCategory: true,
    enableTagSuggestion: true,
  },
}));

vi.mock("@/lib/storage", () => ({
  configStorage: {
    getAIConfig: vi.fn(async () => mocks.config),
    getSettings: vi.fn(async () => ({ language: "zh" })),
  },
}));

const schema = {
  type: "object" as const,
  properties: { value: { type: "string" as const } },
  required: ["value"],
  additionalProperties: false,
};

async function captureRequest(structured: boolean): Promise<Record<string, unknown>> {
  let requestBody: Record<string, unknown> | undefined;
  const fetchMock: typeof fetch = async (_url, options) => {
    requestBody = JSON.parse(String(options?.body));
    return new Response(JSON.stringify({
      id: "test",
      object: "chat.completion",
      created: 0,
      model: "test-model",
      choices: [{
        index: 0,
        message: { role: "assistant", content: structured ? '{"value":"ok"}' : "ok" },
        finish_reason: "stop",
      }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }), { headers: { "content-type": "application/json" } });
  };

  const { createExtensionAgent } = await import("../factory");
  const { agent } = await createExtensionAgent({ providerOptions: { fetch: fetchMock } });
  await agent.commands.run({
    name: "testOutput",
    prompt: "Respond with a value.",
    tools: [],
    maxIterations: 1,
    ...(structured ? { outputSchema: schema } : {}),
  }, {});
  if (!requestBody) throw new Error("No request was sent");
  return requestBody;
}

describe("extension provider output settings", () => {
  beforeEach(() => {
    mocks.config.provider = "ollama";
    mocks.config.baseUrl = "http://localhost:11434/v1";
    mocks.config.apiKey = "";
    mocks.config.smallModelMode = false;
  });

  it("sends the JSON schema to Ollama in normal mode", async () => {
    const request = await captureRequest(true);
    expect(request.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { schema },
    });
  });

  it("leaves plain text unconstrained in small model mode", async () => {
    mocks.config.smallModelMode = true;
    const request = await captureRequest(false);
    expect(request.response_format).toBeUndefined();
  });

  it("keeps schema support for unrelated structured commands in small model mode", async () => {
    mocks.config.smallModelMode = true;
    const request = await captureRequest(true);
    expect(request.response_format).toMatchObject({ type: "json_schema" });
  });

  it("does not enable Ollama-specific schema support for other compatible providers", async () => {
    mocks.config.provider = "custom";
    mocks.config.apiKey = "test-key";
    const request = await captureRequest(true);
    expect(request.response_format).toEqual({ type: "json_object" });
  });

  it("tests a custom endpoint with a plain-text request", async () => {
    mocks.config.provider = "custom";
    mocks.config.baseUrl = "http://localhost:1234/v1";
    mocks.config.apiKey = "test-key";
    const requests: Record<string, unknown>[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_url, options) => {
      requests.push(JSON.parse(String(options?.body)));
      return new Response(JSON.stringify({
        id: "test", object: "chat.completion", created: 0, model: "test-model",
        choices: [{ index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }), { headers: { "content-type": "application/json" } });
    }));

    try {
      const { agentConfigService } = await import("../services/agent-config-service");
      await expect(agentConfigService.testConnection()).resolves.toEqual({
        success: true, message: "连接成功",
      });
      expect(requests).toHaveLength(1);
      expect(requests[0].response_format).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
