import { describe, expect, it, vi } from "vitest";
import { createAgent, InMemory, type AgentEvent, type AgentTool, type ModelClient, type ModelGenerateRequest, type SecurityPolicy } from "../index";

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
    const modelClient = new ToolCallingModelClient();
    const agent = createAgent({ modelClient });

    await expect(agent.run("cancel", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    // An already-aborted run stops before spending a model call.
    expect(modelClient.requests).toHaveLength(0);
  });

  it("accumulates AI SDK v6 usage across every model step", async () => {
    const agent = createAgent({
      modelClient: new ToolCallingModelClient(),
      tools: [{ name: "getProduct", description: "Get current product", execute: () => ({ title: "Mouse" }) }],
    });

    const result = await agent.run("summarize");

    // Two model steps, each reporting 1 input + 1 output token.
    expect(result.usage).toEqual({ inputTokens: 2, outputTokens: 2, totalTokens: 4 });
  });

  it("skips the base system prompt when ignoreBaseSystemPrompt is set", async () => {
    const modelClient = new ToolCallingModelClient();
    const agent = createAgent({ modelClient, systemPrompt: "Base prompt." });

    await agent.runCommand("plain", { systemPrompt: "Only this.", ignoreBaseSystemPrompt: true });
    await agent.runCommand("plain", { systemPrompt: "Run prompt." });

    expect(modelClient.requests[0].systemPrompt).toBe("Only this.");
    expect(modelClient.requests[1].systemPrompt).toBe("Base prompt.\n\nRun prompt.");
  });

  it("keeps tool input and output when an interceptor returns nothing", async () => {
    const execute = vi.fn((input: unknown) => ({ echoed: input }));
    const beforeExecute = vi.fn(() => undefined);
    const afterExecute = vi.fn(() => undefined);
    const modelClient: ModelClient = {
      async generate(request) {
        if (request.messages.some((message) => message.role === "tool")) {
          return { text: "done", toolCalls: [] };
        }
        return { text: "", toolCalls: [{ toolCallId: "call_1", toolName: "echo", input: { id: "a" } }] };
      },
    };
    const agent = createAgent({
      modelClient,
      interceptors: [{ beforeExecute, afterExecute }],
      tools: [{ name: "echo", description: "Echo input", execute }],
    });

    const result = await agent.run("echo a");

    expect(beforeExecute).toHaveBeenCalledWith("echo", { id: "a" }, expect.objectContaining({ toolCallId: "call_1" }));
    expect(execute).toHaveBeenCalledWith({ id: "a" }, expect.anything());
    expect(result.toolCalls[0].output).toEqual({ echoed: { id: "a" } });
  });

  it("asks for a final answer without executing tools once maxIterations is exhausted", async () => {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);
        if (request.systemPrompt?.includes("tool-call limit")) {
          // Models may still emit tool calls here; they must be ignored.
          return {
            text: "Final answer from gathered results.",
            toolCalls: [{ toolCallId: "ignored", toolName: "search", input: {} }],
            usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
          };
        }
        return {
          text: "",
          toolCalls: [{ toolCallId: `call_${requests.length}`, toolName: "search", input: {} }],
          usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        };
      },
    };
    const search = vi.fn(() => ({ hits: 1 }));
    const agent = createAgent({
      modelClient,
      systemPrompt: "Base prompt.",
      maxIterations: 2,
      tools: [{ name: "search", description: "Search", execute: search }],
    });
    const iterations: number[] = [];
    agent.on((event) => {
      if (event.type === "agent.iteration.started") iterations.push(event.iteration);
    });

    const result = await agent.run("find things");
    const memory = await agent.exportMemory();

    expect(requests).toHaveLength(3);
    expect(requests[2].systemPrompt).toMatch(/^Base prompt\.\n\n.*tool-call limit/s);
    expect(iterations).toEqual([1, 2, 3]);
    expect(search).toHaveBeenCalledTimes(2);
    expect(result.text).toBe("Final answer from gathered results.");
    expect(result.toolCalls.map((call) => call.toolCallId)).toEqual(["call_1", "call_2"]);
    expect(result.usage).toEqual({ inputTokens: 3, outputTokens: 3, totalTokens: 6 });
    expect(result.rawMessage).toEqual({ role: "assistant", content: "Final answer from gathered results." });
    // Every stored tool call has a stored result, and the ignored call is not stored.
    const storedCallIds = memory.flatMap((message) =>
      ((message.metadata?.toolCalls as Array<{ toolCallId: string }> | undefined) ?? []).map((call) => call.toolCallId),
    );
    const storedResultIds = memory.filter((message) => message.role === "tool").map((message) => message.metadata?.toolCallId);
    expect(storedCallIds).toEqual(["call_1", "call_2"]);
    expect(storedResultIds).toEqual(["call_1", "call_2"]);
    expect(memory.at(-1)).toMatchObject({ role: "assistant", content: "Final answer from gathered results." });
  });

  it("stores tool calls without the outputs recorded after execution", async () => {
    const modelClient: ModelClient = {
      async generate(request) {
        if (request.messages.some((message) => message.role === "tool")) {
          return { text: "done", toolCalls: [] };
        }
        return { text: "", toolCalls: [{ toolCallId: "call_1", toolName: "lookup", input: { q: "a" } }] };
      },
    };
    const agent = createAgent({ modelClient, tools: [{ name: "lookup", description: "Lookup", execute: () => ({ big: "result" }) }] });

    const result = await agent.run("look it up");
    const [, assistant] = await agent.exportMemory();

    expect(result.toolCalls[0].output).toEqual({ big: "result" });
    expect(assistant.metadata?.toolCalls).toEqual([{ toolCallId: "call_1", toolName: "lookup", input: { q: "a" } }]);
  });

  it("does not add a final step when the model answers within maxIterations", async () => {
    const modelClient = new ToolCallingModelClient();
    const agent = createAgent({
      modelClient,
      maxIterations: 2,
      tools: [{ name: "getProduct", description: "Get current product", execute: () => ({ title: "Mouse" }) }],
    });

    const result = await agent.run("summarize");

    expect(modelClient.requests).toHaveLength(2);
    expect(result.text).toBe("final: Mouse");
  });

  it("stamps run events with the run id and tool events with the tool call id", async () => {
    const modelClient: ModelClient = {
      async generate(request) {
        if (request.messages.some((message) => message.role === "tool")) {
          return { text: "done", toolCalls: [] };
        }
        return { text: "", toolCalls: [{ toolCallId: "call_1", toolName: "lookup", input: {} }] };
      },
    };
    const lookup = vi.fn((_input: unknown, context: { runId?: string }) => ({ runId: context.runId }));
    const agent = createAgent({ modelClient, tools: [{ name: "lookup", description: "Lookup", execute: lookup }] });
    const events: AgentEvent[] = [];
    agent.on((event) => events.push(event));

    const result = await agent.run("look it up", { runId: "turn-1" });
    agent.tools.register({ name: "later", description: "Registered outside a run", execute: () => null });

    const runEvents = events.filter((event) => event.type !== "tool.registered");
    expect(result.runId).toBe("turn-1");
    expect(runEvents.length).toBeGreaterThan(0);
    expect(runEvents.every((event) => event.runId === "turn-1")).toBe(true);
    expect(events.filter((event) => event.type.startsWith("tool.call."))).toEqual([
      expect.objectContaining({ type: "tool.call.started", toolCallId: "call_1" }),
      expect.objectContaining({ type: "tool.call.completed", toolCallId: "call_1", output: { runId: "turn-1" } }),
    ]);
    expect(events.find((event) => event.type === "tool.registered")?.runId).toBeUndefined();
  });

  it("generates a distinct run id per run when none is given", async () => {
    const agent = createAgent({ modelClient: new ToolCallingModelClient() });

    const first = await agent.run("one");
    const second = await agent.run("two");

    expect(first.runId).toMatch(/^run_/);
    expect(second.runId).not.toBe(first.runId);
  });

  it("stamps Skill events emitted while matching with the run id", async () => {
    const agent = createAgent({
      modelClient: new ToolCallingModelClient(),
      skills: [{ id: "help", name: "Help", description: "Global help." }],
    });
    const events: AgentEvent[] = [];
    agent.on((event) => events.push(event));

    const result = await agent.run("help me");

    expect(events.filter((event) => event.type.startsWith("skill."))).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "skill.matched", runId: result.runId }),
        expect.objectContaining({ type: "skill.mounted", skillId: "help", runId: result.runId }),
        expect.objectContaining({ type: "skill.reconciled", runId: result.runId }),
      ]),
    );
  });

  it("keeps concurrent runStream calls on one agent apart", async () => {
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));
    const modelClient: ModelClient = {
      async generate() {
        throw new Error("runStream must use stream()");
      },
      async stream(request) {
        await tick();
        request.emit?.({ type: "message.delta", delta: `delta:${request.toolContext.runId}` });
        await tick();
        return { text: `answer:${request.toolContext.runId}`, toolCalls: [] };
      },
    };
    const agent = createAgent({ modelClient });
    const collect = async (runId: string) => {
      const events: AgentEvent[] = [];
      for await (const event of agent.runStream("hi", { runId })) {
        events.push(event);
      }
      return events;
    };

    const [first, second] = await Promise.all([collect("run-a"), collect("run-b")]);

    for (const [events, runId] of [[first, "run-a"], [second, "run-b"]] as const) {
      expect(events.every((event) => event.runId === runId)).toBe(true);
      expect(events).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: "message.delta", delta: `delta:${runId}` }),
        expect.objectContaining({ type: "agent.completed", result: expect.objectContaining({ runId, text: `answer:${runId}` }) }),
      ]));
    }
  });

  it("aborts the run when the runStream consumer stops early", async () => {
    const signals: AbortSignal[] = [];
    const lookup = vi.fn(() => ({ ok: true }));
    const modelClient: ModelClient = {
      async generate() {
        throw new Error("runStream must use stream()");
      },
      async stream(request) {
        signals.push(request.signal!);
        await new Promise((resolve) => setTimeout(resolve, 0));
        if (request.signal?.aborted) {
          throw request.signal.reason;
        }
        return { text: "", toolCalls: [{ toolCallId: "call_1", toolName: "lookup", input: {} }] };
      },
    };
    const agent = createAgent({ modelClient, tools: [{ name: "lookup", description: "Lookup", execute: lookup }] });
    const events: AgentEvent[] = [];
    agent.on((event) => events.push(event));

    for await (const event of agent.runStream("look it up")) {
      if (event.type === "agent.iteration.started") break;
    }

    await vi.waitFor(() => expect(events.some((event) => event.type === "agent.failed")).toBe(true));
    expect(signals[0].aborted).toBe(true);
    expect(events.find((event) => event.type === "agent.failed")).toMatchObject({ error: { name: "AbortError" } });
    expect(lookup).not.toHaveBeenCalled();
  });

  it("does not retry in chat mode when an auto-mode call is aborted", async () => {
    const controller = new AbortController();
    const modes: Array<string | undefined> = [];
    const modelClient: ModelClient = {
      async generate(request) {
        modes.push(request.invocationMode);
        controller.abort();
        throw controller.signal.reason;
      },
    };
    const agent = createAgent({ modelClient });

    await expect(agent.run("hi", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(modes).toEqual(["response"]);
  });

  it("forwards the caller's abort signal into runStream", async () => {
    const controller = new AbortController();
    controller.abort();
    const agent = createAgent({ modelClient: new ToolCallingModelClient() });

    const consume = async () => {
      for await (const _event of agent.runStream("cancelled", { signal: controller.signal })) {
        // drain
      }
    };

    await expect(consume()).rejects.toMatchObject({ name: "AbortError" });
  });

  it("fits the history into contextWindow and summarizes dropped turns with its own model", async () => {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);
        if (request.systemPrompt?.includes("compress conversation history")) {
          return { text: "Earlier: user asked about keyboards.", toolCalls: [], usage: { inputTokens: 7, outputTokens: 3, totalTokens: 10 } };
        }
        return { text: "answer", toolCalls: [], usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 } };
      },
    };
    const memory = new InMemory();
    for (const content of ["old question", "old answer", "another question", "another answer"]) {
      await memory.add({ role: content.endsWith("question") ? "user" : "assistant", content }, { sessionId: "chat" });
    }
    const agent = createAgent({
      modelClient,
      memory,
      sessionId: "chat",
      contextWindow: { maxTokens: 450, summarize: true, estimateTokens: () => 100 },
    });
    const events: AgentEvent[] = [];
    agent.on((event) => events.push(event));

    const result = await agent.run("new question");

    const [summaryRequest, answerRequest] = requests;
    expect(summaryRequest.tools).toEqual([]);
    expect(summaryRequest.messages[0].content).toContain("User: old question");
    expect(answerRequest.messages).toEqual([
      expect.objectContaining({
        role: "user",
        content: "[Summary of the earlier conversation]\nEarlier: user asked about keyboards.\n[End of summary]\n\nnew question",
      }),
    ]);
    expect(events).toContainEqual(expect.objectContaining({ type: "context.compacted", droppedMessages: 4, summarized: true }));
    expect(result.usage).toEqual({ inputTokens: 8, outputTokens: 4, totalTokens: 12 });
    // The stored history is untouched; only the request was fitted.
    expect(await agent.exportMemory()).toHaveLength(6);
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

