import { embed, embedMany, type EmbeddingModel } from "ai";
import { resolveEmbeddingModel } from "./providers";
import type {
  EmbeddingClient,
  EmbeddingClientConfig,
  EmbeddingTestConnectionResult,
  SimilarityCandidate,
  SimilarityResult,
} from "../core/types";

export type { EmbeddingClient, EmbeddingTestConnectionResult } from "../core/types";

/**
 * Vercel AI SDK backed embedding client for single and batch embedding calls.
 *
 * Example:
 * ```ts
 * const client = createEmbeddingClient({ provider: "openai", model: "text-embedding-3-small" });
 * const vector = await client.embed("退货政策");
 * ```
 */
export class AiSdkEmbeddingClient implements EmbeddingClient {
  constructor(private readonly config: EmbeddingClientConfig) {}

  async embed(input: string, options: { signal?: AbortSignal } = {}): Promise<number[]> {
    const result = await embed({
      model: await this.resolveModel(),
      value: input,
      maxRetries: this.config.maxRetries,
      abortSignal: options.signal,
    });
    return [...result.embedding];
  }

  async embedMany(input: string[], options: { signal?: AbortSignal } = {}): Promise<number[][]> {
    const result = await embedMany({
      model: await this.resolveModel(),
      values: input,
      maxRetries: this.config.maxRetries,
      abortSignal: options.signal,
    });
    return result.embeddings.map((embedding) => [...embedding]);
  }

  async testConnection(options: { signal?: AbortSignal } = {}): Promise<EmbeddingTestConnectionResult> {
    const start = Date.now();
    try {
      const vector = await this.embed("connection test", options);
      const latencyMs = Date.now() - start;
      if (!Array.isArray(vector) || vector.length === 0) {
        return {
          success: false,
          message: "Embedding service returned an empty vector.",
          latencyMs,
        };
      }
      return {
        success: true,
        message: `Connection successful. Returned vector of dimension ${vector.length}.`,
        latencyMs,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        message: "Failed to connect to embedding service.",
        latencyMs,
        error: errorMessage,
      };
    }
  }

  private async resolveModel(): Promise<EmbeddingModel> {
    return resolveEmbeddingModel(this.config);
  }
}

/**
 * Creates an embedding client with the default Vercel AI SDK adapter.
 */
export function createEmbeddingClient(config: EmbeddingClientConfig): EmbeddingClient {
  return new AiSdkEmbeddingClient(config);
}

/**
 * Calculates cosine similarity for two non-zero vectors with equal length.
 *
 * Example:
 * ```ts
 * cosineSimilarity([1, 0], [0, 1]); // 0
 * ```
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have the same length.");
  }
  if (a.length === 0) {
    throw new Error("Vectors must not be empty.");
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    normA += a[index] * a[index];
    normB += b[index] * b[index];
  }

  if (normA === 0 || normB === 0) {
    throw new Error("Vectors must not be zero vectors.");
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ranks arbitrary items by cosine similarity to a query vector.
 *
 * Example:
 * ```ts
 * rankBySimilarity([1, 0], [{ embedding: [0.9, 0.1], item: "A" }], { topK: 1 });
 * ```
 */
export function rankBySimilarity<T>(
  query: number[],
  candidates: Array<SimilarityCandidate<T>>,
  options: { topK?: number } = {},
): Array<SimilarityResult<T>> {
  const ranked = candidates
    .map((candidate) => ({
      item: candidate.item,
      score: cosineSimilarity(query, candidate.embedding),
    }))
    .sort((left, right) => right.score - left.score);

  return typeof options.topK === "number" ? ranked.slice(0, options.topK) : ranked;
}
