/**
 * 搜索与对话相关类型定义
 */

/**
 * 书签向量存储记录
 */
export interface BookmarkEmbedding {
  /** 书签 ID */
  bookmarkId: string;
  /** 模型标识：provider:model:dimensions:version */
  modelKey: string;
  /** 向量维度 */
  dim: number;
  /** 向量数据（Float32Array 序列化） */
  vector: ArrayBuffer;
  /** embedding 输入文本的 hash（用于检测是否需要重新生成） */
  checksum: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 对话意图类型
 */
export type ConversationIntent = 'find' | 'summarize' | 'compare' | 'qa';

/**
 * 检索过滤条件
 */
export interface SearchFilters {
  /** 分类 ID */
  categoryId?: string | null;
  /** 标签（任一匹配） */
  tagsAny?: string[];
  /** 域名过滤 */
  domain?: string | null;
  /** 时间范围（天数） */
  timeRangeDays?: number | null;
  /** 是否允许加载全文片段 */
  includeContent?: boolean;
  /** 是否启用语义检索 */
  semantic?: boolean;
}

/**
 * 对话状态（结构化检索状态机）
 */
export interface ConversationState {
  /** 当前意图 */
  intent: ConversationIntent;
  /** 当前主查询 */
  query: string;
  /** 筛选条件 */
  filters: SearchFilters;
  /** 已展示过的结果 ID（用于去重与"继续找"） */
  seenBookmarkIds: string[];
  /** 最近 N 轮对话（短期记忆） */
  shortMemory: Array<{ role: 'user' | 'assistant'; text: string }>;
  /** 早期对话压缩摘要（长期记忆） */
  longMemorySummary?: string;
}

/**
 * 结构化检索请求（Planner 输出）
 */
export interface SearchRequest {
  /** 意图 */
  intent: ConversationIntent;
  /** 查询文本 */
  query: string;
  /** 筛选条件 */
  filters: SearchFilters;
  /** 返回数量 */
  topK: number;
}

/**
 * 检索结果项（带评分）
 */
export interface SearchResultItem {
  /** 书签 ID */
  bookmarkId: string;
  /** 综合评分 */
  score: number;
  /** 关键词评分 */
  keywordScore?: number;
  /** 语义相似度评分 */
  semanticScore?: number;
  /** 命中原因说明 */
  matchReason?: string;
}

/**
 * 检索结果
 */
export interface SearchResult {
  /** 结果列表 */
  items: SearchResultItem[];
  /** 总匹配数 */
  total: number;
  /** 是否使用了语义检索 */
  usedSemantic: boolean;
  /** 是否使用了关键词检索 */
  usedKeyword: boolean;
}

/**
 * 对话回复（RAG 输出）
 */
export interface ChatSearchResponse {
  /** 回答文本（1-5 句） */
  answer: string;
  /** 结果 bookmarkId 列表（带引用编号） */
  sources: string[];
  /** 建议的下一步操作（2-4 个 chip） */
  nextSuggestions: string[];
}

/**
 * Embedding 任务状态
 */
export type EmbeddingJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Embedding 任务
 */
export interface EmbeddingJob {
  /** 书签 ID */
  bookmarkId: string;
  /** 任务状态 */
  status: EmbeddingJobStatus;
  /** 重试次数 */
  retryCount: number;
  /** 错误信息 */
  error?: string;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}
