import type { ChunkOptions, RAGChunk, RAGDocument } from "./types";

/**
 * 默认 chunk 大小。
 * 这里按“字符数”控制，避免依赖 Node 专属 tokenizer，保证浏览器和服务端都能直接运行。
 */
const DEFAULT_CHUNK_SIZE = 600;

/**
 * 默认 chunk 重叠长度。
 * 适当重叠可以减少语义被切断导致的召回下降。
 */
const DEFAULT_CHUNK_OVERLAP = 120;

/**
 * 默认的优先切分边界。
 * 先尝试按段落、换行和中英文标点切，再退化到空格。
 */
const DEFAULT_SEPARATORS = [
  "\n\n",
  "\n",
  "。",
  "！",
  "？",
  ". ",
  "! ",
  "? ",
  "; ",
  "；",
  "，",
  ", ",
  " ",
];

/**
 * 轻量的递增计数器，用于在未传文档 ID 时生成稳定且可区分的本地 ID。
 */
let chunkIdCounter = 0;

/**
 * 生成一个轻量随机 ID。
 * 只用于 demo / SDK 本地流程，不承担全局唯一性承诺。
 */
function createId(prefix: string): string {
  chunkIdCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${chunkIdCounter.toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/**
 * 规范化文档输入：
 * 1. 自动补全 `id`
 * 2. 统一换行符
 * 3. 去掉首尾空白
 */
export function normalizeDocument(document: RAGDocument): Required<Pick<RAGDocument, "content">> &
  Omit<RAGDocument, "content"> & { id: string } {
  return {
    ...document,
    id: document.id || createId("doc"),
    content: document.content.replace(/\r\n/g, "\n").trim(),
  };
}

/**
 * 将文本切分为多个 chunk。
 *
 * 设计目标：
 * 1. 尽量在自然边界上截断，而不是机械按固定长度截断
 * 2. 保持纯字符串处理逻辑，避免引入运行时依赖
 * 3. 通过 overlap 缓解上下文跨 chunk 丢失
 */
export function splitTextIntoChunks(text: string, options: ChunkOptions = {}): string[] {
  const normalizedText = text.replace(/\r\n/g, "\n").trim();
  if (!normalizedText) {
    return [];
  }

  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const separators = options.separators ?? DEFAULT_SEPARATORS;

  if (chunkSize <= 0) {
    throw new Error("chunkSize must be greater than 0.");
  }

  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap must be between 0 and chunkSize - 1.");
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < normalizedText.length) {
    // 先按目标长度估算当前 chunk 的理论结束位置。
    const targetEnd = Math.min(normalizedText.length, start + chunkSize);
    let end = targetEnd;

    if (targetEnd < normalizedText.length) {
      const window = normalizedText.slice(start, targetEnd);

      // 只在后半段寻找切分边界，避免 chunk 被切得过短。
      const minBoundary = Math.floor(window.length * 0.5);
      let bestBoundary = -1;

      for (const separator of separators) {
        const boundary = window.lastIndexOf(separator);
        if (boundary >= minBoundary) {
          bestBoundary = Math.max(bestBoundary, boundary + separator.length);
        }
      }

      if (bestBoundary > 0) {
        end = start + bestBoundary;
      }
    }

    // 理论上不会进入，但这里保底防止非法边界导致死循环。
    if (end <= start) {
      end = Math.min(normalizedText.length, start + chunkSize);
    }

    const chunk = normalizedText.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= normalizedText.length) {
      break;
    }

    // 下一段从当前结尾往前回退 overlap 个字符开始。
    start = Math.max(end - chunkOverlap, start + 1);
  }

  return chunks;
}

/**
 * 把单个文档切分为多个标准化 chunk。
 */
export function chunkDocument(document: RAGDocument, options: ChunkOptions = {}): RAGChunk[] {
  const normalized = normalizeDocument(document);
  const chunks = splitTextIntoChunks(normalized.content, options);

  return chunks.map((content, index) => ({
    id: `${normalized.id}_chunk_${index}`,
    documentId: normalized.id,
    documentTitle: normalized.title,
    content,
    index,
    metadata: normalized.metadata,
  }));
}
