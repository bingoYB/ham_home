import { describe, expect, it, vi } from "vitest";
import { allProviders } from "./provider-definitions";
import { createAgent } from "../core/agent";

function chatCompletion(message: Record<string, unknown>, finishReason: string) {
  return {
    id: "chatcmpl-1",
    object: "chat.completion",
    created: 1,
    model: "gpt-4.1-mini",
    choices: [{ index: 0, message: { role: "assistant", ...message }, finish_reason: finishReason }],
    usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
  };
}

describe("AiSdkModelClient iteration events", () => {
  it("emits agent.iteration.started once per agent iteration", async () => {
    const responses = [
      chatCompletion(
        {
          content: null,
          tool_calls: [{ id: "call_1", type: "function", function: { name: "getTitle", arguments: "{}" } }],
        },
        "tool_calls",
      ),
      chatCompletion({ content: "The title is Keyboard." }, "stop"),
    ];
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const agent = createAgent({
      provider: "openai",
      providers: allProviders,
      model: "gpt-4.1-mini",
      apiKey: "test-key",
      invocationMode: "chat",
      providerOptions: { fetch: fetchMock },
      tools: [{ name: "getTitle", description: "Get the product title", execute: () => ({ title: "Keyboard" }) }],
    });
    const iterations: number[] = [];
    agent.on((event) => {
      if (event.type === "agent.iteration.started") iterations.push(event.iteration);
    });

    const result = await agent.run("What is the product title?");

    expect(result.text).toBe("The title is Keyboard.");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(iterations).toEqual([1, 2]);
  });
});
