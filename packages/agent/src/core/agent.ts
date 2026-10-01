import type { LanguageModel } from "ai";
import { CommandRegistry } from "../tools/commands";
import { ToolExecutionError, ToolNotFoundError, ToolPermissionError } from "./errors";
import { EventBus } from "./events";
import { TokenBudgetContextBuilder } from "../memory/context-window";
import { InMemory } from "../memory/memory";
import { AiSdkModelClient } from "../llm/model";
import { PageToolManager } from "../pages/pages";
import {
  AgentSkillRuntime,
  PINNED_SKILL_REASON,
  createActivateSkillTool,
  createDiscoverSkillTool,
  createSkillViewTool,
} from "../skills/skills";
import { ToolRegistry, executeWithInterceptors } from "../tools/tools";
import { createAbortError, forwardAbort, throwIfAborted, waitUnlessAborted } from "../utils/abort";
import { validateJsonSchema } from "../utils/schema";
import { mergeUsage } from "../utils/usage";
import type {
  AgentConfig,
  AgentEvent,
  AgentMessage,
  AgentRunOptions,
  AgentRunResult,
  JsonSchema,
  Memory,
  MemoryEntry,
  MemorySession,
  ContextBuilder,
  ModelClient,
  ModelGenerateRequest,
  ModelGenerateResult,
  SecurityPolicy,
  SkillReconcileResult,
  ToolExecutionContext,
  ToolCallSummary,
  AgentTool,
  SkillRequestContext,
} from "./types";

interface InternalRunOptions extends AgentRunOptions {
  model?: string | LanguageModel;
  outputSchema?: JsonSchema;
  invocationMode?: "response" | "chat" | "auto";
  /** Session the run reads and writes. Defaults to the active session. */
  sessionId?: string;
  /** Memory the run reads and writes. Defaults to the agent's memory. */
  memory?: Memory;
  ignoreBaseSystemPrompt?: boolean;
}

/** Per-run values copied into every tool execution context of the run. */
interface RunToolContext {
  runId: string;
  sessionId: string;
  signal?: AbortSignal;
  metadata?: Record<string, unknown>;
  skillContext: SkillRequestContext;
}

type ModelCallMode = "generate" | "stream";

