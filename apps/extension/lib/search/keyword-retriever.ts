/**
 * 关键词检索器
 * 基于文本匹配的关键词搜索
 */
import type { LocalBookmark, SearchResultItem, SearchFilters } from '@/types';
import { bookmarkStorage } from '@/lib/storage';
import { createLogger } from '@hamhome/utils';

const logger = createLogger({ namespace: 'KeywordRetriever' });

/**
 * 计算简单的 BM25 类似评分
 * 基于词频和字段权重
 */
function calculateKeywordScore(
  bookmark: LocalBookmark,
  queryTerms: string[],
  fieldWeights: Record<string, number>
): number {
  let score = 0;
  const queryLower = queryTerms.map(t => t.toLowerCase());

  // 标题匹配（权重最高）
  const titleLower = bookmark.title.toLowerCase();
  for (const term of queryLower) {
    if (titleLower.includes(term)) {
      // 完全匹配权重更高
      if (titleLower === term) {
        score += fieldWeights.title * 2;
      } else if (titleLower.startsWith(term) || titleLower.endsWith(term)) {
        score += fieldWeights.title * 1.5;
      } else {
        score += fieldWeights.title;
      }
    }
  }

  // 描述匹配
  const descLower = bookmark.description.toLowerCase();
  for (const term of queryLower) {
    if (descLower.includes(term)) {
      // 计算出现次数
      const count = (descLower.match(new RegExp(term, 'g')) || []).length;
      score += fieldWeights.description * Math.min(count, 3); // 最多计3次
    }
  }

  // 标签匹配
  const tagsLower = bookmark.tags.map(t => t.toLowerCase());
  for (const term of queryLower) {
    for (const tag of tagsLower) {
      if (tag === term) {
        score += fieldWeights.tags * 2; // 完全匹配
      } else if (tag.includes(term)) {
        score += fieldWeights.tags;
      }
    }
  }

  // URL 匹配
  const urlLower = bookmark.url.toLowerCase();
  for (const term of queryLower) {
    if (urlLower.includes(term)) {
      score += fieldWeights.url;
    }
  }

  return score;
}

/**
 * 从查询字符串中提取关键词
 */
