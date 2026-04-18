/**
 * Background Script - Service Worker
 * 处理快捷键、消息通信、安装事件
 */
import { browser } from "wxt/browser";
import { registerBackgroundService } from "@/lib/services/background-service-server";
import { configStorage } from "@/lib/storage";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import {
  safeOpenPopup,
  safeSendMessageToActiveTab,
  safeCreateTab,
  getExtensionURL,
} from "@/utils/browser-api";
import type { Language } from "@/types";

// 右键菜单 ID
const CONTEXT_MENU_ID = "save-to-hamhome";

/**
 * SingleFile 后台资源获取（匹配官方 bg/fetch.js 的 fetchResource）
 * 使用 credentials: include + cache: force-cache 确保资源请求携带 cookies
 * 401/403/404 自动重试（去掉 referrer）
 */
async function fetchResourceForSingleFile(
  url: string,
  headers?: Record<string, string>,
  referrer?: string,
): Promise<{
  array: number[];
  status: number;
  headers: Record<string, string>;
}> {
  const fetchOptions: RequestInit = {
    credentials: "include", // 等价于 XHR withCredentials: true
    cache: "force-cache", // 优先使用缓存
    headers: headers,
    referrerPolicy: "strict-origin-when-cross-origin",
  };
  if (referrer) {
    fetchOptions.referrer = referrer;
  }

  let response = await fetch(url, fetchOptions);

  // 对 401/403/404 去掉 referrer 重试（官方行为）
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 404
  ) {
    response = await fetch(url, {
      ...fetchOptions,
      referrerPolicy: "no-referrer",
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  // 官方只传 content-type（单个 header），匹配 bg/fetch.js
  const responseHeaders: Record<string, string> = {
    "content-type": response.headers.get("Content-Type") || "",
  };
  return {
    array: Array.from(new Uint8Array(arrayBuffer)),
    status: response.status,
    headers: responseHeaders,
  };
}

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
    import("@/lib/sync/sync-engine"),
    import("@/lib/sync/sync-config-storage"),
  ]).then(([{ syncEngine }, { syncConfigStorage }]) => {
    // 设置定期执行 WebDAV 同步钩子 (30 minutes)
    browser.alarms.create("webdav-periodic-sync", { periodInMinutes: 30 });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (
        alarm.name === "webdav-periodic-sync" ||
        alarm.name === "webdav-local-change-sync"
      ) {
        syncEngine.doSync().catch(console.error);
      }
    });

    // 激活插件时检查上次同步时间，如果超过 30 分钟则触发一次同步
    syncConfigStorage
      .getStatus()
      .then((status) => {
        const lastSyncTime = status.lastSyncTime || 0;
        const now = Date.now();
        const THIRTY_MINUTES = 30 * 60 * 1000;
        if (now - lastSyncTime >= THIRTY_MINUTES) {
          console.log(
            "[HamHome Background] 距离上次同步已超过 30 分钟，触发同步...",
          );
          syncEngine.doSync().catch(console.error);
        }
      })
      .catch(console.error);

    // 订阅本地书签变动，防抖触发同步
    bookmarkStorage.watchBookmarks(() => {
      // 在 Manifest V3 中，长时间的 setTimeout 会在其休眠时被取消，
      // 所以对于 5 分钟的延迟，必须使用 browser.alarms 来实现可靠的防抖
      browser.alarms.create("webdav-local-change-sync", { delayInMinutes: 5 });
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
      // 仅切换当前活动 tab 的书签面板
      await safeSendMessageToActiveTab({ type: "TOGGLE_BOOKMARK_PANEL" });
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

  // --- SingleFile 抓取支持: 资源获取代理 & 分片重组 ---
  const MAX_CONTENT_SIZE = 10 * (1024 * 1024); // 8MB 分片（匹配官方 bg/fetch.js）

  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // 1. 资源抓取代理 (绕过内容脚本的 CORS 限制，匹配官方 bg/fetch.js)
    if (message.method === "singlefile.fetch") {
      (async () => {
        try {
          const result = await fetchResourceForSingleFile(
            message.url,
            message.headers,
            message.referrer,
          );
          const tabId = sender.tab?.id;
          if (!tabId) return;

          // 大资源分片回传（匹配官方 sendResponse 逻辑）
          for (
            let blockIndex = 0;
            blockIndex * MAX_CONTENT_SIZE <= result.array.length;
            blockIndex++
          ) {
            const responseMsg: any = {
              method: "singlefile.fetchResponse",
              requestId: message.requestId,
              headers: result.headers,
              status: result.status,
            };
            responseMsg.truncated = result.array.length > MAX_CONTENT_SIZE;
            if (responseMsg.truncated) {
              responseMsg.finished =
                (blockIndex + 1) * MAX_CONTENT_SIZE > result.array.length;
              responseMsg.array = result.array.slice(
                blockIndex * MAX_CONTENT_SIZE,
                (blockIndex + 1) * MAX_CONTENT_SIZE,
              );
            } else {
              responseMsg.array = result.array;
            }
            await browser.tabs.sendMessage(tabId, responseMsg);
          }
        } catch (error) {
          if (sender.tab?.id) {
            browser.tabs.sendMessage(sender.tab.id, {
              method: "singlefile.fetchResponse",
              requestId: message.requestId,
              error: String(error),
            });
          }
        }
      })();
      return true;
    }

    // 1b. iframe 资源代理（官方 singlefile.fetchFrame）
    if (message.method === "singlefile.fetchFrame") {
      if (sender.tab?.id) {
        return browser.tabs.sendMessage(sender.tab.id, message);
      }
      return false;
    }

    // 2. HTML 分片重组 (已移至 background-service 处理)

    if (message.method === "log") {
      console.warn(message.msg);
    }
    return false;
  });

  // 面板快捷键
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

  // ========== 地址栏搜索 (Omnibox) ==========
  browser.omnibox.setDefaultSuggestion({
    description: "HamHome: 输入关键词搜索书签...",
  });

  browser.omnibox.onInputChanged.addListener(async (text, suggest) => {
    const query = text.trim();
    if (!query) return;

    try {
      // 检查设置是否启用了地址栏搜索
      const settings = await configStorage.getSettings();
      if (settings?.enableOmniboxSearch === false) {
        return;
      }

      // 获取所有未删除的书签
      const allBookmarks = await bookmarkStorage.getBookmarks({
        isDeleted: false,
      });
      if (!allBookmarks || allBookmarks.length === 0) return;

      // 1. 关键词粗筛
      const keywordLower = query.toLowerCase();
      let matchedBookmarks = allBookmarks.filter(
        (b) =>
          b.title?.toLowerCase().includes(keywordLower) ||
          b.url?.toLowerCase().includes(keywordLower) ||
          b.description?.toLowerCase().includes(keywordLower) ||
          b.tags?.some((t) => t.toLowerCase().includes(keywordLower)),
      );

      // 为关键词匹配加上基础评分
      const scoredResults = new Map<
        string,
        { bookmark: (typeof allBookmarks)[0]; score: number }
      >();
      matchedBookmarks.forEach((b) => {
        scoredResults.set(b.id, { bookmark: b, score: 0.5 });
      });

      // 2. 尝试语义搜索（如果可用）
      try {
        const { semanticRetriever } =
          await import("@/lib/search/semantic-retriever");
        if (await semanticRetriever.isAvailable()) {
          const semanticResults = await semanticRetriever.search(query, {
            topK: 5,
            minScore: 0.3,
          });
          for (const item of semanticResults.items) {
            const b = allBookmarks.find((bm) => bm.id === item.bookmarkId);
            if (b) {
              const current = scoredResults.get(b.id);
              if (current) {
                current.score = Math.max(current.score, item.score);
              } else {
                scoredResults.set(b.id, { bookmark: b, score: item.score });
              }
            }
          }
        }
      } catch (e) {
        console.warn(
          "[HamHome Background] 语义搜索失败，回退到纯关键词搜索",
          e,
        );
      }

      // 按评分排序，取前 5 项展示
      const finalResults = Array.from(scoredResults.values())
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(({ bookmark }) => {
          // 对特殊字符进行转义，避免触发 XML 解析错误
          const escapeXml = (unsafe: string) => {
            return unsafe
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&apos;");
          };

          const safeTitle = escapeXml(bookmark.title || "未知内容");
          const safeUrl = escapeXml(bookmark.url);
          // 使用 <url> 和 <match> XML 标签增强显示效果（仅部分浏览器支持，但通常会向前兼容处理）
          return {
            content: bookmark.url,
            description: `<match>${safeTitle}</match> <url>${safeUrl}</url>`,
          };
        });

      suggest(finalResults);
    } catch (error) {
      console.error("[HamHome Background] Omnibox 搜索失败:", error);
    }
  });

  browser.omnibox.onInputEntered.addListener(async (text, disposition) => {
    if (!text) return;

    // 检查设置是否启用了地址栏搜索
    const settings = await configStorage.getSettings();
    if (settings?.enableOmniboxSearch === false) {
      return;
    }

    let url = text;
    // 如果输入的不是 URL（即没有选择下拉项，而是直接回车了搜索词），我们可以尝试搜索并打开第一个
    if (!text.startsWith("http://") && !text.startsWith("https://")) {
      try {
        const allBookmarks = await bookmarkStorage.getBookmarks({
          isDeleted: false,
        });
        const keywordLower = text.toLowerCase();
        const matched = allBookmarks.find(
          (b) =>
            b.title?.toLowerCase().includes(keywordLower) ||
            b.url?.toLowerCase().includes(keywordLower),
        );
        if (matched) {
          url = matched.url;
        } else {
          // 没有匹配则打开 HamHome 搜索页面
          url = getExtensionURL(`app.html?search=${encodeURIComponent(text)}`);
        }
      } catch (e) {
        url = getExtensionURL(`app.html?search=${encodeURIComponent(text)}`);
      }
    }

    try {
      if (disposition === "currentTab") {
        await browser.tabs.update({ url });
      } else if (disposition === "newForegroundTab") {
        await browser.tabs.create({ url, active: true });
      } else if (disposition === "newBackgroundTab") {
        await browser.tabs.create({ url, active: false });
      }
    } catch (e) {
      console.error("[HamHome Background] Omnibox 打开链接失败:", e);
    }
  });
});
