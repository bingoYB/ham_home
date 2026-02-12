/**
 * 混合检索器
 * 结合关键词召回和语义召回，提供更稳定的相关性
 */
import type {
  LocalBookmark,
  SearchResultItem,
  SearchFilters,
  SearchResult,
} from "@/types";
import {
  semanticRetriever,
  type SemanticSearchResult,
  type SemanticSearchOptions,
} from "./semantic-retriever";
import { keywordRetriever, matchesFilters } from "./keyword-retriever";
import { bookmarkStorage } from "@/lib/storage";
import { getBackgroundService } from "@/lib/services";
import { isContentScriptContext } from "@/utils/browser-api";
import { createLogger } from "@hamhome/utils";

const logger = createLogger({ namespace: "HybridRetriever" });

/**
 * 混合检索权重配置
 */
export interface HybridWeights {
  /** 关键词评分权重 */
  keyword: number;
  /** 语义评分权重 */
  semantic: number;
  /** 标签/分类命中加权 */
  filterBoost?: number;
}

/**
 * 默认混合权重
 */
const DEFAULT_WEIGHTS: HybridWeights = {
  keyword: 0.4,
  semantic: 0.6,
  filterBoost: 0.1,
};

/**
 * 混合检索选项
 */
export interface HybridSearchOptions {
  /** 返回数量 */
  topK?: number;
  /** 过滤条件 */
  filters?: SearchFilters;
  /** 排除的书签 ID 列表 */
  excludeIds?: string[];
  /** 权重配置 */
  weights?: Partial<HybridWeights>;
  /** 是否启用语义搜索 */
  enableSemantic?: boolean;
  /** 是否启用关键词搜索 */
  enableKeyword?: boolean;
}

/**
 * 混合检索器类
 */
class HybridRetriever {
  /**
   * 执行语义搜索（自动判断环境）
   * 在 content script 中通过 background service 调用，确保访问正确的 IndexedDB
   */
  private async executeSemanticSearch(
    query: string,
    options: SemanticSearchOptions,
  ): Promise<SemanticSearchResult> {
    if (isContentScriptContext()) {
      // 在 content script 中，通过 background service 调用
      logger.debug(
        "Using background service for semantic search (content script context)",
      );
      const bgService = getBackgroundService();
      return bgService.semanticSearch(query, options);
    }
    // 在扩展页面或 background 中，直接调用
    return semanticRetriever.search(query, options);
  }

  /**
   * 检查语义搜索是否可用（自动判断环境）
   */
  private async checkSemanticAvailable(): Promise<boolean> {
    if (isContentScriptContext()) {
      logger.debug("Checking semantic availability via background service");
      const bgService = getBackgroundService();
      return bgService.isSemanticAvailable();
    }
    return semanticRetriever.isAvailable();
  }

