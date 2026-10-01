import { describe, expect, it } from "vitest";
import { createTurnProgressTracker } from "../turn-progress";

describe("createTurnProgressTracker", () => {
  it("collects streamed answer text and restarts it with each model step", () => {
    const progress = createTurnProgressTracker("en");

    progress.record({ type: "agent.iteration.started", iteration: 1 });
    progress.record({ type: "message.delta", delta: "Let me " });
    progress.record({ type: "message.delta", delta: "search." });
    expect(progress.snapshot().draftAnswer).toBe("Let me search.");

    progress.record({ type: "tool.call.started", toolCallId: "call_1", toolName: "search_bookmarks", input: {} });
    progress.record({ type: "agent.iteration.started", iteration: 2 });
    progress.record({ type: "message.delta", delta: "Found 3." });

    const snapshot = progress.snapshot();
    expect(snapshot.draftAnswer).toBe("Found 3.");
    expect(snapshot.steps.map((step) => [step.type, step.status])).toEqual([
      ["iteration", "completed"],
      ["tool", "running"],
      ["iteration", "completed"],
    ]);
  });

  it("returns step snapshots that later events do not change", () => {
    const progress = createTurnProgressTracker("en");
    progress.record({ type: "tool.call.started", toolCallId: "call_1", toolName: "search_bookmarks", input: {} });

    const before = progress.snapshot();
    progress.record({ type: "tool.call.completed", toolCallId: "call_1", toolName: "search_bookmarks", input: {}, output: [] });

    expect(before.steps[0].status).toBe("running");
    expect(progress.snapshot().steps[0].status).toBe("completed");
  });

  it("records a step when earlier history is condensed", () => {
    const zh = createTurnProgressTracker("zh");
    const en = createTurnProgressTracker("en");

    zh.record({ type: "context.compacted", droppedMessages: 12, summarized: true });
    en.record({ type: "context.compacted", droppedMessages: 4, summarized: false });

    expect(zh.snapshot().steps[0]).toMatchObject({ type: "message", title: "整理较早的对话", content: "已将较早的 12 条消息整理为摘要" });
    expect(en.snapshot().steps[0]).toMatchObject({ content: "4 earlier messages were not sent to the model" });
  });
});