describe("Agent security policy", () => {
  function createDeleteFlow(securityPolicy: SecurityPolicy) {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);
        const toolMessage = request.messages.find((message) => message.role === "tool");
        if (toolMessage) {
          return { text: `tool result: ${toolMessage.content}`, toolCalls: [] };
        }
        return {
          text: "deleting",
          toolCalls: [{ toolCallId: "call_1", toolName: "deleteItem", input: { id: "a" } }],
        };
      },
    };
    const execute = vi.fn(() => ({ deleted: true }));
    const events: AgentEvent[] = [];
    const agent = createAgent({
      modelClient,
      securityPolicy,
      tools: [{ name: "deleteItem", description: "Delete an item", execute }],
    });
    agent.on((event) => events.push(event));
    return { agent, execute, events, requests };
  }

  it("asks through onAsk and runs the tool once approved", async () => {
    const onAsk = vi.fn(async () => true);
    const { agent, execute } = createDeleteFlow({
      getToolPermission: () => ({ mode: "ask", reason: "Deletes data." }),
      onAsk,
    });

    const result = await agent.run("delete item a");

    expect(onAsk).toHaveBeenCalledWith(
      "deleteItem",
      { id: "a" },
      expect.objectContaining({ toolCallId: "call_1" }),
      "Deletes data.",
    );
    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.text).toBe('tool result: {"deleted":true}');
  });

  it("reports a ToolPermissionError to the model when the user rejects", async () => {
    const { agent, execute, events } = createDeleteFlow({
      getToolPermission: () => ({ mode: "ask" }),
      onAsk: async () => false,
    });

    const result = await agent.run("delete item a");
    const failure = events.find((event) => event.type === "tool.call.failed");

    expect(execute).not.toHaveBeenCalled();
    expect(failure).toMatchObject({ toolName: "deleteItem", error: { name: "ToolPermissionError" } });
    expect(result.toolCalls[0].error).toBe('Tool "deleteItem" is not permitted: User rejected the operation.');
    expect(result.text).toContain("not permitted");
  });

  it("stamps approval requests with the run id and accepts a synchronous approval", async () => {
    const { agent, execute, events } = createDeleteFlow({
      getToolPermission: () => ({ mode: "ask" }),
    });
    agent.on((event) => {
      if (event.type === "tool.call.requires_action") agent.approveToolCall(event.toolCallId, true);
    });

    const result = await agent.run("delete item a", { runId: "turn-7" });

    expect(events.find((event) => event.type === "tool.call.requires_action")).toMatchObject({
      toolCallId: "call_1",
      runId: "turn-7",
    });
    expect(execute).toHaveBeenCalledWith({ id: "a" }, expect.objectContaining({ runId: "turn-7", toolCallId: "call_1" }));
    expect(result.runId).toBe("turn-7");
  });

  it("stops waiting for approveToolCall when the run is aborted", async () => {
    const controller = new AbortController();
    const { agent, execute, events, requests } = createDeleteFlow({
      getToolPermission: () => ({ mode: "ask" }),
    });
    agent.on((event) => {
      if (event.type === "tool.call.requires_action") controller.abort();
    });

    await expect(agent.run("delete item a", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });

    expect(execute).not.toHaveBeenCalled();
    expect(requests).toHaveLength(1);
    expect(events.map((event) => event.type)).toEqual(expect.arrayContaining(["tool.call.failed", "agent.failed"]));
    // The aborted call still has a stored result, so the session stays valid.
    expect((await agent.exportMemory()).filter((message) => message.role === "tool")).toEqual([
      expect.objectContaining({ metadata: expect.objectContaining({ toolCallId: "call_1" }) }),
    ]);
    // A late decision for the abandoned call is a no-op.
    expect(() => agent.approveToolCall("call_1", true)).not.toThrow();
    expect(execute).not.toHaveBeenCalled();
  });

  it("stops waiting for onAsk when the run is aborted", async () => {
    const controller = new AbortController();
    const { agent, execute } = createDeleteFlow({
      getToolPermission: () => ({ mode: "ask" }),
      onAsk: () => {
        queueMicrotask(() => controller.abort());
        return new Promise<boolean>(() => undefined);
      },
    });

    await expect(agent.run("delete item a", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
    expect(execute).not.toHaveBeenCalled();
  });

  it("blocks tools the policy denies", async () => {
    const { agent, execute } = createDeleteFlow({
      getToolPermission: () => ({ mode: "deny", reason: "Read-only mode." }),
    });

    const result = await agent.run("delete item a");

    expect(execute).not.toHaveBeenCalled();
    expect(result.toolCalls[0].error).toBe('Tool "deleteItem" is not permitted: Read-only mode.');
  });
});
