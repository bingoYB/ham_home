import type { AiSdkProviderName, EmbeddingClientConfig } from "../core/types";

/**
 * Embedding call options, kept apart from `embedding.ts` so callers that only need to ask
 * "does this provider take a custom size?" do not pull the AI SDK into their bundle.
 */

/**
 * Whether `EmbeddingClientConfig.dimensions` is forwarded for the provider. The
 * model itself must also accept a custom size, which only the caller knows.
 *
 * Example:
 * ```ts
 * supportsEmbeddingDimensions("openai"); // true
 * supportsEmbeddingDimensions("mistral"); // false
 * ```
 */
export function supportsEmbeddingDimensions(provider: AiSdkProviderName | undefined): boolean {
  return toEmbeddingCallOptions({ provider, model: "", dimensions: 1 }) !== undefined;
}

/**
 * Maps `dimensions` onto the per-call option key each AI SDK embedding model reads.
 * Azure reuses the OpenAI embedding model, so it reads the `openai` key too.
 */
export function toEmbeddingCallOptions(
  config: EmbeddingClientConfig,
): Record<string, Record<string, number>> | undefined {
  const { dimensions } = config;
  if (!dimensions) {
    return undefined;
  }

  switch (config.provider ?? "gateway") {
    case "openai":
    case "azure":
      return { openai: { dimensions } };
    case "openai-compatible":
      return { openaiCompatible: { dimensions } };
    case "google":
      return { google: { outputDimensionality: dimensions } };
    default:
      return undefined;
  }
}
