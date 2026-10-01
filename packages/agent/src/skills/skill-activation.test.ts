import { describe, expect, it, vi } from "vitest";
import { createAgent } from "../core/agent";
import type { AgentEvent, AgentSkill, ModelClient, ModelGenerateRequest, ToolExecutionContext } from "../core/types";
import { AgentSkillRuntime, createActivateSkillTool, createSkillViewTool } from "./skills";

const context: ToolExecutionContext = { agentId: "agent", sessionId: "session", runId: "run-1" };

function exportSkill(exportOrders = vi.fn(() => ({ file: "orders.csv" }))): AgentSkill {
  return {
    id: "orders.export",
    name: "Order export",
    description: "Export orders as a CSV file.",
    match: { pageIds: ["orders"] },
    documents: [{ id: "how", kind: "procedure", title: "Export", content: "Pick a date range, then export." }],
    tools: [
      { tool: { name: "exportOrders", description: "Export orders", execute: exportOrders } },
      { tool: { name: "exportInvoices", description: "Export invoices", execute: () => null }, match: { pageIds: ["invoices"] } },
    ],
  };
}

const helpSkill: AgentSkill = { id: "help", name: "Help", description: "Global help." };

describe("AgentSkillRuntime.activate", () => {
  it("activates an inactive skill and mounts the tools that match the context", async () => {
    const events: AgentEvent[] = [];
    const runtime = new AgentSkillRuntime({ events: { emit: (event) => events.push(event) } });
    runtime.register(exportSkill());
    await runtime.reconcile({ pageId: "home" });

    const active = runtime.activate("orders.export", { runId: "run-1", context: { pageId: "home" } });

    expect(active).toMatchObject({ reason: "activated", mountedTools: ["exportOrders"] });
    expect(runtime.listActive().map((item) => item.skill.id)).toEqual(["orders.export"]);
    expect(runtime.listMountedTools().map((item) => item.toolName)).toEqual(["exportOrders"]);
    expect(runtime.hasDiscoverableSkills()).toBe(false);
    expect(events).toEqual(expect.arrayContaining([
      { type: "skill.mounted", skillId: "orders.export", reason: "activated", runId: "run-1" },
      { type: "skill.tool.mounted", skillId: "orders.export", toolName: "exportOrders", reason: "activated", runId: "run-1" },
    ]));
  });

  it("lasts until the next reconcile", async () => {
    const runtime = new AgentSkillRuntime();
    runtime.register(exportSkill());
    runtime.activate("orders.export");

    await runtime.reconcile({ pageId: "home" });

    expect(runtime.listActive()).toEqual([]);
    expect(runtime.listMountedTools()).toEqual([]);
  });

  it("refuses unknown, disabled and non model-invocable skills", () => {
    const runtime = new AgentSkillRuntime();
    runtime.register({ ...helpSkill, id: "manual", modelInvocable: false });
    runtime.register({ ...helpSkill, id: "off" }, { enabled: false });

    expect(runtime.activate("missing")).toBeUndefined();
    expect(runtime.activate("manual")).toBeUndefined();
    expect(runtime.activate("off")).toBeUndefined();
  });
});

describe("Skill tools", () => {
  it("activateSkill returns the skill documents and mounted tools", async () => {
    const runtime = new AgentSkillRuntime();
    runtime.register(exportSkill());
    const tool = createActivateSkillTool({ skills: runtime });

    const result = await tool.execute({ skillId: "orders.export" }, context);
    const missing = await tool.execute({ skillId: "missing" }, context);

    expect(result).toMatchObject({
      activated: true,
      mountedTools: ["exportOrders"],
      active: true,
      documents: [expect.objectContaining({ id: "how" })],
    });
    expect(missing).toEqual({ error: "Skill does not exist or cannot be activated: missing" });
  });

  it("keeps skill documents within maxDocumentTokens", async () => {
    const runtime = new AgentSkillRuntime();
    runtime.register({
      ...helpSkill,
      documents: [
        { id: "short", kind: "faq", title: "Short", content: "a".repeat(40) },
        { id: "long", kind: "manual", title: "Long", content: "b".repeat(400) },
        { id: "late", kind: "faq", title: "Late", content: "c" },
      ],
    });
    await runtime.reconcile({});
    const tool = createSkillViewTool({ skills: runtime }, { maxDocumentTokens: 40 });

    const view = (await tool.execute({ skillId: "help" }, context)) as {
      documents: Array<{ id: string; content: string }>;
      omittedDocumentIds?: string[];
    };

    expect(view.documents.map((document) => document.id)).toEqual(["short", "long"]);
    expect(view.documents[1].content).toMatch(/^b+…\[truncated\]$/);
    expect(view.documents[1].content.length).toBeLessThan(400);
    expect(view.omittedDocumentIds).toEqual(["late"]);
  });
});

