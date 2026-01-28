/**
 * 混合检索器
 * 结合关键词召回和语义召回，提供更稳定的相关性
 */
import type { LocalBookmark, SearchResultItem, SearchFilters, SearchResult } from '@/types';
import { semanticRetriever } from './semantic-retriever';
import { keywordRetriever, matchesFilters } from './keyword-retriever';
import { bookmarkStorage } from '@/lib/storage';
import { createLogger } from '@hamhome/utils';

const logger = createLogger({ namespace: 'HybridRetriever' });

/**
 * 混合检索权重配置
 */
export interface HybridWeights {
  /** 关键词评分权重 */
  keyword: number;
  /** 语义评分权重 */
  semantic: number;
  /** 时间衰减因子（每天衰减多少，0-1） */
  timeDecay?: number;
  /** 标签/分类命中加权 */
  filterBoost?: number;
}

/**
 * 默认混合权重
 */
const DEFAULT_WEIGHTS: HybridWeights = {
  keyword: 0.4,
  semantic: 0.6,
  timeDecay: 0.001, // 每天衰减 0.1%
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
 * 计算时间衰减加权
 */
function calculateTimeBoost(createdAt: number, decayRate: number): number {
  const daysSinceCreation = (Date.now() - createdAt) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysSinceCreation * decayRate);
}

/**
 * 混合检索器类
 */
class HybridRetriever {
  /**
   * 执行混合搜索
   */
  async search(query: string, options: HybridSearchOptions = {}): Promise<SearchResult> {
    const {
      topK = 20,
      filters = {},
      excludeIds = [],
      weights = {},
      enableSemantic = true,
      enableKeyword = true,
    } = options;

    const mergedWeights: HybridWeights = { ...DEFAULT_WEIGHTS, ...weights };

    logger.debug('Hybrid search', { query, enableSemantic, enableKeyword, filters });

    // 并行执行关键词和语义搜索
    const [keywordResult, semanticResult] = await Promise.all([
      enableKeyword
        ? keywordRetriever.search(query, { topK: topK * 2, filters, excludeIds })
        : Promise.resolve({ items: [], searchedCount: 0 }),
      enableSemantic && await semanticRetriever.isAvailable()
        ? semanticRetriever.search(query, { topK: topK * 2, excludeIds })
        : Promise.resolve({ items: [], queryDimensions: 0, searchedCount: 0 }),
    ]);

    const usedKeyword = keywordResult.items.length > 0;
    const usedSemantic = semanticResult.items.length > 0;

    // 合并结果
    const scoreMap = new Map<string, {
      keywordScore: number;
      semanticScore: number;
      combinedScore: number;
      matchReason: string[];
    }>();

    // 添加关键词结果
    for (const item of keywordResult.items) {
      scoreMap.set(item.bookmarkId, {
        keywordScore: item.keywordScore || item.score,
        semanticScore: 0,
        combinedScore: 0,
        matchReason: [item.matchReason || '关键词匹配'],
      });
    }

    // 添加语义结果
    for (const item of semanticResult.items) {
      const existing = scoreMap.get(item.bookmarkId);
      if (existing) {
        existing.semanticScore = item.semanticScore || item.score;
        existing.matchReason.push(item.matchReason || '语义匹配');
      } else {
        scoreMap.set(item.bookmarkId, {
          keywordScore: 0,
          semanticScore: item.semanticScore || item.score,
          combinedScore: 0,
          matchReason: [item.matchReason || '语义匹配'],
        });
      }
    }

    // 获取书签信息用于过滤和时间加权
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

      // 时间衰减加权
      if (mergedWeights.timeDecay) {
        const timeBoost = calculateTimeBoost(bookmark.createdAt, mergedWeights.timeDecay);
        combinedScore *= (0.9 + timeBoost * 0.1); // 时间因素影响 10%
      }

      // 分类/标签命中加权
      if (mergedWeights.filterBoost) {
        if (filters.categoryId && bookmark.categoryId === filters.categoryId) {
          combinedScore *= (1 + mergedWeights.filterBoost);
        }
        if (filters.tagsAny && filters.tagsAny.some(t => bookmark.tags.includes(t))) {
          combinedScore *= (1 + mergedWeights.filterBoost);
        }
      }

      scores.combinedScore = combinedScore;
    }

    // 按综合评分排序
    const sortedResults = Array.from(scoreMap.entries())
      .sort((a, b) => b[1].combinedScore - a[1].combinedScore)
      .slice(0, topK);

    // 转换为 SearchResultItem
    const items: SearchResultItem[] = sortedResults.map(([bookmarkId, scores]) => ({
      bookmarkId,
      score: scores.combinedScore,
      keywordScore: scores.keywordScore,
      semanticScore: scores.semanticScore,
      matchReason: scores.matchReason.join('; '),
    }));

    logger.debug('Hybrid search completed', {
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
  async searchKeywordOnly(query: string, options: Omit<HybridSearchOptions, 'enableSemantic' | 'enableKeyword'> = {}): Promise<SearchResult> {
    return this.search(query, { ...options, enableSemantic: false, enableKeyword: true });
  }

  /**
   * 仅语义搜索
   */
  async searchSemanticOnly(query: string, options: Omit<HybridSearchOptions, 'enableSemantic' | 'enableKeyword'> = {}): Promise<SearchResult> {
    return this.search(query, { ...options, enableSemantic: true, enableKeyword: false });
  }

  /**
   * 根据 ID 列表获取书签
   */
  private async getBookmarksByIds(ids: string[]): Promise<Map<string, LocalBookmark>> {
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
    return semanticRetriever.isAvailable();
  }

  /**
   * 获取搜索统计
   */
  async getSearchStats(): Promise<{
    semanticAvailable: boolean;
    embeddingCoverage: { total: number; withEmbedding: number; coverage: number };
  }> {
    const [semanticAvailable, embeddingCoverage] = await Promise.all([
      this.isSemanticAvailable(),
      semanticRetriever.getCoverageStats(),
    ]);

    return {
      semanticAvailable,
      embeddingCoverage,
    };
  }
}

// 导出单例
export const hybridRetriever = new HybridRetriever();
