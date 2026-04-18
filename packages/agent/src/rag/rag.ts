import type { ModelMessage } from "ai";
import { chunkDocument, normalizeDocument } from "./chunker";
import { HashEmbeddingEmbedder } from "./embedder";
import type {
  AgentRAGOptions,
  BuildContextOptions,
  ContextMessageOptions,
  Embedder,
  ChunkOptions,
  RAGDocument,
  RAGSearchResult,
  VectorStore,
} from "./types";
import { InMemoryVectorStore } from "./vector-store";

/**
 * 默认检索返回条数。
 */
const DEFAULT_TOP_K = 4;

/**
 * 对最终拼出的上下文做长度截断，避免 prompt 无限增长。
 */
function truncateText(text: string, maxChars?: number): string {
  if (!maxChars || text.length <= maxChars) {
    return text;
  }

  return `${text.slice(0, Math.max(0, maxChars - 3)).trimEnd()}...`;
}

/**
 * 默认的单条检索结果展示格式。
 */
function formatSearchResult(
  result: RAGSearchResult,
  index: number,
  includeScores = false,
): string {
  const source = result.documentTitle || result.documentId;
  const scoreSuffix = includeScores ? ` (score=${result.score.toFixed(4)})` : "";

  return `[Source ${index + 1}] ${source}${scoreSuffix}\n${result.content}`;
}

/**
 * Agent 使用的高层 RAG 封装。
 *
 * 职责：
 * 1. 文档切分
 * 2. 文本向量化
 * 3. 写入向量库
 * 4. 查询检索
 * 5. 生成可直接注入模型的上下文
 *
 * 默认实现保持纯 TypeScript，以便同时运行在浏览器端和服务端。
 */
export class AgentRAG {
  /**
   * 文本向量化实现。
   */
  private embedder: Embedder;

  /**
   * 向量存储实现。
   */
  private vectorStore: VectorStore;

  /**
   * 文档切分配置。
   */
  private chunkOptions: ChunkOptions;

  /**
   * 默认返回的检索数量。
   */
  private defaultTopK: number;

  /**
   * 默认相似度阈值。
   */
  private defaultMinScore?: number;

  constructor(options: AgentRAGOptions = {}) {
    // 未显式传入时，使用跨端可运行的默认实现。
    this.embedder = options.embedder ?? new HashEmbeddingEmbedder();
    this.vectorStore = options.vectorStore ?? new InMemoryVectorStore();
    this.chunkOptions = {
      chunkSize: options.chunkSize,
      chunkOverlap: options.chunkOverlap,
      separators: options.separators,
    };
    this.defaultTopK = options.defaultTopK ?? DEFAULT_TOP_K;
    this.defaultMinScore = options.defaultMinScore;
  }

  /**
   * 写入一篇或多篇文档。
   *
   * 行为说明：
   * 1. 先规范化文档并补齐 ID
   * 2. 若文档已存在，先按 `documentId` 删除旧 chunk，避免重复索引
   * 3. 按配置切分文本
   * 4. 为 chunk 批量生成 embedding
   * 5. 写入向量库
   *
   * 返回值是本次新增的 chunk 数量。
   */
  async addDocuments(documents: RAGDocument | RAGDocument[]): Promise<number> {
    const documentList = Array.isArray(documents) ? documents : [documents];
    const normalizedDocuments = documentList.map((document) => normalizeDocument(document));

    // 同一 documentId 重复写入时，采用“替换”语义，而不是“追加”语义。
    await Promise.all(
      normalizedDocuments.map((document) => this.vectorStore.deleteByDocumentId(document.id)),
    );

    const chunks = normalizedDocuments.flatMap((document) =>
      chunkDocument(document, this.chunkOptions),
    );

    if (chunks.length === 0) {
      return 0;
    }

    const embeddings = await this.embedder.embed(chunks.map((chunk) => chunk.content));
    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      ...chunk,
      embedding: embeddings[index],
    }));

    await this.vectorStore.add(chunksWithEmbeddings);
    return chunksWithEmbeddings.length;
  }

  /**
   * 检索与 query 最相近的 chunk。
   */
  async retrieve(query: string, options: BuildContextOptions = {}): Promise<RAGSearchResult[]> {
    // 空查询直接返回空结果，避免把全量低分数据误当成召回结果。
    if (!query.trim()) {
      return [];
    }

    const [queryEmbedding] = await this.embedder.embed([query]);

    return this.vectorStore.search(queryEmbedding, {
      ...options,
      topK: options.topK ?? this.defaultTopK,
      minScore: options.minScore ?? this.defaultMinScore ?? -1,
    });
  }

  /**
   * 把检索结果拼装为一段可直接注入 prompt 的上下文文本。
   */
  async buildContext(query: string, options: BuildContextOptions = {}): Promise<string> {
    const results = await this.retrieve(query, options);
    if (results.length === 0) {
      return "";
    }

    // 支持业务侧自定义格式；未提供时使用默认格式。
    const blocks = results.map((result, index) => {
      if (options.formatter) {
        return options.formatter(result, index);
      }

      return formatSearchResult(result, index, options.includeScores);
    });

    const body = blocks.join("\n\n");
    const content = options.prefix ? `${options.prefix}\n\n${body}` : body;
    return truncateText(content, options.maxChars);
  }

  /**
   * 直接构建一条 AI SDK `ModelMessage`。
   * 适合在 agent 执行前把 RAG 上下文插入到 `messages` 数组中。
   */
  async createContextMessage(
    query: string,
    options: ContextMessageOptions = {},
  ): Promise<ModelMessage> {
    const context = await this.buildContext(query, options);
    const role = options.role ?? "system";
    const instruction =
      options.instruction ??
      "Use the retrieved knowledge below when it is relevant. If the retrieved context is insufficient, say so clearly.";

    return {
      role,
      content: context ? `${instruction}\n\n${context}` : `${instruction}\n\nNo relevant context found.`,
    };
  }

  /**
   * 删除某篇文档对应的全部 chunk。
   */
  async removeDocument(documentId: string): Promise<void> {
    await this.vectorStore.deleteByDocumentId(documentId);
  }

  /**
   * 清空整个索引。
   */
  async clear(): Promise<void> {
    await this.vectorStore.clear();
  }

  /**
   * 返回当前索引中的 chunk 数量。
   */
  async count(): Promise<number> {
    return this.vectorStore.count();
  }
}
