import { describe, expect, it } from "vitest";
import { HookManager } from "../src/event";

describe("HookManager", () => {
  it("should run hooks sequentially and allow payload mutation", async () => {
    const hooks = new HookManager<{
      "llm:before": {
        order: string[];
        temperature: number;
      };
    }>();

    hooks.on("llm:before", async (payload) => {
      payload.order.push("first");
      payload.temperature = 0.2;
    });

    hooks.on("llm:before", (payload) => {
      payload.order.push(`second:${payload.temperature}`);
    });

    const payload = await hooks.emit("llm:before", {
      order: [],
      temperature: 0.8,
    });

    expect(payload.order).toEqual(["first", "second:0.2"]);
    expect(payload.temperature).toBe(0.2);
  });

  it("should support once subscriptions", async () => {
    const hooks = new HookManager<{
      ping: {
        count: number;
      };
    }>();

    hooks.once("ping", (payload) => {
      payload.count += 1;
    });

    await hooks.emit("ping", { count: 0 });
    const payload = await hooks.emit("ping", { count: 0 });

    expect(payload.count).toBe(0);
    expect(hooks.listenerCount("ping")).toBe(0);
  });
});
