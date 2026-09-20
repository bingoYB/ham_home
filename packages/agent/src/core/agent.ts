import type { LanguageModel } from "ai";
import { CommandRegistry } from "../tools/commands";
import { ToolExecutionError, ToolNotFoundError } from "./errors";
import { EventBus } from "./events";
import { InMemory } from "../memory/memory";
import { AiSdkModelClient } from "../llm/model";
import { PageToolManager } from "../pages/pages";
import { AgentSkillRuntime, createDiscoverSkillTool, createSkillViewTool } from "../skills/skills";
import { ToolRegistry } from "../tools/tools";
import { validateJsonSchema } from "../utils/schema";
import type {
  AgentConfig,
  AgentEvent,
  AgentMessage,
  AgentRunOptions,
  AgentRunResult,
  JsonSchema,
  MemoryEntry,
  MemorySession,
  ModelClient,
  ToolExecutionContext,
  ToolCallSummary,
  AgentTool,
  SkillRequestContext,
} from "./types";

interface InternalRunOptions extends AgentRunOptions {
  model?: string | LanguageModel;
  outputSchema?: JsonSchema;
  invocationMode?: "response" | "chat" | "auto";
  sessionId?: string;
  ignoreBaseSystemPrompt?: boolean;
}

type ModelCallMode = "generate" | "stream";

/**
 * Main runtime entry for conversation, tool execution, page tools and commands.
 *
 * Example:
 * ```ts
 * const agent = createAgent({ model: "gpt-4.1-mini", systemPrompt: "You help users on this page." });
 * const result = await agent.run("总结当前页面");
 * ```
 */
export class Agent {
  readonly agentId: string;
  readonly events = new EventBus();
  readonly tools: ToolRegistry;
  readonly pages: PageToolManager;
  readonly commands: CommandRegistry;
  readonly skills: AgentSkillRuntime;

  private activeSessionId: string;
  private readonly memory;
  private readonly modelClient: ModelClient;
  private readonly defaultMaxIterations: number;
  private readonly defaultTemperature?: number;
  private readonly baseSystemPrompt?: string;
  private fixedInvocationMode?: "response" | "chat";
  private pendingApprovals = new Map<string, (approved: boolean) => void>();

  constructor(private readonly config: AgentConfig) {
    this.agentId = config.agentId ?? createId("agent");
    this.activeSessionId = config.sessionId ?? createId("session");
    this.memory = config.memory ?? new InMemory({ maxMessages: 40 });
    this.modelClient = config.modelClient ?? new AiSdkModelClient(config);
    this.defaultMaxIterations = config.maxIterations ?? 5;
    this.defaultTemperature = config.temperature;
    this.baseSystemPrompt = config.systemPrompt;
    this.tools = new ToolRegistry(this.events);
    this.pages = new PageToolManager(this.tools, this.events);
    this.skills = new AgentSkillRuntime({
      matcher: config.skillMatcher,
      store: config.skillStore,
      events: this.events,
    });
    this.commands = new CommandRegistry(this);

    // Register initial tools from config
    config.tools?.forEach((tool) => this.tools.register(tool));
    config.skills?.forEach((skill) => {
      this.skills.register(skill);
      skill.pages?.forEach((page) => this.pages.register(page));
    });
  }

  get sessionId(): string {
    return this.activeSessionId;
  }

  on(handler: (event: AgentEvent) => void): () => void {
    return this.events.on(handler);
  }



  setInvocationMode(mode: "chat" | "response" | "auto"): void {
    if (mode === "auto") {
      this.fixedInvocationMode = undefined;
    } else {
      this.fixedInvocationMode = mode;
    }
    this.events.emit({
      type: "agent.invocationMode.fixed",
      mode: this.fixedInvocationMode ?? "chat",
    });
  }

  approveToolCall(toolCallId: string, approved: boolean = true): void {
    const resolve = this.pendingApprovals.get(toolCallId);
    if (resolve) {
      resolve(approved);
      this.pendingApprovals.delete(toolCallId);
    }
  }

  async run<TOutput = unknown>(input: string, options: AgentRunOptions = {}): Promise<AgentRunResult<TOutput>> {
    return this.runInternal<TOutput>(input, options, "generate");
  }

