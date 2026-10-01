import { beforeEach, describe, expect, it, vi } from "vitest";
import { TokenBudgetContextBuilder, type ModelClient } from "@hamhome/agent";

const holder = vi.hoisted(() => ({ modelClient: undefined as unknown, agentOptions: [] as unknown[] }));

vi.mock("@/lib/storage", () => ({
  bookmarkStorage: { getBookmarkById: vi.fn(async () => null) },
  configStorage: {},
  tabGroupRulesStorage: {},
}));
vi.mock("../../tools/global-agent-tools", () => ({ createGlobalAgentTools: vi.fn(async () => []) }));
vi.mock("../../tools/chat-search-tools", () => ({ getChatSearchLanguage: vi.fn(async () => "en") }));
vi.mock("../../factory", async () => {
  const { createAgent } = await import("@hamhome/agent");
  return {
    createExtensionAgent: vi.fn(async (options: Record<string, unknown>) => {
      holder.agentOptions.push(options);
      return { agent: createAgent({ ...options, modelClient: holder.modelClient as ModelClient }), config: {} };
    }),
  };
});

const { GlobalAgentService } = await import("../global-agent-service");
const { createInitialChatSearchState } = await import("../chat-search-session-store");

function createSessionStore() {
  return {
    ensureSession: vi.fn(async (id?: string) => ({
      id: id ?? "session-1",
      title: "Chat",
      messages: [],
      state: createInitialChatSearchState(),
    })),
    seedRuntimeMemory: vi.fn(async () => 0),
    appendTurn: vi.fn(async () => undefined),
    saveState: vi.fn(async (id: string) => ({ id, title: "Chat", createdAt: 1, updatedAt: 1, messages: [] })),
  };
}

/** Model that streams "Hello", then waits until the test releases it or the turn is aborted. */
function createGatedModel() {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const modelClient: ModelClient = {
    async generate() {
      throw new Error("the global agent streams its turns");
    },
    async stream(request) {
      request.emit?.({ type: "message.delta", delta: "Hello" });
      if (request.signal?.aborted) {
        throw request.signal.reason;
      }
      await Promise.race([
        gate,
        new Promise((resolve) => request.signal?.addEventListener("abort", resolve, { once: true })),
      ]);
      if (request.signal?.aborted) {
        throw request.signal.reason;
      }
      return { text: "Hello world", toolCalls: [] };
    },
  };
  return { modelClient, release };
}

describe("GlobalAgentService streaming turns", () => {
  beforeEach(() => {
    holder.agentOptions.length = 0;
  });

  it("exposes live progress while a turn runs and clears it afterwards", async () => {
    const { modelClient, release } = createGatedModel();
    holder.modelClient = modelClient;
    const sessionStore = createSessionStore();
    const service = new GlobalAgentService(sessionStore as never);

    const turn = service.runTurn({ type: "message", text: "hi" }, undefined, "turn-1");
    await vi.waitFor(() => expect(service.getTurnProgress("turn-1")?.draftAnswer).toBe("Hello"));

    expect(service.getTurnProgress("turn-1")).toMatchObject({
      pendingApproval: null,
      steps: expect.arrayContaining([expect.objectContaining({ type: "iteration", status: "completed" })]),
    });

    release();
    const result = await turn;

    expect(result.response.answer).toBe("Hello world");
    // No tool calls in this turn, so its transcript is empty.
    expect(sessionStore.appendTurn).toHaveBeenCalledWith("session-1", "hi", "Hello world", expect.anything(), []);
    expect(service.getTurnProgress("turn-1")).toBeNull();
    expect(holder.agentOptions[0]).toMatchObject({ contextBuilder: expect.any(TokenBudgetContextBuilder) });
  });

  it("stops a running turn without saving it", async () => {
    const { modelClient } = createGatedModel();
    holder.modelClient = modelClient;
    const sessionStore = createSessionStore();
    const service = new GlobalAgentService(sessionStore as never);

    const turn = service.runTurn({ type: "message", text: "hi" }, undefined, "turn-2");
    await vi.waitFor(() => expect(service.getTurnProgress("turn-2")?.draftAnswer).toBe("Hello"));

    expect(service.cancelTurn("turn-2")).toBe(true);
    await expect(turn).rejects.toThrow("Stopped");
    expect(sessionStore.appendTurn).not.toHaveBeenCalled();
    expect(service.cancelTurn("turn-2")).toBe(false);
  });

  it("reuses one context builder across turns", async () => {
    const { modelClient, release } = createGatedModel();
    holder.modelClient = modelClient;
    release();
    const service = new GlobalAgentService(createSessionStore() as never);

    await service.runTurn({ type: "message", text: "one" }, undefined, "turn-a");
    await service.runTurn({ type: "message", text: "two" }, undefined, "turn-b");

    const [first, second] = holder.agentOptions as Array<{ contextBuilder: unknown }>;
    expect(first.contextBuilder).toBe(second.contextBuilder);
  });
});
