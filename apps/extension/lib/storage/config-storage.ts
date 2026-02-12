/**
 * 配置存储模块
 * 基于 WXT Storage 存储 AI 配置和用户设置
 */
import type { AIConfig, LocalSettings, CustomFilter, EmbeddingConfig } from '@/types';

// 默认 AI 配置
const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-3.5-turbo',
  temperature: 0.3,
  maxTokens: 1000,
  enableTranslation: false, // 默认关闭翻译
  enableSmartCategory: true, // 默认开启智能分类
  enableTagSuggestion: true, // 默认开启标签推荐
  privacyDomains: [], // 隐私域名列表
  autoDetectPrivacy: true, // 默认开启自动隐私检测
};

// 默认 Embedding 配置
const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  enabled: false, // 默认关闭语义搜索
  provider: 'openai',
  model: 'text-embedding-3-small',
  batchSize: 16,
};

// 默认设置
const DEFAULT_SETTINGS: LocalSettings = {
  autoSaveSnapshot: true,
  defaultCategory: null,
  theme: 'system',
  language: 'zh',
  shortcut: 'Ctrl+Shift+E',
  panelPosition: 'left',
  panelShortcut: 'Ctrl+Shift+B',
};

// 定义存储项（使用 sync 实现跨设备同步）
const aiConfigItem = storage.defineItem<AIConfig>('sync:aiConfig', {
  fallback: DEFAULT_AI_CONFIG,
});

const settingsItem = storage.defineItem<LocalSettings>('sync:settings', {
  fallback: DEFAULT_SETTINGS,
});

const customFiltersItem = storage.defineItem<CustomFilter[]>('sync:customFilters', {
  fallback: [],
});

// Embedding 配置（使用 sync 实现跨设备同步）
const embeddingConfigItem = storage.defineItem<EmbeddingConfig>('sync:embeddingConfig', {
  fallback: DEFAULT_EMBEDDING_CONFIG,
});

class ConfigStorage {
  /**
   * 获取 AI 配置
   */
  async getAIConfig(): Promise<AIConfig> {
    return aiConfigItem.getValue();
  }

  /**
   * 设置 AI 配置
   */
  async setAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const current = await aiConfigItem.getValue();
    const updated = { ...current, ...config };
    await aiConfigItem.setValue(updated);
    return updated;
  }

  /**
   * 获取用户设置
   */
  async getSettings(): Promise<LocalSettings> {
    return settingsItem.getValue();
  }

  /**
   * 设置用户设置
   */
  async setSettings(settings: Partial<LocalSettings>): Promise<LocalSettings> {
    const current = await settingsItem.getValue();
    const updated = { ...current, ...settings };
    await settingsItem.setValue(updated);
    return updated;
  }

  /**
   * 重置 AI 配置为默认值
   */
  async resetAIConfig(): Promise<AIConfig> {
    await aiConfigItem.setValue(DEFAULT_AI_CONFIG);
    return DEFAULT_AI_CONFIG;
  }

  /**
   * 重置用户设置为默认值
   */
  async resetSettings(): Promise<LocalSettings> {
    await settingsItem.setValue(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }

  /**
   * 获取自定义筛选器列表
   */
  async getCustomFilters(): Promise<CustomFilter[]> {
    return customFiltersItem.getValue();
  }

  /**
   * 保存自定义筛选器列表
   */
  async setCustomFilters(filters: CustomFilter[]): Promise<void> {
    await customFiltersItem.setValue(filters);
  }

  /**
   * 添加自定义筛选器
   */
  async addCustomFilter(filter: CustomFilter): Promise<void> {
    const filters = await customFiltersItem.getValue();
    filters.push(filter);
    await customFiltersItem.setValue(filters);
  }

  /**
   * 更新自定义筛选器
   */
  async updateCustomFilter(filterId: string, updates: Partial<CustomFilter>): Promise<void> {
    const filters: CustomFilter[] = await customFiltersItem.getValue();
    const index = filters.findIndex((f: CustomFilter) => f.id === filterId);
    if (index !== -1) {
      filters[index] = { ...filters[index], ...updates, updatedAt: Date.now() };
      await customFiltersItem.setValue(filters);
    }
  }

  /**
   * 删除自定义筛选器
   */
  async deleteCustomFilter(filterId: string): Promise<void> {
    const filters: CustomFilter[] = await customFiltersItem.getValue();
    const filtered = filters.filter((f: CustomFilter) => f.id !== filterId);
    await customFiltersItem.setValue(filtered);
  }

  // ============ Embedding 配置 ============

  /**
   * 获取 Embedding 配置
   */
  async getEmbeddingConfig(): Promise<EmbeddingConfig> {
    return embeddingConfigItem.getValue();
  }

  /**
   * 设置 Embedding 配置
   */
  async setEmbeddingConfig(config: Partial<EmbeddingConfig>): Promise<EmbeddingConfig> {
    const current = await embeddingConfigItem.getValue();
    const updated = { ...current, ...config };
    await embeddingConfigItem.setValue(updated);
    return updated;
  }

  /**
   * 重置 Embedding 配置为默认值
   */
  async resetEmbeddingConfig(): Promise<EmbeddingConfig> {
    await embeddingConfigItem.setValue(DEFAULT_EMBEDDING_CONFIG);
    return DEFAULT_EMBEDDING_CONFIG;
  }

  // ============ 监听变化 ============

  /**
   * 监听 AI 配置变化
   */
  watchAIConfig(callback: (config: AIConfig) => void): () => void {
    return aiConfigItem.watch((newValue: AIConfig | null) => {
      callback(newValue ?? DEFAULT_AI_CONFIG);
    });
  }

  /**
   * 监听用户设置变化
   */
  watchSettings(callback: (settings: LocalSettings) => void): () => void {
    return settingsItem.watch((newValue: LocalSettings | null) => {
      callback(newValue ?? DEFAULT_SETTINGS);
    });
  }

  /**
   * 监听自定义筛选器变化
   */
  watchCustomFilters(callback: (filters: CustomFilter[]) => void): () => void {
    return customFiltersItem.watch((newValue: CustomFilter[] | null) => {
      callback(newValue ?? []);
    });
  }

  /**
   * 监听 Embedding 配置变化
   */
  watchEmbeddingConfig(callback: (config: EmbeddingConfig) => void): () => void {
    return embeddingConfigItem.watch((newValue: EmbeddingConfig | null) => {
      callback(newValue ?? DEFAULT_EMBEDDING_CONFIG);
    });
  }
}

export const configStorage = new ConfigStorage();
export { DEFAULT_AI_CONFIG, DEFAULT_SETTINGS, DEFAULT_EMBEDDING_CONFIG };
