import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentTool, ToolExecutionContext } from "@hamhome/agent";
import type { AgentToolApprovalRequest } from "@/types";

vi.mock("@/lib/storage", () => ({
  bookmarkStorage: {
    getBookmarkById: vi.fn(async (id: string) =>
      id === "b1" ? { id: "b1", title: "React 性能优化", url: "https://react.dev" } : null,
    ),
    getCategories: vi.fn(async () => [
      { id: "c1", name: "开发", parentId: null },
      { id: "c2", name: "前端", parentId: "c1" },
      { id: "c3", name: "React", parentId: "c2" },
    ]),
  },
  configStorage: { getCustomFilters: vi.fn(async () => []) },
  tabGroupRulesStorage: { getRules: vi.fn(async () => []) },
}));

const { ToolApprovalBroker, createToolApprovalPolicy } = await import(
  "../tool-approval-service"
);

const context: ToolExecutionContext = { agentId: "agent", sessionId: "session" };

function tool(name: string, riskLevel: string): AgentTool {
  return { name, description: name, metadata: { riskLevel }, execute: () => undefined };
}

function createPolicy() {
  const requestApproval = vi.fn(async (_request: AgentToolApprovalRequest) => true);
  const policy = createToolApprovalPolicy({
    tools: [tool("delete_bookmark", "high"), tool("delete_category", "high"), tool("search_bookmarks", "low")],
    language: "zh",
    requestApproval,
  });
  return { policy, requestApproval };
}

function createRequest(expiresAt = Date.now() + 60_000): AgentToolApprovalRequest {
  return { id: "approval_1", toolName: "delete_bookmark", title: "删除书签", expiresAt };
}

describe("createToolApprovalPolicy", () => {
  it("asks only before running high-risk tools", () => {
    const { policy } = createPolicy();

    expect(policy.getToolPermission("delete_bookmark", {}, context)).toEqual({ mode: "ask" });
    expect(policy.getToolPermission("search_bookmarks", {}, context)).toEqual({ mode: "allow" });
  });

  it("describes a permanent bookmark delete with the bookmark title", async () => {
    const { policy, requestApproval } = createPolicy();

    await expect(
      policy.onAsk?.("delete_bookmark", { id: "b1", permanent: true }, context),
    ).resolves.toBe(true);

    const [request] = requestApproval.mock.calls[0];
    expect(request).toMatchObject({
      toolName: "delete_bookmark",
      title: "删除书签",
      target: "React 性能优化",
      detail: "永久删除，无法恢复。",
    });
    expect(request.expiresAt).toBeGreaterThan(Date.now());
  });

  it("warns that deleting a category also deletes its subcategories", async () => {
    const { policy, requestApproval } = createPolicy();

    await policy.onAsk?.("delete_category", { id: "c1" }, context);

    expect(requestApproval.mock.calls[0][0]).toMatchObject({
      title: "删除分类",
      target: "开发",
      detail: "会同时删除 2 个子分类，其中的书签会移到「未分类」。",
    });
  });
});

describe("ToolApprovalBroker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("exposes a pending approval by turn and settles it by id", async () => {
    const broker = new ToolApprovalBroker();
    const request = createRequest();
    const decision = broker.waitForDecision("turn_1", request);

    expect(broker.getPending("turn_1")).toEqual(request);
    expect(broker.getPending("turn_2")).toBeNull();
    expect(broker.resolve(request.id, true)).toBe(true);
    await expect(decision).resolves.toBe(true);
    expect(broker.getPending("turn_1")).toBeNull();
    expect(broker.resolve(request.id, false)).toBe(false);
  });

  it("rejects automatically once the approval expires", async () => {
    vi.useFakeTimers();
    const broker = new ToolApprovalBroker();
    const decision = broker.waitForDecision("turn_1", createRequest(Date.now() + 1_000));

    await vi.advanceTimersByTimeAsync(1_000);

    await expect(decision).resolves.toBe(false);
    expect(broker.getPending("turn_1")).toBeNull();
  });
});
