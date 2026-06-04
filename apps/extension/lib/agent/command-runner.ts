import type {
  AgentCommand,
  AgentRunOptions,
  CommandRunResult,
} from "@browser-agent-sdk/agent";
import type { ResolvedAgentConfig } from "./factory";
import {
  assertAgentConfigured,
  createAgentFromResolvedConfig,
  createExtensionAgent,
} from "./factory";

export interface RunExtensionCommandOptions<TInput, TOutput> {
  command: AgentCommand<TInput, TOutput>;
  input: TInput;
  systemPrompt?: string;
  temperature?: number;
  maxIterations?: number;
  metadata?: Record<string, unknown>;
  config?: ResolvedAgentConfig;
}

export interface RunExtensionCommandResult<TOutput> {
  output: TOutput;
  raw: CommandRunResult<TOutput>;
  config: ResolvedAgentConfig;
}

/**
 * 运行一个 Browser Agent SDK Command，并在本次调用结束后注销临时命令。
 *
 * 示例：
 * ```ts
 * const result = await runExtensionCommand({
 *   command: { name: "translate", prompt: "Return JSON.", outputSchema },
 *   input: { text: "hello" },
 * });
 * result.output;
 * ```
 */
export async function runExtensionCommand<TInput, TOutput>(
  options: RunExtensionCommandOptions<TInput, TOutput>,
): Promise<RunExtensionCommandResult<TOutput>> {
  const { agent, config } = options.config
    ? {
        agent: createAgentFromResolvedConfig(options.config, {
          name: `command-${options.command.name}`,
          systemPrompt: options.systemPrompt,
          maxIterations: options.maxIterations,
        }),
        config: options.config,
      }
    : await createExtensionAgent({
        name: `command-${options.command.name}`,
        systemPrompt: options.systemPrompt,
        maxIterations: options.maxIterations,
      });
  assertAgentConfigured(config.rawConfig);

  const unregister = agent.commands.register(options.command, {
    onConflict: "replace",
  });

  try {
    const runOptions: AgentRunOptions = {
      invocationMode: config.invocationMode,
      temperature: options.temperature ?? config.temperature,
      maxIterations: options.maxIterations ?? options.command.maxIterations,
      metadata: options.metadata,
    };

    const raw = await agent.commands.run<TInput, TOutput>(
      options.command.name,
      options.input,
      runOptions,
    );

    return {
      output: raw.output,
      raw,
      config,
    };
  } finally {
    unregister();
  }
}
