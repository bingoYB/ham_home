import { Agent } from "@hamhome/agent";
import { configStorage } from "@/lib/storage";
import type { AIConfig, Language } from "@/types";
import {
  getDefaultBaseUrl,
  getDefaultModel,
  PROVIDER_DEFAULTS,
  requiresApiKey,
} from "./provider-config";

export interface ResolvedAgentConfig {
  rawConfig: AIConfig;
  language: Language;
  provider: AIConfig["provider"];
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface CreateExtensionAgentOptions {
  name: string;
  systemPrompt: string;
  tools?: ConstructorParameters<typeof Agent>[0]["tools"];
}

function getMissingConfigMessage(config: AIConfig): string {
  if (
    (config.provider === "azure" || config.provider === "custom") &&
    !config.baseUrl?.trim()
  ) {
    return "请先配置 Base URL";
  }

  if (requiresApiKey(config.provider) && !config.apiKey?.trim()) {
    return "请先配置 API Key";
  }

  return "请先完成 AI 配置";
}

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
    model: rawConfig.model || getDefaultModel(rawConfig.provider),
    apiKey: rawConfig.apiKey?.trim(),
    baseURL:
      rawConfig.baseUrl?.trim() || getDefaultBaseUrl(rawConfig.provider) || undefined,
    temperature: rawConfig.temperature,
    maxTokens: rawConfig.maxTokens,
  };
}

export function isAgentConfigured(config: AIConfig): boolean {
  if (
    (config.provider === "azure" || config.provider === "custom") &&
    !config.baseUrl?.trim()
  ) {
    return false;
  }

  if (config.provider === "ollama") {
    return true;
  }

  if (requiresApiKey(config.provider)) {
    return !!config.apiKey?.trim();
  }

  return true;
}

export function assertAgentConfigured(config: AIConfig): void {
  if (!isAgentConfigured(config)) {
    throw new Error(getMissingConfigMessage(config));
  }

  if (
    PROVIDER_DEFAULTS[config.provider]?.requiresApiKey &&
    !config.apiKey?.trim()
  ) {
    throw new Error("请先配置 API Key");
  }
}

export async function createExtensionAgent(
  options: CreateExtensionAgentOptions,
): Promise<{ agent: Agent; config: ResolvedAgentConfig }> {
  const config = await resolveAgentConfig();
  assertAgentConfigured(config.rawConfig);

  const agent = new Agent({
    name: options.name,
    provider: config.provider,
    model: config.model,
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    systemPrompt: options.systemPrompt,
    tools: options.tools,
    workspace: "HamHome browser extension",
  });

  return { agent, config };
}
