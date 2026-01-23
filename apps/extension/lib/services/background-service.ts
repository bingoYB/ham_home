/**
 * Background Service - 使用 @webext-core/proxy-service
 * 提供类型安全的 background 方法调用
 */
import { createProxyService, registerService } from '@webext-core/proxy-service';
import type { ProxyServiceKey } from '@webext-core/proxy-service';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { configStorage } from '@/lib/storage/config-storage';
import type { LocalBookmark, LocalCategory, LocalSettings } from '@/types';

/**
 * Background 服务接口
 */
export interface IBackgroundService {
  /** 获取所有书签 */
  getBookmarks(): Promise<LocalBookmark[]>;
  /** 获取所有分类 */
  getCategories(): Promise<LocalCategory[]>;
  /** 获取所有标签 */
  getAllTags(): Promise<string[]>;
  /** 获取设置 */
  getSettings(): Promise<LocalSettings>;
  /** 获取当前页面 HTML */
  getPageHtml(): Promise<string | null>;
  /** 打开设置页面 */
  openOptionsPage(): Promise<void>;
  /** 打开新标签页 */
  openTab(url: string): Promise<void>;
}

/**
 * Background 服务实现
 * 在 background script 中执行
 */
class BackgroundServiceImpl implements IBackgroundService {
  async getBookmarks(): Promise<LocalBookmark[]> {
    return bookmarkStorage.getBookmarks();
  }

  async getCategories(): Promise<LocalCategory[]> {
    return bookmarkStorage.getCategories();
  }

  async getAllTags(): Promise<string[]> {
    return bookmarkStorage.getAllTags();
  }

  async getSettings(): Promise<LocalSettings> {
    return configStorage.getSettings();
  }

  async getPageHtml(): Promise<string | null> {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tab?.id) return null;

      // 注入脚本获取完整 HTML
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => document.documentElement.outerHTML,
      });

      return results[0]?.result || null;
    } catch (error) {
      console.error('[BackgroundService] getPageHtml error:', error);
      return null;
    }
  }

  async openOptionsPage(): Promise<void> {
    await chrome.tabs.create({ url: chrome.runtime.getURL('app.html#settings') });
  }

  async openTab(url: string): Promise<void> {
    await chrome.tabs.create({ url });
  }
}

/**
 * 服务 key，用于关联注册和调用
 */
const BACKGROUND_SERVICE_KEY = 'BackgroundService' as ProxyServiceKey<IBackgroundService>;

/**
 * 在 background 中注册服务
 */
export function registerBackgroundService(): void {
  registerService(BACKGROUND_SERVICE_KEY, new BackgroundServiceImpl());
}

/**
 * 在任意位置获取服务代理
 */
export function getBackgroundService() {
  return createProxyService<IBackgroundService>(BACKGROUND_SERVICE_KEY);
}