  /**
   * 执行混合搜索
   */
  async search(
    query: string,
    options: HybridSearchOptions = {},
  ): Promise<SearchResult> {
    const {
      topK = 20,
      filters = {},
      excludeIds = [],
      weights = {},
      enableSemantic = true,
      enableKeyword = true,
    } = options;

    const mergedWeights: HybridWeights = { ...DEFAULT_WEIGHTS, ...weights };

    logger.debug("Hybrid search", {
      query,
      enableSemantic,
      enableKeyword,
      filters,
    });

    // 检查语义搜索可用性（自动判断环境）
    const semanticAvailable = await this.checkSemanticAvailable();
    const willUseSemantic = enableSemantic && semanticAvailable;

    logger.info("Hybrid search semantic decision", {
      enableSemantic,
      semanticAvailable,
      willUseSemantic,
      query: query.slice(0, 50),
      isContentScript: isContentScriptContext(),
    });

    // 并行执行关键词和语义搜索
    const [keywordResult, semanticResult] = await Promise.all([
      enableKeyword
        ? keywordRetriever.search(query, {
            topK: topK * 2,
            filters,
            excludeIds,
          })
        : Promise.resolve({ items: [], searchedCount: 0 }),
      willUseSemantic
        ? this.executeSemanticSearch(query, { topK: topK * 2, excludeIds })
        : Promise.resolve({ items: [], queryDimensions: 0, searchedCount: 0 }),
    ]);

    const usedKeyword = keywordResult.items.length > 0;
    const usedSemantic = semanticResult.items.length > 0;

    // 合并结果
    const scoreMap = new Map<
      string,
      {
        keywordScore: number;
        semanticScore: number;
        combinedScore: number;
        matchReason: string[];
      }
    >();

    // 添加关键词结果
    for (const item of keywordResult.items) {
      scoreMap.set(item.bookmarkId, {
        keywordScore: item.keywordScore || item.score,
        semanticScore: 0,
        combinedScore: 0,
        matchReason: [item.matchReason || "关键词匹配"],
      });
    }

    // 添加语义结果
    for (const item of semanticResult.items) {
      const existing = scoreMap.get(item.bookmarkId);
      if (existing) {
        existing.semanticScore = item.semanticScore || item.score;
        existing.matchReason.push(item.matchReason || "语义匹配");
      } else {
        scoreMap.set(item.bookmarkId, {
          keywordScore: 0,
          semanticScore: item.semanticScore || item.score,
          combinedScore: 0,
          matchReason: [item.matchReason || "语义匹配"],
        });
      }
    }

    // 获取书签信息用于过滤
    const bookmarkIds = Array.from(scoreMap.keys());
    const bookmarks = await this.getBookmarksByIds(bookmarkIds);

    // 计算综合评分
    for (const [bookmarkId, scores] of scoreMap) {
      const bookmark = bookmarks.get(bookmarkId);
      if (!bookmark) {
        scoreMap.delete(bookmarkId);
        continue;
      }

      // 应用过滤条件（语义搜索不带过滤，这里统一过滤）
      if (filters && Object.keys(filters).length > 0) {
        if (!matchesFilters(bookmark, filters)) {
          scoreMap.delete(bookmarkId);
          continue;
        }
      }

      // 计算加权综合评分
      let combinedScore =
        scores.keywordScore * mergedWeights.keyword +
        scores.semanticScore * mergedWeights.semantic;

      // 分类/标签命中加权
      if (mergedWeights.filterBoost) {
        if (filters.categoryId && bookmark.categoryId === filters.categoryId) {
          combinedScore *= 1 + mergedWeights.filterBoost;
        }
        if (
          filters.tagsAny &&
          filters.tagsAny.some((t) => bookmark.tags.includes(t))
        ) {
          combinedScore *= 1 + mergedWeights.filterBoost;
        }
      }

      scores.combinedScore = combinedScore;
    }

    // 按综合评分排序
    const sortedResults = Array.from(scoreMap.entries())
      .sort((a, b) => b[1].combinedScore - a[1].combinedScore)
      .slice(0, topK);

    // 转换为 SearchResultItem
    const items: SearchResultItem[] = sortedResults.map(
      ([bookmarkId, scores]) => ({
        bookmarkId,
        score: scores.combinedScore,
        keywordScore: scores.keywordScore,
        semanticScore: scores.semanticScore,
        matchReason: scores.matchReason.join("; "),
      }),
    );

    logger.debug("Hybrid search completed", {
      query,
      keywordCount: keywordResult.items.length,
      semanticCount: semanticResult.items.length,
      mergedCount: scoreMap.size,
      resultCount: items.length,
    });

    return {
      items,
      total: scoreMap.size,
      usedSemantic,
      usedKeyword,
    };
  }

  /**
   * 仅关键词搜索
   */
  async searchKeywordOnly(
    query: string,
    options: Omit<HybridSearchOptions, "enableSemantic" | "enableKeyword"> = {},
  ): Promise<SearchResult> {
    return this.search(query, {
      ...options,
      enableSemantic: false,
      enableKeyword: true,
    });
  }

  /**
   * 仅语义搜索
   */
  async searchSemanticOnly(
    query: string,
    options: Omit<HybridSearchOptions, "enableSemantic" | "enableKeyword"> = {},
  ): Promise<SearchResult> {
    return this.search(query, {
      ...options,
      enableSemantic: true,
      enableKeyword: false,
    });
  }

  /**
   * 根据 ID 列表获取书签
   */
  private async getBookmarksByIds(
    ids: string[],
  ): Promise<Map<string, LocalBookmark>> {
    const result = new Map<string, LocalBookmark>();
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });

    for (const bookmark of bookmarks) {
      if (ids.includes(bookmark.id)) {
        result.set(bookmark.id, bookmark);
      }
    }

    return result;
  }

  /**
   * 检查语义搜索是否可用
   */
  async isSemanticAvailable(): Promise<boolean> {
    return this.checkSemanticAvailable();
  }

  /**
   * 获取 embedding 覆盖率统计（自动判断环境）
   */
  private async getCoverageStats(): Promise<{
    total: number;
    withEmbedding: number;
    coverage: number;
  }> {
    if (isContentScriptContext()) {
      const bgService = getBackgroundService();
      return bgService.getEmbeddingCoverageStats();
    }
    return semanticRetriever.getCoverageStats();
  }

  /**
   * 获取搜索统计
   */
  async getSearchStats(): Promise<{
    semanticAvailable: boolean;
    embeddingCoverage: {
      total: number;
      withEmbedding: number;
      coverage: number;
    };
  }> {
    const [semanticAvailable, embeddingCoverage] = await Promise.all([
      this.isSemanticAvailable(),
      this.getCoverageStats(),
    ]);

    return {
      semanticAvailable,
      embeddingCoverage,
    };
  }
}

// 导出单例
export const hybridRetriever = new HybridRetriever();
