import { describe, expect, it, vi } from "vitest";
import type { AgentMessage, ContextBuildInput } from "../core/types";
import { TokenBudgetContextBuilder } from "./context-window";

const user = (content: string, extra: Partial<AgentMessage> = {}): AgentMessage => ({ role: "user", content, ...extra });
const assistant = (content: string, extra: Partial<AgentMessage> = {}): AgentMessage => ({ role: "assistant", content, ...extra });
const toolTurn = (request: string): AgentMessage[] => [
  user(request),
  assistant("", { metadata: { toolCalls: [{ toolCallId: `call_${request}`, toolName: "search", input: { q: request } }] } }),
  { role: "tool", content: `{"hits":"${request}"}`, metadata: { toolCallId: `call_${request}`, toolName: "search" } },
  assistant(`answer ${request}`),
];

function buildInput(messages: AgentMessage[], extra: Partial<ContextBuildInput> = {}): ContextBuildInput {
  return { sessionId: "s1", userInput: "", messages, activeSkills: [], ...extra };
}

describe("TokenBudgetContextBuilder", () => {
  it("returns the history unchanged when it fits", async () => {
    const builder = new TokenBudgetContextBuilder({ maxTokens: 10_000 });
    const messages = [...toolTurn("a"), user("b")];

    expect(await builder.build(buildInput(messages))).toEqual(messages);
  });

  it("cuts oversized tool results even when the history fits", async () => {
    const builder = new TokenBudgetContextBuilder({ maxTokens: 10_000, maxToolResultTokens: 20 });
    const messages: AgentMessage[] = [user("q"), { role: "tool", content: "x".repeat(400), metadata: { toolCallId: "1" } }];

    const [, tool] = await builder.build(buildInput(messages));

    expect(tool.content).toMatch(/^x+…\[tool result truncated\]$/);
    expect(tool.content.length).toBeLessThan(100);
    expect(messages[1].content).toHaveLength(400);
  });

  it("removes images of earlier turns before dropping any turn", async () => {
    const builder = new TokenBudgetContextBuilder({ maxTokens: 1500 });
    const image = { type: "image" as const, image: "aGVsbG8=", mediaType: "image/png" };
    const messages = [
      user("earlier photo", { attachments: [image] }),
      assistant("nice"),
      user("new photo", { attachments: [image] }),
    ];

    const result = await builder.build(buildInput(messages));

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ role: "user", content: "earlier photo\n[1 image(s) removed from the history to save context]", attachments: undefined });
    expect(result[2].attachments).toEqual([image]);
  });

  it("drops the oldest whole turns and keeps tool calls with their results", async () => {
    const onCompacted = vi.fn();
    const builder = new TokenBudgetContextBuilder({ maxTokens: 50, estimateTokens: () => 10 });
    const messages = [user("one"), assistant("first answer"), ...toolTurn("two"), user("three")];

    const result = await builder.build(buildInput(messages, { onCompacted }));

    expect(result).toEqual([...toolTurn("two"), user("three")]);
    expect(onCompacted).toHaveBeenCalledWith({ droppedMessages: 2, summarized: false });
  });

  it("always keeps the newest turn, even when it alone exceeds the budget", async () => {
    const builder = new TokenBudgetContextBuilder({ maxTokens: 15, estimateTokens: () => 10 });
    const messages = [user("one"), ...toolTurn("two")];

    expect(await builder.build(buildInput(messages))).toEqual(toolTurn("two"));
  });

  it("summarizes dropped turns once and extends the summary incrementally", async () => {
    const generateText = vi.fn(async () => (generateText.mock.calls.length === 1 ? "S1" : "S2"));
    const onCompacted = vi.fn();
    const builder = new TokenBudgetContextBuilder({ maxTokens: 650, summarize: true, estimateTokens: () => 100 });
    const history = [user("one"), assistant("first answer"), ...toolTurn("two"), user("three")];

    const first = await builder.build(buildInput(history, { generateText, onCompacted }));
    const again = await builder.build(buildInput(history, { generateText, onCompacted }));
    const grown = await builder.build(
      buildInput([...history, assistant("answer three"), user("four")], { generateText, onCompacted }),
    );

    expect(first).toEqual([
      user("[Summary of the earlier conversation]\nS1\n[End of summary]\n\nthree"),
    ]);
    expect(again).toEqual(first);
    expect(generateText).toHaveBeenCalledTimes(2);

    const [firstRequest] = generateText.mock.calls[0] as unknown as [{ systemPrompt: string; prompt: string }];
    expect(firstRequest.systemPrompt).toContain("compress conversation history");
    expect(firstRequest.prompt).toContain("User: one");
    expect(firstRequest.prompt).toContain('Assistant called tool search with {"q":"two"}');
    expect(firstRequest.prompt).toContain('Tool search returned: {"hits":"two"}');

    // Only the newly dropped turn is sent, together with the previous summary.
    const [secondRequest] = generateText.mock.calls[1] as unknown as [{ prompt: string }];
    expect(secondRequest.prompt).toContain("Summary so far:\nS1");
    expect(secondRequest.prompt).toContain("User: three\nAssistant: answer three");
    expect(secondRequest.prompt).not.toContain("User: one");
    expect(grown[0].content).toBe("[Summary of the earlier conversation]\nS2\n[End of summary]\n\nfour");

    expect(onCompacted.mock.calls).toEqual([
      [{ droppedMessages: 6, summarized: true }],
      [{ droppedMessages: 8, summarized: true }],
    ]);
  });

  it("falls back to dropping turns when the summary fails", async () => {
    const onCompacted = vi.fn();
    const builder = new TokenBudgetContextBuilder({ maxTokens: 250, summarize: true, estimateTokens: () => 100 });
    const history = [user("one"), assistant("first"), user("two")];

    const result = await builder.build(
      buildInput(history, { generateText: async () => Promise.reject(new Error("rate limited")), onCompacted }),
    );

    expect(result).toEqual([user("two")]);
    expect(onCompacted).toHaveBeenCalledWith({ droppedMessages: 2, summarized: false });
  });

  it("rethrows a failed summary when the run was aborted", async () => {
    const controller = new AbortController();
    const builder = new TokenBudgetContextBuilder({ maxTokens: 250, summarize: true, estimateTokens: () => 100 });
    const generateText = async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    };

    await expect(
      builder.build(buildInput([user("one"), assistant("first"), user("two")], { generateText, signal: controller.signal })),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
