import { createAmazonBedrock } from "@ai-sdk/amazon-bedrock";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createAzure } from "@ai-sdk/azure";
import { createCerebras } from "@ai-sdk/cerebras";
import { createCohere } from "@ai-sdk/cohere";
import { createDeepInfra } from "@ai-sdk/deepinfra";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { createFireworks } from "@ai-sdk/fireworks";
import { createGatewayProvider } from "@ai-sdk/gateway";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createMistral } from "@ai-sdk/mistral";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createPerplexity } from "@ai-sdk/perplexity";
import { createTogetherAI } from "@ai-sdk/togetherai";
import { createVercel } from "@ai-sdk/vercel";
import { createXai } from "@ai-sdk/xai";
import type { AiSdkProviderDefinition } from "../core/types";

/**
 * AI SDK provider definitions, published as `@hamhome/agent/providers`.
 *
 * Every provider package is side-effect free, so a bundler keeps only the
 * definitions the app imports.
 *
 * Example:
 * ```ts
 * import { openaiProvider, openaiCompatibleProvider } from "@hamhome/agent/providers";
 * createAgent({ providers: [openaiProvider, openaiCompatibleProvider], provider: "openai", model: "gpt-4.1-mini" });
 * ```
 */

const LANGUAGE_AND_EMBEDDING = { language: true, embedding: true } as const;
const LANGUAGE_ONLY = { language: true, embedding: false } as const;

export const gatewayProvider: AiSdkProviderDefinition = {
  name: "gateway",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createGatewayProvider(options),
};

export const vercelProvider: AiSdkProviderDefinition = {
  name: "vercel",
  supports: LANGUAGE_ONLY,
  create: (options) => createVercel(options),
};

export const openaiProvider: AiSdkProviderDefinition = {
  name: "openai",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createOpenAI(options),
};

export const openaiCompatibleProvider: AiSdkProviderDefinition = {
  name: "openai-compatible",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => {
    if (!options.baseURL) {
      throw new Error('Provider "openai-compatible" requires baseUrl or providerOptions.baseURL.');
    }
    return createOpenAICompatible({
      name: "openai-compatible",
      ...options,
      baseURL: String(options.baseURL),
    });
  },
};

export const anthropicProvider: AiSdkProviderDefinition = {
  name: "anthropic",
  supports: LANGUAGE_ONLY,
  create: (options) => createAnthropic(options),
};

export const googleProvider: AiSdkProviderDefinition = {
  name: "google",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createGoogleGenerativeAI(options),
};

export const xaiProvider: AiSdkProviderDefinition = {
  name: "xai",
  supports: LANGUAGE_ONLY,
  create: (options) => createXai(options),
};

export const azureProvider: AiSdkProviderDefinition = {
  name: "azure",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createAzure(options),
};

export const amazonBedrockProvider: AiSdkProviderDefinition = {
  name: "amazon-bedrock",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createAmazonBedrock(options),
};

export const groqProvider: AiSdkProviderDefinition = {
  name: "groq",
  supports: LANGUAGE_ONLY,
  create: (options) => createGroq(options),
};

export const deepinfraProvider: AiSdkProviderDefinition = {
  name: "deepinfra",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createDeepInfra(options),
};

export const mistralProvider: AiSdkProviderDefinition = {
  name: "mistral",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createMistral(options),
};

export const togetheraiProvider: AiSdkProviderDefinition = {
  name: "togetherai",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createTogetherAI(options),
};

export const cohereProvider: AiSdkProviderDefinition = {
  name: "cohere",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createCohere(options),
};

export const fireworksProvider: AiSdkProviderDefinition = {
  name: "fireworks",
  supports: LANGUAGE_AND_EMBEDDING,
  create: (options) => createFireworks(options),
};

export const deepseekProvider: AiSdkProviderDefinition = {
  name: "deepseek",
  supports: LANGUAGE_ONLY,
  create: (options) => createDeepSeek(options),
};

export const cerebrasProvider: AiSdkProviderDefinition = {
  name: "cerebras",
  supports: LANGUAGE_ONLY,
  create: (options) => createCerebras(options),
};

export const perplexityProvider: AiSdkProviderDefinition = {
  name: "perplexity",
  supports: LANGUAGE_ONLY,
  create: (options) => createPerplexity(options),
};

/**
 * Every built-in provider. Convenient for scripts and tests; apps that care
 * about bundle size should list only the providers they use.
 */
export const allProviders: AiSdkProviderDefinition[] = [
  gatewayProvider,
  vercelProvider,
  openaiProvider,
  openaiCompatibleProvider,
  anthropicProvider,
  googleProvider,
  xaiProvider,
  azureProvider,
  amazonBedrockProvider,
  groqProvider,
  deepinfraProvider,
  mistralProvider,
  togetheraiProvider,
  cohereProvider,
  fireworksProvider,
  deepseekProvider,
  cerebrasProvider,
  perplexityProvider,
];