describe("Agent Skill activation", () => {
  /** Model that discovers, activates and then uses the export skill. */
  function activationModel(requests: ModelGenerateRequest[]): ModelClient {
    return {
      async generate(request) {
        requests.push(request);
        const call = (toolName: string, input: unknown) => ({
          text: "",
          toolCalls: [{ toolCallId: `call_${requests.length}`, toolName, input }],
        });
        switch (requests.length) {
          case 1:
            return call("discoverSkill", { query: "export orders" });
          case 2:
            return call("activateSkill", { skillId: "orders.export" });
          case 3:
            return call("exportOrders", {});
          default:
            return { text: "Exported to orders.csv.", toolCalls: [] };
        }
      },
    };
  }

  it("mounts an activated skill's tools for the following steps of the run", async () => {
    const requests: ModelGenerateRequest[] = [];
    const exportOrders = vi.fn(() => ({ file: "orders.csv" }));
    const agent = createAgent({
      modelClient: activationModel(requests),
      skills: [helpSkill, exportSkill(exportOrders)],
    });

    const result = await agent.run("export my orders");
    const toolNames = (request: ModelGenerateRequest) => request.tools.map((tool) => tool.name);

    expect(toolNames(requests[0])).toEqual(expect.arrayContaining(["skill_view", "discoverSkill", "activateSkill"]));
    expect(toolNames(requests[0])).not.toContain("exportOrders");
    expect(result.toolCalls[0].output).toEqual([expect.objectContaining({ skill: expect.objectContaining({ id: "orders.export" }) })]);
    // Nothing is left to discover, but the discovery tools stay for the rest of the run.
    expect(toolNames(requests[2])).toEqual(expect.arrayContaining(["exportOrders", "discoverSkill", "activateSkill"]));
    expect(requests[2].systemPrompt).toContain("- orders.export: Export orders as a CSV file.");
    expect(exportOrders).toHaveBeenCalledTimes(1);
    expect(result.text).toBe("Exported to orders.csv.");
  });

  it("exposes activated tools in a run restricted to other tools", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({
      modelClient: activationModel(requests),
      skills: [helpSkill, exportSkill()],
      tools: [{ name: "lookup", description: "Lookup", execute: () => null }],
    });

    await agent.run("export my orders", { tools: ["lookup"] });

    expect(requests[0].activeToolNames).not.toContain("exportOrders");
    expect(requests[2].activeToolNames).toEqual(expect.arrayContaining(["lookup", "exportOrders"]));
    expect(requests[2].tools.map((tool) => tool.name)).toContain("exportOrders");
  });

  it("hides activateSkill when allowActivation is false", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({
      modelClient: { generate: async (request) => (requests.push(request), { text: "ok", toolCalls: [] }) },
      skills: [helpSkill, exportSkill()],
      discoverSkill: { allowActivation: false },
    });

    await agent.run("export my orders");

    expect(requests[0].tools.map((tool) => tool.name)).toContain("discoverSkill");
    expect(requests[0].tools.map((tool) => tool.name)).not.toContain("activateSkill");
    expect(requests[0].systemPrompt).not.toContain("activateSkill");
  });
});

describe("Pinned skills", () => {
  it("keep pinned skills active when the request does not match them", async () => {
    const runtime = new AgentSkillRuntime();
    runtime.register(exportSkill());
    runtime.register({ ...helpSkill, id: "manual", match: { pageIds: ["x"] }, modelInvocable: false });

    const result = await runtime.reconcile(
      { pageId: "home" },
      { pinnedSkillIds: ["orders.export", "manual", "missing", "orders.export"] },
    );

    expect(result.pinnedSkillIds).toEqual(["orders.export"]);
    expect(result.activeSkills).toEqual([expect.objectContaining({ reason: "pinned", mountedTools: ["exportOrders"] })]);
    expect(result.mountedTools.map((tool) => tool.toolName)).toEqual(["exportOrders"]);
  });

  it("keep the match reason of a pinned skill that the request matches", async () => {
    const runtime = new AgentSkillRuntime();
    runtime.register(exportSkill());

    const result = await runtime.reconcile({ pageId: "orders" }, { pinnedSkillIds: ["orders.export"] });

    expect(result.activeSkills).toEqual([expect.objectContaining({ reason: "matched by pageId" })]);
    expect(result.pinnedSkillIds).toEqual(["orders.export"]);
  });
});

