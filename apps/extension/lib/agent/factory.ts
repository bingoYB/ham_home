import {
  createAgent,
  type Agent,
  type AgentRunOptions,
  type AgentSkill,
  type AgentTool,
  type DynamicCapabilityOptions,
  type Memory,
} from "@browser-agent-sdk/agent";
import { configStorage } from "@/lib/storage";
import type { AIConfig, Language } from "@/types";
import {
  getDefaultBaseUrl,
  getDefaultModel,
  PROVIDER_DEFAULTS,
  requiresApiKey,
  resolveAgentProvider,
} from "./provider-config";

export interface ResolvedAgentConfig {
  rawConfig: AIConfig;
  language: Language;
  provider: AIConfig["provider"];
  agentProvider: ReturnType<typeof resolveAgentProvider>;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  invocationMode?: AgentRunOptions["invocationMode"];
}

export interface CreateExtensionAgentOptions {
  name?: string;
  systemPrompt?: string;
  tools?: AgentTool[];
  memory?: Memory;
  sessionId?: string;
  maxIterations?: number;
  skills?: AgentSkill[];
  dynamicCapabilities?: DynamicCapabilityOptions;
}

function getMissingConfigMessage(config: AIConfig): string {
  const provider = resolveAgentProvider(config.provider);
  const baseUrl = config.baseUrl?.trim() || getDefaultBaseUrl(config.provider);

  if (provider === "openai-compatible" && !baseUrl) {
    return "请先配置 Base URL";
  }

  if (config.provider === "azure" && !baseUrl) {
    return "请先配置 Base URL";
  }

  if (requiresApiKey(config.provider) && !config.apiKey?.trim()) {
    return "请先配置 API Key";
  }

  return "请先完成 AI 配置";
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
  const agentProvider = resolveAgentProvider(rawConfig.provider);
  const baseUrl =
    rawConfig.baseUrl?.trim() || getDefaultBaseUrl(rawConfig.provider) || undefined;

  return {
    rawConfig,
    language: rawConfig.language || settings.language || "zh",
    provider: rawConfig.provider,
    agentProvider,
    model: rawConfig.model || getDefaultModel(rawConfig.provider),
    apiKey: rawConfig.provider === "ollama" ? undefined : rawConfig.apiKey?.trim(),
    baseUrl,
    temperature: rawConfig.temperature,
    maxTokens: rawConfig.maxTokens,
    invocationMode: resolveInvocationMode(rawConfig.apiMode),
  };
}

/**
 * 检查当前 AI 配置是否可用于发起模型请求。
 */
export function isAgentConfigured(config: AIConfig): boolean {
  const provider = resolveAgentProvider(config.provider);
  const baseUrl = config.baseUrl?.trim() || getDefaultBaseUrl(config.provider);

  if ((provider === "openai-compatible" || config.provider === "azure") && !baseUrl) {
    return false;
  }

  if (requiresApiKey(config.provider)) {
    return !!config.apiKey?.trim();
  }

  return true;
}

/**
 * 在 AI 配置不完整时抛出用户可读错误。
 */
export function assertAgentConfigured(config: AIConfig): void {
  if (!isAgentConfigured(config)) {
    throw new Error(getMissingConfigMessage(config));
  }

  if (PROVIDER_DEFAULTS[config.provider]?.requiresApiKey && !config.apiKey?.trim()) {
    throw new Error("请先配置 API Key");
  }
}

/**
 * 创建 Browser Agent SDK 的 Agent 实例。
 *
 * 示例：
 * ```ts
 * const { agent } = await createExtensionAgent({ name: "bookmark-ai" });
 * await agent.run("hello");
 * ```
 */
export async function createExtensionAgent(
  options: CreateExtensionAgentOptions = {},
): Promise<{ agent: Agent; config: ResolvedAgentConfig }> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  return {
    agent: createAgentFromResolvedConfig(config, options),
    config,
  };
}

/**
 * 基于已解析配置创建 Agent，适合需要先读取 language/model 后再注册 command 的服务。
 */
export function createAgentFromResolvedConfig(
  config: ResolvedAgentConfig,
  options: CreateExtensionAgentOptions = {},
): Agent {
  return createAgent({
    agentId: options.name,
    sessionId: options.sessionId,
    provider: config.agentProvider,
    model: config.model,
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    invocationMode: config.invocationMode,
    systemPrompt: options.systemPrompt,
    tools: options.tools,
    skills: options.skills,
    memory: options.memory,
    maxIterations: options.maxIterations,
    temperature: config.temperature,
    dynamicCapabilities: options.dynamicCapabilities ?? { enabled: false },
  });
}
