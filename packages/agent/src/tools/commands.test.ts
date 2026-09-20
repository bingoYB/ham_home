import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommandRegistry } from "./commands";
import { Agent } from "../core/agent";
import { ToolNotFoundError } from "../core/errors";

describe("CommandRegistry", () => {
  let agent: any;

  beforeEach(() => {
    agent = {
      tools: {
        get: vi.fn(),
        register: vi.fn(() => vi.fn()), // returns unregister
      },
      pages: {
        currentPageId: "page1",
      },
      sessionId: "session1",
      runCommand: vi.fn().mockResolvedValue({
        text: '{"result":"success"}',
        rawMessage: {},
        toolCalls: [],
        usage: { totalTokens: 10 },
      }),
    };
  });

  it("passes command attachments to the agent run", async () => {
    const registry = new CommandRegistry(agent);
    registry.register({
      name: "analyze_image",
      prompt: "describe",
      attachments: (input: any) => [{ type: "image", image: input.image }],
    });

    await registry.run("analyze_image", { image: "https://example.com/a.png" });

    const [, options] = agent.runCommand.mock.calls[0];
    expect(options.attachments).toEqual([
      { type: "image", image: "https://example.com/a.png" },
    ]);
  });

  it("omits attachments when the command declares none", async () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "plain", prompt: "hi" });

    await registry.run("plain", {});

    const [, options] = agent.runCommand.mock.calls[0];
    expect(options.attachments).toBeUndefined();
  });

  it("registers and lists commands", () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "my_cmd", prompt: "Hello" });
    const cmd = registry.get("my_cmd");
    expect(cmd).toBeDefined();
    expect(registry.list().map(c => c.name)).toContain("my_cmd");
  });

  it("throws when registering duplicate without replace", () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "dup", prompt: "" });
    expect(() => registry.register({ name: "dup", prompt: "" })).toThrow('Command "dup" is already registered.');
  });

  it("supports onConflict: replace", () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "dup", prompt: "first" });
    registry.register({ name: "dup", prompt: "second" }, { onConflict: "replace" });
    expect(registry.get("dup")?.prompt).toBe("second");
  });

  it("supports onConflict: namespace", () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "dup", prompt: "first" });
    registry.register({ name: "dup", prompt: "second" }, { onConflict: "namespace", namespace: "my_ns" });
    registry.register({ name: "dup", prompt: "third" }, { onConflict: "namespace" }); // defaults to "command"
    expect(registry.get("my_ns.dup")?.prompt).toBe("second");
    expect(registry.get("command.dup")?.prompt).toBe("third");
  });

  it("getMetadata omits prompt", () => {
    const registry = new CommandRegistry(agent);
    registry.register({ name: "meta", prompt: "secret" });
    const meta = registry.getMetadata();
    expect(meta.find(m => m.name === "meta")).not.toHaveProperty("prompt");
  });

  it("registerMany allows multiple registrations", () => {
    const registry = new CommandRegistry(agent);
    const unregister = registry.registerMany([
      { name: "cmd1", prompt: "" },
      { name: "cmd2", prompt: "" }
    ]);
    expect(registry.get("cmd1")).toBeDefined();
    expect(registry.get("cmd2")).toBeDefined();
    unregister();
    expect(registry.get("cmd1")).toBeUndefined();
    expect(registry.get("cmd2")).toBeUndefined();
  });

  it("run method handles function prompt", async () => {
    const registry = new CommandRegistry(agent);
    const promptFn = vi.fn().mockReturnValue("dynamic prompt");
    registry.register({ name: "dyn", prompt: promptFn });

    await registry.run("dyn", { data: 1 });
    expect(promptFn).toHaveBeenCalledWith({ data: 1 }, expect.objectContaining({ sessionId: "session1" }));
    expect(agent.runCommand).toHaveBeenCalledWith("dynamic prompt", expect.anything());
  });

  it("run method registers temporary tools and unregisters them", async () => {
    const registry = new CommandRegistry(agent);
    const unregisterToolSpy = vi.fn();
    agent.tools.register.mockReturnValue(unregisterToolSpy);

    const tempTool = { name: "temp", description: "", execute: async () => {} };
    registry.register({
      name: "with_tools",
      prompt: "do something",
      tools: [tempTool, "existing_tool"]
    });

    agent.tools.get.mockImplementation((name: string) => name === "existing_tool" ? {} : undefined);

    await registry.run("with_tools", {});

    expect(agent.tools.register).toHaveBeenCalledWith(tempTool, { onConflict: "replace" });
    expect(unregisterToolSpy).toHaveBeenCalled(); // Ensure finally block runs
  });

  it("run method throws ToolNotFoundError for unknown string tools", async () => {
    const registry = new CommandRegistry(agent);
    agent.tools.get.mockReturnValue(undefined);
    registry.register({ name: "bad_tool", prompt: "", tools: ["unknown"] });
    await expect(registry.run("bad_tool", {})).rejects.toThrow('Tool "unknown" was not found.');
  });
});
