/**
 * 存储模块统一导出
 */
export { bookmarkStorage } from './bookmark-storage';
export { snapshotStorage } from './snapshot-storage';
export { configStorage, DEFAULT_AI_CONFIG, DEFAULT_SETTINGS, DEFAULT_EMBEDDING_CONFIG } from './config-storage';
export { obsidianSyncStorage, DEFAULT_OBSIDIAN_SYNC_CONFIG } from './obsidian-sync-storage';
export { pinStorage } from './pin-storage';
export { aiCacheStorage } from './ai-cache-storage';
export { vectorStore } from './vector-store';
export { importTaskStorage } from './import-task-storage';
export { aiTaskStorage } from './ai-task-storage';
export type { VectorStoreStats } from './vector-store';
