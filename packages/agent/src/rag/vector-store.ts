import type { RAGChunk, RAGSearchResult, VectorSearchOptions, VectorStore } from "./types";

/**
 * 计算余弦相似度。
 * 输入向量不要求事先归一化，这里会自行计算模长。
 */
function cosineSimilarity(left: number[], right: number[]): number {
  const length = Math.min(left.length, right.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (let index = 0; index < length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue * leftValue;
    rightNorm += rightValue * rightValue;
  }

  if (!leftNorm || !rightNorm) {
    return 0;
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

/**
 * 纯内存向量库。
 *
 * 特点：
 * 1. 浏览器 / 服务端通用
 * 2. 零依赖、易于测试
 * 3. 适合作为默认实现和接口示例
 *
 * 不足：
 * 1. 数据不持久化
 * 2. 检索是线性扫描，不适合大规模数据
 */
export class InMemoryVectorStore implements VectorStore {
  /**
   * 以 chunkId 为 key 存储所有 chunk。
   */
  private chunks = new Map<string, RAGChunk>();

  /**
   * 写入或覆盖一批 chunk。
   */
  async add(chunks: RAGChunk[]): Promise<void> {
    for (const chunk of chunks) {
      this.chunks.set(chunk.id, {
        ...chunk,
        embedding: chunk.embedding ? [...chunk.embedding] : undefined,
      });
    }
  }

  /**
   * 线性扫描全部 chunk，按余弦相似度排序返回前 topK 条。
   */
  async search(
    queryEmbedding: number[],
    options: VectorSearchOptions = {},
  ): Promise<RAGSearchResult[]> {
    const { topK = 5, minScore = -1, documentIds, filter } = options;
    const documentIdSet = documentIds ? new Set(documentIds) : null;
    const results: RAGSearchResult[] = [];

    for (const chunk of this.chunks.values()) {
      if (!chunk.embedding) {
        continue;
      }

      if (documentIdSet && !documentIdSet.has(chunk.documentId)) {
        continue;
      }

      if (filter && !filter(chunk)) {
        continue;
      }

      // 直接在内存中计算相似度，适合小到中等规模数据。
      const score = cosineSimilarity(queryEmbedding, chunk.embedding);
      if (score < minScore) {
        continue;
      }

      results.push({
        ...chunk,
        embedding: chunk.embedding ? [...chunk.embedding] : undefined,
        score,
      });
    }

    return results.sort((left, right) => right.score - left.score).slice(0, topK);
  }

  /**
   * 删除指定文档的全部 chunk。
   */
  async deleteByDocumentId(documentId: string): Promise<void> {
    for (const [chunkId, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(chunkId);
      }
    }
  }

  /**
   * 清空整个向量库。
   */
  async clear(): Promise<void> {
    this.chunks.clear();
  }

  /**
   * 返回当前已存储 chunk 数量。
   */
  async count(): Promise<number> {
    return this.chunks.size;
  }
}
