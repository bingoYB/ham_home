/**
 * OpenAI API 模式缓存的 WXT Storage 持久化适配器
 *
 * 将 @hamhome/agent 的 API 模式探测结果持久化到浏览器扩展存储中，
 * 使得每次会话无需重复探测 responses/chat API 可用性。
 */

import { registerApiModePersistence } from "@hamhome/agent";

const API_MODE_CACHE_KEY = "local:apiModeCache";

const apiModeCacheItem = storage.defineItem<Record<string, unknown>>(
  API_MODE_CACHE_KEY,
  { fallback: {} },
);

/**
 * 初始化 API 模式缓存持久化。
 * 应在扩展启动时（如 background script 初始化阶段）调用一次。
 */
export function initApiModePersistence(): void {
  registerApiModePersistence({
    async load() {
      const data = await apiModeCacheItem.getValue();
      return (data ?? {}) as Record<string, any>;
    },
    async save(cache) {
      await apiModeCacheItem.setValue(cache);
    },
  });
}
