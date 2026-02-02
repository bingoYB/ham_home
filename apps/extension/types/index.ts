/**
 * HamHome 浏览器插件本地类型定义
 * 适配本地存储的数据结构（时间戳为 number）
 */

// AI 对话式搜索类型
export * from './ai-search';

// ============ 书签相关 ============

/**
 * 本地书签数据结构
 */
export interface LocalBookmark {
  id: string;
  url: string;
  title: string;
  description: string; // AI 生成的摘要
  content?: string; // 提取的正文 (Markdown)
  categoryId: string | null;
  tags: string[];
  favicon?: string;
  hasSnapshot: boolean; // 是否有本地快照
  createdAt: number; // 时间戳
  updatedAt: number; // 时间戳
  isDeleted?: boolean; // 软删除标记
}

/**
 * 创建书签的输入数据
 */
export type CreateBookmarkInput = Omit<
  LocalBookmark,
  "id" | "createdAt" | "updatedAt"
>;

/**
 * 更新书签的输入数据
 */
export type UpdateBookmarkInput = Partial<
  Omit<LocalBookmark, "id" | "createdAt" | "updatedAt">
>;

// ============ 分类相关 ============

/**
 * 本地分类数据结构
 */
export interface LocalCategory {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number; // 时间戳
}

// ============ AI 配置相关 ============

/**
 * AI 服务提供商
 * - openai: OpenAI
 * - anthropic: Anthropic Claude
 * - google: Google Gemini
 * - azure: Azure OpenAI
 * - deepseek: DeepSeek
 * - groq: Groq
 * - mistral: Mistral AI
 * - moonshot: Moonshot/Kimi (月之暗面)
 * - zhipu: 智谱AI/GLM
 * - hunyuan: 腾讯混元
 * - nvidia: NVIDIA NIM
 * - siliconflow: SiliconFlow (硅基流动)
 * - ollama: Ollama (本地)
 * - custom: 自定义 OpenAI 兼容 API
 */
export type AIProvider =
  | "openai"
  | "anthropic"
  | "google"
  | "azure"
  | "deepseek"
  | "groq"
  | "mistral"
  | "moonshot"
  | "zhipu"
  | "hunyuan"
  | "nvidia"
  | "siliconflow"
  | "ollama"
  | "custom";

/**
 * AI 配置
 */
export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string; // 自定义端点
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enableTranslation: boolean; // 是否启用翻译
  enableSmartCategory: boolean; // 是否启用智能分类
  enableTagSuggestion: boolean; // 是否启用标签推荐
  presetTags?: string[]; // 预设标签列表（用于自动匹配书签）
  privacyDomains?: string[]; // 隐私域名列表（不分析这些域名的页面内容）
  autoDetectPrivacy?: boolean; // 是否自动检测隐私页面（默认开启）
  language?: Language; // AI 提示词语言
}

/**
 * Embedding 服务配置（独立于文本生成模型）
 * 用于语义搜索的向量生成服务
 */
export interface EmbeddingConfig {
  /** 是否启用语义检索 */
  enabled: boolean;
  /** 服务提供商 */
  provider: AIProvider;
  /** OpenAI-compatible base url */
  baseUrl?: string;
  /** API Key（云端 provider 需要；ollama 可为空） */
  apiKey?: string;
  /** Embedding 模型名（例如 text-embedding-3-small / bge-m3） */
  model: string;
  /** 向量维度（部分 provider 支持指定；不支持则由返回值确定） */
  dimensions?: number;
  /** 批量 embedding 大小（默认 16） */
  batchSize?: number;
}

// ============ 用户设置相关 ============

/**
 * 主题模式
 */
export type ThemeMode = "light" | "dark" | "system";

/**
 * 语言设置
 */
export type Language = "zh" | "en";

/**
 * 书签面板位置
 */
export type PanelPosition = "left" | "right";

/**
 * 用户设置
 */
export interface LocalSettings {
  autoSaveSnapshot: boolean; // 自动保存快照
  defaultCategory: string | null;
  theme: ThemeMode;
  language: Language;
  shortcut: string; // 快捷键配置
  panelPosition: PanelPosition; // 书签面板位置
  panelShortcut: string; // 面板快捷键
}

// ============ 快照相关 ============

/**
 * 网页快照数据结构 (IndexedDB)
 */
export interface Snapshot {
  id: string;
  bookmarkId: string;
  html: Blob;
  size: number;
  createdAt: number; // 时间戳
}

// ============ 页面内容提取 ============

/**
 * 页面元数据
 */
export interface PageMetadata {
  description?: string; // meta description
  keywords?: string; // meta keywords
  author?: string; // 作者
  siteName?: string; // 网站名称
  publishDate?: string; // 发布日期
  ogTitle?: string; // Open Graph 标题
  ogDescription?: string; // Open Graph 描述
  ogImage?: string; // Open Graph 图片
}

/**
 * 提取的页面内容
 */
