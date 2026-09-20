import { describe, expect, it } from "vitest";
import { AgentSkillRuntime, createUsageGuideSkill, InMemorySkillStore } from "./skills";
import type { AgentSkill, EmbeddingClient, EmbeddingTestConnectionResult, ModelClient, ModelGenerateRequest } from "../core/types";
import { createAgent } from "../core/agent";

describe("AgentSkillRuntime", () => {
  it("registers skills, builds an active prompt index and reconciles page tools", async () => {
    const runtime = new AgentSkillRuntime();
    const readOrder = {
      name: "readOrder",
      description: "Read current order",
      execute: () => ({ id: "order-1" }),
    };

    runtime.register({
      id: "order-management",
      name: "Order Management",
      description: "Help users create and troubleshoot orders.",
      whenToUse: "Use on order pages.",
      match: { pageIds: ["orders.create"], keywords: ["创建订单"] },
      documents: [
        {
          id: "create-order",
          kind: "procedure",
          title: "创建订单",
          content: "打开订单页，填写客户、商品和数量，然后提交。",
          pageId: "orders.create",
          keywords: ["创建订单", "提交订单"],
        },
      ],
      tools: [{ tool: readOrder }],
    });

    const result = await runtime.reconcile({ pageId: "orders.create", userInput: "怎么创建订单？" });

    expect(result.activeSkills.map((item) => item.skill.id)).toEqual(["order-management"]);
    expect(result.mountedTools.map((item) => item.toolName)).toEqual(["readOrder"]);
    expect(runtime.buildPromptIndex()).toContain("order-management");
  });

  it("discovers inactive skills and views active skill details separately", async () => {
    const runtime = new AgentSkillRuntime();
    const activeSkill = createUsageGuideSkill({
      id: "orders",
      name: "Orders",
      description: "Help users create orders.",
      match: { moduleIds: ["orders"] },
      documents: [
        {
          id: "create",
          kind: "manual",
          title: "Create orders",
          content: "Use the create button to start an order.",
        },
      ],
    });
    const inactiveSkill = createUsageGuideSkill({
      id: "reports",
      name: "Reports",
      description: "Help users export metrics and reports.",
      match: { moduleIds: ["analytics"] },
      documents: [
        {
          id: "export",
          kind: "manual",
          title: "Export reports",
          content: "Use the export button to download CSV files.",
          keywords: ["export", "csv"],
        },
      ],
    });

    runtime.registerMany([activeSkill, inactiveSkill]);
    await runtime.reconcile({ moduleId: "orders", userInput: "create order" });

    const viewed = runtime.view({ skillId: "orders" });
    const hidden = runtime.view({ skillId: "reports" });
    const discovered = await runtime.discover({ query: "export csv" });

    expect(viewed?.documents?.[0]?.id).toBe("create");
    expect(hidden).toBeUndefined();
    expect(discovered[0]?.skill.id).toBe("reports");
    expect(discovered[0]?.active).toBe(false);
  });

  it("can view inactive skill details when explicitly allowed", async () => {
    const runtime = new AgentSkillRuntime();

    runtime.register(createUsageGuideSkill({
      id: "reports",
      name: "Reports",
      description: "Help users export metrics and reports.",
      documents: [{ id: "export", kind: "manual", title: "Export reports", content: "Use export." }],
    }));

    const viewed = runtime.view({ skillId: "reports" }, { allowInactive: true });

    expect(viewed?.documents?.[0]?.id).toBe("export");
    expect(viewed?.active).toBe(false);
  });

  it("applies tool-level match", async () => {
    const runtime = new AgentSkillRuntime();

    runtime.register({
      id: "orders",
      name: "Orders",
      description: "Order workflows.",
      match: { pageIds: ["orders.create"] },
      documents: [
        {
          id: "draft",
          kind: "page-help",
          title: "Draft order",
          content: "Draft orders can be submitted from the create page.",
          pageId: "orders.create",
        },
      ],
      tools: [
        {
          tool: { name: "readDraft", description: "Read draft", execute: () => ({ ok: true }) },
          match: { intents: ["create"] },
        },
        {
          tool: { name: "refundOrder", description: "Refund order", execute: () => ({ ok: true }) },
          match: { intents: ["refund"] },
        },
      ],
    });

    const mounted = await runtime.reconcile({ pageId: "orders.create", intent: "create" });
    expect(mounted.mountedTools.map((item) => item.toolName)).toEqual(["readDraft"]);

    const unmounted = await runtime.reconcile({ pageId: "reports" });
    expect(unmounted.unmountedSkillIds).toEqual(["orders"]);
  });

  it("InMemorySkillStore lists and filters correctly", () => {
    const store = new InMemorySkillStore();
    store.put({ id: "s1", name: "S1", description: "D1", tags: ["t1"], source: { type: "local" } });
    store.put({ id: "s2", name: "S2", description: "D2", tags: ["t2"] });

    expect(store.list()).toHaveLength(2);
    expect(store.list({ tags: ["t1"] })).toHaveLength(1);
    expect(store.list({ source: "local" })).toHaveLength(1);

    store.delete("s1");
    expect(store.list()).toHaveLength(1);
  });

  it("handles namespace strategy on conflict", () => {
    const runtime = new AgentSkillRuntime();
    runtime.register({ id: "s1", name: "S1", description: "" });
    runtime.register({ id: "s1", name: "S1-copy", description: "" }, { onConflict: "namespace" });
    runtime.register({ id: "s1", name: "S1-copy2", description: "" }, { onConflict: "namespace" });

    const skills = runtime.list();
    expect(skills.map(s => s.id)).toEqual(["s1", "s1.2", "s1.3"]);
  });

  it("throws on conflict without replace strategy", () => {
    const runtime = new AgentSkillRuntime();
    runtime.register({ id: "s1", name: "S1", description: "" });
    expect(() => runtime.register({ id: "s1", name: "S1", description: "" })).toThrow('Skill "s1" is already registered.');
  });

  it("matches using different rule dimensions like tags, intents, urlPatterns", async () => {
    const runtime = new AgentSkillRuntime();

    runtime.register({
      id: "s1",
      name: "S1",
      description: "",
      match: {
        tags: ["billing"],
        urlPatterns: ["https://example.com/checkout*"],
        intents: ["pay"]
      }
    });

    const matches = await runtime.resolve({
      tags: ["billing"],
      url: "https://example.com/checkout/123",
      intent: "pay"
    });

    expect(matches).toHaveLength(1);
    expect(matches[0].score).toBeGreaterThan(0);
  });

  it("tokenizes and scores correctly for discover", async () => {
    const runtime = new AgentSkillRuntime();

    runtime.register({
      id: "s1",
      name: "Chinese Test",
      description: "测试分词", // "测试分词"
      tags: ["test"]
    });

    const discovered = await runtime.discover({ query: "测试 test" });
    expect(discovered).toHaveLength(1);
    expect(discovered[0].skill.id).toBe("s1");
    expect(discovered[0].score).toBeGreaterThan(0);
  });
});

