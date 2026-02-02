/**
 * AI 对话式搜索类型定义
 */

/**
 * AI 搜索模式
 */
export type SearchMode = 'keyword' | 'chat';

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
}

/**
 * useConversationalSearch Hook 返回类型
 */
export interface ConversationalSearchState {
  /** 当前搜索模式 */
  mode: SearchMode;
  /** 切换模式 */
  toggleMode: () => void;
  /** 设置模式 */
  setMode: (mode: SearchMode) => void;
  /** 查询文本 */
  query: string;
  /** 设置查询 */
  setQuery: (query: string) => void;
  /** AI 回答（流式输出） */
  answer: string;
  /** AI 状态 */
  status: AISearchStatus;
  /** 错误信息 */
  error: string | null;
  /** 检索结果（书签列表） */
  results: Source[];
  /** 后续建议 */
  suggestions: Suggestion[];
  /** 高亮的书签 ID */
  highlightedBookmarkId: string | null;
  /** 设置高亮书签 */
  setHighlightedBookmarkId: (id: string | null) => void;
  /** 执行搜索 */
  handleSearch: () => Promise<void>;
  /** 清除结果 */
  clearResults: () => void;
  /** 关闭 AI 面板 */
  closePanel: () => void;
  /** AI 面板是否打开 */
  isPanelOpen: boolean;
}
