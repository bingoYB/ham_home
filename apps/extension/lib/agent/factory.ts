import {
  createAgent,
  type Agent,
  type AgentConfig,
  type AgentRunOptions,
} from "@hamhome/agent";
import { configStorage } from "@/lib/storage";
import type { AIConfig, Language } from "@/types";
import {
  getDefaultBaseUrl,
  getDefaultModel,
  normalizeProviderBaseUrl,
  requiresApiKey,
  resolveAgentProvider,
} from "./provider-config";
import { EXTENSION_AGENT_PROVIDERS } from "./sdk-providers";

export interface ResolvedAgentConfig {
  rawConfig: AIConfig;
  language: Language;
  provider: AIConfig["provider"];
  agentProvider: ReturnType<typeof resolveAgentProvider>;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  invocationMode?: AgentRunOptions["invocationMode"];
}

/**
 * SDK agent options a caller may set. Provider, credentials, model, invocation
 * mode and the default temperature always come from the stored AI config, and
 * the provider list is always EXTENSION_AGENT_PROVIDERS.
 */
export type CreateExtensionAgentOptions = Omit<
  AgentConfig,
  "provider" | "providers" | "model" | "apiKey" | "baseUrl" | "invocationMode" | "temperature"
>;

function getMissingConfigMessage(config: AIConfig): string | undefined {
  const needsBaseUrl =
    resolveAgentProvider(config.provider) === "openai-compatible" ||
    config.provider === "azure";
  const baseUrl = config.baseUrl?.trim() || getDefaultBaseUrl(config.provider);

  if (needsBaseUrl && !baseUrl) {
    return "请先配置 Base URL";
  }

  if (requiresApiKey(config.provider) && !config.apiKey?.trim()) {
    return "请先配置 API Key";
  }

  return undefined;
}

function resolveInvocationMode(
  apiMode?: AIConfig["apiMode"],
): AgentRunOptions["invocationMode"] | undefined {
  if (apiMode === "responses") {
    return "response";
  }

  if (apiMode === "chat") {
    return "chat";
  }

  return undefined;
}

/**
 * 读取扩展内 AI 配置，并转换成 Browser Agent SDK 可直接使用的配置。
 *
 * 示例：
 * ```ts
 * const config = await resolveAgentConfig({ provider: "openai" });
 * config.agentProvider; // "openai"
 * ```
 */
export async function resolveAgentConfig(
  configOverride?: Partial<AIConfig>,
): Promise<ResolvedAgentConfig> {
  const [storedConfig, settings] = await Promise.all([
    configStorage.getAIConfig(),
    configStorage.getSettings(),
  ]);

  const rawConfig: AIConfig = {
    ...storedConfig,
    ...configOverride,
    language: configOverride?.language || settings.language || storedConfig.language,
  };

  return {
    rawConfig,
    language: rawConfig.language || settings.language || "zh",
    provider: rawConfig.provider,
    agentProvider: resolveAgentProvider(rawConfig.provider),
    model: rawConfig.model || getDefaultModel(rawConfig.provider),
    apiKey: rawConfig.provider === "ollama" ? undefined : rawConfig.apiKey?.trim(),
    baseUrl: normalizeProviderBaseUrl(
      rawConfig.provider,
      rawConfig.baseUrl?.trim() || getDefaultBaseUrl(rawConfig.provider),
    ),
    temperature: rawConfig.temperature,
    invocationMode: resolveInvocationMode(rawConfig.apiMode),
  };
}

/**
 * 检查当前 AI 配置是否可用于发起模型请求。
 */
export function isAgentConfigured(config: AIConfig): boolean {
  return !getMissingConfigMessage(config);
}

/**
 * 在 AI 配置不完整时抛出用户可读错误。
 */
export function assertAgentConfigured(config: AIConfig): void {
  const message = getMissingConfigMessage(config);
  if (message) {
    throw new Error(message);
  }
}

/**
 * Create an SDK agent bound to the stored AI config. Throws a user-readable
 * error when the config is incomplete.
 *
 * Example:
 * ```ts
 * const { agent, config } = await createExtensionAgent();
 * const { output } = await agent.commands.run(command, input, { systemPrompt });
 * ```
 */
export async function createExtensionAgent(
  options: CreateExtensionAgentOptions = {},
): Promise<{ agent: Agent; config: ResolvedAgentConfig }> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const agent = createAgent({
    ...options,
    // Single-shot commands do not need the skill_view/discoverSkill tools.
    dynamicCapabilities: options.dynamicCapabilities ?? { enabled: false },
    providers: EXTENSION_AGENT_PROVIDERS,
    provider: config.agentProvider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    invocationMode: config.invocationMode,
    temperature: config.temperature,
  });

  return { agent, config };
}
