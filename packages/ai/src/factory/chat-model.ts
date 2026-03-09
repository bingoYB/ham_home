import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";

import type { AIClientConfig } from "../types";
import { getDefaultModel, PROVIDER_DEFAULTS } from "../config/providers";

export type SupportedChatModel = ChatOpenAI | ChatAnthropic;

export function createChatModel(config: AIClientConfig): SupportedChatModel {
  const defaults = PROVIDER_DEFAULTS[config.provider];
  const model = config.model || getDefaultModel(config.provider);
  const temperature = config.temperature ?? 0.3;
  const maxTokens = config.maxTokens ?? 1000;

  if (config.provider === "anthropic") {
    return new ChatAnthropic({
      apiKey: config.apiKey || "",
      model,
      temperature,
      maxTokens,
      clientOptions: config.baseUrl || defaults.baseUrl
        ? {
            baseURL: config.baseUrl || defaults.baseUrl,
          }
        : undefined,
    });
  }

  return new ChatOpenAI({
    apiKey: config.provider === "ollama" ? "ollama" : config.apiKey || "",
    model,
    temperature,
    maxTokens,
    configuration: config.baseUrl || defaults.baseUrl
      ? {
          baseURL: config.baseUrl || defaults.baseUrl,
        }
      : undefined,
  });
}
