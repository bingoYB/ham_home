import { ToolNotFoundError, ToolValidationError } from "../core/errors";
import { validateJsonSchema } from "../utils/schema";
import type {
  AgentEvent,
  AgentTool,
  RegisterConflictStrategy,
  ToolExecutionContext,
  ToolInterceptor,
  ToolScope,
} from "../core/types";

export interface ToolRegisterOptions {
  onConflict?: RegisterConflictStrategy;
  namespace?: string;
}

/**
 * Runtime registry for tool registration, lookup, scoped cleanup and execution.
 *
 * Example:
 * ```ts
 * const unregister = registry.register({ name: "readPage", description: "...", execute: () => document.title });
 * unregister();
 * ```
 */
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();

  constructor(
    private readonly events?: { emit(event: AgentEvent): void },
    private readonly interceptors: ToolInterceptor[] = []
  ) {}

  register<TInput, TOutput>(tool: AgentTool<TInput, TOutput>, options: ToolRegisterOptions = {}): () => void {
    const name = this.resolveName(tool.name, options);
    const normalizedTool = { ...tool, name };

    if (this.tools.has(name) && options.onConflict !== "replace") {
      throw new ToolValidationError(`Tool "${name}" is already registered.`);
    }

    this.tools.set(name, normalizedTool);
    this.events?.emit({ type: "tool.registered", toolName: name, scope: normalizedTool.scope });

    return () => this.unregister(name);
  }

  registerMany(tools: AgentTool[], options: ToolRegisterOptions = {}): () => void {
    const unregisters = tools.map((tool) => this.register(tool, options));
    return () => unregisters.forEach((unregister) => unregister());
  }

  unregister(toolName: string): boolean {
    const deleted = this.tools.delete(toolName);
    if (deleted) {
      this.events?.emit({ type: "tool.unregistered", toolName });
    }
    return deleted;
  }

  unregisterMany(toolNames: string[]): void {
    toolNames.forEach((toolName) => this.unregister(toolName));
  }

  unregisterByScope(scope: ToolScope): void {
    for (const tool of this.listByScope(scope)) {
      this.unregister(tool.name);
    }
  }

  unregisterByPage(pageId: string): void {
    this.unregisterByScope({ type: "page", pageId });
  }

  get(toolName: string): AgentTool | undefined {
    return this.tools.get(toolName);
  }

  list(): AgentTool[] {
    return [...this.tools.values()];
  }

  listByScope(scope: ToolScope): AgentTool[] {
    return this.list().filter((tool) => tool.scope && isSameScope(tool.scope, scope));
  }

  listForModel(activeToolNames?: string[]): AgentTool[] {
    if (!activeToolNames) {
      return this.list();
    }

    const allowed = new Set(activeToolNames);
    return this.list().filter((tool) => allowed.has(tool.name));
  }

  getMetadata(): Array<Omit<AgentTool, "execute">> {
    return this.list().map(({ execute: _execute, ...tool }) => tool);
  }

  async execute(toolName: string, input: unknown, context: ToolExecutionContext): Promise<unknown> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    validateJsonSchema(tool.parameters, input);

    let currentInput = input;

    // Execute beforeExecute interceptors
    for (const interceptor of this.interceptors) {
      if (interceptor.beforeExecute) {
        currentInput = await interceptor.beforeExecute(toolName, currentInput, context) ?? currentInput;
      }
    }

    let output = await tool.execute(currentInput, context);

    // Execute afterExecute interceptors (in reverse order)
    for (let i = this.interceptors.length - 1; i >= 0; i--) {
      const interceptor = this.interceptors[i];
      if (interceptor.afterExecute) {
        output = await interceptor.afterExecute(toolName, currentInput, output, context) ?? output;
      }
    }

    return output;
  }

  private resolveName(name: string, options: ToolRegisterOptions): string {
    if (!this.tools.has(name) || options.onConflict === "replace") {
      return name;
    }

    if (options.onConflict === "namespace") {
      const namespace = options.namespace ?? "tool";
      return `${namespace}.${name}`;
    }

    return name;
  }
}

function isSameScope(left: ToolScope, right: ToolScope): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}
