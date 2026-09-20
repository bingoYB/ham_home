import { beforeEach, describe, expect, it, vi } from "vitest";
import { AiSdkModelClient } from "./model";
import type { AgentMessage, ModelGenerateRequest } from "../core/types";

const aiMocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  jsonSchema: vi.fn((schema) => schema),
  Output: {
    object: vi.fn((config) => ({ type: "object-output", ...config })),
  },
  streamText: vi.fn(),
  tool: vi.fn((config) => config),
}));

vi.mock("ai", () => ({
  generateText: aiMocks.generateText,
  jsonSchema: aiMocks.jsonSchema,
  Output: aiMocks.Output,
  streamText: aiMocks.streamText,
  tool: aiMocks.tool,
}));

describe("AiSdkModelClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiMocks.generateText.mockResolvedValue({
      text: "done",
      toolCalls: [],
      totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    });
  });

  it("keeps plain user messages as string content", async () => {
    const client = new AiSdkModelClient({ model: {} as any });

    await client.generate({
      messages: [{ role: "user", content: "hello" }],
      tools: [],
      maxIterations: 1,
      toolContext: {} as any,
    } as ModelGenerateRequest);

    const [{ messages }] = aiMocks.generateText.mock.calls[0];
    expect(messages[0]).toEqual({ role: "user", content: "hello" });
  });

  it("converts user attachments to multimodal content parts", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    const messages: AgentMessage[] = [
      {
        role: "user",
        content: "describe this image",
        attachments: [
          { type: "image", image: "AAAA", mediaType: "image/png" },
          { type: "text", text: "alt: a cat" },
        ],
      },
    ];

    await client.generate({
      messages,
      tools: [],
      maxIterations: 1,
      toolContext: {} as any,
    } as ModelGenerateRequest);

    const [{ messages: modelMessages }] = aiMocks.generateText.mock.calls[0];
    expect(modelMessages[0]).toEqual({
      role: "user",
      content: [
        { type: "text", text: "describe this image" },
        { type: "image", image: "AAAA", mediaType: "image/png" },
        { type: "text", text: "alt: a cat" },
      ],
    });
  });

  it("splits data URLs so the SDK does not try to download them", async () => {
    const client = new AiSdkModelClient({ model: {} as any });

    await client.generate({
      messages: [
        {
          role: "user",
          content: "describe",
          attachments: [{ type: "image", image: "data:image/jpeg;base64,BBBB" }],
        },
      ],
      tools: [],
      maxIterations: 1,
      toolContext: {} as any,
    } as ModelGenerateRequest);

    const [{ messages: modelMessages }] = aiMocks.generateText.mock.calls[0];
    // data: URL 会被 AI SDK 当成待下载的远程资源并因协议不支持而报错
    expect(modelMessages[0].content[1]).toEqual({
      type: "image",
      image: "BBBB",
      mediaType: "image/jpeg",
    });
  });

  it("passes http image urls through untouched", async () => {
    const client = new AiSdkModelClient({ model: {} as any });

    await client.generate({
      messages: [
        {
          role: "user",
          content: "describe",
          attachments: [
            { type: "image", image: "https://example.com/a.png", mediaType: "image/png" },
          ],
        },
      ],
      tools: [],
      maxIterations: 1,
      toolContext: {} as any,
    } as ModelGenerateRequest);

    const [{ messages: modelMessages }] = aiMocks.generateText.mock.calls[0];
    expect(modelMessages[0].content[1]).toEqual({
      type: "image",
      image: "https://example.com/a.png",
      mediaType: "image/png",
    });
  });

  it("converts tool history to the AI SDK v6 ModelMessage schema", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    const messages: AgentMessage[] = [
      { role: "user", content: "计算下 5+12*999 ，同时查下洛杉矶的天气" },
      {
        role: "assistant",
        content: "",
        metadata: {
          toolCalls: [
            {
              toolCallId: "call_calculate",
              toolName: "calculate",
              input: { expression: "5+12*999" },
            },
          ],
        },
      },
      {
        role: "tool",
        content: JSON.stringify({ result: 11993, originalExpression: "5+12*999" }),
        metadata: {
          toolCallId: "call_calculate",
          toolName: "calculate",
        },
      },
      {
        role: "tool",
        content: "plain string result",
        metadata: {
          toolCallId: "call_weather",
          toolName: "weather",
        },
      },
    ];

    await client.generate(createRequest(messages));

    expect(aiMocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
      messages: [
        { role: "user", content: "计算下 5+12*999 ，同时查下洛杉矶的天气" },
        {
          role: "assistant",
          content: [
            {
              type: "tool-call",
              toolCallId: "call_calculate",
              toolName: "calculate",
              input: { expression: "5+12*999" },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_calculate",
              toolName: "calculate",
              output: {
                type: "json",
                value: { result: 11993, originalExpression: "5+12*999" },
              },
            },
          ],
        },
        {
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId: "call_weather",
              toolName: "weather",
              output: {
                type: "text",
                value: "plain string result",
              },
            },
          ],
        },
      ],
    }));
  });

  it("uses AI SDK output constraints instead of prompt instructions when outputSchema is provided", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    aiMocks.generateText.mockResolvedValue({
      text: '{"success":true}',
      output: { success: true },
      toolCalls: [],
      totalUsage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    });

    const request = createRequest([]);
    request.systemPrompt = "You are a helpful assistant.";
    request.outputSchema = {
      type: "object",
      properties: { success: { type: "boolean" } },
      required: ["success"],
      additionalProperties: false,
    };

    await client.generate(request);

    expect(aiMocks.generateText).toHaveBeenCalledWith(expect.objectContaining({
      system: "You are a helpful assistant.",
      output: {
        type: "object-output",
        schema: request.outputSchema,
      },
    }));
    expect(aiMocks.Output.object).toHaveBeenCalledWith({ schema: request.outputSchema });
  });

  it("rejects invalid strict output schemas before calling the provider", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    const request = createRequest([]);
    request.outputSchema = {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
      },
      required: ["success"],
      additionalProperties: false,
    };

    await expect(client.generate(request)).rejects.toThrow("Missing: message");
    expect(aiMocks.generateText).not.toHaveBeenCalled();
  });

  it("appends tool instructions without failing if schema generation is empty", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    const request = createRequest([]);
    request.tools = [
      { name: "test_tool", description: "A test tool" }
    ];

    await client.generate(request);

    expect(aiMocks.tool).toHaveBeenCalledWith({
      description: "A test tool",
      inputSchema: { type: "object", properties: {}, additionalProperties: true },
    });
  });

  it("falls back to stream processing when catching a specific stream format error", async () => {
    const client = new AiSdkModelClient({ model: {} as any });

    // Simulate error thrown during generateText which matches the stream fallback criteria
    const streamError = new Error("Mock Stream Error") as any;
    streamError.statusCode = 200;
    streamError.responseBody = "data: {\"mock\":\"data\"}";
    aiMocks.generateText.mockRejectedValue(streamError);

    const asyncIterable = {
      [Symbol.asyncIterator]: async function* () {
        yield "part 1 ";
        yield "part 2";
      }
    };

    aiMocks.streamText.mockReturnValue({
      textStream: asyncIterable,
      text: Promise.resolve("part 1 part 2"),
      toolCalls: Promise.resolve([{ toolCallId: "1", toolName: "toolA", args: { a: 1 } }]),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 5, totalTokens: 15 }),
    });

    const emitFn = vi.fn();
    const request = createRequest([]);
    request.emit = emitFn;
    request.outputSchema = {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    };

    const result = await client.generate(request);

    expect(aiMocks.streamText).toHaveBeenCalled();
    expect(emitFn).toHaveBeenCalledWith({ type: "message.delta", delta: "part 1 " });
    expect(emitFn).toHaveBeenCalledWith({ type: "message.delta", delta: "part 2" });

    expect(result.text).toBe("part 1 part 2");
    expect(result.toolCalls).toEqual([
      { toolCallId: "1", toolName: "toolA", input: { a: 1 } }
    ]);
  });

  it("rethrows error in generate if it doesn't match stream error criteria", async () => {
    const client = new AiSdkModelClient({ model: {} as any });
    aiMocks.generateText.mockRejectedValue(new Error("Normal Error"));

    await expect(client.generate(createRequest([]))).rejects.toThrow("Normal Error");
  });
});

function createRequest(messages: AgentMessage[]): ModelGenerateRequest {
  return {
    model: {} as any,
    messages,
    tools: [],
    maxIterations: 1,
    toolContext: { agentId: "agent_test", sessionId: "session_test" },
  };
}