function extractQueryTerms(query: string): string[] {
  // 移除特殊字符，按空格分词
  return query
    .replace(/[^\w\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(term => term.length > 0);
}

/**
 * 检查书签是否匹配查询
 */
function matchesQuery(bookmark: LocalBookmark, queryTerms: string[]): boolean {
  const queryLower = queryTerms.map(t => t.toLowerCase());
  const searchable = [
    bookmark.title.toLowerCase(),
    bookmark.description.toLowerCase(),
    bookmark.url.toLowerCase(),
    ...bookmark.tags.map(t => t.toLowerCase()),
  ].join(' ');

  // 至少匹配一个查询词
  return queryLower.some(term => searchable.includes(term));
}

/**
 * 检查书签是否匹配过滤条件
 */
function matchesFilters(bookmark: LocalBookmark, filters: SearchFilters): boolean {
  // 分类过滤
  if (filters.categoryId !== undefined && filters.categoryId !== null) {
    if (bookmark.categoryId !== filters.categoryId) return false;
  }

  // 标签过滤（任一匹配）
  if (filters.tagsAny && filters.tagsAny.length > 0) {
    const hasMatch = filters.tagsAny.some(tag => bookmark.tags.includes(tag));
    if (!hasMatch) return false;
  }

  // 域名过滤
  if (filters.domain) {
    try {
      const url = new URL(bookmark.url);
      if (!url.hostname.includes(filters.domain)) return false;
    } catch {
      return false;
    }
  }

  // 时间范围过滤
  if (filters.timeRangeDays) {
    const cutoffTime = Date.now() - filters.timeRangeDays * 24 * 60 * 60 * 1000;
    if (bookmark.createdAt < cutoffTime) return false;
  }

  return true;
}

/**
 * 关键词检索选项
 */
export interface KeywordSearchOptions {
  /** 返回数量 */
  topK?: number;
  /** 过滤条件 */
  filters?: SearchFilters;
  /** 排除的书签 ID 列表 */
  excludeIds?: string[];
  /** 字段权重 */
  fieldWeights?: Record<string, number>;
}

/**
 * 关键词检索结果
 */
export interface KeywordSearchResult {
  /** 结果列表 */
  items: SearchResultItem[];
  /** 搜索的书签数量 */
  searchedCount: number;
}

/**
 * 默认字段权重
 */
const DEFAULT_FIELD_WEIGHTS = {
  title: 3,
  description: 1.5,
  tags: 2,
  url: 0.5,
};

/**
 * 关键词检索器类
 */
class KeywordRetriever {
  /**
   * 执行关键词搜索
   */
  async search(query: string, options: KeywordSearchOptions = {}): Promise<KeywordSearchResult> {
    const {
      topK = 20,
      filters = {},
      excludeIds = [],
      fieldWeights = DEFAULT_FIELD_WEIGHTS,
    } = options;

    // 提取查询词
    const queryTerms = extractQueryTerms(query);
    if (queryTerms.length === 0) {
      return { items: [], searchedCount: 0 };
    }

    // 获取所有书签
    const bookmarks = await bookmarkStorage.getBookmarks({ isDeleted: false });
    const excludeSet = new Set(excludeIds);

    logger.debug('Keyword search', { query, terms: queryTerms, bookmarkCount: bookmarks.length });

    // 过滤和评分
    const scoredResults: Array<{ bookmark: LocalBookmark; score: number }> = [];

    for (const bookmark of bookmarks) {
      // 排除指定 ID
      if (excludeSet.has(bookmark.id)) continue;

      // 检查过滤条件
      if (!matchesFilters(bookmark, filters)) continue;

      // 检查是否匹配查询
      if (!matchesQuery(bookmark, queryTerms)) continue;

      // 计算评分
      const score = calculateKeywordScore(bookmark, queryTerms, fieldWeights);
      if (score > 0) {
        scoredResults.push({ bookmark, score });
      }
    }

    // 按评分降序排序
    scoredResults.sort((a, b) => b.score - a.score);

    // 取 top K
    const topResults = scoredResults.slice(0, topK);

    // 归一化评分（0-1）
    const maxScore = topResults[0]?.score || 1;
    const items: SearchResultItem[] = topResults.map(result => ({
      bookmarkId: result.bookmark.id,
      score: result.score / maxScore,
      keywordScore: result.score / maxScore,
      matchReason: this.getMatchReason(result.bookmark, queryTerms),
    }));

    logger.debug('Keyword search completed', {
      query,
      searchedCount: bookmarks.length,
      resultCount: items.length,
    });

    return {
      items,
      searchedCount: bookmarks.length,
    };
  }

  /**
   * 生成匹配原因描述
   */
  private getMatchReason(bookmark: LocalBookmark, queryTerms: string[]): string {
    const reasons: string[] = [];
    const queryLower = queryTerms.map(t => t.toLowerCase());

    // 检查标题匹配
    const titleLower = bookmark.title.toLowerCase();
    const titleMatches = queryLower.filter(term => titleLower.includes(term));
    if (titleMatches.length > 0) {
      reasons.push(`标题匹配: ${titleMatches.join(', ')}`);
    }

    // 检查标签匹配
    const tagMatches = bookmark.tags.filter(tag =>
      queryLower.some(term => tag.toLowerCase().includes(term))
    );
    if (tagMatches.length > 0) {
      reasons.push(`标签: ${tagMatches.join(', ')}`);
    }

    return reasons.length > 0 ? reasons.join('; ') : '关键词匹配';
  }

  /**
   * 简单的全文搜索（不带评分）
   */
  async simpleSearch(query: string, limit = 50): Promise<LocalBookmark[]> {
    return bookmarkStorage.getBookmarks({
      search: query,
      limit,
      isDeleted: false,
    });
  }
}

// 导出单例
export const keywordRetriever = new KeywordRetriever();

// 导出工具函数
export { extractQueryTerms, matchesFilters, matchesQuery };
