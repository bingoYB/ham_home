/**
 * Embedding 模块入口
 */
export { embeddingClient, EmbeddingRateLimitError, isEmbeddingSupported } from './embedding-client';
export { embeddingQueue, buildEmbeddingText, generateChecksum, isPrivacyUrl } from './embedding-queue';
export type { QueueStatus, QueueProgress } from './embedding-queue';
