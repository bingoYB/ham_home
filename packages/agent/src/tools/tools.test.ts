import { describe, expect, it, vi } from "vitest";
import { ToolValidationError } from "../core/errors";
import { ToolRegistry } from "./tools";

describe("ToolRegistry", () => {
  it("registers, rejects duplicates, replaces, namespaces and unregisters tools", () => {
    const registry = new ToolRegistry();
    const execute = vi.fn();

    registry.register({ name: "read", description: "read data", execute });
    expect(registry.list()).toHaveLength(1);
    expect(() => registry.register({ name: "read", description: "duplicate", execute })).toThrow(ToolValidationError);

    registry.register({ name: "read", description: "replacement", execute }, { onConflict: "replace" });
    registry.register({ name: "read", description: "namespaced", execute }, { onConflict: "namespace", namespace: "page" });

    expect(registry.get("read")?.description).toBe("replacement");
    expect(registry.get("page.read")?.description).toBe("namespaced");

    registry.unregister("read");
    expect(registry.get("read")).toBeUndefined();
  });

  it("validates input schema and unregisters by page scope", async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: "sum",
      description: "sum values",
      parameters: {
        type: "object",
        properties: { value: { type: "number" } },
        required: ["value"],
        additionalProperties: false,
      },
      scope: { type: "page", pageId: "a" },
      execute: (input: { value: number }) => input.value + 1,
    });

    await expect(
      registry.execute("sum", { value: "bad" }, { agentId: "a", sessionId: "s" }),
    ).rejects.toThrow("$.value must be number");
    await expect(registry.execute("sum", { value: 1 }, { agentId: "a", sessionId: "s" })).resolves.toBe(2);

    registry.unregisterByPage("a");
    expect(registry.list()).toHaveLength(0);
  });

  it("unregisters many tools at once", () => {
    const registry = new ToolRegistry();
    const execute = vi.fn();
    registry.registerMany([
      { name: "t1", description: "", execute },
      { name: "t2", description: "", execute }
    ]);
    expect(registry.list()).toHaveLength(2);

    registry.unregisterMany(["t1", "t2"]);
    expect(registry.list()).toHaveLength(0);
  });

  it("listForModel filters by activeToolNames", () => {
    const registry = new ToolRegistry();
    const execute = vi.fn();
    registry.register({ name: "t1", description: "", execute });
    registry.register({ name: "t2", description: "", execute });

    const all = registry.listForModel();
    expect(all).toHaveLength(2);

    const filtered = registry.listForModel(["t2"]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("t2");
  });

  it("getMetadata omits execute function", () => {
    const registry = new ToolRegistry();
    registry.register({ name: "t1", description: "meta", execute: vi.fn() });

    const meta = registry.getMetadata();
    expect(meta[0]).not.toHaveProperty("execute");
    expect(meta[0].name).toBe("t1");
  });

  it("execute throws ToolNotFoundError for unknown tool", async () => {
    const registry = new ToolRegistry();
    await expect(registry.execute("unknown", {}, { agentId: "a", sessionId: "s" }))
      .rejects.toThrow("Tool \"unknown\" was not found.");
  });
});
