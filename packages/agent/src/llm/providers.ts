import type { EmbeddingModel, LanguageModel } from "ai";
import type {
  AiSdkProviderConfig,
  AiSdkProviderDefinition,
  AiSdkProviderName,
  EmbeddingClientConfig,
} from "../core/types";

type ProviderLike = {
  languageModel?: (modelId: string) => unknown;
  chat?: (modelId: string) => unknown;
  embedding?: (modelId: string) => unknown;
  embeddingModel?: (modelId: string) => unknown;
  textEmbedding?: (modelId: string) => unknown;
  textEmbeddingModel?: (modelId: string) => unknown;
};

type ProviderFactoryConfig = Pick<
  AiSdkProviderConfig,
  "provider" | "providers" | "apiKey" | "tokenProvider" | "baseUrl" | "providerOptions"
>;

/**
 * Resolves a provider/model pair into an AI SDK language model. The provider
 * must be one of `config.providers`.
 *
 * Example:
 * ```ts
 * import { anthropicProvider } from "@hamhome/agent/providers";
 * const model = await resolveLanguageModel({
 *   providers: [anthropicProvider],
 *   provider: "anthropic",
 *   model: "claude-sonnet-4-5",
 * });
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

  const definition = findProviderDefinition(config);
  if (!definition.supports.language) {
    throw new Error(`Provider "${definition.name}" does not expose an AI SDK language model.`);
  }

  const provider = await createProvider(definition, config);
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
    throw new Error(`Provider "${definition.name}" does not expose an AI SDK language model for mode "${invocationMode || 'default'}".`);
  }
  return languageModel as LanguageModel;
}

/**
 * Resolves a provider/model pair into an AI SDK embedding model. The provider
 * must be one of `config.providers`.
 *
 * Example:
 * ```ts
 * import { googleProvider } from "@hamhome/agent/providers";
 * const model = await resolveEmbeddingModel({
 *   providers: [googleProvider],
 *   provider: "google",
 *   model: "text-embedding-004",
 * });
 * ```
 */
export async function resolveEmbeddingModel(config: EmbeddingClientConfig): Promise<EmbeddingModel> {
  if (typeof config.model !== "string") {
    return config.model;
  }

  const definition = findProviderDefinition(config);
  if (!definition.supports.embedding) {
    throw new Error(`Provider "${definition.name}" does not expose an AI SDK embedding model.`);
  }

  const provider = await createProvider(definition, config);
  const embeddingModel =
    provider.embedding?.(config.model) ??
    provider.embeddingModel?.(config.model) ??
    provider.textEmbedding?.(config.model) ??
    provider.textEmbeddingModel?.(config.model);

  if (!embeddingModel) {
    throw new Error(`Provider "${definition.name}" does not expose an AI SDK embedding model.`);
  }

  return embeddingModel as EmbeddingModel;
}

export async function resolveApiKey(config: Pick<AiSdkProviderConfig, "apiKey" | "tokenProvider">): Promise<string | undefined> {
  return config.tokenProvider ? config.tokenProvider() : config.apiKey;
}

function normalizeProviderName(provider: AiSdkProviderConfig["provider"] | undefined): AiSdkProviderName {
  return provider ?? "gateway";
}

function findProviderDefinition(config: ProviderFactoryConfig): AiSdkProviderDefinition {
  const name = normalizeProviderName(config.provider);
  const definition = config.providers?.find((item) => item.name === name);
  if (!definition) {
    throw new Error(
      `Provider "${name}" is not registered. Import its definition from "@hamhome/agent/providers" and pass it in the \`providers\` option.`,
    );
  }
  return definition;
}

async function createProvider(definition: AiSdkProviderDefinition, config: ProviderFactoryConfig): Promise<ProviderLike> {
  const apiKey = await resolveApiKey(config);
  return definition.create(createProviderOptions(config.providerOptions, apiKey, config.baseUrl)) as ProviderLike;
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
