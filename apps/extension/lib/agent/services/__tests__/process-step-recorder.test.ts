import { describe, expect, it } from "vitest";
import { ToolPermissionError } from "@hamhome/agent";
import { createProcessStepRecorder } from "../process-step-recorder";

describe("createProcessStepRecorder", () => {
  it("matches tool results to their step by tool call id, even out of order", () => {
    const recorder = createProcessStepRecorder("en");

    recorder.record({ type: "tool.call.started", toolCallId: "call_a", toolName: "search_bookmarks", input: { q: "a" } });
    recorder.record({ type: "tool.call.started", toolCallId: "call_b", toolName: "search_bookmarks", input: { q: "b" } });
    recorder.record({ type: "tool.call.completed", toolCallId: "call_b", toolName: "search_bookmarks", input: { q: "b" }, output: "B" });
    recorder.record({
      type: "tool.call.failed",
      toolCallId: "call_a",
      toolName: "search_bookmarks",
      input: { q: "a" },
      error: new ToolPermissionError("search_bookmarks", "User rejected the operation."),
    });

    const steps = recorder.finish();
    expect(steps).toHaveLength(2);
    expect(steps[0]).toMatchObject({ input: expect.stringContaining('"a"'), status: "failed", error: "Not approved, so it did not run" });
    expect(steps[1]).toMatchObject({ input: expect.stringContaining('"b"'), status: "completed", output: '"B"' });
  });

  it("falls back to call order per tool name when the model gives no tool call id", () => {
    const recorder = createProcessStepRecorder("en");

    recorder.record({ type: "tool.call.started", toolName: "get_stats", input: 1 });
    recorder.record({ type: "tool.call.started", toolName: "get_stats", input: 2 });
    recorder.record({ type: "tool.call.completed", toolName: "get_stats", input: 1, output: "first" });

    const steps = recorder.finish();
    expect(steps.map((step) => [step.input, step.output, step.status])).toEqual([
      ["1", '"first"', "completed"],
      // Still running when the turn ends, so finish() marks it completed.
      ["2", undefined, "completed"],
    ]);
  });
});
