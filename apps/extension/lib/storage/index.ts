/**
 * 存储模块统一导出
 */
export { bookmarkStorage } from './bookmark-storage';
export { snapshotStorage } from './snapshot-storage';
export { configStorage, DEFAULT_AI_CONFIG, DEFAULT_SETTINGS, DEFAULT_EMBEDDING_CONFIG } from './config-storage';
export { aiCacheStorage } from './ai-cache-storage';
export { vectorStore } from './vector-store';
export type { VectorStoreStats } from './vector-store';

