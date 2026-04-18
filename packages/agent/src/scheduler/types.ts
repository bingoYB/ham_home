import type { EventDispatcher } from "../event";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface TaskDefinition<
  TOutput = unknown,
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  title?: string;
  dependsOn?: string[];
  run: (
    context: TaskExecutionContext<TSharedState>,
  ) => Promise<TOutput> | TOutput;
}

export interface TaskSnapshot<TOutput = unknown> {
  id: string;
  title?: string;
  dependsOn: string[];
  status: TaskStatus;
  result?: TOutput;
  error?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface TaskExecutionContext<
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  taskId: string;
  sharedState: TSharedState;
  results: Readonly<Record<string, unknown>>;
  signal?: AbortSignal;
  getResult<T = unknown>(taskId: string): T | undefined;
  setSharedState(key: string, value: unknown): void;
}

export interface TaskManagerOptions<
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  concurrency?: number;
  stopOnError?: boolean;
  sharedState?: TSharedState;
  signal?: AbortSignal;
  dispatcher?: EventDispatcher<TaskManagerEventMap<TSharedState>>;
}

export interface TaskRunResult<
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  sharedState: TSharedState;
  results: Record<string, unknown>;
  tasks: TaskSnapshot[];
  success: boolean;
}

export interface TaskManagerEventMap<
  TSharedState extends Record<string, unknown> = Record<string, unknown>,
> {
  "scheduler:start": {
    tasks: TaskSnapshot[];
    sharedState: TSharedState;
  };
  "scheduler:finish": TaskRunResult<TSharedState>;
  "task:before": {
    task: TaskSnapshot;
    sharedState: TSharedState;
    results: Readonly<Record<string, unknown>>;
  };
  "task:after": {
    task: TaskSnapshot;
    sharedState: TSharedState;
    results: Readonly<Record<string, unknown>>;
  };
  "task:error": {
    task: TaskSnapshot;
    sharedState: TSharedState;
    results: Readonly<Record<string, unknown>>;
    error: unknown;
  };
  "task:skipped": {
    task: TaskSnapshot;
    sharedState: TSharedState;
    results: Readonly<Record<string, unknown>>;
    reason: string;
  };
}