describe("Agent pinned skills across runs", () => {
  /** Activates the export skill in the first run, then answers plainly. */
  function scriptedModel(requests: ModelGenerateRequest[]): ModelClient {
    const script = [
      { toolName: "discoverSkill", input: { query: "export orders" } },
      { toolName: "activateSkill", input: { skillId: "orders.export" } },
    ];
    return {
      async generate(request) {
        requests.push(request);
        const step = script.shift();
        return step
          ? { text: "", toolCalls: [{ toolCallId: `call_${requests.length}`, ...step }] }
          : { text: "done", toolCalls: [] };
      },
    };
  }
  const toolNames = (request: ModelGenerateRequest) => request.tools.map((tool) => tool.name);

  it("keeps a skill the model activated active in the next run of the same session", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({ modelClient: scriptedModel(requests), skills: [helpSkill, exportSkill()] });

    const first = await agent.run("export my orders");
    const before = requests.length;
    const second = await agent.run("now last month's orders");

    expect(first.pinnedSkillIds).toEqual(["orders.export"]);
    expect(toolNames(requests[before])).toContain("exportOrders");
    expect(requests[before].systemPrompt).toContain("- orders.export: Export orders as a CSV file.");
    expect(second.pinnedSkillIds).toEqual(["orders.export"]);
  });

  it("restores pinned skills on a new agent from skillContext.pinnedSkillIds", async () => {
    const first = await createAgent({ modelClient: scriptedModel([]), skills: [helpSkill, exportSkill()] }).run("export");

    const requests: ModelGenerateRequest[] = [];
    const nextTurnAgent = createAgent({
      modelClient: { generate: async (request) => (requests.push(request), { text: "ok", toolCalls: [] }) },
      skills: [helpSkill, exportSkill()],
    });
    const second = await nextTurnAgent.run("again", { skillContext: { pinnedSkillIds: first.pinnedSkillIds } });

    expect(toolNames(requests[0])).toContain("exportOrders");
    expect(second.pinnedSkillIds).toEqual(["orders.export"]);
  });

  it("lets the host drop pinned skills by passing an empty list", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({ modelClient: scriptedModel(requests), skills: [helpSkill, exportSkill()] });
    await agent.run("export my orders");
    const before = requests.length;

    const second = await agent.run("something else", { skillContext: { pinnedSkillIds: [] } });

    expect(toolNames(requests[before])).not.toContain("exportOrders");
    expect(second.pinnedSkillIds).toEqual([]);
  });

  it("does not apply the session's pinned skills to commands", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({ modelClient: scriptedModel(requests), skills: [helpSkill, exportSkill()] });
    await agent.run("export my orders");

    await agent.commands.run({ name: "classify", prompt: "classify this" }, {});
    const commandRequest = requests.at(-1)!;
    await agent.run("and last month");
    const nextChatRequest = requests.at(-1)!;

    expect(toolNames(commandRequest)).not.toContain("exportOrders");
    expect(toolNames(nextChatRequest)).toContain("exportOrders");
  });

  it("forgets pinned skills when the session memory is cleared", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({ modelClient: scriptedModel(requests), skills: [helpSkill, exportSkill()] });
    await agent.run("export my orders");

    await agent.clearMemory();
    const result = await agent.run("hello");

    expect(toolNames(requests.at(-1)!)).not.toContain("exportOrders");
    expect(result.pinnedSkillIds).toEqual([]);
  });

  it("exposes pinned skill tools in a run restricted to other tools", async () => {
    const requests: ModelGenerateRequest[] = [];
    const agent = createAgent({
      modelClient: { generate: async (request) => (requests.push(request), { text: "ok", toolCalls: [] }) },
      skills: [helpSkill, exportSkill()],
      tools: [{ name: "lookup", description: "Lookup", execute: () => null }],
    });

    await agent.run("again", { tools: ["lookup"], skillContext: { pinnedSkillIds: ["orders.export"] } });

    expect(requests[0].activeToolNames).toEqual(expect.arrayContaining(["lookup", "exportOrders"]));
  });
});
