import { logger } from "../utils/logger";
import type {
  TaskDefinition,
  TaskExecutionContext,
  TaskManagerOptions,
  TaskRunResult,
  TaskSnapshot,
} from "./types";

const schedulerLogger = logger.child("scheduler");

/**
 * 通用任务调度器。
 * 支持依赖拓扑、并发执行、失败后跳过下游任务，以及生命周期事件派发。
 */
export class TaskManager<
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  private readonly tasks = new Map<string, TaskDefinition<unknown, TSharedState>>();
  private readonly snapshots = new Map<string, TaskSnapshot>();
  private readonly results: Record<string, unknown> = {};
  private readonly sharedState: TSharedState;
  private readonly concurrency: number;
  private readonly stopOnError: boolean;
  private readonly signal?: AbortSignal;
  private readonly dispatcher?: TaskManagerOptions<TSharedState>["dispatcher"];

  constructor(options: TaskManagerOptions<TSharedState> = {}) {
    this.sharedState = (options.sharedState ?? {}) as TSharedState;
    this.concurrency = Math.max(1, options.concurrency ?? 1);
    this.stopOnError = options.stopOnError ?? false;
    this.signal = options.signal;
    this.dispatcher = options.dispatcher;
  }

  registerTask<TOutput>(task: TaskDefinition<TOutput, TSharedState>): void {
    this.tasks.set(task.id, task as TaskDefinition<unknown, TSharedState>);
    this.snapshots.set(task.id, {
      id: task.id,
      title: task.title,
      dependsOn: [...(task.dependsOn ?? [])],
      status: "pending",
    });
  }

  registerTasks<TOutput>(tasks: TaskDefinition<TOutput, TSharedState>[]): void {
    for (const task of tasks) {
      this.registerTask(task);
    }
  }

  getTask(taskId: string): TaskSnapshot | undefined {
    const snapshot = this.snapshots.get(taskId);
    return snapshot ? { ...snapshot } : undefined;
  }

  listTasks(): TaskSnapshot[] {
    return Array.from(this.snapshots.values()).map((snapshot) => ({ ...snapshot }));
  }

  getResult<T = unknown>(taskId: string): T | undefined {
    return this.results[taskId] as T | undefined;
  }

  async run(): Promise<TaskRunResult<TSharedState>> {
    this.ensureValidGraph();
    this.ensureNotAborted();

    await this.dispatcher?.emit("scheduler:start", {
      tasks: this.listTasks(),
      sharedState: this.sharedState,
    });

    const pending = new Set(this.tasks.keys());
    const running = new Map<string, Promise<void>>();
    let hasFailure = false;

    const launchReadyTasks = async () => {
      await this.markSkippedTasks(pending);

      if (this.stopOnError && hasFailure) {
        return;
      }

      const ready = Array.from(pending).filter((taskId) => this.isReady(taskId));

      while (ready.length > 0 && running.size < this.concurrency) {
        const taskId = ready.shift()!;
        pending.delete(taskId);

        const execution = this.executeTask(taskId)
          .then((success) => {
            if (!success) {
              hasFailure = true;
            }
          })
          .finally(() => {
            running.delete(taskId);
          });

        running.set(taskId, execution);
      }
    };

    await launchReadyTasks();

    while (running.size > 0 || pending.size > 0) {
      if (running.size === 0) {
        throw new Error(
          `Task scheduler is stuck. Remaining tasks: ${Array.from(pending).join(", ")}`,
        );
      }

      await Promise.race(running.values());
      this.ensureNotAborted();
      await launchReadyTasks();
    }

    const result: TaskRunResult<TSharedState> = {
      sharedState: this.sharedState,
      results: { ...this.results },
      tasks: this.listTasks(),
      success: !hasFailure,
    };

    await this.dispatcher?.emit("scheduler:finish", result);
    return result;
  }

  private async executeTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    const snapshot = this.snapshots.get(taskId);

    if (!task || !snapshot) {
      throw new Error(`Unknown task "${taskId}".`);
    }

    snapshot.status = "running";
    snapshot.startedAt = new Date().toISOString();

    await this.dispatcher?.emit("task:before", {
      task: { ...snapshot },
      sharedState: this.sharedState,
      results: this.results,
    });

    try {
      schedulerLogger.debug(`Running task "${taskId}".`);

      const result = await task.run(this.createTaskContext(taskId));

      snapshot.status = "completed";
      snapshot.result = result;
      snapshot.finishedAt = new Date().toISOString();
      this.results[taskId] = result;

      await this.dispatcher?.emit("task:after", {
        task: { ...snapshot },
        sharedState: this.sharedState,
        results: this.results,
      });

      return true;
    } catch (error) {
      snapshot.status = "failed";
      snapshot.error = error instanceof Error ? error.message : String(error);
      snapshot.finishedAt = new Date().toISOString();

      await this.dispatcher?.emit("task:error", {
        task: { ...snapshot },
        sharedState: this.sharedState,
        results: this.results,
        error,
      });

      return false;
    }
  }

  private createTaskContext(taskId: string): TaskExecutionContext<TSharedState> {
    return {
      taskId,
      sharedState: this.sharedState,
      results: this.results,
      signal: this.signal,
      getResult: <T = unknown>(id: string) => this.results[id] as T | undefined,
      setSharedState: (key: string, value: unknown) => {
        (this.sharedState as Record<string, unknown>)[key] = value;
      },
    };
  }

  private async markSkippedTasks(pending: Set<string>): Promise<void> {
    for (const taskId of Array.from(pending)) {
      const snapshot = this.snapshots.get(taskId);

      if (!snapshot) {
        continue;
      }

      const failedDependency = snapshot.dependsOn.find((dependencyId) => {
        const dependency = this.snapshots.get(dependencyId);
        return dependency?.status === "failed" || dependency?.status === "skipped";
      });

      if (!failedDependency) {
        continue;
      }

      snapshot.status = "skipped";
      snapshot.error = `Skipped because dependency "${failedDependency}" did not complete successfully.`;
      snapshot.finishedAt = new Date().toISOString();
      pending.delete(taskId);

      await this.dispatcher?.emit("task:skipped", {
        task: { ...snapshot },
        sharedState: this.sharedState,
        results: this.results,
        reason: snapshot.error,
      });
    }
  }

  private isReady(taskId: string): boolean {
    const snapshot = this.snapshots.get(taskId);

    if (!snapshot || snapshot.status !== "pending") {
      return false;
    }

    return snapshot.dependsOn.every((dependencyId) => {
      const dependency = this.snapshots.get(dependencyId);
      return dependency?.status === "completed";
    });
  }

  private ensureValidGraph(): void {
    for (const [taskId, task] of this.tasks.entries()) {
      for (const dependencyId of task.dependsOn ?? []) {
        if (!this.tasks.has(dependencyId)) {
          throw new Error(
            `Task "${taskId}" depends on unknown task "${dependencyId}".`,
          );
        }
      }
    }

    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string) => {
      if (visited.has(taskId)) {
        return;
      }

      if (visiting.has(taskId)) {
        throw new Error(`Circular task dependency detected at "${taskId}".`);
      }

      visiting.add(taskId);

      const task = this.tasks.get(taskId);
      for (const dependencyId of task?.dependsOn ?? []) {
        visit(dependencyId);
      }

      visiting.delete(taskId);
      visited.add(taskId);
    };

    for (const taskId of this.tasks.keys()) {
      visit(taskId);
    }
  }

  private ensureNotAborted(): void {
    if (this.signal?.aborted) {
      throw new Error("Task scheduler aborted.");
    }
  }
}
