/**
 * HamHome 浏览器插件本地类型定义
 * 适配本地存储的数据结构（时间戳为 number）
 */

// ============ 书签相关 ============

/**
 * 本地书签数据结构
 */
export interface LocalBookmark {
  id: string;
  url: string;
  title: string;
  description: string;        // AI 生成的摘要
  content?: string;           // 提取的正文 (Markdown)
  categoryId: string | null;
  tags: string[];
  favicon?: string;
  hasSnapshot: boolean;       // 是否有本地快照
  createdAt: number;          // 时间戳
  updatedAt: number;          // 时间戳
  isDeleted?: boolean;        // 软删除标记
}

/**
 * 创建书签的输入数据
 */
export type CreateBookmarkInput = Omit<LocalBookmark, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * 更新书签的输入数据
 */
export type UpdateBookmarkInput = Partial<Omit<LocalBookmark, 'id' | 'createdAt' | 'updatedAt'>>;

// ============ 分类相关 ============

/**
 * 本地分类数据结构
 */
export interface LocalCategory {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
  createdAt: number;          // 时间戳
}

// ============ AI 配置相关 ============

/**
 * AI 服务提供商
 */
export type AIProvider = 'openai' | 'anthropic' | 'ollama' | 'custom';

/**
 * AI 配置
 */
export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string;           // 自定义端点
  model?: string;
  temperature?: number;
  maxTokens?: number;
  enabled: boolean;           // 是否启用 AI 分析
}

// ============ 用户设置相关 ============

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * 语言设置
 */
export type Language = 'zh' | 'en';

/**
 * 用户设置
 */
export interface LocalSettings {
  autoSaveSnapshot: boolean;  // 自动保存快照
  defaultCategory: string | null;
  theme: ThemeMode;
  language: Language;
  shortcut: string;           // 快捷键配置
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
  createdAt: number;          // 时间戳
}

// ============ 页面内容提取 ============

/**
 * 提取的页面内容
 */
export interface PageContent {
  url: string;
  title: string;
  content: string;            // Markdown 格式
  textContent: string;        // 纯文本
  excerpt: string;            // 摘要
  favicon: string;
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
  sortBy?: 'createdAt' | 'updatedAt' | 'title';
  sortOrder?: 'asc' | 'desc';
}

// ============ 导入导出相关 ============

/**
 * 导出数据格式
 */
export interface ExportData {
  version: string;
  exportedAt: number;
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  settings?: LocalSettings;
}

/**
 * 导入结果
 */
export interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
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

// ============ 消息通信 ============

/**
 * 消息类型
 */
export type MessageType = 
  | 'EXTRACT_CONTENT'
  | 'GET_PAGE_HTML'
  | 'SAVE_BOOKMARK'
  | 'AI_ANALYZE';

/**
 * 消息结构
 */
export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
}

