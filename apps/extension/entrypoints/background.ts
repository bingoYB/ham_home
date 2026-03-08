/**
 * Background Script - Service Worker
 * 处理快捷键、消息通信、安装事件
 */
import { browser } from "wxt/browser";
import { registerBackgroundService } from "@/lib/services";
import { configStorage } from "@/lib/storage";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import {
  safeOpenPopup,
  safeBroadcastToTabs,
  safeCreateTab,
  getExtensionURL,
} from "@/utils/browser-api";
import type { Language } from "@/types";

// 右键菜单 ID
const CONTEXT_MENU_ID = "save-to-hamhome";

// 菜单标题映射
const MENU_TITLES: Record<Language, string> = {
  en: "Save to HamHome",
  zh: "收藏到 HamHome",
};

/**
 * 获取右键菜单标题（根据用户语言设置）
 */
async function getContextMenuTitle(): Promise<string> {
  try {
    // 优先从用户设置中获取语言
    const settings = await configStorage.getSettings();
    if (settings?.language && ["en", "zh"].includes(settings.language)) {
      return MENU_TITLES[settings.language as Language];
    }
  } catch (error) {
    console.warn("[HamHome Background] 获取语言设置失败:", error);
  }

  // 降级：使用浏览器语言
  const browserLang =
    browser.i18n?.getUILanguage?.() || navigator.language || "en";
  if (browserLang.startsWith("zh")) {
    return MENU_TITLES.zh;
  }

  // 默认英文
  return MENU_TITLES.en;
}

/**
 * 创建或更新右键菜单
 */
async function createContextMenu() {
  try {
    const title = await getContextMenuTitle();

    // 先删除所有菜单（避免重复 ID 错误）
    await browser.contextMenus.removeAll();

    // 创建新的右键菜单
    await browser.contextMenus.create({
      id: CONTEXT_MENU_ID,
      title,
      contexts: ["page", "selection", "link", "image"],
    });

    console.log("[HamHome Background] 右键菜单已创建:", title);
  } catch (error) {
    console.error("[HamHome Background] 创建右键菜单失败:", error);
  }
}

/**
 * 更新右键菜单标题（当语言变化时）
 */
async function updateContextMenuTitle() {
  try {
    const title = await getContextMenuTitle();
    await browser.contextMenus.update(CONTEXT_MENU_ID, { title });
    console.log("[HamHome Background] 右键菜单标题已更新:", title);
  } catch (error) {
    console.warn("[HamHome Background] 更新右键菜单标题失败:", error);
  }
}

export default defineBackground(() => {
  console.log("[HamHome Background] Service Worker 启动");

  // 注册 proxy service（必须在最顶部同步执行）
  registerBackgroundService();

  // 1. 初始化并订阅 WebDAV 存储变更自动同步
  Promise.all([
    import('@/lib/sync/sync-engine'),
    import('@/lib/sync/sync-config-storage')
  ]).then(([{ syncEngine }, { syncConfigStorage }]) => {
    // 设置定期执行 WebDAV 同步钩子 (30 minutes)
    browser.alarms.create('webdav-periodic-sync', { periodInMinutes: 30 });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'webdav-periodic-sync' || alarm.name === 'webdav-local-change-sync') {
        syncEngine.doSync().catch(console.error);
      }
    });

    // 激活插件时检查上次同步时间，如果超过 30 分钟则触发一次同步
    syncConfigStorage.getStatus().then((status) => {
      const lastSyncTime = status.lastSyncTime || 0;
      const now = Date.now();
      const THIRTY_MINUTES = 30 * 60 * 1000;
      if (now - lastSyncTime >= THIRTY_MINUTES) {
        console.log("[HamHome Background] 距离上次同步已超过 30 分钟，触发同步...");
        syncEngine.doSync().catch(console.error);
      }
    }).catch(console.error);

    // 订阅本地书签变动，防抖触发同步
    bookmarkStorage.watchBookmarks(() => {
      // 在 Manifest V3 中，长时间的 setTimeout 会在其休眠时被取消，
      // 所以对于 5 分钟的延迟，必须使用 browser.alarms 来实现可靠的防抖
      browser.alarms.create('webdav-local-change-sync', { delayInMinutes: 5 });
    });
  });

  // 调试：输出已注册的快捷键
  browser.commands.getAll().then((commands) => {
    console.log("[HamHome Background] 已注册的快捷键:", commands);
  });

  // Service Worker 每次启动时创建右键菜单（确保菜单始终存在）
  createContextMenu();

  // 监听快捷键
  browser.commands.onCommand.addListener(async (command) => {
    console.log("[HamHome Background] 快捷键触发:", command);
    if (command === "save-bookmark") {
      // 打开 Popup（兼容不同浏览器）
      await safeOpenPopup();
    } else if (command === "toggle-bookmark-panel") {
      // 切换书签面板 - 广播消息给所有 content script（兼容 Firefox）
      await safeBroadcastToTabs({ type: "TOGGLE_BOOKMARK_PANEL" });
    }
  });

  // 监听右键菜单点击
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    console.log("[HamHome Background] 右键菜单点击:", info.menuItemId);
    if (info.menuItemId === CONTEXT_MENU_ID) {
      // 打开 Popup（兼容不同浏览器）
      await safeOpenPopup();
    }
  });

  // 安装/更新时初始化
  browser.runtime.onInstalled.addListener(async (details) => {
    console.log("[HamHome Background] 安装/更新事件:", details.reason);

    // 创建右键菜单
    await createContextMenu();

    if (details.reason === "install") {
      // 首次安装，打开设置页面（使用安全的跨浏览器 API）
      safeCreateTab(getExtensionURL("app.html#settings"));
    }
  });

  // 监听语言设置变化，更新右键菜单标题
  configStorage.watchSettings((settings) => {
    if (settings?.language) {
      updateContextMenuTitle();
    }
  });
});