  /**
   * Runs the agent and yields lifecycle events as they happen.
   *
   * Example:
   * ```ts
   * for await (const event of agent.runStream("hello")) console.log(event.type);
   * ```
   */
  async *runStream(input: string, options: AgentRunOptions = {}): AsyncIterable<AgentEvent> {
    const queue: AgentEvent[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let failure: Error | undefined;
    const off = this.on((event) => {
      queue.push(event);
      wake?.();
    });

    try {
      void this.runInternal(input, options, "stream")
        .catch((error: unknown) => {
          failure = error instanceof Error ? error : new Error(String(error));
        })
        .finally(() => {
          done = true;
          wake?.();
        });

      while (!done || queue.length > 0) {
        if (queue.length === 0) {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
          wake = undefined;
          continue;
        }
        yield queue.shift() as AgentEvent;
      }

      if (failure) {
        throw failure;
      }
    } finally {
      off();
    }
  }

  clearMemory(): Promise<void> | void {
    return this.memory.clear({ sessionId: this.sessionId });
  }

  exportMemory(): Promise<AgentMessage[]> | AgentMessage[] {
    return this.memory.get({ sessionId: this.sessionId });
  }

  /**
   * Exports render-ready memory entries for the active session.
   *
   * Example:
   * ```ts
   * const entries = await agent.exportMemoryEntries();
   * entries[0].message.content;
   * ```
   */
  exportMemoryEntries(): Promise<MemoryEntry[]> | MemoryEntry[] {
    return this.memory.getEntries?.({ sessionId: this.sessionId }) ?? [];
  }

  /**
   * Creates a new conversation session and switches the agent to it.
   *
   * Example:
   * ```ts
   * const session = await agent.createSession({ title: "Checkout help" });
   * ```
   */
  async createSession(session: Partial<MemorySession> = {}): Promise<MemorySession> {
    const created = this.memory.createSession
      ? await this.memory.createSession(session)
      : { id: session.id ?? createId("session"), title: session.title, createdAt: Date.now(), updatedAt: Date.now(), metadata: session.metadata };
    this.activeSessionId = created.id;
    return created;
  }

  /**
   * Switches future runs, memory exports, and tool context to an existing session.
   */
  async switchSession(sessionId: string): Promise<void> {
    if (this.memory.getSession) {
      const session = await this.memory.getSession(sessionId);
      if (!session && this.memory.createSession) {
        await this.memory.createSession({ id: sessionId });
      } else if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
    } else if (this.memory.createSession) {
      await this.memory.createSession({ id: sessionId });
    }

    this.activeSessionId = sessionId;
  }

  /**
   * Lists known sessions, ordered by most recently updated first when the
   * backing memory supports session metadata.
   */
  listSessions(): Promise<MemorySession[]> | MemorySession[] {
    return this.memory.listSessions?.() ?? [];
  }

  /**
   * Deletes a conversation session and switches to the newest remaining session.
   */
  async deleteSession(sessionId: string): Promise<void> {
    if (!this.memory.deleteSession) {
      await this.memory.clear();
    } else {
      await this.memory.deleteSession(sessionId);
    }

    if (this.activeSessionId === sessionId) {
      const sessions = this.memory.listSessions ? await this.memory.listSessions() : [];
      this.activeSessionId = sessions[0]?.id ?? createId("session");
      if (this.memory.createSession && sessions.length === 0) {
        await this.memory.createSession({ id: this.activeSessionId });
      }
    }
  }

  async runCommand<TOutput = unknown>(
    input: string,
    options: InternalRunOptions,
  ): Promise<AgentRunResult<TOutput>> {
    return this.runInternal<TOutput>(input, options, "generate");
  }

  private async runInternal<TOutput = unknown>(
    input: string,
    options: InternalRunOptions = {},
    modelCallMode: ModelCallMode = "generate",
  ): Promise<AgentRunResult<TOutput>> {
    const isDebug = options.debug ?? this.config.debug ?? false;
    let debugOff: (() => void) | undefined;

    if (isDebug) {
      console.log(`[Agent.run] User initiated request: "${input}"`);
      debugOff = this.on((event) => {
        if (event.type === "tool.call.started") {
          console.log(`[Agent.run] Tool call started: ${event.toolName} with input:`, event.input);
        } else if (event.type === "tool.call.completed") {
          console.log(`[Agent.run] Tool call completed: ${event.toolName} with output:`, event.output);
        } else if (event.type === "tool.call.failed") {
          console.error(`[Agent.run] Tool call failed: ${event.toolName} with error:`, event.error);
        } else if (event.type === "agent.iteration.started") {
          console.log(`[Agent.run] Iteration started: ${event.iteration}`);
        }
      });
    }

    try {
      const userMessage: AgentMessage = {
        role: "user",
        content: input,
        attachments: options.attachments,
        metadata: options.metadata,
      };
      await this.memory.add(userMessage, { sessionId: this.sessionId });

      const skillContext = this.resolveSkillContext(input, options);
      const skillReconcile = await this.reconcileSkills(skillContext);
      const skillPromptIndex = this.skills.buildPromptIndex();
      const systemPrompt = mergePrompts(this.baseSystemPrompt, this.pages.currentSystemPrompt, skillPromptIndex, options.systemPrompt);
      const toolContext = this.createToolContext(options.signal, options.metadata, skillContext);
      const runTools = this.resolveRunTools(skillReconcile.mountedTools.map((mounted) => mounted.tool), options.tools);

      const targetMode = options.invocationMode ?? this.config.invocationMode ?? "auto";
      let currentMode: "response" | "chat" = targetMode === "auto" ? (this.fixedInvocationMode ?? "response") : targetMode;

      const maxIterations = options.maxIterations ?? this.defaultMaxIterations;
      let iteration = 0;

      let finalResultText = "";
      let finalOutput: TOutput | undefined;
      const allToolCalls: ToolCallSummary[] = [];
      let accumulatedUsage: any = undefined;
      let lastAssistantMessage: AgentMessage | undefined;

      while (iteration < maxIterations) {
        this.events.emit({ type: "agent.iteration.started", iteration: iteration + 1 });

        const callModel = async (mode: "response" | "chat") => {
          const params = {
            model: options.model ?? this.config.model,
            systemPrompt,
            messages: await this.memory.get({ sessionId: this.sessionId }),
            tools: runTools.tools,
            activeToolNames: runTools.activeToolNames,
            maxIterations: 1,
            temperature: options.temperature ?? this.defaultTemperature,
            signal: options.signal,
            toolContext,
            outputSchema: options.outputSchema,
            emit: (event: AgentEvent) => this.events.emit(event),
            invocationMode: mode,
          };

          if (modelCallMode === "stream") {
            if (!this.modelClient.stream) {
              throw new Error("The configured modelClient does not support runStream.");
            }
            return this.modelClient.stream<TOutput>(params);
          }

          return this.modelClient.generate<TOutput>(params);
        };

        let result;
        try {
          result = await callModel(currentMode);
          if (targetMode === "auto" && !this.fixedInvocationMode) {
            this.fixedInvocationMode = currentMode;
            this.events.emit({ type: "agent.invocationMode.fixed", mode: currentMode });
          }
        } catch (error: any) {
          if (targetMode === "auto" && !this.fixedInvocationMode && currentMode === "response") {
            console.log(`[Agent.run] Model call failed in "response" mode, switching to "chat" mode and retrying...`, error);
            currentMode = "chat";
            result = await callModel(currentMode);
            this.fixedInvocationMode = currentMode;
            this.events.emit({ type: "agent.invocationMode.fixed", mode: currentMode });
          } else {
            throw error;
          }
        }

        finalResultText = result.text;
        if (result.output) {
          finalOutput = result.output;
        }

        if (result.usage) {
          if (!accumulatedUsage) {
            accumulatedUsage = { ...result.usage };
          } else if (typeof (result.usage as any).promptTokens === "number") {
            accumulatedUsage.promptTokens = (accumulatedUsage.promptTokens || 0) + ((result.usage as any).promptTokens || 0);
            accumulatedUsage.completionTokens = (accumulatedUsage.completionTokens || 0) + ((result.usage as any).completionTokens || 0);
            accumulatedUsage.totalTokens = (accumulatedUsage.totalTokens || 0) + ((result.usage as any).totalTokens || 0);
          }
        }

        const assistantMessage: AgentMessage = {
          role: "assistant",
          content: result.text,
          metadata: { toolCalls: result.toolCalls },
        };
        lastAssistantMessage = assistantMessage;

        await this.memory.add(assistantMessage, { sessionId: this.sessionId });

        if (!result.toolCalls || result.toolCalls.length === 0) {
          break;
        }

        for (const call of result.toolCalls) {
          allToolCalls.push(call);

          this.events.emit({ type: "tool.call.started", toolName: call.toolName, input: call.input });

          try {
            const specificToolContext = this.createToolContext(options.signal, options.metadata, skillContext, call.toolCallId);
            const output = await this.executeRunTool(runTools.toolMap, call.toolName, call.input, specificToolContext);
            call.output = output;
            this.events.emit({ type: "tool.call.completed", toolName: call.toolName, input: call.input, output });
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            const wrapped = error.name === "ToolExecutionError" || error.name === "ToolNotFoundError" || error.name === "ToolValidationError"
              ? error
              : new ToolExecutionError(call.toolName, error);

            call.error = wrapped.message;
            this.events.emit({ type: "tool.call.failed", toolName: call.toolName, input: call.input, error: wrapped });
          }

          await this.memory.add(
            {
              role: "tool",
              content: JSON.stringify(call.error ? { error: call.error } : call.output),
              metadata: { toolCallId: call.toolCallId, toolName: call.toolName, input: call.input },
            },
            { sessionId: this.sessionId },
          );
        }

        iteration++;
      }

      const runResult: AgentRunResult<TOutput> = {
        text: finalResultText,
        output: finalOutput,
        rawMessage: lastAssistantMessage!,
        toolCalls: allToolCalls,
        usage: accumulatedUsage,
      };

      if (lastAssistantMessage) {
        this.events.emit({ type: "message.completed", message: lastAssistantMessage });
      }
      this.events.emit({ type: "agent.completed", result: runResult });

      if (isDebug) {
        console.log(`[Agent.run] Request completed with text: "${runResult.text}"`);
      }
      return runResult;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      this.events.emit({ type: "agent.failed", error: normalized });

      if (isDebug) {
        console.error(`[Agent.run] Request failed with error:`, normalized);
      }
      throw normalized;
    } finally {
      debugOff?.();
    }
  }

  private resolveSkillContext(input: string, options: InternalRunOptions): SkillRequestContext {
    return {
      pageId: options.skillContext?.pageId ?? this.pages.currentPageId,
      moduleId: options.skillContext?.moduleId,
      url: options.skillContext?.url,
      intent: options.skillContext?.intent,
      userInput: options.skillContext?.userInput ?? input,
      tags: options.skillContext?.tags,
      metadata: options.skillContext?.metadata,
    };
  }

  private async reconcileSkills(context: SkillRequestContext) {
    if (this.config.dynamicCapabilities?.enabled === false) {
      return {
        activeSkills: this.skills.listActive(),
        mountedTools: [],
        mountedSkillIds: [],
        unmountedSkillIds: [],
        mountedToolNames: [],
        unmountedToolNames: [],
      };
    }

    return this.skills.reconcile(context);
  }

  private resolveRunTools(skillTools: AgentTool[], activeToolNames?: string[]) {
    const skillViewEnabled = this.config.skillView?.enabled !== false && this.config.dynamicCapabilities?.enabled !== false;
    const discoverSkillEnabled = (this.config.discoverSkill?.enabled ?? this.config.findSkill?.enabled) !== false && this.config.dynamicCapabilities?.enabled !== false;
    const skillViewTool = skillViewEnabled
      ? createSkillViewTool(this, { allowInactive: this.config.skillView?.allowInactive })
      : undefined;
    const discoverSkillTool = discoverSkillEnabled ? createDiscoverSkillTool(this) : undefined;
    // Skill tools are request-local capabilities. They are visible to this model
    // call and executable through the run-local map, but never registered as
    // global tools that could survive a later page or Skill change.
    const unrestrictedTools = [
      ...this.tools.list(),
      ...skillTools,
      ...(skillViewTool ? [skillViewTool] : []),
      ...(discoverSkillTool ? [discoverSkillTool] : []),
    ];
    const shouldKeepSkillView = this.config.skillView?.keepWhenToolsRestricted !== false;
    const shouldKeepDiscoverSkill = (this.config.discoverSkill?.keepWhenToolsRestricted ?? this.config.findSkill?.keepWhenToolsRestricted) !== false;
    const allowed = activeToolNames ? new Set(activeToolNames) : undefined;
    const tools = !allowed
      ? unrestrictedTools
      : unrestrictedTools.filter(
        (tool) =>
          allowed.has(tool.name) ||
          (shouldKeepSkillView && tool.name === "skill_view") ||
          (shouldKeepDiscoverSkill && tool.name === "discoverSkill"),
      );
    const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
    const retainedToolNames = [
      ...(shouldKeepSkillView && skillViewTool ? ["skill_view"] : []),
      ...(shouldKeepDiscoverSkill && discoverSkillTool ? ["discoverSkill"] : []),
    ];

    return {
      tools,
      toolMap,
      activeToolNames: activeToolNames ? [...new Set([...activeToolNames, ...retainedToolNames])] : activeToolNames,
    };
  }

  private async executeRunTool(
    toolMap: Map<string, AgentTool>,
    toolName: string,
    input: unknown,
    context: ToolExecutionContext,
  ): Promise<unknown> {
    const tool = toolMap.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    validateJsonSchema(tool.parameters, input);

    if (this.config.securityPolicy) {
      const permission = await this.config.securityPolicy.getToolPermission(toolName, input, context);
      if (permission.mode === "deny") {
        throw new Error(`Tool execution denied: ${permission.reason ?? "Security policy blocked execution."}`);
      }
      if (permission.mode === "ask") {
        const onAskHandler = (this.config.securityPolicy as any).onAsk;
        let approved = false;
        if (onAskHandler && typeof onAskHandler === "function") {
            approved = await onAskHandler(toolName, input, context, permission.reason);
        } else if (context.toolCallId) {
            approved = await new Promise<boolean>((resolve) => {
                this.pendingApprovals.set(context.toolCallId!, resolve);
                this.events.emit({
                    type: "tool.call.requires_action",
                    toolCallId: context.toolCallId!,
                    toolName,
                    input,
                    reason: permission.reason,
                });
            });
            this.pendingApprovals.delete(context.toolCallId);
        }
        if (!approved) {
           throw new Error(`Tool execution denied: User rejected the operation.`);
        }
      }
    }

    let currentInput = input;
    const interceptors = this.config.interceptors ?? [];
    for (const interceptor of interceptors) {
      if (interceptor.beforeExecute) {
        currentInput = await interceptor.beforeExecute(toolName, currentInput, context);
      }
    }

    let output = await tool.execute(currentInput, context);

    for (const interceptor of [...interceptors].reverse()) {
      if (interceptor.afterExecute) {
        output = await interceptor.afterExecute(toolName, currentInput, output, context);
      }
    }

    return output;
  }

  private createToolContext(
    signal: AbortSignal | undefined,
    metadata: Record<string, unknown> | undefined,
    skillContext: SkillRequestContext,
    toolCallId?: string
  ): ToolExecutionContext {
    return {
      agentId: this.agentId,
      sessionId: this.sessionId,
      toolCallId,
      pageId: skillContext.pageId ?? this.pages.currentPageId,
      moduleId: skillContext.moduleId,
      url: skillContext.url ? String(skillContext.url) : undefined,
      intent: skillContext.intent,
      signal,
      metadata,
    };
  }
}

export function createAgent(config: AgentConfig): Agent {
  return new Agent(config);
}

function mergePrompts(...prompts: Array<string | undefined>): string | undefined {
  const merged = prompts.filter(Boolean).join("\n\n");
  return merged.length > 0 ? merged : undefined;
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
