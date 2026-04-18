import { generateText, streamText, tool, type ModelMessage, type Tool, type ToolSet } from "ai";
import { z } from "zod";
import { HookManager } from "../event";
import type { BaseMemory } from "../memory";
import { MCPRegistry } from "../mcp";
import { TaskManager } from "../scheduler";
import { SkillLoader, type SkillDefinition } from "../skill";
import { ToolRegistry } from "../tools";
import { logger } from "../utils/logger";
import { createAgentModel } from "./model";
import type {
  AgentEventMap,
  AgentInput,
  AgentLoopStep,
  AgentModelConfig,
  AgentOptions,
  AgentRunOptions,
  AgentRunResult,
  AgentStepResult,
  AgentStreamCallbacks,
  AgentTaskManagerOptions,
  AgentWorkflowResult,
  AgentRuntimeContext,
  GenerateOptions,
  GenerateResult,
} from "./types";
export * from "./model";
export * from "./providers";



function createRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeInput(input: AgentInput): ModelMessage[] {
  if (typeof input === "string") {
    return [{ role: "user", content: input }];
  }

  return Array.isArray(input) ? input : [input];
}

function cloneTool<TTool extends ToolSet[string]>(toolDefinition: TTool): TTool {
  return Object.create(
    Object.getPrototypeOf(toolDefinition),
    Object.getOwnPropertyDescriptors(toolDefinition),
  ) as TTool;
}

function normalizeToolCall(
  toolCall: any,
  index: number,
): { toolCallId: string; toolName: string; input: unknown } {
  return {
    toolCallId:
      toolCall?.toolCallId ??
      toolCall?.id ??
      `tool_call_${index + 1}`,
    toolName: toolCall?.toolName ?? toolCall?.name,
    input:
      toolCall?.input ??
      toolCall?.args ??
      toolCall?.arguments ??
      {},
  };
}

function createAssistantMessage(result: GenerateResult): ModelMessage {
  const content: Array<Record<string, unknown>> = [];

  if (result.text) {
    content.push({
      type: "text",
      text: result.text,
    });
  }

  for (const [index, toolCall] of (result.toolCalls ?? []).entries()) {
    const normalized = normalizeToolCall(toolCall, index);
    content.push({
      type: "tool-call",
      toolCallId: normalized.toolCallId,
      toolName: normalized.toolName,
      input: normalized.input,
    });
  }

  if (content.length === 1 && content[0]?.type === "text") {
    return {
      role: "assistant",
      content: String(content[0].text ?? ""),
    };
  }

  return {
    role: "assistant",
    content: content as any,
  };
}

function createToolResultMessage(toolResults: AgentLoopStep["toolResults"]): ModelMessage {
  return {
    role: "tool",
    content: toolResults.map((toolResult) => {
      let outputPayload: any;
      if (toolResult.isError) {
        outputPayload = {
          type: typeof toolResult.output === 'string' ? 'error-text' : 'error-json',
          value: toolResult.output
        };
      } else {
        outputPayload = {
          type: typeof toolResult.output === 'string' ? 'text' : 'json',
          value: toolResult.output
        };
      }

      return {
        type: "tool-result",
        toolCallId: toolResult.toolCallId,
        toolName: toolResult.toolName,
        output: outputPayload,
      };
    }) as any,
  };
}

function normalizeGenerateResult(result: any): GenerateResult {
  return {
    text: result.text,
    toolCalls: result.toolCalls,
    toolResults: result.toolResults,
    responseMessages: result.response?.messages as any,
    finishReason: result.finishReason,
    llmSteps: result.steps?.map((step: any) => ({
      text: step.text,
      toolCalls: step.toolCalls,
      toolResults: step.toolResults,
      responseMessages: step.response?.messages as any,
      finishReason: step.finishReason,
    })),
    usage: result.usage,
  };
}

/**
 * Agent 运行时编排层。
 * 负责把 model、memory、tools、skills、mcp、hooks、scheduler 这些模块组合起来。
 */