/** Appended to the system prompt of the extra step that follows an exhausted tool loop. */
const FINAL_ANSWER_INSTRUCTION =
  "The tool-call limit for this request has been reached. Do not call any more tools. " +
  "Answer the user now using the tool results gathered so far, and briefly say what is still missing if the task is incomplete.";

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
  private readonly contextBuilder?: ContextBuilder;
  private readonly defaultMaxIterations: number;
  private readonly defaultTemperature?: number;
  private readonly baseSystemPrompt?: string;
  private fixedInvocationMode?: "response" | "chat";
  private pendingApprovals = new Map<string, (approved: boolean) => void>();
  /** Skills the model activated, per session, kept active in later runs. */
  private readonly pinnedSkillsBySession = new Map<string, string[]>();

  constructor(private readonly config: AgentConfig) {
    this.agentId = config.agentId ?? createId("agent");
    this.activeSessionId = config.sessionId ?? createId("session");
    this.memory = config.memory ?? new InMemory({ maxMessages: 40 });
    this.modelClient = config.modelClient ?? new AiSdkModelClient(config);
    this.contextBuilder =
      config.contextBuilder ?? (config.contextWindow ? new TokenBudgetContextBuilder(config.contextWindow) : undefined);
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
   * Runs the agent and yields this run's lifecycle events as they happen.
   * Only events stamped with this run's `runId` are yielded, so concurrent
   * runs on the same agent never leak into each other's stream. Leaving the
   * loop early (`break`, `return` or a thrown error) aborts the run, so an
   * abandoned stream stops calling the model and tools.
   *
   * Example:
   * ```ts
   * for await (const event of agent.runStream("hello")) console.log(event.type);
   * ```
   */
  async *runStream(input: string, options: AgentRunOptions = {}): AsyncIterable<AgentEvent> {
    const runId = options.runId ?? createId("run");
    const controller = new AbortController();
    const stopForwarding = forwardAbort(options.signal, controller);
    const queue: AgentEvent[] = [];
    let wake: (() => void) | undefined;
    let done = false;
    let failure: Error | undefined;
    const off = this.on((event) => {
      if (event.runId !== runId) {
        return;
      }
      queue.push(event);
      wake?.();
    });

    try {
      void this.runInternal(input, { ...options, runId, signal: controller.signal }, "stream")
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
      stopForwarding();
      if (!done) {
        controller.abort(createAbortError("The run stream was closed before the run finished."));
      }
    }
  }

  clearMemory(): Promise<void> | void {
    this.pinnedSkillsBySession.delete(this.sessionId);
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
    this.pinnedSkillsBySession.delete(sessionId);
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
    const runId = options.runId ?? createId("run");
    // Stamping the run id lets listeners on a shared agent tell concurrent
    // runs apart.
    const emit = (event: AgentEvent) => this.events.emit({ ...event, runId });
    // Isolated commands pass a throwaway memory instead of the session's.
    const memory = options.memory ?? this.memory;
    const sessionId = options.sessionId ?? this.sessionId;
    // A command on a throwaway memory is not part of the conversation, so it
    // neither uses nor updates the session's pinned Skills.
    const usesSessionMemory = options.memory === undefined;
    const isDebug = options.debug ?? this.config.debug ?? false;
    let debugOff: (() => void) | undefined;

    if (isDebug) {
      console.log(`[Agent.run] User initiated request: "${input}"`);
      debugOff = this.on((event) => {
        if (event.runId !== runId) {
          return;
        }
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
      await memory.add(userMessage, { sessionId });

      const skillContext = this.resolveSkillContext(input, options);
      const requestedPinnedSkillIds =
        options.skillContext?.pinnedSkillIds ??
        (usesSessionMemory ? this.pinnedSkillsBySession.get(sessionId) : undefined) ??
        [];
      const skillReconcile = await this.reconcileSkills(skillContext, runId, requestedPinnedSkillIds);
      const runContext: RunToolContext = { runId, sessionId, signal: options.signal, metadata: options.metadata, skillContext };
      const toolContext = this.createToolContext(runContext);

      // Skills matched by this request's rules. Every other active Skill was
      // chosen by the model, in this run (activateSkill) or an earlier one
      // (pinned), and its tools are exposed even when `options.tools`
      // restricts the run.
      const ruleMatchedSkillIds = new Set(
        skillReconcile.activeSkills
          .filter((active) => active.reason !== PINNED_SKILL_REASON)
          .map((active) => active.skill.id),
      );
      const modelChosenToolNames = () =>
        this.skills
          .listActive()
          .filter((active) => !ruleMatchedSkillIds.has(active.skill.id))
          .flatMap((active) => active.mountedTools);
      const initialActiveSkillIds = new Set(this.skills.listActive().map((active) => active.skill.id));

      let runTools = this.resolveRunTools(
        skillReconcile.mountedTools.map((mounted) => mounted.tool),
        options.tools,
        modelChosenToolNames(),
      );
      const buildSystemPrompt = () =>
        mergePrompts(
          options.ignoreBaseSystemPrompt ? undefined : this.baseSystemPrompt,
          this.pages.currentSystemPrompt,
          this.skills.buildPromptIndex({
            skillViewEnabled: runTools.toolMap.has("skill_view"),
            discoverSkillEnabled: runTools.toolMap.has("discoverSkill"),
            activateSkillEnabled: runTools.toolMap.has("activateSkill"),
          }),
          options.systemPrompt,
        );
      let systemPrompt = buildSystemPrompt();

      let activeSkillKey = [...initialActiveSkillIds].join(",");
      // After an activateSkill call, the next step sees the Skill's tools and
      // its prompt index entry. Tools offered earlier stay available, so past
      // tool calls in the history keep a matching definition.
      const refreshAfterActivation = () => {
        const activeSkills = this.skills.listActive();
        const key = activeSkills.map((active) => active.skill.id).join(",");
        if (key === activeSkillKey) {
          return;
        }
        activeSkillKey = key;

        const next = this.resolveRunTools(
          this.skills.listMountedTools().map((mounted) => mounted.tool),
          options.tools,
          modelChosenToolNames(),
        );
        for (const tool of runTools.tools) {
          if (!next.toolMap.has(tool.name)) {
            next.tools.push(tool);
            next.toolMap.set(tool.name, tool);
          }
        }
        if (next.activeToolNames && runTools.activeToolNames) {
          next.activeToolNames = [...new Set([...runTools.activeToolNames, ...next.activeToolNames])];
        }
        runTools = next;
        systemPrompt = buildSystemPrompt();
      };

      const targetMode = options.invocationMode ?? this.config.invocationMode ?? "auto";
      let currentMode: "response" | "chat" = targetMode === "auto" ? (this.fixedInvocationMode ?? "response") : targetMode;

      const maxIterations = options.maxIterations ?? this.defaultMaxIterations;
      let iteration = 0;
      // Whether the latest model step asked for tools. Still true after the
      // loop means it stopped on maxIterations instead of on an answer.
      let hasPendingToolCalls = false;

      let finalResultText = "";
      let finalOutput: TOutput | undefined;
      const allToolCalls: ToolCallSummary[] = [];
      let accumulatedUsage: AgentRunResult["usage"];
      let lastAssistantMessage: AgentMessage | undefined;

      // One plain completion with the run's model; context builders use it,
      // e.g. to summarize turns that no longer fit.
      const generateText = async (request: { systemPrompt: string; prompt: string; signal?: AbortSignal }) => {
        const result = await this.modelClient.generate({
          model: options.model ?? this.config.model,
          systemPrompt: request.systemPrompt,
          messages: [{ role: "user", content: request.prompt }],
          tools: [],
          maxIterations: 1,
          signal: request.signal ?? options.signal,
          toolContext,
          invocationMode: currentMode,
        });
        accumulatedUsage = mergeUsage(accumulatedUsage, result.usage);
        return result.text;
      };

      // History sent with a model step: the stored session, fitted to the
      // context window when a builder is configured. It is never stored.
      const loadContext = async (): Promise<AgentMessage[]> => {
        const history = await memory.get({ sessionId });
        if (!this.contextBuilder) {
          return history;
        }
        return this.contextBuilder.build({
          sessionId,
          userInput: input,
          pageId: this.pages.currentPageId,
          messages: history,
          activeSkills: this.skills.listActive(),
          signal: options.signal,
          generateText,
          onCompacted: (info) => emit({ type: "context.compacted", ...info }),
        });
      };

      const callModel = async (
        mode: "response" | "chat",
        stepSystemPrompt: string | undefined,
      ): Promise<ModelGenerateResult<TOutput>> => {
        const params: ModelGenerateRequest = {
          model: options.model ?? this.config.model,
          systemPrompt: stepSystemPrompt,
          messages: await loadContext(),
          tools: runTools.tools,
          activeToolNames: runTools.activeToolNames,
          maxIterations: 1,
          temperature: options.temperature ?? this.defaultTemperature,
          signal: options.signal,
          toolContext,
          outputSchema: options.outputSchema,
          emit,
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

      // Runs one model step and folds its text, output and usage into the run.
      // In "auto" mode the first "response" failure retries once in "chat".
      const runStep = async (stepSystemPrompt = systemPrompt): Promise<ModelGenerateResult<TOutput>> => {
        let result: ModelGenerateResult<TOutput>;
        try {
          result = await callModel(currentMode, stepSystemPrompt);
          if (targetMode === "auto" && !this.fixedInvocationMode) {
            this.fixedInvocationMode = currentMode;
            emit({ type: "agent.invocationMode.fixed", mode: currentMode });
          }
        } catch (error: any) {
          // An abort is not a sign that "response" mode is unsupported.
          if (targetMode === "auto" && !this.fixedInvocationMode && currentMode === "response" && !options.signal?.aborted) {
            console.log(`[Agent.run] Model call failed in "response" mode, switching to "chat" mode and retrying...`, error);
            currentMode = "chat";
            result = await callModel(currentMode, stepSystemPrompt);
            this.fixedInvocationMode = currentMode;
            emit({ type: "agent.invocationMode.fixed", mode: currentMode });
          } else {
            throw error;
          }
        }

        finalResultText = result.text;
        if (result.output) {
          finalOutput = result.output;
        }
        accumulatedUsage = mergeUsage(accumulatedUsage, result.usage);
        return result;
      };

      while (iteration < maxIterations) {
        throwIfAborted(options.signal);
        emit({ type: "agent.iteration.started", iteration: iteration + 1 });

        const result = await runStep();

        const assistantMessage: AgentMessage = {
          role: "assistant",
          content: result.text,
          // A copy: the agent records outputs on `result.toolCalls` later,
          // which must not leak into the stored message.
          metadata: {
            toolCalls: (result.toolCalls ?? []).map(({ toolCallId, toolName, input }) => ({ toolCallId, toolName, input })),
          },
        };
        lastAssistantMessage = assistantMessage;

        await memory.add(assistantMessage, { sessionId });

        hasPendingToolCalls = (result.toolCalls?.length ?? 0) > 0;
        if (!hasPendingToolCalls) {
          break;
        }

        for (const call of result.toolCalls) {
          allToolCalls.push(call);

          emit({ type: "tool.call.started", toolCallId: call.toolCallId, toolName: call.toolName, input: call.input });

          try {
            const specificToolContext = this.createToolContext(runContext, call.toolCallId);
            const output = await this.executeRunTool(runTools.toolMap, call.toolName, call.input, specificToolContext);
            call.output = output;
            emit({ type: "tool.call.completed", toolCallId: call.toolCallId, toolName: call.toolName, input: call.input, output });
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            const wrapped = error.name === "ToolExecutionError" || error.name === "ToolNotFoundError" || error.name === "ToolValidationError" || error.name === "ToolPermissionError"
              ? error
              : new ToolExecutionError(call.toolName, error);

            call.error = wrapped.message;
            emit({ type: "tool.call.failed", toolCallId: call.toolCallId, toolName: call.toolName, input: call.input, error: wrapped });
          }

          await memory.add(
            {
              role: "tool",
              content: JSON.stringify(call.error ? { error: call.error } : call.output),
              metadata: { toolCallId: call.toolCallId, toolName: call.toolName, input: call.input },
            },
            { sessionId },
          );
        }

        refreshAfterActivation();
        iteration++;
      }

      if (hasPendingToolCalls) {
        // The loop ran out of iterations right after executing tools, so the
        // latest text belongs to a tool-calling step and is usually empty. One
        // more step turns the gathered tool results into an answer.
        throwIfAborted(options.signal);
        emit({ type: "agent.iteration.started", iteration: iteration + 1 });

        const result = await runStep(mergePrompts(systemPrompt, FINAL_ANSWER_INSTRUCTION));

        // Tool calls of this step are never executed, so they are not stored:
        // a tool call without a tool result makes the next request invalid.
        lastAssistantMessage = { role: "assistant", content: result.text };
        await memory.add(lastAssistantMessage, { sessionId });
      }

      const activatedSkillIds = this.skills
        .listActive()
        .map((active) => active.skill.id)
        .filter((skillId) => !initialActiveSkillIds.has(skillId));
      const pinnedSkillIds = [...new Set([...skillReconcile.pinnedSkillIds, ...activatedSkillIds])];
      if (usesSessionMemory) {
        this.pinnedSkillsBySession.set(sessionId, pinnedSkillIds);
      }

      const runResult: AgentRunResult<TOutput> = {
        runId,
        pinnedSkillIds,
        text: finalResultText,
        output: finalOutput,
        rawMessage: lastAssistantMessage!,
        toolCalls: allToolCalls,
        usage: accumulatedUsage,
      };

      if (lastAssistantMessage) {
        emit({ type: "message.completed", message: lastAssistantMessage });
      }
      emit({ type: "agent.completed", result: runResult });

      if (isDebug) {
        console.log(`[Agent.run] Request completed with text: "${runResult.text}"`);
      }
      return runResult;
    } catch (error) {
      const normalized = error instanceof Error ? error : new Error(String(error));
      emit({ type: "agent.failed", error: normalized });

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

  private async reconcileSkills(
    context: SkillRequestContext,
    runId: string,
    pinnedSkillIds: string[],
  ): Promise<SkillReconcileResult> {
    if (this.config.dynamicCapabilities?.enabled === false) {
      return {
        activeSkills: this.skills.listActive(),
        mountedTools: [],
        mountedSkillIds: [],
        unmountedSkillIds: [],
        mountedToolNames: [],
        unmountedToolNames: [],
        // Skills are not managed in this mode; keep the host's list intact.
        pinnedSkillIds,
      };
    }

    return this.skills.reconcile(context, { runId, pinnedSkillIds });
  }

  /**
   * @param alwaysAllowedToolNames Tools exposed even when `activeToolNames`
   *   restricts the run, e.g. tools of a Skill the model activated.
   */
  private resolveRunTools(skillTools: AgentTool[], activeToolNames?: string[], alwaysAllowedToolNames: string[] = []) {
    const dynamicCapabilitiesEnabled = this.config.dynamicCapabilities?.enabled !== false;
    // Only expose skill tools that can return something: skill_view needs a
    // viewable skill and discoverSkill needs an inactive skill to find.
    const canViewSkills = this.skills.listActive().length > 0 || (this.config.skillView?.allowInactive === true && this.skills.list().length > 0);
    const skillViewEnabled = this.config.skillView?.enabled !== false && dynamicCapabilitiesEnabled && canViewSkills;
    const discoverSkillEnabled = (this.config.discoverSkill?.enabled ?? this.config.findSkill?.enabled) !== false && dynamicCapabilitiesEnabled && this.skills.hasDiscoverableSkills();
    const skillViewTool = skillViewEnabled
      ? createSkillViewTool(this, {
        allowInactive: this.config.skillView?.allowInactive,
        maxDocumentTokens: this.config.maxSkillContextTokens,
      })
      : undefined;
    const discoverSkillTool = discoverSkillEnabled ? createDiscoverSkillTool(this) : undefined;
    const activateSkillTool =
      discoverSkillEnabled && this.config.discoverSkill?.allowActivation !== false
        ? createActivateSkillTool(this, { maxDocumentTokens: this.config.maxSkillContextTokens })
        : undefined;
    // Skill tools are request-local capabilities. They are visible to this model
    // call and executable through the run-local map, but never registered as
    // global tools that could survive a later page or Skill change.
    const unrestrictedTools = [
      ...this.tools.list(),
      ...skillTools,
      ...(skillViewTool ? [skillViewTool] : []),
      ...(discoverSkillTool ? [discoverSkillTool] : []),
      ...(activateSkillTool ? [activateSkillTool] : []),
    ];
    const shouldKeepSkillView = this.config.skillView?.keepWhenToolsRestricted !== false;
    const shouldKeepDiscoverSkill = (this.config.discoverSkill?.keepWhenToolsRestricted ?? this.config.findSkill?.keepWhenToolsRestricted) !== false;
    const allowed = activeToolNames ? new Set([...activeToolNames, ...alwaysAllowedToolNames]) : undefined;
    const tools = !allowed
      ? unrestrictedTools
      : unrestrictedTools.filter(
        (tool) =>
          allowed.has(tool.name) ||
          (shouldKeepSkillView && tool.name === "skill_view") ||
          (shouldKeepDiscoverSkill && (tool.name === "discoverSkill" || tool.name === "activateSkill")),
      );
    const toolMap = new Map(tools.map((tool) => [tool.name, tool]));
    const retainedToolNames = [
      ...(shouldKeepSkillView && skillViewTool ? ["skill_view"] : []),
      ...(shouldKeepDiscoverSkill && discoverSkillTool ? ["discoverSkill"] : []),
      ...(shouldKeepDiscoverSkill && activateSkillTool ? ["activateSkill"] : []),
      ...alwaysAllowedToolNames,
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
    // Remaining calls of an aborted step fail fast; each one still gets a tool
    // result in memory, so the stored history stays valid for the next run.
    throwIfAborted(context.signal);

    const tool = toolMap.get(toolName);
    if (!tool) {
      throw new ToolNotFoundError(toolName);
    }

    validateJsonSchema(tool.parameters, input);

    const securityPolicy = this.config.securityPolicy;
    if (securityPolicy) {
      const permission = await securityPolicy.getToolPermission(toolName, input, context);
      if (permission.mode === "deny") {
        throw new ToolPermissionError(toolName, permission.reason ?? "Security policy blocked execution.");
      }
      if (permission.mode === "ask") {
        const approved = await this.requestApproval(securityPolicy, toolName, input, context, permission.reason);
        if (!approved) {
          throw new ToolPermissionError(toolName, "User rejected the operation.");
        }
      }
    }

    return executeWithInterceptors(tool, input, context, this.config.interceptors ?? []);
  }

  /**
   * Waits for the user's decision on an "ask" tool call, through `onAsk` or
   * `approveToolCall()`. Aborting the run rejects the wait, so an unanswered
   * approval never blocks the run forever.
   */
  private async requestApproval(
    policy: SecurityPolicy,
    toolName: string,
    input: unknown,
    context: ToolExecutionContext,
    reason: string | undefined,
  ): Promise<boolean> {
    if (policy.onAsk) {
      return waitUnlessAborted(Promise.resolve(policy.onAsk(toolName, input, context, reason)), context.signal);
    }

    const toolCallId = context.toolCallId;
    if (!toolCallId) {
      return false;
    }

    // The resolver is stored before the event fires, so a handler may call
    // approveToolCall() synchronously.
    const decision = new Promise<boolean>((resolve) => {
      this.pendingApprovals.set(toolCallId, resolve);
    });
    this.events.emit({ type: "tool.call.requires_action", toolCallId, toolName, input, reason, runId: context.runId });

    try {
      return await waitUnlessAborted(decision, context.signal);
    } finally {
      this.pendingApprovals.delete(toolCallId);
    }
  }

  private createToolContext(run: RunToolContext, toolCallId?: string): ToolExecutionContext {
    const { skillContext } = run;
    return {
      agentId: this.agentId,
      sessionId: run.sessionId,
      runId: run.runId,
      toolCallId,
      pageId: skillContext.pageId ?? this.pages.currentPageId,
      moduleId: skillContext.moduleId,
      url: skillContext.url ? String(skillContext.url) : undefined,
      intent: skillContext.intent,
      signal: run.signal,
      metadata: run.metadata,
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
