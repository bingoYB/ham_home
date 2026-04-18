import { generateText, streamText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Agent } from "../src/agent";
import { BaseMemory } from "../src/memory";

vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");

  return {
    ...actual,
    generateText: vi.fn(),
    streamText: vi.fn(),
  };
});

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn(),
}));

class SimpleMemory extends BaseMemory {
  protected async compress(): Promise<void> {
    this.messages = this.messages.slice(-this.maxMessages);
  }
}

const mockedGenerateText = vi.mocked(generateText);
const mockedStreamText = vi.mocked(streamText);
const mockModel = {} as LanguageModel;
const mockedCreateOpenAI = vi.mocked(createOpenAI);

describe("Agent", () => {
  beforeEach(() => {
    mockedGenerateText.mockReset();
    mockedStreamText.mockReset();
    mockedCreateOpenAI.mockReset();
    mockedCreateOpenAI.mockReturnValue({
      chat: vi.fn(() => mockModel),
    } as any);
  });

  it("should orchestrate memory, tools, skills and lifecycle hooks", async () => {
    let lastGenerateOptions: any;
    mockedGenerateText.mockImplementation(async (options: any) => {
      lastGenerateOptions = options;

      const toolOutput = await options.tools?.calculator.execute?.(
        {
          a: 2,
          b: 3,
        },
        {
          toolCallId: "call_calculator",
          messages: options.messages,
        },
      );

      const skillOutput = await options.tools?.load_skill.execute?.(
        {
          name: "debugging",
        },
        {
          toolCallId: "call_skill",
          messages: options.messages,
        },
      );

      return {
        text: `result:${toolOutput};skill:${String(skillOutput).includes("<skill")}`,
      } as any;
    });

    const memory = new SimpleMemory({
      sessionId: "agent-test",
      maxMessages: 10,
    });
    const agent = new Agent({
      name: "demo-agent",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
      memory,
      systemPrompt: "You are helpful.",
      workspace: "/tmp/demo",
    });

    agent.registerTool("calculator", {
      description: "Add two numbers",
      inputSchema: z.object({
        a: z.number(),
        b: z.number(),
      }),
      execute: async ({ a, b }) => a + b,
    });

    agent.registerSkills([
      {
        name: "debugging",
        desc: "Debug complex issues",
        loader: async () => "Use logs and isolate variables.",
      },
    ]);

    const events: string[] = [];

    agent.getHookManager().on("llm:before", () => {
      events.push("llm:before");
    });
    agent.getHookManager().on("tool:before", ({ toolName }) => {
      events.push(`tool:before:${toolName}`);
    });
    agent.getHookManager().on("skill:before", ({ skillName }) => {
      events.push(`skill:before:${skillName}`);
    });
    agent.getHookManager().on("skill:after", ({ skillName }) => {
      events.push(`skill:after:${skillName}`);
    });
    agent.getHookManager().on("tool:after", ({ toolName }) => {
      events.push(`tool:after:${toolName}`);
    });
    agent.getHookManager().on("agent:after_run", () => {
      events.push("agent:after_run");
    });

    const result = await agent.run("Please calculate", {
      includeMCPTools: false,
    });

    expect(result.text).toBe("result:5;skill:true");
    expect(lastGenerateOptions?.messages[0]).toMatchObject({
      role: "system",
    });
    expect(mockedCreateOpenAI).toHaveBeenCalledWith({
      apiKey: "test-key",
    });
    expect(events).toEqual([
      "llm:before",
      "tool:before:calculator",
      "tool:after:calculator",
      "tool:before:load_skill",
      "skill:before:debugging",
      "skill:after:debugging",
      "tool:after:load_skill",
      "agent:after_run",
    ]);

    const messages = await memory.getMessages();
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "user",
      content: "Please calculate",
    });
    expect(messages[1]).toMatchObject({
      role: "assistant",
      content: "result:5;skill:true",
    });
  });

  it("should expose task workflow execution through the agent", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "result:undefined;skill:false",
    } as any);

    const agent = new Agent({
      name: "workflow-agent",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
    });

    const workflow = await agent.runWorkflow(
      [
        {
          id: "prepare",
          run: ({ setSharedState }) => {
            setSharedState("prompt", "Run workflow");
            return "ready";
          },
        },
        {
          id: "respond",
          dependsOn: ["prepare"],
          run: async ({ sharedState }) => {
            const runAgent = sharedState.runAgent as (
              input: string,
              options?: { includeMCPTools?: boolean },
            ) => Promise<{ text: string }>;
            const result = await runAgent(String(sharedState.prompt), {
              includeMCPTools: false,
            });
            return result.text;
          },
        },
      ],
      {
        sharedState: {
          stage: "demo",
        },
      },
    );

    expect(workflow.success).toBe(true);
    expect(workflow.results.prepare).toBe("ready");
    expect(workflow.results.respond).toBe("result:undefined;skill:false");
    expect(workflow.sharedState.agentName).toBe("workflow-agent");
    expect(workflow.sharedState.stage).toBe("demo");
  });

  it("should run an autonomous loop until tool results are incorporated", async () => {
    let invokeCount = 0;
    mockedGenerateText.mockImplementation(async (options: any) => {
      invokeCount += 1;

      if (invokeCount === 1) {
        return {
          text: "Need to calculate first.",
          toolCalls: [
            {
              toolCallId: "loop_call_1",
              toolName: "calculator",
              input: {
                a: 4,
                b: 6,
              },
            },
          ],
        } as any;
      }

      const lastMessage = options.messages[options.messages.length - 1] as any;
      const toolResult = lastMessage?.content?.[0]?.output;

      return {
        text: `Final answer: ${toolResult}`,
      } as any;
    });

    const memory = new SimpleMemory({
      sessionId: "agent-loop-test",
      maxMessages: 20,
    });
    const agent = new Agent({
      name: "loop-agent",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
      memory,
    });

    agent.registerTool(
      "calculator",
      {
        description: "Add two numbers",
        inputSchema: z.object({
          a: z.number(),
          b: z.number(),
        }),
        execute: async ({ a, b }) => a + b,
      },
    );

    const loopEvents: string[] = [];
    agent.getHookManager().on("agent:loop_start", () => {
      loopEvents.push("start");
    });
    agent.getHookManager().on("agent:loop_step", ({ step }) => {
      loopEvents.push(`step:${step.stepNumber}`);
    });
    agent.getHookManager().on("agent:loop_finish", ({ result }) => {
      loopEvents.push(`finish:${result.iterations}`);
    });

    const result = await agent.run("Solve with tools", {
      includeMCPTools: false,
      maxIterations: 4,
    });

    expect(result.text).toBe("Final answer: 10");
    expect(result.iterations).toBe(2);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]?.toolCalls).toEqual([
      {
        toolCallId: "loop_call_1",
        toolName: "calculator",
        input: {
          a: 4,
          b: 6,
        },
      },
    ]);
    expect(result.steps[0]?.toolResults[0]?.output).toBe(10);
    expect(invokeCount).toBe(2);
    expect(loopEvents).toEqual(["start", "step:0", "finish:2"]);

    const messages = await memory.getMessages();
    expect(messages.map((message) => message.role)).toEqual([
      "user",
      "assistant",
      "tool",
      "assistant",
    ]);
  });

  it("should initialize openai-compatible providers internally with baseURL", async () => {
    mockedGenerateText.mockResolvedValue({
      text: "ok",
    } as any);

    const chat = vi.fn(() => mockModel);
    mockedCreateOpenAI.mockReturnValue({
      chat,
    } as any);

    const agent = new Agent({
      provider: "zhipu",
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
      apiKey: "compat-key",
      model: "glm-4-flash",
    });

    const result = await agent.run("hello", {
      includeMCPTools: false,
    });

    expect(result.text).toBe("ok");
    expect(mockedCreateOpenAI).toHaveBeenCalledWith({
      apiKey: "compat-key",
      baseURL: "https://open.bigmodel.cn/api/paas/v4",
    });
    expect(chat).toHaveBeenCalledWith("glm-4-flash");
  });
});
