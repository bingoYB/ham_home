import { describe, expect, it, vi } from "vitest";
import { createAgent, type AgentEvent, type AgentTool, type ModelClient, type ModelGenerateRequest } from "../index";

class ToolCallingModelClient implements ModelClient {
  readonly requests: ModelGenerateRequest[] = [];
  readonly streamRequests: ModelGenerateRequest[] = [];

  async generate(request: ModelGenerateRequest) {
    this.requests.push(request);
    return this.respond(request);
  }

  async stream(request: ModelGenerateRequest) {
    this.streamRequests.push(request);
    return this.respond(request);
  }

  private async respond(request: ModelGenerateRequest) {
    request.emit?.({ type: "agent.iteration.started", iteration: 1 });

    if (request.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const tool = request.tools.find((item) => item.name === "getProduct");
    if (!tool) {
      return { text: "no tool", toolCalls: [] };
    }

    const hasToolResult = request.messages.some(m => m.role === "tool");
    if (hasToolResult) {
      const toolMsg = request.messages.find(m => m.role === "tool");
      let title = "Product";
      if (toolMsg && typeof toolMsg.content === "string") {
        try { title = JSON.parse(toolMsg.content).title; } catch(e) {}
      }
      return {
        text: `final: ${title}`,
        toolCalls: [],
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
      };
    }

    request.emit?.({ type: "tool.call.started", toolName: tool.name, input: {} });
    const output = await tool.execute({}, request.toolContext);
    request.emit?.({ type: "tool.call.completed", toolName: tool.name, input: {}, output });

    return {
      text: `calling tool...`,
      toolCalls: [{ toolName: tool.name, input: {}, output }],
      usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
    };
  }
}

describe("Agent", () => {
  it("runs a tool-call loop and records memory/events", async () => {
    const modelClient = new ToolCallingModelClient();
    const agent = createAgent({
      modelClient,
      systemPrompt: "You are a page assistant.",
      maxIterations: 3,
      tools: [
        {
          name: "getProduct",
          description: "Get current product",
          execute: () => ({ title: "Keyboard" }),
        },
      ],
    });
    const events: string[] = [];
    agent.on((event) => events.push(event.type));

    const result = await agent.run("summarize product");

    expect(result.text).toBe("final: Keyboard");
    expect(result.toolCalls).toHaveLength(1);
    expect(modelClient.requests[0].maxIterations).toBe(1);
    expect(events).toEqual(expect.arrayContaining(["tool.call.started", "tool.call.completed", "agent.completed"]));
    expect(await agent.exportMemory()).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "user", content: "summarize product" }),
      expect.objectContaining({ role: "assistant", content: "final: Keyboard" }),
    ]));
  });

  it("executes multiple tool calls from one model response", async () => {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);
        const toolMessages = request.messages.filter((message) => message.role === "tool");

        if (toolMessages.length > 0) {
          const outputs = toolMessages.map((message) => JSON.parse(message.content));
          return {
            text: `final: ${outputs[0].title} costs ${outputs[1].price}`,
            toolCalls: [],
          };
        }

        return {
          text: "calling tools...",
          toolCalls: [
            { toolCallId: "call_title", toolName: "getTitle", input: { id: "keyboard" } },
            { toolCallId: "call_price", toolName: "getPrice", input: { id: "keyboard" } },
          ],
        };
      },
    };
    const executedTools: string[] = [];
    const agent = createAgent({
      modelClient,
      maxIterations: 3,
      tools: [
        {
          name: "getTitle",
          description: "Get product title",
          execute: (input) => {
            executedTools.push(`getTitle:${(input as { id: string }).id}`);
            return { title: "Keyboard" };
          },
        },
        {
          name: "getPrice",
          description: "Get product price",
          execute: (input) => {
            executedTools.push(`getPrice:${(input as { id: string }).id}`);
            return { price: 99 };
          },
        },
      ],
    });

    const result = await agent.run("summarize product");
    const memory = await agent.exportMemory();

    expect(result.text).toBe("final: Keyboard costs 99");
    expect(result.toolCalls).toEqual([
      expect.objectContaining({ toolCallId: "call_title", toolName: "getTitle", output: { title: "Keyboard" } }),
      expect.objectContaining({ toolCallId: "call_price", toolName: "getPrice", output: { price: 99 } }),
    ]);
    expect(executedTools).toEqual(["getTitle:keyboard", "getPrice:keyboard"]);
    expect(requests).toHaveLength(2);
    expect(memory.filter((message) => message.role === "tool")).toEqual([
      expect.objectContaining({ metadata: expect.objectContaining({ toolCallId: "call_title", toolName: "getTitle" }) }),
      expect.objectContaining({ metadata: expect.objectContaining({ toolCallId: "call_price", toolName: "getPrice" }) }),
    ]);
  });

  it("propagates tool failures without crashing the test process", async () => {
    const failingTool: AgentTool = {
      name: "getProduct",
      description: "fails",
      execute: () => {
        throw new Error("boom");
      },
    };
    const agent = createAgent({ modelClient: new ToolCallingModelClient(), tools: [failingTool] });

    await expect(agent.run("use tool")).rejects.toThrow("boom");
  });

  it("supports AbortController in a browser-like environment", async () => {
    const controller = new AbortController();
    controller.abort();
    const agent = createAgent({ modelClient: new ToolCallingModelClient() });

    await expect(agent.run("cancel", { signal: controller.signal })).rejects.toThrow("Aborted");
  });

  it("returns lifecycle events from runStream", async () => {
    const modelClient = new ToolCallingModelClient();
    const agent = createAgent({
      modelClient,
      tools: [{ name: "getProduct", description: "Get current product", execute: () => ({ title: "Mouse" }) }],
    });

    const eventTypes: string[] = [];
    for await (const event of agent.runStream("summarize")) {
      eventTypes.push(event.type);
    }

    expect(eventTypes).toContain("agent.completed");
    expect(modelClient.requests).toHaveLength(0);
    expect(modelClient.streamRequests.length).toBeGreaterThan(0);
  });

  it("uses generate for run and stream for runStream", async () => {
    const calls: string[] = [];
    const modelClient: ModelClient = {
      async generate() {
        calls.push("generate");
        return { text: "generated", toolCalls: [] };
      },
      async stream(request) {
        calls.push("stream");
        request.emit?.({ type: "message.delta", delta: "streamed" });
        return { text: "streamed", toolCalls: [] };
      },
    };
    const agent = createAgent({ modelClient });

    const runResult = await agent.run("plain");
    const streamEvents: AgentEvent[] = [];
    for await (const event of agent.runStream("streaming")) {
      streamEvents.push(event);
    }

    expect(runResult.text).toBe("generated");
    expect(calls).toEqual(["generate", "stream"]);
    expect(streamEvents).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "message.delta", delta: "streamed" }),
      expect.objectContaining({ type: "agent.completed" }),
    ]));
  });

  it("creates, switches, and deletes sessions", async () => {
    const agent = createAgent({ modelClient: new ToolCallingModelClient() });
    const firstSessionId = agent.sessionId;

    const second = await agent.createSession({ title: "Second" });
    expect(agent.sessionId).toBe(second.id);

    await agent.run("second message");
    expect(await agent.exportMemory()).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "user", content: "second message" }),
    ]));

    await agent.switchSession(firstSessionId);
    expect(await agent.exportMemory()).toEqual([]);

    const sessions = await agent.listSessions();
    expect(sessions.map((session) => session.id)).toContain(second.id);

    await agent.deleteSession(second.id);
    expect((await agent.listSessions()).map((session) => session.id)).not.toContain(second.id);
  });

  it("exports render-ready entries and clears only the active session", async () => {
    const agent = createAgent({ modelClient: new ToolCallingModelClient() });
    const firstSessionId = agent.sessionId;
    await agent.run("first session");

    const second = await agent.createSession({ title: "Second" });
    await agent.run("second session");

    expect(await agent.exportMemoryEntries()).toEqual(expect.arrayContaining([
      expect.objectContaining({
        id: expect.any(String),
        sessionId: second.id,
        createdAt: expect.any(Number),
        message: expect.objectContaining({ role: "user", content: "second session" }),
      }),
    ]));

    await agent.clearMemory();
    expect(await agent.exportMemory()).toEqual([]);

    await agent.switchSession(firstSessionId);
    expect(await agent.exportMemory()).toEqual(expect.arrayContaining([
      expect.objectContaining({ role: "user", content: "first session" }),
    ]));
  });

  it("prints debug logs when debug is enabled", async () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const agent = createAgent({
      modelClient: new ToolCallingModelClient(),
      tools: [{ name: "getProduct", description: "Get current product", execute: () => ({ title: "Mouse" }) }],
      debug: true,
    });

    await agent.run("test debug log");

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[Agent.run] User initiated request:"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[Agent.run] Iteration started:"));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[Agent.run] Tool call started:"), expect.anything());
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[Agent.run] Tool call completed:"), expect.anything());
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining("[Agent.run] Request completed with text:"));

    consoleLogSpy.mockRestore();
  });
});
