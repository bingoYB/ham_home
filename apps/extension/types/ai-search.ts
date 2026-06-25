/**
 * AI 对话式搜索类型定义
 */

/**
 * 建议操作类型
 * - text: 文本建议，点击后填入输入框
 * - copyAllLinks: 复制所有链接
 * - batchAddTags: 批量打标签
 * - batchMoveCategory: 批量移动分类
 * - showMore: 显示更多结果
 * - timeFilter: 时间过滤
 * - domainFilter: 域名过滤
 * - categoryFilter: 分类过滤
 * - semanticOnly: 只看语义匹配
 * - keywordOnly: 只看关键词匹配
 * - findDuplicates: 查找重复书签
 */
export type SuggestionActionType =
  | 'text'
  | 'copyAllLinks'
  | 'batchAddTags'
  | 'batchMoveCategory'
  | 'showMore'
  | 'timeFilter'
  | 'domainFilter'
  | 'categoryFilter'
  | 'semanticOnly'
  | 'keywordOnly'
  | 'findDuplicates'
  | 'navigate';

/**
 * 建议项
 */
export interface Suggestion {
  /** 显示文本 */
  label: string;
  /** 操作类型 */
  action: SuggestionActionType;
  /** 操作参数 */
  payload?: Record<string, unknown>;
}

/**
 * AI 搜索状态
 */
export type AISearchStatus = 'idle' | 'thinking' | 'searching' | 'writing' | 'done' | 'error';

/**
 * Agent 执行过程步骤，用于在对话窗口渲染中间过程。
 *
 * 示例：
 * ```ts
 * const step: AgentProcessStep = {
 *   id: 'tool_1',
 *   type: 'tool',
 *   title: 'search_bookmarks',
 *   status: 'completed',
 * };
 * ```
 */
export interface AgentProcessStep {
  /** 前端列表渲染使用的稳定 ID */
  id: string;
  /** 步骤类型 */
  type: 'iteration' | 'skill' | 'tool' | 'message';
  /** 用户可读标题 */
  title: string;
  /** 可选说明或摘要 */
  content?: string;
  /** 当前步骤状态 */
  status: 'running' | 'completed' | 'failed';
  /** 关联的工具名称 */
  toolName?: string;
  /** 工具入参，已脱敏 */
  input?: unknown;
  /** 工具输出摘要，已截断 */
  output?: unknown;
  /** 失败原因 */
  error?: string;
  /** 创建时间 */
  timestamp: number;
}

/**
 * 引用源（关联的书签）
 */
export interface Source {
  /** 引用编号（从 1 开始） */
  index: number;
  /** 书签 ID */
  bookmarkId: string;
  /** 书签标题 */
  title: string;
  /** 书签 URL */
  url: string;
  /** 综合相关度分数 (0-1) */
  score?: number;
  /** 关键词匹配分数 (0-1) */
  keywordScore?: number;
  /** 语义匹配分数 (0-1) */
  semanticScore?: number;
  /** 匹配原因描述 */
  matchReason?: string;
}

/**
 * AI 对话搜索结果
 */
export interface AISearchResult {
  /** AI 回答（Markdown 格式） */
  answer: string;
  /** 引用源列表 */
  sources: Source[];
  /** 后续建议 */
  suggestions: Suggestion[];
}

/**
 * 对话历史记录
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  sources?: Source[];
  steps?: AgentProcessStep[];
}
