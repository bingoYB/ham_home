import { describe, expect, it, vi } from "vitest";
import { createAgent } from "../core/agent";
import { AiSdkModelClient } from "./model";
import { allProviders } from "./provider-definitions";

const schema = {
  type: "object" as const,
  properties: { value: { type: "string" as const } },
  required: ["value"],
  additionalProperties: false,
};

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: { message, type: "invalid_request_error" } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function completion(content: string): Response {
  return new Response(JSON.stringify({
    id: "test", object: "chat.completion", created: 0, model: "test-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  }), { headers: { "content-type": "application/json" } });
}

function streamCompletion(content: string): Response {
  const chunk = (delta: object, finishReason: string | null) => JSON.stringify({
    id: "test", object: "chat.completion.chunk", created: 0, model: "test-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  });
  return new Response(
    `data: ${chunk({ role: "assistant", content }, null)}\n\ndata: ${chunk({}, "stop")}\n\ndata: [DONE]\n\n`,
    { headers: { "content-type": "text/event-stream" } },
  );
}

function createCompatibleAgent(fetchMock: typeof fetch, providerOptions: Record<string, unknown> = {}) {
  return createAgent({
    provider: "openai-compatible", providers: allProviders, model: "test-model",
    baseUrl: "http://localhost:1234/v1", apiKey: "test-key",
    invocationMode: "chat", providerOptions: { ...providerOptions, fetch: fetchMock },
  });
}

async function runStructuredCommand(agent: ReturnType<typeof createAgent>) {
  return agent.commands.run({
    name: "structuredTest", prompt: "Return the value.", tools: [], maxIterations: 1,
    outputSchema: schema,
  }, {}, { systemPrompt: "Keep this instruction.", temperature: 0, invocationMode: "chat" });
}

describe("OpenAI-compatible structured output fallback", () => {
  it("retries an LM Studio response_format error with schema-guided text", async () => {
    const requests: Array<{ body: Record<string, any>; headers: Headers }> = [];
    const fetchMock: typeof fetch = vi.fn(async (_input, init) => {
      requests.push({ body: JSON.parse(String(init?.body)), headers: new Headers(init?.headers) });
      return requests.length === 1
        ? errorResponse("'response_format.type' must be 'json_schema' or 'text'")
        : completion('{"value":"ok"}');
    });

    const result = await runStructuredCommand(createCompatibleAgent(fetchMock));

    expect(result.output).toEqual({ value: "ok" });
    expect(requests).toHaveLength(2);
    expect(requests[0].body.response_format).toEqual({ type: "json_object" });
    expect(requests[1].body.response_format).toBeUndefined();
    expect(requests[1].body.model).toBe(requests[0].body.model);
    expect(requests[1].body.temperature).toBe(0);
    expect(requests[1].headers.get("authorization")).toBe("Bearer test-key");
    expect(requests[1].body.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "user", content: "Return the value." }),
      expect.objectContaining({ role: "system", content: expect.stringContaining("Keep this instruction.") }),
      expect.objectContaining({ role: "system", content: expect.stringContaining(JSON.stringify(schema)) }),
    ]));
  });

  it("retains structured-output validation after retrying", async () => {
    let attempts = 0;
    const fetchMock: typeof fetch = vi.fn(async () => ++attempts === 1
      ? errorResponse("Unsupported response_format")
      : completion('{}'));

    await expect(runStructuredCommand(createCompatibleAgent(fetchMock))).rejects.toThrow(/value.*required/i);
    expect(attempts).toBe(2);
  });

  it.each([
    [400, "The model was not found"],
    [401, "Not authorized to use response_format"],
  ])("does not retry unrelated HTTP %s errors", async (status, message) => {
    const fetchMock: typeof fetch = vi.fn(async () => errorResponse(message, status));

    await expect(runStructuredCommand(createCompatibleAgent(fetchMock))).rejects.toThrow(message);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry again if the text request fails", async () => {
    let attempts = 0;
    const fetchMock: typeof fetch = vi.fn(async () => errorResponse(
      ++attempts === 1 ? "Unsupported response_format" : "Text request rejected",
    ));

    await expect(runStructuredCommand(createCompatibleAgent(fetchMock))).rejects.toThrow("Text request rejected");
    expect(attempts).toBe(2);
  });

  it("does not retry a request after cancellation", async () => {
    const controller = new AbortController();
    const fetchMock: typeof fetch = vi.fn(async () => {
      controller.abort();
      return errorResponse("Unsupported response_format");
    });
    const agent = createCompatibleAgent(fetchMock);

    await expect(agent.commands.run({
      name: "cancelled", prompt: "Return the value.", tools: [], maxIterations: 1,
      outputSchema: schema,
    }, {}, { invocationMode: "chat", signal: controller.signal })).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not alter providers configured for native JSON Schema output", async () => {
    const requests: Record<string, any>[] = [];
    const fetchMock: typeof fetch = vi.fn(async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return errorResponse("Unsupported response_format");
    });

    await expect(runStructuredCommand(createCompatibleAgent(fetchMock, { supportsStructuredOutputs: true })))
      .rejects.toThrow("Unsupported response_format");
    expect(requests).toHaveLength(1);
    expect(requests[0].response_format.type).toBe("json_schema");
  });

  it("retries streaming requests before emitting the successful response", async () => {
    const requests: Record<string, any>[] = [];
    const fetchMock: typeof fetch = vi.fn(async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return requests.length === 1
        ? errorResponse("Unsupported response_format")
        : streamCompletion('{"value":"streamed"}');
    });
    const client = new AiSdkModelClient({
      provider: "openai-compatible", providers: allProviders, model: "test-model",
      baseUrl: "http://localhost:1234/v1", providerOptions: { fetch: fetchMock },
    });
    const emit = vi.fn();

    const result = await client.stream({
      messages: [{ role: "user", content: "Return the value." }], tools: [],
      maxIterations: 1, toolContext: {} as any, outputSchema: schema,
      invocationMode: "chat", emit,
    });

    expect(result.output).toEqual({ value: "streamed" });
    expect(requests).toHaveLength(2);
    expect(requests[0].response_format).toEqual({ type: "json_object" });
    expect(requests[1].response_format).toBeUndefined();
    expect(requests[1].messages[0]).toMatchObject({
      role: "system", content: expect.stringContaining(JSON.stringify(schema)),
    });
    expect(emit).toHaveBeenCalledWith({ type: "message.delta", delta: '{"value":"streamed"}' });
  });
});