export interface PageContent {
  url: string;
  title: string;
  content: string; // Markdown 格式
  textContent: string; // 纯文本
  excerpt: string; // 摘要
  favicon: string;
  metadata?: PageMetadata; // 页面元数据
  isReaderable?: boolean; // 是否可读（Readability 判断）
  isPrivate?: boolean; // 是否为隐私页面
  privacyReason?: string; // 隐私原因
}

// ============ 查询相关 ============

/**
 * 书签查询参数
 */
export interface BookmarkQuery {
  categoryId?: string;
  tags?: string[];
  isDeleted?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "updatedAt" | "title";
  sortOrder?: "asc" | "desc";
}

// ============ AI 分析结果 ============

/**
 * AI 分析结果
 */
export interface AnalysisResult {
  title: string;
  summary: string;
  category: string;
  tags: string[];
}

/**
 * 标签推荐结果
 */
export interface TagSuggestion {
  tag: string;
  confidence: number; // 0-1 置信度
  reason?: string; // 推荐原因
}

/**
 * 智能分类结果
 */
export interface CategorySuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number; // 0-1 置信度
  reason?: string; // 推荐原因
}

// ============ 消息通信 ============

/**
 * 批量操作类型
 */
export type BatchOperationType =
  | "delete"
  | "addTags"
  | "removeTags"
  | "changeCategory"
  | "restore";

/**
 * 批量操作参数
 */
export interface BatchOperationParams {
  operation: BatchOperationType;
  bookmarkIds: string[];
  tags?: string[]; // 用于 addTags/removeTags
  categoryId?: string | null; // 用于 changeCategory
  permanent?: boolean; // 用于 delete
}

/**
 * 批量操作结果
 */
export interface BatchOperationResult {
  success: number;
  failed: number;
  errors?: string[];
}

// ============ 预设分类系统 ============

/**
 * 预设分类
 */
export interface PresetCategory {
  id: string;
  name: string;
  icon: string;
  description?: string;
  keywords: string[]; // 用于智能匹配的关键词
}

/**
 * 层级分类结构（用于预设分类方案）
 */
export interface HierarchicalCategory {
  id: string;
  name: string;
  icon?: string;
  children?: HierarchicalCategory[];
}

/**
 * AI 生成分类结果
 */
export interface AIGeneratedCategory {
  name: string;
  children?: AIGeneratedCategory[];
}

// ============ 自定义筛选器相关 ============

/**
 * 筛选字段类型
 */
export type FilterField =
  | "title"
  | "url"
  | "description"
  | "tags"
  | "createdAt";

/**
 * 筛选操作符类型
 */
export type FilterOperator =
  | "equals"
  | "contains"
  | "notEquals"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan";

/**
 * 筛选条件
 */
export interface FilterCondition {
  field: FilterField;
  operator: FilterOperator;
  value: string;
}

/**
 * 自定义筛选器
 */
export interface CustomFilter {
  id: string;
  name: string;
  conditions: FilterCondition[];
  createdAt: number;
  updatedAt: number;
}

// ============ 语义搜索相关 ============

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
 * - query: 查询书签（包含各种筛选条件）
 * - statistics: 统计查询（如"昨天收藏了多少"）
 * - help: 帮助查询（如"快捷键是什么"）
 */
export type ConversationIntent = "query" | "statistics" | "help";

/**
 * 查询子类型（用于 query 意图的细分）
 * - time: 按时间查询
 * - category: 按分类查询
 * - tag: 按标签查询
 * - semantic: 语义化查询
 * - compound: 复合查询（包含多个条件）
 */
export type QuerySubtype = "time" | "category" | "tag" | "semantic" | "compound";

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
  /** 查询子类型 */
  querySubtype?: QuerySubtype;
  /** 当前主查询 */
  query: string;
  /** 提炼后的语义查询关键词 */
  refinedQuery?: string;
  /** 筛选条件 */
  filters: SearchFilters;
  /** 已展示过的结果 ID（用于去重与"继续找"） */
  seenBookmarkIds: string[];
  /** 最近 N 轮对话（短期记忆） */
  shortMemory: Array<{ role: "user" | "assistant"; text: string }>;
  /** 早期对话压缩摘要（长期记忆） */
  longMemorySummary?: string;
}

/**
 * 结构化检索请求（Planner 输出）
 */
export interface SearchRequest {
  /** 意图 */
  intent: ConversationIntent;
  /** 查询子类型（仅 query 意图时有效） */
  querySubtype?: QuerySubtype;
  /** 原始查询文本 */
  query: string;
  /** 提炼后的语义查询关键词 */
  refinedQuery: string;
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
  nextSuggestions: Suggestion[];
}

// Re-export Suggestion from ai-search
export type { Suggestion, SuggestionActionType } from './ai-search';

/**
 * Embedding 任务状态
 */
export type EmbeddingJobStatus = "pending" | "processing" | "completed" | "failed";

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
