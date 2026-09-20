import { beforeEach, describe, expect, it, vi } from "vitest";
import { PageToolManager } from "./pages";
import { ToolRegistry } from "../tools/tools";

describe("PageToolManager", () => {
  let events: any;
  let tools: ToolRegistry;

  beforeEach(() => {
    events = { emit: vi.fn() };
    tools = new ToolRegistry(events);
  });

  it("registers and unregisters pages", () => {
    const manager = new PageToolManager(tools, events);
    const page = { pageId: "p1", tools: [] };
    const unregister = manager.register(page);
    expect(manager.list()).toHaveLength(1);
    unregister();
    expect(manager.list()).toHaveLength(0);
  });

  it("throws when registering duplicate page", () => {
    const manager = new PageToolManager(tools, events);
    manager.register({ pageId: "p1", tools: [] });
    expect(() => manager.register({ pageId: "p1", tools: [] })).toThrow('Page "p1" is already registered.');
  });

  it("registerMany registers multiple pages and returns unregister callback", () => {
    const manager = new PageToolManager(tools, events);
    const unregisterAll = manager.registerMany([{ pageId: "p1", tools: [] }, { pageId: "p2", tools: [] }]);
    expect(manager.list()).toHaveLength(2);
    unregisterAll();
    expect(manager.list()).toHaveLength(0);
  });

  it("unregistering current page clears current state", async () => {
    const manager = new PageToolManager(tools, events);
    manager.register({ pageId: "p1", tools: [], systemPrompt: "test prompt" });
    await manager.switchTo("p1");
    expect(manager.currentPageId).toBe("p1");
    expect(manager.currentSystemPrompt).toBe("test prompt");

    manager.unregister("p1");
    expect(manager.currentPageId).toBeUndefined();
    expect(manager.currentSystemPrompt).toBeUndefined();
  });

  it("switchTo with URL resolves page by match", async () => {
    const manager = new PageToolManager(tools, events);
    manager.register({
      pageId: "p2",
      tools: [{ name: "t1", description: "test", execute: async () => {} }],
      match: (url) => url.pathname === "/test"
    });

    const page = await manager.switchTo(new URL("https://example.com/test"));
    expect(page.pageId).toBe("p2");
    expect(manager.currentPageId).toBe("p2");
    expect(events.emit).toHaveBeenCalledWith(expect.objectContaining({ type: "page.changed", pageId: "p2" }));
  });

  it("switchTo throws if no page matched", async () => {
    const manager = new PageToolManager(tools, events);
    await expect(manager.switchTo(new URL("https://example.com/unmatched"))).rejects.toThrow('No page matched "https://example.com/unmatched".');
  });

  it("switchTo clears previous page tools", async () => {
    const manager = new PageToolManager(tools, events);
    manager.register({ pageId: "p1", tools: [{ name: "t1", description: "test", execute: async () => {} }] });
    manager.register({ pageId: "p2", tools: [{ name: "t2", description: "test", execute: async () => {} }] });

    await manager.switchTo("p1");
    expect(tools.list().map(t => t.name)).toContain("t1");

    await manager.switchTo("p2");
    expect(tools.list().map(t => t.name)).not.toContain("t1");
    expect(tools.list().map(t => t.name)).toContain("t2");
  });
});
