import { describe, expect, it } from "vitest";
import { createAgent, type ModelClient, type ModelGenerateRequest } from "../index";

class CommandModelClient implements ModelClient {
  readonly requests: ModelGenerateRequest[] = [];

  async generate(request: ModelGenerateRequest) {
    this.requests.push(request);
    const readPage = request.tools.find((tool) => tool.name === "readPageContent");
    const page = readPage ? await readPage.execute({}, request.toolContext) : { text: "" };

    return {
      text: JSON.stringify({
        summary: `summary:${(page as { text: string }).text}`,
        tags: ["page", "test", "mvp"],
        category: "demo",
      }),
      toolCalls: readPage ? [{ toolName: readPage.name, input: {}, output: page }] : [],
    };
  }
}

describe("PageToolManager and CommandRegistry", () => {
  it("switches page scoped tools and keeps conversation runtime alive", async () => {
    const agent = createAgent({ modelClient: new CommandModelClient() });
    agent.pages.register({
      pageId: "a",
      match: (url) => url.pathname === "/a",
      tools: [{ name: "toolA", description: "A", execute: () => "A" }],
      systemPrompt: "Page A",
    });
    agent.pages.register({
      pageId: "b",
      match: (url) => url.pathname === "/b",
      tools: [{ name: "toolB", description: "B", execute: () => "B" }],
      systemPrompt: "Page B",
    });

    await agent.pages.switchTo("https://example.com/a");
    expect(agent.tools.get("toolA")).toBeDefined();
    expect(agent.tools.get("toolB")).toBeUndefined();

    await agent.pages.switchTo("https://example.com/b");
    expect(agent.tools.get("toolA")).toBeUndefined();
    expect(agent.tools.get("toolB")).toBeDefined();
  });

  it("runs a structured command with restricted tools", async () => {
    const modelClient = new CommandModelClient();
    const agent = createAgent({ modelClient });
    agent.tools.register({
      name: "readPageContent",
      description: "Read page text",
      execute: () => ({ text: "hello page" }),
    });
    agent.tools.register({
      name: "forbidden",
      description: "Should not be visible",
      execute: () => "secret",
    });
    agent.commands.register({
      name: "summarizePage",
      description: "Summarize current page",
      inputSchema: {
        type: "object",
        properties: { maxSummaryLength: { type: "number" } },
        required: ["maxSummaryLength"],
        additionalProperties: false,
      },
      outputSchema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          tags: { type: "array", items: { type: "string" } },
          category: { type: "string" },
        },
        required: ["summary", "tags", "category"],
        additionalProperties: false,
      },
      tools: ["readPageContent"],
      prompt: "请读取当前页面内容，输出 JSON。摘要长度不超过 {{maxSummaryLength}} 字。",
    });

    const result = await agent.commands.run<{ maxSummaryLength: number }, { summary: string; tags: string[]; category: string }>(
      "summarizePage",
      { maxSummaryLength: 120 },
    );

    // No skills are registered, so skill_view/discoverSkill have nothing to offer and stay hidden.
    expect(modelClient.requests[0].tools.map((tool) => tool.name)).toEqual(["readPageContent"]);
    expect(result.output).toEqual({
      summary: "summary:hello page",
      tags: ["page", "test", "mvp"],
      category: "demo",
    });
  });

  it("runs an unregistered command definition with run-level prompt options", async () => {
    const modelClient = new CommandModelClient();
    const agent = createAgent({ modelClient, dynamicCapabilities: { enabled: false } });

    const result = await agent.commands.run(
      {
        name: "describeImage",
        prompt: (input: { topic: string }) => `describe ${input.topic}`,
        maxIterations: 1,
        outputSchema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            category: { type: "string" },
          },
          required: ["summary", "tags", "category"],
          additionalProperties: false,
        },
      },
      { topic: "cat" },
      {
        systemPrompt: "You describe images.",
        attachments: [{ type: "image", image: "aGVsbG8=", mediaType: "image/png" }],
      },
    );

    const [request] = modelClient.requests;
    expect(request.systemPrompt).toBe("You describe images.");
    expect(request.messages.at(-1)).toMatchObject({
      role: "user",
      content: "describe cat",
      attachments: [{ type: "image", image: "aGVsbG8=", mediaType: "image/png" }],
    });
    expect(result.output).toMatchObject({ category: "demo" });
    expect(agent.commands.get("describeImage")).toBeUndefined();
  });

  it("drops the agent's base system prompt for commands that ignore it", async () => {
    const modelClient = new CommandModelClient();
    const agent = createAgent({ modelClient, systemPrompt: "You are a chat assistant." });

    await agent.commands.run(
      { name: "standalone", prompt: "classify", ignoreBaseSystemPrompt: true },
      {},
      { systemPrompt: "You classify text." },
    );
    await agent.commands.run({ name: "inherits", prompt: "classify" }, {}, { systemPrompt: "You classify text." });

    expect(modelClient.requests[0].systemPrompt).toBe("You classify text.");
    expect(modelClient.requests[1].systemPrompt).toBe("You are a chat assistant.\n\nYou classify text.");
  });

  it("runs commands on a throwaway memory by default", async () => {
    const modelClient = new CommandModelClient();
    const agent = createAgent({ modelClient });
    await agent.run("earlier chat message");
    const memoryBefore = await agent.exportMemory();

    const result = await agent.commands.run({ name: "classify", prompt: "classify this" }, {});

    const commandRequest = modelClient.requests.at(-1)!;
    expect(commandRequest.messages.map((message) => message.content)).toEqual(["classify this"]);
    expect(await agent.exportMemory()).toEqual(memoryBefore);
    expect(result.runId).toMatch(/^run_/);
  });

  it("runs a command inside the conversation when it opts into session memory", async () => {
    const modelClient = new CommandModelClient();
    const agent = createAgent({ modelClient });
    await agent.run("earlier chat message");
    const inConversation = { name: "followUp", prompt: "summarize the chat", useSessionMemory: true };

    await agent.commands.run(inConversation, {});
    const commandRequest = modelClient.requests.at(-1)!;
    // The run-level option overrides the command definition.
    await agent.commands.run(inConversation, {}, { useSessionMemory: false });
    const overriddenRequest = modelClient.requests.at(-1)!;

    expect(commandRequest.messages.map((message) => message.content)).toEqual([
      "earlier chat message",
      expect.any(String),
      "summarize the chat",
    ]);
    expect(overriddenRequest.messages.map((message) => message.content)).toEqual(["summarize the chat"]);
    expect((await agent.exportMemory()).map((message) => message.content)).toEqual([
      "earlier chat message",
      expect.any(String),
      "summarize the chat",
      expect.any(String),
    ]);
  });

  it("writes session-memory commands into the given session", async () => {
    const agent = createAgent({ modelClient: new CommandModelClient() });
    const activeSessionId = agent.sessionId;

    await agent.commands.run({ name: "note", prompt: "remember this" }, {}, { useSessionMemory: true, sessionId: "notes" });

    expect(await agent.exportMemory()).toEqual([]);
    await agent.switchSession("notes");
    expect((await agent.exportMemory()).map((message) => message.content)).toEqual(["remember this", expect.any(String)]);
    expect(activeSessionId).not.toBe("notes");
  });

  it("validates command input and duplicate command names", async () => {
    const agent = createAgent({ modelClient: new CommandModelClient() });
    agent.commands.register({
      name: "classify",
      inputSchema: { type: "object", required: ["text"], properties: { text: { type: "string" } } },
      prompt: "classify {{text}}",
    });

    expect(() => agent.commands.register({ name: "classify", prompt: "duplicate" })).toThrow("already registered");
    await expect(agent.commands.run("classify", { text: 123 })).rejects.toThrow("$.text must be string");
  });

  it("has a built-in testConnection command that verifies model connection", async () => {
    class TestConnectionModelClient implements ModelClient {
      readonly requests: ModelGenerateRequest[] = [];
      async generate(request: ModelGenerateRequest) {
        this.requests.push(request);
        return {
          text: JSON.stringify({
            success: true,
            message: "Connection verified",
          }),
          toolCalls: [],
        };
      }
    }

    const modelClient = new TestConnectionModelClient();
    const agent = createAgent({ modelClient });

    const command = agent.commands.get("testConnection");
    expect(command).toBeDefined();
    expect(command?.name).toBe("testConnection");
    expect(command?.description).toBe("Test the connectivity of the model");
    expect(command?.outputSchema).toMatchObject({
      required: ["success", "message"],
      additionalProperties: false,
    });

    const result = await agent.commands.run("testConnection", {});
    expect(result.output).toEqual({
      success: true,
      message: "Connection verified",
    });
    expect(modelClient.requests[0].outputSchema).toEqual(command?.outputSchema);
  });
});
