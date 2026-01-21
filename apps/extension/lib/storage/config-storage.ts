/**
 * 配置存储模块
 * 存储 AI 配置和用户设置
 */
import type { AIConfig, LocalSettings, CustomFilter } from '@/types';

const STORAGE_KEYS = {
  AI_CONFIG: 'aiConfig',
  SETTINGS: 'settings',
  CUSTOM_FILTERS: 'customFilters',
};

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

class ConfigStorage {
  /**
   * 获取 AI 配置
   */
  async getAIConfig(): Promise<AIConfig> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.AI_CONFIG);
    return { ...DEFAULT_AI_CONFIG, ...result[STORAGE_KEYS.AI_CONFIG] };
  }

  /**
   * 设置 AI 配置
   */
  async setAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
    const current = await this.getAIConfig();
    const updated = { ...current, ...config };
    await chrome.storage.local.set({ [STORAGE_KEYS.AI_CONFIG]: updated });
    return updated;
  }

  /**
   * 获取用户设置
   */
  async getSettings(): Promise<LocalSettings> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
  }

  /**
   * 设置用户设置
   */
  async setSettings(settings: Partial<LocalSettings>): Promise<LocalSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
    return updated;
  }

  /**
   * 重置 AI 配置为默认值
   */
  async resetAIConfig(): Promise<AIConfig> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.AI_CONFIG]: DEFAULT_AI_CONFIG,
    });
    return DEFAULT_AI_CONFIG;
  }

  /**
   * 重置用户设置为默认值
   */
  async resetSettings(): Promise<LocalSettings> {
    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
    });
    return DEFAULT_SETTINGS;
  }

  /**
   * 获取自定义筛选器列表
   */
  async getCustomFilters(): Promise<CustomFilter[]> {
    const result = await chrome.storage.local.get(STORAGE_KEYS.CUSTOM_FILTERS);
    return result[STORAGE_KEYS.CUSTOM_FILTERS] || [];
  }

  /**
   * 保存自定义筛选器列表
   */
  async setCustomFilters(filters: CustomFilter[]): Promise<void> {
    await chrome.storage.local.set({ [STORAGE_KEYS.CUSTOM_FILTERS]: filters });
  }

  /**
   * 添加自定义筛选器
   */
  async addCustomFilter(filter: CustomFilter): Promise<void> {
    const filters = await this.getCustomFilters();
    filters.push(filter);
    await this.setCustomFilters(filters);
  }

  /**
   * 更新自定义筛选器
   */
  async updateCustomFilter(filterId: string, updates: Partial<CustomFilter>): Promise<void> {
    const filters = await this.getCustomFilters();
    const index = filters.findIndex((f) => f.id === filterId);
    if (index !== -1) {
      filters[index] = { ...filters[index], ...updates, updatedAt: Date.now() };
      await this.setCustomFilters(filters);
    }
  }

  /**
   * 删除自定义筛选器
   */
  async deleteCustomFilter(filterId: string): Promise<void> {
    const filters = await this.getCustomFilters();
    const filtered = filters.filter((f) => f.id !== filterId);
    await this.setCustomFilters(filtered);
  }
}

export const configStorage = new ConfigStorage();
export { DEFAULT_AI_CONFIG, DEFAULT_SETTINGS };

