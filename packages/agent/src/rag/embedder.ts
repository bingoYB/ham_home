import type { Embedder } from "./types";

/**
 * 轻量哈希函数。
 * 用于把 token 映射到固定维度的向量槽位。
 */
function hashToken(token: string, seed = 2166136261): number {
  let hash = seed >>> 0;

  for (const char of Array.from(token)) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/**
 * 将向量做 L2 归一化，方便后续使用余弦相似度。
 */
function normalizeVector(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  if (!norm) {
    return vector;
  }

  return vector.map((value) => value / norm);
}

/**
 * 文本分词。
 *
 * 这里没有依赖语言特定分词器，而是采用：
 * 1. Unicode 单词 token
 * 2. 去空白后的 2-gram / 3-gram
 *
 * 这样英文和中文都能有一个“够用”的跨端默认效果。
 */
function tokenize(text: string): string[] {
  const normalized = text.normalize("NFKC").toLowerCase().trim();
  if (!normalized) {
    return [];
  }

  const tokens: string[] = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const compact = Array.from(normalized.replace(/\s+/g, ""));

  if (compact.length === 1) {
    tokens.push(compact[0]);
  }

  for (const size of [2, 3]) {
    if (compact.length < size) {
      continue;
    }

    for (let index = 0; index <= compact.length - size; index += 1) {
      tokens.push(compact.slice(index, index + size).join(""));
    }
  }

  return tokens;
}

/**
 * 纯 TS 的本地 Embedding 实现，适合浏览器端和服务端 demo/轻量检索。
 * 如需接入真实 embedding API，只需要实现 Embedder 接口并替换即可。
 */
export class HashEmbeddingEmbedder implements Embedder {
  /**
   * 向量维度。
   * 维度越高，碰撞越少；维度越低，性能和体积越省。
   */
  readonly dimension: number;

  constructor(options: { dimension?: number } = {}) {
    this.dimension = options.dimension ?? 256;

    if (this.dimension < 8) {
      throw new Error("Embedding dimension must be at least 8.");
    }
  }

  /**
   * 批量向量化接口。
   */
  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedOne(text));
  }

  /**
   * 单条文本向量化流程：
   * 1. tokenize
   * 2. hash 到固定维度桶
   * 3. 用第二个 hash 控制正负号，减少单向累积偏置
   * 4. 归一化
   */
  private embedOne(text: string): number[] {
    const vector = new Array<number>(this.dimension).fill(0);
    const tokens = tokenize(text);

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      const index = hashToken(token) % this.dimension;
      const sign = (hashToken(token, 1315423911) & 1) === 0 ? 1 : -1;
      vector[index] += sign;
    }

    return normalizeVector(vector);
  }
}
