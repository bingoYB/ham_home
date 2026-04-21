import {
  PROVIDER_DEFAULTS as AGENT_PROVIDER_DEFAULTS,
  getDefaultBaseUrl as getAgentDefaultBaseUrl,
  getDefaultModel as getAgentDefaultModel,
  getProviderModels as getAgentProviderModels,
  requiresApiKey as checkRequiresApiKey,
  type ProviderConfig,
} from "@hamhome/agent";
import type { AIProvider } from "../types";

export type { ProviderConfig };

export const PROVIDER_DEFAULTS: Record<AIProvider, ProviderConfig> =
  AGENT_PROVIDER_DEFAULTS as Record<AIProvider, ProviderConfig>;

export function getDefaultModel(provider: AIProvider): string {
  return getAgentDefaultModel(provider);
}

export function getProviderModels(provider: AIProvider): string[] {
  return getAgentProviderModels(provider);
}

export function getDefaultBaseUrl(provider: AIProvider): string {
  return getAgentDefaultBaseUrl(provider);
}

export function requiresApiKey(provider: AIProvider): boolean {
  return checkRequiresApiKey(provider);
}