describe("Agent skill integration", () => {
  it("injects skill_view, discoverSkill, prompt index and request-local skill tools", async () => {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);

        const toolMessages = request.messages.filter((message) => message.role === "tool");
        if (toolMessages.length >= 2) {
          return { text: "created", toolCalls: [] };
        }
        if (toolMessages.length === 1) {
          return {
            text: "reading draft",
            toolCalls: [{ toolName: "readOrderDraft", input: {} }],
          };
        }

        return {
          text: "viewing skill",
          toolCalls: [{ toolName: "skill_view", input: { skillId: "orders" } }],
        };
      },
    };
    const skill: AgentSkill = {
      id: "orders",
      name: "Orders",
      description: "Order creation guidance.",
      whenToUse: "Use when users create orders.",
      match: { pageIds: ["orders.create"] },
      tools: [
        {
          tool: {
            name: "readOrderDraft",
            description: "Read the order draft",
            execute: () => ({ customer: "Ada" }),
          },
        },
      ],
    };
    const agent = createAgent({ modelClient, skills: [skill], maxIterations: 3 });

    const result = await agent.run("创建订单", { skillContext: { pageId: "orders.create" } });

    expect(result.text).toBe("created");
    expect(requests[0].tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["skill_view", "discoverSkill", "readOrderDraft"]));
    expect(requests[0].systemPrompt).toContain("orders");
    expect(requests[0].systemPrompt).toContain("Call skill_view");
    expect(agent.tools.get("readOrderDraft")).toBeUndefined();
    expect(result.toolCalls[0]?.toolName).toBe("skill_view");
    expect(result.toolCalls[0]?.output).toEqual(expect.objectContaining({ active: true }));
    expect(result.toolCalls[1]?.output).toEqual({ customer: "Ada" });
  });

  it("can strictly exclude skill base tools when tools are restricted", async () => {
    const requests: ModelGenerateRequest[] = [];
    const modelClient: ModelClient = {
      async generate(request) {
        requests.push(request);
        return { text: "done", toolCalls: [] };
      },
    };
    const agent = createAgent({
      modelClient,
      skillView: { keepWhenToolsRestricted: false },
      discoverSkill: { keepWhenToolsRestricted: false },
      tools: [{ name: "readPage", description: "Read page", execute: () => "page" }],
    });

    await agent.run("read", { tools: ["readPage"] });

    expect(requests[0].tools.map((tool) => tool.name)).toEqual(["readPage"]);
    expect(requests[0].activeToolNames).toEqual(["readPage"]);
  });

  it("allows concurrent runs on the same agent", async () => {
    let started!: () => void;
    let secondStarted!: () => void;
    let releaseFirst!: () => void;
    let releaseSecond!: () => void;
    const startedPromise = new Promise<void>((resolve) => {
      started = resolve;
    });
    const secondStartedPromise = new Promise<void>((resolve) => {
      secondStarted = resolve;
    });
    const releaseFirstPromise = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const releaseSecondPromise = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    let calls = 0;
    const modelClient: ModelClient = {
      async generate() {
        calls += 1;
        if (calls === 1) {
          started();
          await releaseFirstPromise;
        } else {
          secondStarted();
          await releaseSecondPromise;
        }
        return { text: "done", toolCalls: [] };
      },
    };
    const agent = createAgent({ modelClient });

    const firstRun = agent.run("first");
    await startedPromise;

    const secondRun = agent.run("second");
    await secondStartedPromise;
    releaseFirst();
    releaseSecond();
    await expect(firstRun).resolves.toMatchObject({ text: "done" });
    await expect(secondRun).resolves.toMatchObject({ text: "done" });
  });
});
