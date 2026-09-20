import type { Agent } from "../core/agent";
import { CommandNotFoundError, ToolNotFoundError } from "../core/errors";
import { parseStructuredOutput, validateJsonSchema } from "../utils/schema";
import type {
  AgentCommand,
  AgentContentPart,
  AgentTool,
  CommandContext,
  CommandRunOptions,
  CommandRunResult,
  RegisterConflictStrategy,
} from "../core/types";

export interface CommandRegisterOptions {
  onConflict?: RegisterConflictStrategy;
  namespace?: string;
}

/**
 * Registry and runner for reusable fixed tasks such as page summary or classification.
 *
 * Example:
 * ```ts
 * agent.commands.register({ name: "classify", prompt: "Return { category } as JSON." });
 * const result = await agent.commands.run("classify", {});
 * ```
 */
export class CommandRegistry {
  private readonly commands = new Map<string, unknown>();

  constructor(private readonly agent: Agent) {
    this.register({
      name: "testConnection",
      description: "Test the connectivity of the model",
      prompt: "Respond with success: true and a message confirming connection. You are being tested for connection and responsiveness.",
      outputSchema: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string" },
        },
        required: ["success", "message"],
        additionalProperties: false,
      },
    });
  }

  register<TInput, TOutput>(
    command: AgentCommand<TInput, TOutput>,
    options: CommandRegisterOptions = {},
  ): () => void {
    const name = this.resolveName(command.name, options);
    const normalized = { ...command, name };

    if (this.commands.has(name) && options.onConflict !== "replace") {
      throw new Error(`Command "${name}" is already registered.`);
    }

    this.commands.set(name, normalized);
    return () => this.unregister(name);
  }

  registerMany(commands: AgentCommand[], options: CommandRegisterOptions = {}): () => void {
    const unregisters = commands.map((command) => this.register(command, options));
    return () => unregisters.forEach((unregister) => unregister());
  }

  unregister(commandName: string): boolean {
    return this.commands.delete(commandName);
  }

  get(commandName: string): AgentCommand | undefined {
    return this.commands.get(commandName) as AgentCommand | undefined;
  }

  list(): AgentCommand[] {
    return [...this.commands.values()] as AgentCommand[];
  }

  getMetadata(): Array<Omit<AgentCommand, "prompt">> {
    return this.list().map(({ prompt: _prompt, ...command }) => command);
  }

  async run<TInput = unknown, TOutput = unknown>(
    commandName: string,
    input: TInput,
    options: CommandRunOptions = {},
  ): Promise<CommandRunResult<TOutput>> {
    const command = this.commands.get(commandName) as AgentCommand<TInput, TOutput> | undefined;
    if (!command) {
      throw new CommandNotFoundError(commandName);
    }

    validateJsonSchema(command.inputSchema, input);

    const context: CommandContext = {
      agent: this.agent,
      pageId: this.agent.pages.currentPageId,
      sessionId: options.sessionId ?? this.agent.sessionId,
    };
    const { toolNames, unregisterTemporaryTools } = this.resolveTools(command, context);
    const prompt = this.renderPrompt(command, input, context);
    const attachments = this.resolveAttachments(command, input, context);

    try {
      const result = await this.agent.runCommand<TOutput>(prompt, {
        ...options,
        attachments: options.attachments ?? attachments,
        model: options.model ?? command.model,
        maxIterations: options.maxIterations ?? command.maxIterations,
        tools: toolNames,
        outputSchema: command.outputSchema,
        ignoreBaseSystemPrompt: options.ignoreBaseSystemPrompt ?? command.ignoreBaseSystemPrompt,
        metadata: { ...options.metadata, command: command.name, input },
      });

      const output = command.outputSchema ? parseStructuredOutput<TOutput>(result.text, command.outputSchema) : (result.text as TOutput);

      return {
        command: command.name,
        output,
        rawMessage: result.rawMessage,
        toolCalls: result.toolCalls,
        usage: result.usage,
      };
    } finally {
      unregisterTemporaryTools();
    }
  }

  private resolveTools<TInput, TOutput>(command: AgentCommand<TInput, TOutput>, context: CommandContext): {
    toolNames: string[] | undefined;
    unregisterTemporaryTools: () => void;
  } {
    if (!command.tools) {
      return { toolNames: undefined, unregisterTemporaryTools: () => undefined };
    }

    const selected = typeof command.tools === "function" ? command.tools(context) : command.tools;
    const unregisters: Array<() => void> = [];
    const toolNames = selected.map((item) => {
      if (typeof item === "string") {
        if (!this.agent.tools.get(item)) {
          throw new ToolNotFoundError(item);
        }
        return item;
      }

      const unregister = this.agent.tools.register(item as AgentTool, { onConflict: "replace" });
      unregisters.push(unregister);
      return item.name;
    });

    return {
      toolNames,
      unregisterTemporaryTools: () => unregisters.forEach((unregister) => unregister()),
    };
  }

  private resolveAttachments<TInput, TOutput>(
    command: AgentCommand<TInput, TOutput>,
    input: TInput,
    context: CommandContext,
  ): AgentContentPart[] | undefined {
    if (!command.attachments) {
      return undefined;
    }

    const attachments =
      typeof command.attachments === "function" ? command.attachments(input, context) : command.attachments;
    return attachments?.length ? attachments : undefined;
  }

  private renderPrompt<TInput>(command: AgentCommand<TInput>, input: TInput, context: CommandContext): string {
    if (typeof command.prompt === "function") {
      return command.prompt(input, context);
    }

    const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
    // Lightweight template replacement supports the PRD's {{field}} examples without adding a template engine.
    return command.prompt.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
      const value = key.split(".").reduce<unknown>((current, segment) => {
        return typeof current === "object" && current !== null ? (current as Record<string, unknown>)[segment] : undefined;
      }, source);
      return value == null ? "" : String(value);
    });
  }

  private resolveName(name: string, options: CommandRegisterOptions): string {
    if (!this.commands.has(name) || options.onConflict === "replace") {
      return name;
    }

    if (options.onConflict === "namespace") {
      return `${options.namespace ?? "command"}.${name}`;
    }

    return name;
  }
}
