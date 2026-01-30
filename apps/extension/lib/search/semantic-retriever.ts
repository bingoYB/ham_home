/**
 * 语义检索器
 * 基于 embedding 向量的 cosine 相似度检索
 */
import type {
  LocalBookmark,
  SearchResultItem,
  BookmarkEmbedding,
} from "@/types";
import { vectorStore, bookmarkStorage } from "@/lib/storage";
import { embeddingClient } from "@/lib/embedding";
import { createLogger } from "@hamhome/utils";

const logger = createLogger({ namespace: "SemanticRetriever" });

/**
 * 计算两个向量的 cosine 相似度
 */
function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error("Vector dimensions do not match");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * 将 ArrayBuffer 转换为 Float32Array
 */
function bufferToFloat32Array(buffer: ArrayBuffer): Float32Array {
  return new Float32Array(buffer);
}

/**
 * 语义检索选项
 */
export interface SemanticSearchOptions {
  /** 返回数量 */
  topK?: number;
  /** 最小相似度阈值（0-1） */
  minScore?: number;
  /** 排除的书签 ID 列表 */
  excludeIds?: string[];
  /** 只在指定的书签 ID 范围内搜索 */
  filterIds?: string[];
}

/**
 * 语义检索结果
 */
export interface SemanticSearchResult {
  /** 结果列表 */
  items: SearchResultItem[];
  /** 查询向量维度 */
  queryDimensions: number;
  /** 搜索的向量数量 */
  searchedCount: number;
}

/**
 * 语义检索器类
 */
class SemanticRetriever {
  /**
   * 检查语义检索是否可用
   */
  async isAvailable(): Promise<boolean> {
    await embeddingClient.loadConfig();
    const isEnabled = embeddingClient.isEnabled();
    const isSupported = embeddingClient.isProviderSupported();
    const config = embeddingClient.getConfig();
    
    const available = isEnabled && isSupported;
    
    // 使用 info 级别日志，确保在生产环境也能看到
    if (!available) {
      logger.info('Semantic retriever not available', {
        isEnabled,
        isSupported,
        provider: config?.provider,
        enabled: config?.enabled,
        hasApiKey: !!config?.apiKey,
        reason: !config?.enabled 
          ? 'Embedding not enabled in settings' 
          : !isSupported 
            ? `Provider ${config?.provider} does not support embedding`
            : !config?.apiKey && config?.provider !== 'ollama'
              ? 'API key not configured'
              : 'Unknown',
      });
    } else {
      logger.debug('Semantic retriever available', {
        provider: config?.provider,
        model: config?.model,
      });
    }
    
    return available;
  }

