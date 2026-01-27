/**
 * 浏览器 API 兼容工具
 *
 * 使用 WXT 提供的 browser 对象统一处理 Chrome/Firefox 差异
 * browser 对象是 Promise-based API，兼容所有浏览器
 *
 * 使用 WXT 提供的 import.meta.env 检测浏览器类型：
 * - import.meta.env.FIREFOX
 * - import.meta.env.CHROME
 * - import.meta.env.EDGE
 * - import.meta.env.SAFARI
 * - import.meta.env.OPERA
 */

import { browser } from "wxt/browser";

export type BrowserType =
  | "chrome"
  | "firefox"
  | "edge"
  | "safari"
  | "opera"
  | "unknown";

/**
 * 获取当前浏览器类型
 * 优先使用 WXT 编译时环境变量，运行时降级使用 User Agent 检测
 */
export function getBrowserType(): BrowserType {
  // WXT 编译时注入的环境变量
  if (import.meta.env.FIREFOX) return "firefox";
  if (import.meta.env.EDGE) return "edge";
  if (import.meta.env.SAFARI) return "safari";
  if (import.meta.env.OPERA) return "opera";
  if (import.meta.env.CHROME) return "chrome";

  // 运行时降级检测（通常不会走到这里）
  if (typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    if (ua.includes("Firefox/")) return "firefox";
    if (ua.includes("Edg/")) return "edge";
    if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "safari";
    if (ua.includes("OPR/")) return "opera";
    if (ua.includes("Chrome/")) return "chrome";
  }

  return "unknown";
}

/**
 * 检查是否为 Firefox 浏览器
 */
export function isFirefox(): boolean {
  return getBrowserType() === "firefox";
}

/**
 * 获取浏览器特定的 URL
 */
export function getBrowserSpecificURL(
  type: "shortcuts" | "extensions" | "addons",
): string {
  const browserType = getBrowserType();

  switch (type) {
    case "shortcuts":
      if (browserType === "firefox") {
        // Firefox: 需在插件页面点击齿轮图标 → 管理扩展快捷键
        return "about:addons";
      }
      // Chrome/Edge
      return "chrome://extensions/shortcuts";

    case "extensions":
    case "addons":
      if (browserType === "firefox") {
        return "about:addons";
      }
      return "chrome://extensions";

    default:
      return "";
  }
}

/**
 * 安全地打开 Popup
 * Firefox 在某些情况下不支持 action.openPopup()
 */
export async function safeOpenPopup(): Promise<boolean> {
  try {
    if (browser.action?.openPopup) {
      console.log("[BrowserAPI] openPopup supported");
      await browser.action.openPopup();
      return true;
      // @ts-ignore
    } else if (browser.browserAction?.openPopup) {
      // 兼容火狐浏览器
      console.log("[BrowserAPI] browserAction.openPopup supported");
      // @ts-ignore
      await browser.browserAction.openPopup();
      return true;
    }
  } catch (error) {
    // Firefox 可能抛出错误，静默处理
    console.warn("[BrowserAPI] openPopup not supported:", error);
  }
  return false;
}

/**
 * 安全地创建新标签页
 */
export async function safeCreateTab(url: string) {
  try {
    return await browser.tabs.create({ url });
  } catch (error) {
    console.error("[BrowserAPI] Failed to create tab:", error);
    return null;
  }
}

/**
 * 获取扩展内部页面 URL
 */
export function getExtensionURL(path: string): string {
  // 使用类型断言绕过 WXT 的严格路径类型限制
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (browser.runtime.getURL as (path: string) => string)(path);
}

/**
 * 安全地向指定 tab 的 content script 发送消息
 * 使用 WXT browser 对象统一处理跨浏览器兼容
 *
 * @param tabId 目标 tab ID
 * @param message 消息内容
 * @returns 响应或 null（发送失败时）
 */
export async function safeSendMessageToTab<T = unknown>(
  tabId: number,
  message: unknown,
): Promise<T | null> {
  try {
    const response = await browser.tabs.sendMessage(tabId, message);
    return response as T;
  } catch (error) {
    // 常见错误：
    // - "Could not establish connection" (content script 未加载)
    // - "The message port closed" (content script 被卸载)
    console.warn("[BrowserAPI] sendMessageToTab failed:", error);
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
  filter?: Parameters<typeof browser.tabs.query>[0],
): Promise<void> {
  try {
    const tabs = await browser.tabs.query(filter || {});

    // 并行发送，不等待响应
    await Promise.allSettled(
      tabs
        .filter((tab) => tab.id !== undefined)
        .map((tab) =>
          browser.tabs.sendMessage(tab.id!, message).catch(() => {
            // 静默忽略错误（某些页面可能没有 content script）
          }),
        ),
    );
  } catch (error) {
    console.error("[BrowserAPI] broadcastToTabs failed:", error);
  }
}
