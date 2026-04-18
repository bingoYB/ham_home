import { describe, expect, it } from "vitest";
import { HookManager } from "../src/event";
import { TaskManager, type TaskManagerEventMap } from "../src/scheduler";

describe("TaskManager", () => {
  it("should execute tasks based on dependencies and collect results", async () => {
    const manager = new TaskManager<{
      execution: string[];
    }>({
      sharedState: {
        execution: [],
      },
      concurrency: 2,
    });

    manager.registerTasks([
      {
        id: "prepare",
        run: ({ sharedState }) => {
          sharedState.execution.push("prepare");
          return "draft";
        },
      },
      {
        id: "review",
        dependsOn: ["prepare"],
        run: ({ getResult, sharedState }) => {
          sharedState.execution.push("review");
          return `${getResult<string>("prepare")}-reviewed`;
        },
      },
    ]);

    const result = await manager.run();

    expect(result.success).toBe(true);
    expect(result.results.prepare).toBe("draft");
    expect(result.results.review).toBe("draft-reviewed");
    expect(result.sharedState.execution).toEqual(["prepare", "review"]);
  });

  it("should skip downstream tasks when a dependency fails", async () => {
    const events: string[] = [];
    const hooks = new HookManager<TaskManagerEventMap<Record<string, unknown>>>();

    hooks.on("task:error", ({ task }) => {
      events.push(`error:${task.id}`);
    });

    hooks.on("task:skipped", ({ task }) => {
      events.push(`skipped:${task.id}`);
    });

    const manager = new TaskManager({
      dispatcher: hooks,
    });

    manager.registerTasks([
      {
        id: "fail",
        run: () => {
          throw new Error("boom");
        },
      },
      {
        id: "after-fail",
        dependsOn: ["fail"],
        run: () => "never",
      },
    ]);

    const result = await manager.run();
    const snapshots = Object.fromEntries(result.tasks.map((task) => [task.id, task]));

    expect(result.success).toBe(false);
    expect(snapshots.fail.status).toBe("failed");
    expect(snapshots["after-fail"].status).toBe("skipped");
    expect(events).toEqual(["error:fail", "skipped:after-fail"]);
  });
});