export class Agent {
  readonly name: string;

  private readonly modelConfig: AgentModelConfig;
  private readonly defaultModel: GenerateOptions["model"];
  private readonly memory?: BaseMemory;
  private readonly toolRegistry: ToolRegistry;
  private readonly skillLoader: SkillLoader;
  private readonly mcpRegistry: MCPRegistry;
  private readonly systemPrompt?: AgentOptions["systemPrompt"];
  private readonly workspace: string;
  private readonly hooks = new HookManager<AgentEventMap>();

  constructor(options: AgentOptions) {
    this.name = options.name ?? "agent";
    this.modelConfig = {
      provider: options.provider,
      model: options.model,
      apiKey: options.apiKey,
      apikey: options.apikey,
      baseURL: options.baseURL,
      baseUrl: options.baseUrl,
      baseurl: options.baseurl,
    };
    this.defaultModel = createAgentModel(this.modelConfig);
    this.memory = options.memory;
    this.toolRegistry = options.tools ?? new ToolRegistry();
    this.skillLoader = options.skills ?? new SkillLoader();
    this.mcpRegistry = options.mcp ?? new MCPRegistry();
    this.systemPrompt = options.systemPrompt;
    this.workspace = options.workspace ?? "your workspace";
  }

  getHookManager(): HookManager<AgentEventMap> {
    return this.hooks;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getSkillLoader(): SkillLoader {
    return this.skillLoader;
  }

  getMCPRegistry(): MCPRegistry {
    return this.mcpRegistry;
  }

  registerTool(name: string, options: Tool): void {
    this.toolRegistry.registerTool(name, options);
  }

  registerSkills(skills: SkillDefinition[]): void {
    this.skillLoader.addSkills(skills);
  }

  async clearMemory(): Promise<void> {
    if (this.memory) {
      await this.memory.clear();
    }
  }

  async loadSkill(
    name: string,
    context: AgentRuntimeContext = this.createRuntimeContext(),
  ): Promise<string> {
    await this.hooks.emit("skill:before", {
      skillName: name,
      context,
    });

    try {
      const content = await this.skillLoader.loadSkill(name);
      const wrapped = `<skill name="${name}">\n${content}\n</skill>`;

      await this.hooks.emit("skill:after", {
        skillName: name,
        content: wrapped,
        context,
      });

      return wrapped;
    } catch (error) {
      await this.hooks.emit("skill:error", {
        skillName: name,
        error,
        context,
      });

      return `Error: Failed to load skill '${name}'. ${error instanceof Error ? error.message : String(error)
        }`;
    }
  }

  async step(
    input: AgentInput,
    options: AgentRunOptions = {},
  ): Promise<AgentStepResult> {
    const context = this.createRuntimeContext(options);
    const inputMessages = normalizeInput(input);

    await this.hooks.emit("agent:before_run", {
      input: inputMessages,
      options,
      context,
    });

    try {
      const llmOptions = await this.buildGenerateOptions(inputMessages, options, context);

      await this.hooks.emit("llm:before", {
        options: llmOptions,
        context,
        stepNumber: 0,
      });

      const result = await this.generate(llmOptions);

      await this.hooks.emit("llm:after", {
        options: llmOptions,
        result,
        context,
        stepNumber: 0,
      });

      const agentResult: AgentStepResult = {
        ...result,
        stepNumber: 0,
        messages: llmOptions.messages,
        context,
      };

      return agentResult;
    } catch (error) {
      const llmOptions = await this.buildGenerateOptions(inputMessages, options, context, false);

      await this.hooks.emit("llm:error", {
        options: llmOptions,
        context,
        error,
        stepNumber: 0,
      });

      await this.hooks.emit("agent:error", {
        input: inputMessages,
        options,
        context,
        error,
      });

      throw error;
    }
  }

  async run(input: AgentInput, options: AgentRunOptions = {}): Promise<AgentRunResult> {
    const context = this.createRuntimeContext(options);
    const inputMessages = normalizeInput(input);
    const maxIterations = options.maxIterations ?? 8;
    const steps: AgentLoopStep[] = [];

    await this.hooks.emit("agent:before_run", {
      input: inputMessages,
      options,
      context,
    });

    try {
      const systemPrompt = await this.resolveSystemPrompt(options);
      const conversation = await this.resolveMessages(inputMessages, systemPrompt, true);
      const tools = await this.resolveTools(options, context);

      await this.hooks.emit("agent:loop_start", {
        input: inputMessages,
        options,
        context,
        messages: [...conversation],
      });

      for (let stepNumber = 0; stepNumber < maxIterations; stepNumber += 1) {
        const llmOptions: GenerateOptions = {
          model: this.resolveModel(options),
          messages: [...conversation],
          tools,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        };

        await this.hooks.emit("llm:before", {
          options: llmOptions,
          context,
          stepNumber,
        });

        const result = await this.generate(llmOptions);

        await this.hooks.emit("llm:after", {
          options: llmOptions,
          result,
          context,
          stepNumber,
        });

        const stepResult: AgentStepResult = {
          ...result,
          stepNumber,
          messages: [...conversation],
          context,
        };

        const responseMessages =
          result.responseMessages?.length
            ? result.responseMessages
            : [createAssistantMessage(result)];

        conversation.push(...responseMessages);

        const normalizedToolCalls = (result.toolCalls ?? []).map(normalizeToolCall);

        if (normalizedToolCalls.length === 0) {
          const agentResult: AgentRunResult = {
            ...result,
            runId: context.runId,
            messages: [...conversation],
            context,
            steps,
            iterations: stepNumber + 1,
          };

          await this.persistLoopMessages(responseMessages);

          await this.hooks.emit("agent:loop_finish", {
            result: agentResult,
            options,
            context,
          });

          await this.hooks.emit("agent:after_run", {
            input: inputMessages,
            result: agentResult,
            options,
            context,
          });

          return agentResult;
        }

        const toolResults = await this.resolveToolResults(
          normalizedToolCalls,
          result,
          tools,
          context,
          options,
        );
        const loopStep: AgentLoopStep = {
          stepNumber,
          result: stepResult,
          toolCalls: normalizedToolCalls,
          toolResults,
        };

        steps.push(loopStep);

        const hasToolMessages = responseMessages.some((m: any) => m.role === "tool");
        if (!hasToolMessages) {
          const toolMessage = createToolResultMessage(toolResults);
          conversation.push(toolMessage);
          await this.persistLoopMessages([...responseMessages, toolMessage]);
        } else {
          await this.persistLoopMessages(responseMessages);
        }

        await this.hooks.emit("agent:loop_step", {
          step: loopStep,
          options,
          context,
          messages: [...conversation],
        });
      }

      throw new Error(
        `Agent loop exceeded maxIterations=${maxIterations}.`,
      );
    } catch (error) {
      const llmOptions = await this.buildGenerateOptions(inputMessages, options, context, false);

      await this.hooks.emit("llm:error", {
        options: llmOptions,
        context,
        error,
      });

      await this.hooks.emit("agent:error", {
        input: inputMessages,
        options,
        context,
        error,
      });

      throw error;
    }
  }

  async stream(
    input: AgentInput,
    callbacks: AgentStreamCallbacks = {},
    options: AgentRunOptions = {},
  ): Promise<AgentRunResult> {
    const context = this.createRuntimeContext(options);
    const inputMessages = normalizeInput(input);
    const maxIterations = options.maxIterations ?? 8;
    callbacks.onStart?.(context);

    await this.hooks.emit("agent:before_run", {
      input: inputMessages,
      options,
      context,
    });

    const steps: AgentLoopStep[] = [];

    try {
      const systemPrompt = await this.resolveSystemPrompt(options);
      const conversation = await this.resolveMessages(inputMessages, systemPrompt, true);
      const tools = await this.resolveTools(options, context);

      await this.hooks.emit("agent:loop_start", {
        input: inputMessages,
        options,
        context,
        messages: [...conversation],
      });

      for (let stepNumber = 0; stepNumber < maxIterations; stepNumber += 1) {
        const llmOptions: GenerateOptions = {
          model: this.resolveModel(options),
          messages: [...conversation],
          tools,
          temperature: options.temperature,
          maxTokens: options.maxTokens,
        };

        let finalResult: GenerateResult | undefined;

        await this.hooks.emit("llm:before", {
          options: llmOptions,
          context,
          stepNumber,
        });

        await this.streamGenerate(llmOptions, {
          onText: callbacks.onText,
          onToolCall: callbacks.onToolCall,
          onFinish: async (result) => {
            finalResult = result;
            await this.hooks.emit("llm:after", {
              options: llmOptions,
              result,
              context,
              stepNumber,
            });
          },
        });

        const result = finalResult ?? { text: "" };
        const stepResult: AgentStepResult = {
          ...result,
          stepNumber,
          messages: [...conversation],
          context,
        };

        const responseMessages =
          result.responseMessages?.length
            ? result.responseMessages
            : [createAssistantMessage(result)];

        conversation.push(...responseMessages);

        const normalizedToolCalls = (result.toolCalls ?? []).map(normalizeToolCall);

        if (normalizedToolCalls.length === 0) {
          await this.persistLoopMessages(responseMessages);

          const agentResult: AgentRunResult = {
            ...result,
            runId: context.runId,
            messages: [...conversation],
            context,
            steps,
            iterations: stepNumber + 1,
          };

          await this.hooks.emit("agent:loop_finish", {
            result: agentResult,
            options,
            context,
          });

          await this.hooks.emit("agent:after_run", {
            input: inputMessages,
            result: agentResult,
            options,
            context,
          });

          callbacks.onFinish?.(agentResult);
          return agentResult;
        }

        const toolResults = await this.resolveToolResults(
          normalizedToolCalls,
          result,
          tools,
          context,
          options,
        );
        const loopStep: AgentLoopStep = {
          stepNumber,
          result: stepResult,
          toolCalls: normalizedToolCalls,
          toolResults,
        };

        steps.push(loopStep);

        const hasToolMessages = responseMessages.some((m: any) => m.role === "tool");
        if (!hasToolMessages) {
          const toolMessage = createToolResultMessage(toolResults);
          conversation.push(toolMessage);
          await this.persistLoopMessages([...responseMessages, toolMessage]);
        } else {
          await this.persistLoopMessages(responseMessages);
        }

        await this.hooks.emit("agent:loop_step", {
          step: loopStep,
          options,
          context,
          messages: [...conversation],
        });
      }

      throw new Error(
        `Agent loop exceeded maxIterations=${maxIterations}.`,
      );
    } catch (error) {
      const llmOptions = await this.buildGenerateOptions(inputMessages, options, context, false);

      await this.hooks.emit("llm:error", {
        options: llmOptions,
        context,
        error,
      });

      await this.hooks.emit("agent:error", {
        input: inputMessages,
        options,
        context,
        error,
      });

      throw error;
    }
  }

  createTaskManager(options: AgentTaskManagerOptions = {}): TaskManager<Record<string, unknown>> {
    const sharedState: Record<string, unknown> = {
      agentName: this.name,
      runAgent: (input: AgentInput, runOptions?: AgentRunOptions) =>
        this.run(input, runOptions),
      ...(options.sharedState ?? {}),
    };

    return new TaskManager<Record<string, unknown>>({
      ...options,
      sharedState,
      dispatcher: this.hooks,
    });
  }

  async runWorkflow(
    tasks: Parameters<TaskManager<Record<string, unknown>>["registerTasks"]>[0],
    options: AgentTaskManagerOptions = {},
  ): Promise<AgentWorkflowResult> {
    const manager = this.createTaskManager(options);
    manager.registerTasks(tasks);
    return manager.run();
  }

  private createRuntimeContext(options: AgentRunOptions = {}): AgentRuntimeContext {
    return {
      agentName: this.name,
      runId: createRunId(),
      metadata: options.metadata ?? {},
      startedAt: new Date().toISOString(),
      signal: options.signal,
    };
  }

  private async buildGenerateOptions(
    inputMessages: ModelMessage[],
    options: AgentRunOptions,
    context: AgentRuntimeContext,
    persistInput = true,
  ): Promise<GenerateOptions> {
    const systemPrompt = await this.resolveSystemPrompt(options);
    const messages = await this.resolveMessages(inputMessages, systemPrompt, persistInput);
    const tools = await this.resolveTools(options, context);

    return {
      model: this.resolveModel(options),
      messages,
      tools,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
    };
  }

  private async generate(options: GenerateOptions): Promise<GenerateResult> {
    const result = await generateText({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      tools: options.tools,
    });

    logger.info("generate result", result);
    return normalizeGenerateResult(result);
  }

  private async streamGenerate(
    options: GenerateOptions,
    callbacks: AgentStreamCallbacks,
  ): Promise<void> {
    const result = streamText({
      model: options.model,
      messages: options.messages,
      temperature: options.temperature,
      maxOutputTokens: options.maxTokens,
      tools: options.tools,
      onFinish: (event) => {
        callbacks.onFinish?.(normalizeGenerateResult(event));
      },
    });

    for await (const delta of result.textStream) {
      callbacks.onText?.(delta);
    }

    if (result.toolCalls) {
      for await (const toolCall of await result.toolCalls) {
        callbacks.onToolCall?.(toolCall);
      }
    }
  }

  private async resolveSystemPrompt(options: AgentRunOptions): Promise<string | undefined> {
    const parts: string[] = [];

    if (this.systemPrompt) {
      parts.push(
        typeof this.systemPrompt === "function"
          ? await this.systemPrompt()
          : this.systemPrompt,
      );
    }

    const skillDescriptions = this.skillLoader.getDescriptions();
    if (skillDescriptions) {
      parts.push(this.skillLoader.getSystemPrompt(this.workspace));
    }

    if (options.systemPrompt) {
      parts.push(options.systemPrompt);
    }

    const prompt = parts.filter(Boolean).join("\n\n").trim();
    return prompt || undefined;
  }

  private async resolveMessages(
    inputMessages: ModelMessage[],
    systemPrompt?: string,
    persistInput = true,
  ): Promise<ModelMessage[]> {
    if (this.memory && persistInput) {
      for (const message of inputMessages) {
        await this.memory.addMessage(message);
      }
    }

    const conversationMessages =
      this.memory ? await this.memory.getMessages() : inputMessages;

    if (!systemPrompt) {
      return [...conversationMessages];
    }

    return [
      {
        role: "system",
        content: systemPrompt,
      },
      ...conversationMessages,
    ];
  }

  private async resolveTools(
    options: AgentRunOptions,
    context: AgentRuntimeContext,
  ): Promise<ToolSet | undefined> {
    const selectedTools = options.toolNames?.length
      ? this.toolRegistry.getToolsByName(options.toolNames)
      : this.toolRegistry.getTools();

    const tools: ToolSet = {
      ...selectedTools,
      ...(options.additionalTools ?? {}),
    };

    if (this.skillLoader.listSkillNames().length > 0) {
      tools.load_skill = this.createLoadSkillTool(context);
    }

    if (options.includeMCPTools ?? true) {
      Object.assign(
        tools,
        await this.mcpRegistry.getTools({
          includeControlTools: options.includeMCPControlTools ?? false,
        }),
      );
    }

    if (Object.keys(tools).length === 0) {
      return undefined;
    }

    return this.wrapToolsWithHooks(tools, context);
  }

  private async resolveToolResults(
    toolCalls: AgentLoopStep["toolCalls"],
    result: GenerateResult,
    tools: ToolSet | undefined,
    context: AgentRuntimeContext,
    options: AgentRunOptions,
  ): Promise<AgentLoopStep["toolResults"]> {
    const providedResults = (result.toolResults ?? []).map((toolResult: any) => ({
      toolCallId: toolResult?.toolCallId ?? toolResult?.id,
      toolName: toolResult?.toolName ?? toolResult?.name,
      input: toolResult?.input ?? {},
      output: toolResult?.output,
      isError: toolResult?.type === "tool-error",
    }));

    if (providedResults.length > 0) {
      return providedResults;
    }

    const outputs: AgentLoopStep["toolResults"] = [];

    for (const toolCall of toolCalls) {
      const toolDefinition = tools?.[toolCall.toolName];

      if (!toolDefinition?.execute) {
        outputs.push({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input,
          output: `Error: Unknown tool "${toolCall.toolName}".`,
          isError: true,
        });
        continue;
      }

      try {
        const output = await toolDefinition.execute(toolCall.input as never, {
          toolCallId: toolCall.toolCallId,
          messages: [],
        } as never);

        outputs.push({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input,
          output,
        });
      } catch (error) {
        if (options.continueOnToolError === false) {
          throw error;
        }

        await this.hooks.emit("tool:error", {
          toolName: toolCall.toolName,
          input: toolCall.input,
          error,
          context,
        });

        outputs.push({
          toolCallId: toolCall.toolCallId,
          toolName: toolCall.toolName,
          input: toolCall.input,
          output: `Error: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        });
      }
    }

    return outputs;
  }

  private createLoadSkillTool(context: AgentRuntimeContext): ToolSet[string] {
    return tool({
      description: "Load a specialized skill content to gain knowledge.",
      inputSchema: z.object({
        name: z.string().describe("The name of the skill to load"),
      }),
      outputSchema: z.string().describe("The content of the skill"),
      execute: async ({ name }: { name: string }) => this.loadSkill(name, context),
    });
  }

  private wrapToolsWithHooks(
    tools: ToolSet,
    context: AgentRuntimeContext,
  ): ToolSet {
    const wrapped: ToolSet = {};

    for (const [toolName, toolDefinition] of Object.entries(tools)) {
      const cloned = cloneTool(toolDefinition);
      const originalExecute = toolDefinition.execute;

      cloned.execute = async (input: unknown, executionOptions: unknown) => {
        await this.hooks.emit("tool:before", {
          toolName,
          input,
          context,
        });

        try {
          const output = originalExecute
            ? await originalExecute(input as never, executionOptions as never)
            : undefined;

          await this.hooks.emit("tool:after", {
            toolName,
            input,
            output,
            context,
          });

          return output;
        } catch (error) {
          await this.hooks.emit("tool:error", {
            toolName,
            input,
            error,
            context,
          });

          throw error;
        }
      };

      wrapped[toolName] = cloned;
    }

    return wrapped;
  }


  private async persistLoopMessages(messages: ModelMessage[]): Promise<void> {
    if (!this.memory) {
      return;
    }

    for (const message of messages) {
      await this.memory.addMessage(message);
    }
  }

  private resolveModel(options: AgentRunOptions = {}): GenerateOptions["model"] {
    if (
      options.provider === undefined &&
      options.model === undefined &&
      options.apiKey === undefined &&
      options.apikey === undefined &&
      options.baseURL === undefined &&
      options.baseUrl === undefined &&
      options.baseurl === undefined
    ) {
      return this.defaultModel;
    }

    return createAgentModel({
      provider: options.provider ?? this.modelConfig.provider,
      model: options.model ?? this.modelConfig.model,
      apiKey: options.apiKey ?? this.modelConfig.apiKey,
      apikey: options.apikey ?? this.modelConfig.apikey,
      baseURL: options.baseURL ?? this.modelConfig.baseURL,
      baseUrl: options.baseUrl ?? this.modelConfig.baseUrl,
      baseurl: options.baseurl ?? this.modelConfig.baseurl,
    });
  }
}

export * from "./types";
