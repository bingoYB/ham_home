/**
 * OpenAI API 模式自适应缓存
 *
 * 在首次连接时自动探测 responses / chat/completions 两种 API，
 * 成功后将结果缓存（内存 + 可选持久化），后续调用直接使用已验证的模式。
 */

// ─── 类型定义 ────────────────────────────────────────────────────

/** OpenAI 调用模式 */
export type OpenAIApiMode = "responses" | "chat";

/** 缓存条目 */
interface ApiModeCacheEntry {
  mode: OpenAIApiMode;
  /** 上次验证时间 (ms) */
  verifiedAt: number;
}

/** 外部持久化适配器（可选注入） */
export interface ApiModePersistence {
  load(): Promise<Record<string, ApiModeCacheEntry>>;
  save(cache: Record<string, ApiModeCacheEntry>): Promise<void>;
}

// ─── 缓存管理器 ──────────────────────────────────────────────────

/** 缓存有效期：7 天 */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** 内存缓存 */
const memoryCache = new Map<string, ApiModeCacheEntry>();

/** 外部持久化适配器 */
let persistence: ApiModePersistence | undefined;

/** 持久化数据是否已加载 */
let persistenceLoaded = false;

/**
 * 构建缓存 key
 * 格式：`provider::baseURL`（baseURL 统一移除尾部斜杠）
 */
export function buildCacheKey(provider: string, baseURL?: string): string {
  const normalizedBase = (baseURL || "default").replace(/\/+$/, "");
  return `${provider}::${normalizedBase}`;
}

/**
 * 注册外部持久化适配器。
 * 调用后将在首次 get 时自动加载持久化数据。
 */
export function registerApiModePersistence(adapter: ApiModePersistence): void {
  persistence = adapter;
  persistenceLoaded = false;
}

/**
 * 确保持久化数据已加载到内存。
 */
async function ensurePersistenceLoaded(): Promise<void> {
  if (!persistence || persistenceLoaded) {
    return;
  }

  try {
    const data = await persistence.load();
    for (const [key, entry] of Object.entries(data)) {
      // 仅加载未过期且内存中不存在的条目
      if (!memoryCache.has(key) && !isExpired(entry)) {
        memoryCache.set(key, entry);
      }
    }
  } catch {
    // 持久化加载失败不影响功能
  }

  persistenceLoaded = true;
}

function isExpired(entry: ApiModeCacheEntry): boolean {
  return Date.now() - entry.verifiedAt > CACHE_TTL_MS;
}

/**
 * 获取已缓存的 API 模式。
 * 如果缓存不存在或已过期，返回 undefined。
 */
export async function getCachedApiMode(
  provider: string,
  baseURL?: string,
): Promise<OpenAIApiMode | undefined> {
  await ensurePersistenceLoaded();

  const key = buildCacheKey(provider, baseURL);
  const entry = memoryCache.get(key);

  if (!entry) {
    return undefined;
  }

  if (isExpired(entry)) {
    memoryCache.delete(key);
    return undefined;
  }

  return entry.mode;
}

/**
 * 缓存探测成功的 API 模式。
 * 同时写入内存缓存和外部持久化（如已注册）。
 */
export async function setCachedApiMode(
  provider: string,
  baseURL: string | undefined,
  mode: OpenAIApiMode,
): Promise<void> {
  const key = buildCacheKey(provider, baseURL);
  const entry: ApiModeCacheEntry = {
    mode,
    verifiedAt: Date.now(),
  };

  memoryCache.set(key, entry);

  if (persistence) {
    try {
      const all = Object.fromEntries(memoryCache);
      await persistence.save(all);
    } catch {
      // 持久化写入失败不影响功能
    }
  }
}

/**
 * 清除指定 provider+baseURL 的缓存。
 * 配置变更时调用，使下次连接重新探测。
 */
export async function clearCachedApiMode(
  provider: string,
  baseURL?: string,
): Promise<void> {
  const key = buildCacheKey(provider, baseURL);
  memoryCache.delete(key);

  if (persistence) {
    try {
      const all = Object.fromEntries(memoryCache);
      await persistence.save(all);
    } catch {
      // ignore
    }
  }
}

/**
 * 清除所有缓存（测试用）。
 */
export function clearAllCachedApiModes(): void {
  memoryCache.clear();
  persistenceLoaded = false;
}
