import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createCerebras } from "@ai-sdk/cerebras";
import { createCohere } from "@ai-sdk/cohere";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createFal } from "@ai-sdk/fal";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGatewayProvider } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createLuma } from "@ai-sdk/luma";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createVercel } from "@ai-sdk/vercel";
import { createXai } from "@ai-sdk/xai";
import type { EmbeddingModel, LanguageModel } from "ai";
import type { AiSdkProviderConfig, AiSdkProviderName, EmbeddingClientConfig } from "../core/types";

type ProviderLike = {
  languageModel?: (modelId: string) => unknown;
  chat?: (modelId: string) => unknown;
  embedding?: (modelId: string) => unknown;
  embeddingModel?: (modelId: string) => unknown;
  textEmbedding?: (modelId: string) => unknown;
  textEmbeddingModel?: (modelId: string) => unknown;
};

const LANGUAGE_PROVIDER_NAMES: ReadonlySet<AiSdkProviderName> = new Set([
  "gateway",
  "vercel",
  "openai",
  "openai-compatible",
  "anthropic",
  "google",
  "xai",
  "azure",
  "amazon-bedrock",
  "groq",
  "deepinfra",
  "mistral",
  "togetherai",
  "cohere",
  "fireworks",
  "deepseek",
  "cerebras",
  "perplexity",
]);

const EMBEDDING_PROVIDER_NAMES: ReadonlySet<AiSdkProviderName> = new Set([
  "gateway",
  "openai",
  "openai-compatible",
  "google",
  "azure",
  "amazon-bedrock",
  "deepinfra",
  "mistral",
  "togetherai",
  "cohere",
  "fireworks",
]);

/**
 * Resolves a provider/model pair into an AI SDK language model.
 *
 * Example:
 * ```ts
 * const model = await resolveLanguageModel({ provider: "anthropic", model: "claude-sonnet-4-5" });
 * ```
 */
export async function resolveLanguageModel(
  config: AiSdkProviderConfig,
  invocationMode?: "response" | "chat",
): Promise<LanguageModel> {
  if (!config.model) {
    throw new Error("A model is required. Pass AgentConfig.model or a custom modelClient.");
  }

  if (typeof config.model !== "string") {
    return config.model;
  }

  const providerName = normalizeProviderName(config.provider);
  if (!LANGUAGE_PROVIDER_NAMES.has(providerName)) {
    throw new Error(`Provider "${providerName}" does not expose an AI SDK language model.`);
  }

  const provider = await createProvider(config);
  let languageModel;

  if (invocationMode === "chat") {
    languageModel = provider.chat?.(config.model) ?? callProvider(provider, config.model);
  } else if (invocationMode === "response") {
    languageModel = provider.languageModel?.(config.model) ?? callProvider(provider, config.model);
  } else {
    languageModel =
      provider.languageModel?.(config.model) ?? provider.chat?.(config.model) ?? callProvider(provider, config.model);
  }

  if (!languageModel) {
    throw new Error(`Provider "${providerName}" does not expose an AI SDK language model for mode "${invocationMode || 'default'}".`);
  }
  return languageModel as LanguageModel;
}

/**
 * Resolves a provider/model pair into an AI SDK embedding model.
 *
 * Example:
 * ```ts
 * const model = await resolveEmbeddingModel({ provider: "google", model: "text-embedding-004" });
 * ```
 */
export async function resolveEmbeddingModel(config: EmbeddingClientConfig): Promise<EmbeddingModel> {
  if (typeof config.model !== "string") {
    return config.model;
  }

  const providerName = normalizeProviderName(config.provider);
  if (!EMBEDDING_PROVIDER_NAMES.has(providerName)) {
    throw new Error(`Provider "${providerName}" does not expose an AI SDK embedding model.`);
  }

  const provider = await createProvider(config);
  const embeddingModel =
    provider.embedding?.(config.model) ??
    provider.embeddingModel?.(config.model) ??
    provider.textEmbedding?.(config.model) ??
    provider.textEmbeddingModel?.(config.model);

  if (!embeddingModel) {
    throw new Error(`Provider "${providerName}" does not expose an AI SDK embedding model.`);
  }

  return embeddingModel as EmbeddingModel;
}

export async function resolveApiKey(config: Pick<AiSdkProviderConfig, "apiKey" | "tokenProvider">): Promise<string | undefined> {
  return config.tokenProvider ? config.tokenProvider() : config.apiKey;
}

function normalizeProviderName(provider: AiSdkProviderConfig["provider"] | undefined): AiSdkProviderName {
  return provider ?? "gateway";
}

async function createProvider(config: Pick<AiSdkProviderConfig, "provider" | "apiKey" | "tokenProvider" | "baseUrl" | "providerOptions">): Promise<ProviderLike> {
  const apiKey = await resolveApiKey(config);
  const options = createProviderOptions(config.providerOptions, apiKey, config.baseUrl);

  switch (normalizeProviderName(config.provider)) {
    case "gateway":
      return createGatewayProvider(options) as ProviderLike;
    case "vercel":
      return createVercel(options) as ProviderLike;
    case "openai":
      return createOpenAI(options) as ProviderLike;
    case "openai-compatible": {
      const baseURL = config.baseUrl ?? String(config.providerOptions?.baseURL ?? "");
      if (!baseURL) {
        throw new Error('Provider "openai-compatible" requires baseUrl or providerOptions.baseURL.');
      }
      return createOpenAICompatible({
        name: "openai-compatible",
        ...options,
        baseURL,
      }) as ProviderLike;
    }
    case "anthropic":
      return createAnthropic(options) as ProviderLike;
    case "google":
      return createGoogleGenerativeAI(options) as ProviderLike;
    case "xai":
      return createXai(options) as ProviderLike;
    case "azure":
      return createAzure(options) as ProviderLike;
    case "amazon-bedrock":
      return createAmazonBedrock(options) as ProviderLike;
    case "groq":
      return createGroq(options) as ProviderLike;
    case "fal":
      return createFal(options) as ProviderLike;
    case "deepinfra":
      return createDeepInfra(options) as ProviderLike;
    case "mistral":
      return createMistral(options) as ProviderLike;
    case "togetherai":
      return createTogetherAI(options) as ProviderLike;
    case "cohere":
      return createCohere(options) as ProviderLike;
    case "fireworks":
      return createFireworks(options) as ProviderLike;
    case "deepseek":
      return createDeepSeek(options) as ProviderLike;
    case "cerebras":
      return createCerebras(options) as ProviderLike;
    case "perplexity":
      return createPerplexity(options) as ProviderLike;
    case "luma":
      return createLuma(options) as ProviderLike;
  }
}

function callProvider(provider: unknown, model: string): unknown {
  return typeof provider === "function" ? provider(model) : undefined;
}

function createProviderOptions(
  providerOptions: Record<string, unknown> | undefined,
  apiKey: string | undefined,
  baseUrl: string | undefined,
): Record<string, unknown> {
  return {
    ...(providerOptions ?? {}),
    ...(apiKey ? { apiKey } : {}),
    ...(baseUrl ? { baseURL: baseUrl } : {}),
  };
}
