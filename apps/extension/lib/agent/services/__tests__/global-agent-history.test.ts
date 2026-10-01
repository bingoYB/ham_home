import { describe, expect, it, vi } from "vitest";
import { InMemory, type AgentSkill, type ModelClient, type ModelGenerateRequest } from "@hamhome/agent";

const holder = vi.hoisted(() => ({ modelClient: undefined as unknown, probe: undefined as unknown }));

vi.mock("@/lib/storage", () => ({
  bookmarkStorage: { getBookmarkById: vi.fn(async () => null) },
  configStorage: {},
  tabGroupRulesStorage: {},
}));
vi.mock("../../tools/global-agent-tools", () => ({ createGlobalAgentTools: vi.fn(async () => []) }));
vi.mock("../../tools/chat-search-tools", () => ({ getChatSearchLanguage: vi.fn(async () => "en") }));
// A Skill that never matches the global assistant, so it is used only once
// the model activates it.
vi.mock("../../skills/hamhome-feature-skill", () => ({
  createHamHomeFeatureSkill: (): AgentSkill => ({
    id: "orders.export",
    name: "Order export",
    description: "Export orders as a CSV file.",
    match: { pageIds: ["orders"] },
    tools: [{ tool: { name: "exportOrders", description: "Export orders", execute: holder.probe as () => unknown } }],
  }),
}));
vi.mock("../../factory", async () => {
  const { createAgent } = await import("@hamhome/agent");
  return {
    createExtensionAgent: vi.fn(async (options: Record<string, unknown>) => ({
      agent: createAgent({ ...options, modelClient: holder.modelClient as ModelClient }),
      config: {},
    })),
  };
});

const { GlobalAgentService } = await import("../global-agent-service");
const { ChatSearchSessionStore } = await import("../chat-search-session-store");

/** Streams the scripted steps in order, then plain answers. */
function scriptedModel(requests: ModelGenerateRequest[], steps: Array<{ toolName: string; input: unknown }>): ModelClient {
  const answer = async (request: ModelGenerateRequest) => {
    requests.push(request);
    const step = steps.shift();
    return step
      ? { text: "", toolCalls: [{ toolCallId: `call_${requests.length}`, ...step }] }
      : { text: `answer ${requests.length}`, toolCalls: [] };
  };
  return { generate: answer, stream: answer };
}

describe("GlobalAgentService conversation history", () => {
  it("replays earlier tool calls and keeps an activated Skill in the next turn", async () => {
    holder.probe = vi.fn(() => ({ file: "orders.csv" }));
    const requests: ModelGenerateRequest[] = [];
    holder.modelClient = scriptedModel(requests, [
      { toolName: "discoverSkill", input: { query: "export orders" } },
      { toolName: "activateSkill", input: { skillId: "orders.export" } },
      { toolName: "exportOrders", input: { month: "2026-09" } },
    ]);
    const store = new ChatSearchSessionStore(new InMemory());
    const service = new GlobalAgentService(store);

    const first = await service.runTurn({ type: "message", text: "export my orders" }, undefined, "turn-1");
    const secondTurnStart = requests.length;
    await service.runTurn({ type: "message", text: "and the month before" }, first.session.id, "turn-2");
    const nextTurnRequest = requests[secondTurnStart];

    // The chat UI only shows what the user said and the final answers.
    const snapshot = await store.getSessionSnapshot(first.session.id);
    expect(snapshot.messages.map((message) => message.content)).toEqual([
      "export my orders",
      first.response.answer,
      "and the month before",
      "answer 5",
    ]);
    expect(snapshot.state.pinnedSkillIds).toEqual(["orders.export"]);

    // The next turn's model sees the earlier tool calls and their results...
    const replayedTools = nextTurnRequest.messages.filter((message) => message.role === "tool");
    expect(replayedTools.map((message) => message.metadata?.toolName)).toEqual(["discoverSkill", "activateSkill", "exportOrders"]);
    expect(replayedTools[2].content).toContain("orders.csv");
    expect(
      nextTurnRequest.messages.flatMap((message) =>
        ((message.metadata?.toolCalls as Array<{ toolName: string }> | undefined) ?? []).map((call) => call.toolName),
      ),
    ).toEqual(["discoverSkill", "activateSkill", "exportOrders"]);
    // ...and can call the activated Skill's tool again right away.
    expect(nextTurnRequest.tools.map((tool) => tool.name)).toContain("exportOrders");
    expect(holder.probe).toHaveBeenCalledTimes(1);
  });
});
