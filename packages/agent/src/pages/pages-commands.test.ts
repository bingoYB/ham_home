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

    expect(modelClient.requests[0].tools.map((tool) => tool.name)).toEqual(["readPageContent", "skill_view", "discoverSkill"]);
    expect(result.output).toEqual({
      summary: "summary:hello page",
      tags: ["page", "test", "mvp"],
      category: "demo",
    });
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