  /**
   * 执行语义搜索
   */
  async search(
    query: string,
    options: SemanticSearchOptions = {},
  ): Promise<SemanticSearchResult> {
    const { topK = 20, minScore = 0.3, excludeIds = [], filterIds } = options;

    // 检查是否可用
    if (!(await this.isAvailable())) {
      logger.warn("Semantic search is not available");
      return {
        items: [],
        queryDimensions: 0,
        searchedCount: 0,
      };
    }

    // 获取查询向量
    logger.debug("Generating query embedding", { query: query.slice(0, 50) });
    const queryVector = await embeddingClient.embed(query);
    const queryFloat32 = new Float32Array(queryVector);

    // 获取当前模型的所有向量
    const modelKey = embeddingClient.getModelKey();
    const embeddings = await vectorStore.getEmbeddingsByModel(modelKey);

    logger.debug("Searching embeddings", {
      modelKey,
      embeddingCount: embeddings.length,
      queryDimensions: queryVector.length,
    });

    if (embeddings.length === 0) {
      logger.warn("No embeddings found for model", { modelKey });
    }

    // 过滤向量
    let filteredEmbeddings = embeddings;

    if (filterIds && filterIds.length > 0) {
      const filterSet = new Set(filterIds);
      filteredEmbeddings = embeddings.filter((e) =>
        filterSet.has(e.bookmarkId),
      );
    }

    if (excludeIds.length > 0) {
      const excludeSet = new Set(excludeIds);
      filteredEmbeddings = filteredEmbeddings.filter(
        (e) => !excludeSet.has(e.bookmarkId),
      );
    }

    // 计算相似度并排序
    const scores: Array<{ bookmarkId: string; score: number }> = [];

    for (const embedding of filteredEmbeddings) {
      // 检查维度匹配
      if (embedding.dim !== queryVector.length) {
        logger.warn("Dimension mismatch", {
          bookmarkId: embedding.bookmarkId,
          embeddingDim: embedding.dim,
          queryDim: queryVector.length,
        });
        continue;
      }

      const embeddingVector = bufferToFloat32Array(embedding.vector);
      const score = cosineSimilarity(queryFloat32, embeddingVector);

      if (score >= minScore) {
        scores.push({ bookmarkId: embedding.bookmarkId, score });
      }
    }

    // 按相似度降序排序
    scores.sort((a, b) => b.score - a.score);

    // 取 top K
    const topResults = scores.slice(0, topK);

    // 转换为 SearchResultItem
    const items: SearchResultItem[] = topResults.map((result) => ({
      bookmarkId: result.bookmarkId,
      score: result.score,
      semanticScore: result.score,
      matchReason: `语义相似度: ${(result.score * 100).toFixed(1)}%`,
    }));

    logger.debug("Semantic search completed", {
      query: query.slice(0, 50),
      searchedCount: filteredEmbeddings.length,
      resultCount: items.length,
      topScore: items[0]?.score,
    });

    return {
      items,
      queryDimensions: queryVector.length,
      searchedCount: filteredEmbeddings.length,
    };
  }

  /**
   * 查找相似书签（基于书签 ID）
   */
  async findSimilar(
    bookmarkId: string,
    options: SemanticSearchOptions = {},
  ): Promise<SemanticSearchResult> {
    const { topK = 10, minScore = 0.5, excludeIds = [] } = options;

    // 获取目标书签的向量
    const embedding = await vectorStore.getEmbedding(bookmarkId);
    if (!embedding) {
      logger.warn("Bookmark embedding not found", { bookmarkId });
      return {
        items: [],
        queryDimensions: 0,
        searchedCount: 0,
      };
    }

    const queryVector = bufferToFloat32Array(embedding.vector);

    // 获取同模型的所有向量
    const embeddings = await vectorStore.getEmbeddingsByModel(
      embedding.modelKey,
    );

    // 排除自身和指定 ID
    const excludeSet = new Set([bookmarkId, ...excludeIds]);
    const filteredEmbeddings = embeddings.filter(
      (e) => !excludeSet.has(e.bookmarkId),
    );

    // 计算相似度并排序
    const scores: Array<{ bookmarkId: string; score: number }> = [];

    for (const emb of filteredEmbeddings) {
      if (emb.dim !== embedding.dim) continue;

      const embeddingVector = bufferToFloat32Array(emb.vector);
      const score = cosineSimilarity(queryVector, embeddingVector);

      if (score >= minScore) {
        scores.push({ bookmarkId: emb.bookmarkId, score });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    const topResults = scores.slice(0, topK);

    const items: SearchResultItem[] = topResults.map((result) => ({
      bookmarkId: result.bookmarkId,
      score: result.score,
      semanticScore: result.score,
      matchReason: `相似度: ${(result.score * 100).toFixed(1)}%`,
    }));

    return {
      items,
      queryDimensions: embedding.dim,
      searchedCount: filteredEmbeddings.length,
    };
  }

  /**
   * 获取覆盖率统计
   */
  async getCoverageStats(): Promise<{
    total: number;
    withEmbedding: number;
    coverage: number;
  }> {
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const total = bookmarks.length;

    if (total === 0) {
      return { total: 0, withEmbedding: 0, coverage: 0 };
    }

    const bookmarkIds = bookmarks.map((b) => b.id);
    const embeddings = await vectorStore.getEmbeddings(bookmarkIds);
    const withEmbedding = embeddings.size;

    return {
      total,
      withEmbedding,
      coverage: Math.round((withEmbedding / total) * 100),
    };
  }
}

// 导出单例
export const semanticRetriever = new SemanticRetriever();
