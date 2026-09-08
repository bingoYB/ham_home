import { describe, expect, it, vi } from "vitest";
import { createAgent } from "../core/agent";

describe("OpenAI strict structured-output payload", () => {
  it.each([
    ["chat", "/chat/completions"],
    ["response", "/responses"],
  ] as const)(
    "requires every testConnection property in %s mode",
    async (invocationMode, endpoint) => {
      const requests: Array<{ url: string; body: Record<string, any> }> = [];
      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        requests.push({
          url: String(input),
          body: JSON.parse(String(init?.body ?? "{}")),
        });

        return new Response(JSON.stringify({
          error: {
            message: "request captured",
            type: "invalid_request_error",
          },
        }), {
          status: 400,
          headers: { "content-type": "application/json" },
        });
      });
      const agent = createAgent({
        provider: "openai",
        model: "gpt-4.1-mini",
        apiKey: "test-key",
        providerOptions: { fetch: fetchMock },
      });

      await expect(agent.commands.run(
        "testConnection",
        {},
        { invocationMode, maxIterations: 1 },
      )).rejects.toThrow("request captured");

      expect(requests).toHaveLength(1);
      expect(requests[0].url).toContain(endpoint);

      const format = invocationMode === "chat"
        ? requests[0].body.response_format?.json_schema
        : requests[0].body.text?.format;

      expect(format).toMatchObject({
        ...(invocationMode === "response" ? { type: "json_schema" } : {}),
        strict: true,
        schema: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
          },
          required: ["success", "message"],
          additionalProperties: false,
        },
      });
    },
  );
});
