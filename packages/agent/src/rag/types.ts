import type { ModelMessage } from "ai";

/**
 * 原始知识文档。
 * `content` 是必须字段，其余字段用于标识来源和透传额外元信息。
 */
export interface RAGDocument {
  /**
   * 文档唯一标识。
   * 未传入时会在 chunk 阶段自动生成。
   */
  id?: string;
  /**
   * 文档标题，用于最终拼接检索上下文时展示来源。
   */
  title?: string;
  /**
   * 文档正文，会被切分为多个 chunk 再参与向量化。
   */
  content: string;
  /**
   * 业务侧透传的元数据，例如标签、租户、权限范围等。
   */
  metadata?: Record<string, unknown>;
}

/**
 * 文档切分后的最小检索单元。
 */
export interface RAGChunk {
  /**
   * Chunk 唯一标识，通常由 `documentId + chunkIndex` 组成。
   */
  id: string;
  /**
   * 原始文档 ID，用于删除、过滤和溯源。
   */
  documentId: string;
  /**
   * 原始文档标题。
   */
  documentTitle?: string;
  /**
   * 当前 chunk 的文本内容。
   */
  content: string;
  /**
   * chunk 在原始文档中的顺序。
   */
  index: number;
  /**
   * 从文档透传下来的元数据。
   */
  metadata?: Record<string, unknown>;
  /**
   * 向量表示。
   * 在 `addDocuments()` 完成 embedding 之后才会被填充。
   */
  embedding?: number[];
}

/**
 * 检索结果，在 chunk 基础上附带相似度分数。
 */
export interface RAGSearchResult extends RAGChunk {
  /**
   * 相似度分数，默认使用余弦相似度。
   */
  score: number;
}

/**
 * 文本切分配置。
 */
export interface ChunkOptions {
  /**
   * 每个 chunk 的目标字符长度。
   */
  chunkSize?: number;
  /**
   * 相邻 chunk 的重叠字符数，用于减少切分带来的语义断裂。
   */
  chunkOverlap?: number;
  /**
   * 优先切分边界。
   * 会优先在这些分隔符附近截断，而不是生硬按字符长度裁切。
   */
  separators?: string[];
}

/**
 * 向量检索配置。
 */
export interface VectorSearchOptions {
  /**
   * 最多返回多少条结果。
   */
  topK?: number;
  /**
   * 最低相似度阈值，低于该值的结果会被过滤。
   */
  minScore?: number;
  /**
   * 只在指定文档集合中检索。
   */
  documentIds?: string[];
  /**
   * 对 chunk 做进一步业务过滤。
   */
  filter?: (chunk: RAGChunk) => boolean;
}

/**
 * 将检索结果拼装为 prompt context 时的配置。
 */
export interface BuildContextOptions extends VectorSearchOptions {
  /**
   * 限制最终 context 的最大字符数。
   */
  maxChars?: number;
  /**
   * 是否在输出中包含相似度分数。
   */
  includeScores?: boolean;
  /**
   * 给最终 context 添加统一前缀。
   */
  prefix?: string;
  /**
   * 自定义格式化单条检索结果。
   */
  formatter?: (result: RAGSearchResult, index: number) => string;
}

/**
 * 生成 AI SDK 消息时的扩展配置。
 */
export interface ContextMessageOptions extends BuildContextOptions {
  /**
   * 注入 context 时使用的消息角色。
   * 默认是 `system`，更适合用作 agent 的检索增强上下文。
   */
  role?: Extract<ModelMessage["role"], "system" | "user" | "assistant">;
  /**
   * 放在 context 之前的使用说明。
   */
  instruction?: string;
}

/**
 * 向量化抽象。
 * 浏览器端、服务端、远程 embedding API 都可以通过实现这个接口接入。
 */
export interface Embedder {
  /**
   * 向量维度，仅作为能力描述字段。
   */
  dimension?: number;
  /**
   * 批量把文本转成向量。
   */
  embed(texts: string[]): Promise<number[][]>;
}

/**
 * 向量存储抽象。
 * 默认可用内存实现，后续可以替换为数据库、IndexedDB、远程向量库等。
 */
export interface VectorStore {
  /**
   * 写入一批带向量的 chunk。
   */
  add(chunks: RAGChunk[]): Promise<void>;
  /**
   * 根据查询向量检索相似 chunk。
   */
  search(queryEmbedding: number[], options?: VectorSearchOptions): Promise<RAGSearchResult[]>;
  /**
   * 删除某个文档对应的所有 chunk。
   */
  deleteByDocumentId(documentId: string): Promise<void>;
  /**
   * 清空整个索引。
   */
  clear(): Promise<void>;
  /**
   * 返回当前索引内 chunk 总数。
   */
  count(): Promise<number>;
}

/**
 * AgentRAG 构造配置。
 */
export interface AgentRAGOptions extends ChunkOptions {
  /**
   * 自定义 embedding 实现。
   */
  embedder?: Embedder;
  /**
   * 自定义向量存储实现。
   */
  vectorStore?: VectorStore;
  /**
   * 默认检索数量。
   */
  defaultTopK?: number;
  /**
   * 默认最小分数阈值。
   */
  defaultMinScore?: number;
}
