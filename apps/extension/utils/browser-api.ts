/**
 * 浏览器 API 兼容工具
 * 
 * WXT 框架已经处理了 chrome.* / browser.* API 的 polyfill，
 * 此模块主要用于处理不同浏览器之间的特殊差异。
 * 
 * 使用 WXT 提供的 import.meta.env 检测浏览器类型：
 * - import.meta.env.FIREFOX
 * - import.meta.env.CHROME
 * - import.meta.env.EDGE
 * - import.meta.env.SAFARI
 * - import.meta.env.OPERA
 */

export type BrowserType = 'chrome' | 'firefox' | 'edge' | 'safari' | 'opera' | 'unknown';

/**
 * 获取当前浏览器类型
 * 优先使用 WXT 编译时环境变量，运行时降级使用 User Agent 检测
 */
export function getBrowserType(): BrowserType {
  // WXT 编译时注入的环境变量
  if (import.meta.env.FIREFOX) return 'firefox';
  if (import.meta.env.EDGE) return 'edge';
  if (import.meta.env.SAFARI) return 'safari';
  if (import.meta.env.OPERA) return 'opera';
  if (import.meta.env.CHROME) return 'chrome';
  
  // 运行时降级检测（通常不会走到这里）
  if (typeof navigator !== 'undefined') {
    const ua = navigator.userAgent;
    if (ua.includes('Firefox/')) return 'firefox';
    if (ua.includes('Edg/')) return 'edge';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'safari';
    if (ua.includes('OPR/')) return 'opera';
    if (ua.includes('Chrome/')) return 'chrome';
  }
  
  return 'unknown';
}

/**
 * 检查是否为 Firefox 浏览器
 */
export function isFirefox(): boolean {
  return getBrowserType() === 'firefox';
}

/**
 * 检查是否为 Chrome 浏览器
 */
export function isChrome(): boolean {
  return getBrowserType() === 'chrome';
}

/**
 * 检查是否为 Edge 浏览器
 */
export function isEdge(): boolean {
  return getBrowserType() === 'edge';
}

/**
 * 获取浏览器特定的 URL
 */
export function getBrowserSpecificURL(type: 'shortcuts' | 'extensions' | 'addons'): string {
  const browserType = getBrowserType();
  
  switch (type) {
    case 'shortcuts':
      if (browserType === 'firefox') {
        // Firefox: 需在插件页面点击齿轮图标 → 管理扩展快捷键
        return 'about:addons';
      }
      // Chrome/Edge
      return 'chrome://extensions/shortcuts';
    
    case 'extensions':
    case 'addons':
      if (browserType === 'firefox') {
        return 'about:addons';
      }
      return 'chrome://extensions';
    
    default:
      return '';
  }
}

/**
 * 安全地打开 Popup
 * Firefox 在某些情况下不支持 chrome.action.openPopup()
 */
export async function safeOpenPopup(): Promise<boolean> {
  try {
    if (chrome.action?.openPopup) {
      await chrome.action.openPopup();
      return true;
    }
  } catch (error) {
    // Firefox 可能抛出错误，静默处理
    console.warn('[BrowserAPI] openPopup not supported:', error);
  }
  return false;
}

/**
 * 安全地创建新标签页
 */
export async function safeCreateTab(url: string): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.create({ url });
  } catch (error) {
    console.error('[BrowserAPI] Failed to create tab:', error);
    return null;
  }
}

/**
 * 获取扩展内部页面 URL
 */
export function getExtensionURL(path: string): string {
  return chrome.runtime.getURL(path);
}

/**
 * 检查 API 是否可用
 */
export function isAPIAvailable(apiPath: string): boolean {
  try {
    const parts = apiPath.split('.');
    let current: unknown = chrome;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return false;
      }
    }
    return current !== undefined;
  } catch {
    return false;
  }
}

/**
 * 浏览器特性检测
 */
export const browserFeatures = {
  /** 是否支持 openPopup API */
  get supportsOpenPopup(): boolean {
    return isAPIAvailable('action.openPopup') && !isFirefox();
  },
  
  /** 是否支持 scripting API */
  get supportsScripting(): boolean {
    return isAPIAvailable('scripting.executeScript');
  },
  
  /** 是否支持 downloads API */
  get supportsDownloads(): boolean {
    return isAPIAvailable('downloads.download');
  },
  
  /** 是否使用 Manifest V3 */
  get isManifestV3(): boolean {
    return import.meta.env.MANIFEST_VERSION === 3;
  },
};

/**
 * 安全地向指定 tab 的 content script 发送消息
 * 兼容 Chrome/Firefox/Edge
 * 
 * @param tabId 目标 tab ID
 * @param message 消息内容
 * @returns 响应或 null（发送失败时）
 */
export async function safeSendMessageToTab<T = unknown>(
  tabId: number,
  message: unknown
): Promise<T | null> {
  try {
    const response = await chrome.tabs.sendMessage(tabId, message);
    return response as T;
  } catch (error) {
    // 常见错误：
    // - "Could not establish connection" (content script 未加载)
    // - "The message port closed" (content script 被卸载)
    // - Firefox 特有的连接错误
    console.warn('[BrowserAPI] sendMessageToTab failed:', error);
    return null;
  }
}

/**
 * 安全地向所有 tab 广播消息
 * 用于 background -> content script 的广播场景
 * 
 * @param message 消息内容
 * @param filter 可选的 tab 过滤条件
 */
export async function safeBroadcastToTabs(
  message: unknown,
  filter?: chrome.tabs.QueryInfo
): Promise<void> {
  try {
    const tabs = await chrome.tabs.query(filter || {});
    
    // 并行发送，不等待响应
    await Promise.allSettled(
      tabs
        .filter((tab) => tab.id !== undefined)
        .map((tab) =>
          chrome.tabs.sendMessage(tab.id!, message).catch(() => {
            // 静默忽略错误（某些页面可能没有 content script）
          })
        )
    );
  } catch (error) {
    console.error('[BrowserAPI] broadcastToTabs failed:', error);
  }
}
