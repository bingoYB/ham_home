/**
 * Background Script - Service Worker
 * 处理快捷键、消息通信、安装事件
 */
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';
import { configStorage } from '@/lib/storage/config-storage';

export default defineBackground(() => {
  console.log('[HamHome Background] Service Worker 启动');

  // 监听快捷键
  chrome.commands.onCommand.addListener(async (command) => {
    console.log('[HamHome Background] 快捷键触发:', command);
    if (command === 'save-bookmark') {
      // 打开 Popup
      chrome.action.openPopup().catch(() => {
        // 某些情况下无法打开 popup，忽略错误
      });
    }
  });

  // 监听消息
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    handleMessage(message, sendResponse);
    return true; // 保持消息通道开放
  });

  // 安装/更新时初始化
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[HamHome Background] 安装/更新事件:', details.reason);
    if (details.reason === 'install') {
      // 首次安装，打开设置页面
      chrome.tabs.create({ url: chrome.runtime.getURL('app.html#settings') });
    }
  });
});

/**
 * 统一消息处理
 */
async function handleMessage(
  message: { type: string },
  sendResponse: (response: unknown) => void
) {
  try {
    switch (message.type) {
      case 'GET_PAGE_HTML': {
        const html = await handleGetPageHTML();
        sendResponse(html);
        break;
      }
      case 'GET_BOOKMARKS': {
        const bookmarks = await bookmarkStorage.getBookmarks();
        sendResponse(bookmarks);
        break;
      }
      case 'GET_CATEGORIES': {
        const categories = await bookmarkStorage.getCategories();
        sendResponse(categories);
        break;
      }
      case 'GET_ALL_TAGS': {
        const tags = await bookmarkStorage.getAllTags();
        sendResponse(tags);
        break;
      }
      case 'GET_SETTINGS': {
        const settings = await configStorage.getSettings();
        sendResponse(settings);
        break;
      }
      default:
        sendResponse(null);
    }
  } catch (error) {
    console.error('[HamHome Background] Message handling error:', error);
    sendResponse(null);
  }
}

/**
 * 获取当前页面的完整 HTML
 */
async function handleGetPageHTML(): Promise<string | null> {
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

    console.log('[HamHome Background] Get page HTML results:', results);

    return results[0]?.result || null;
  } catch (error) {
    console.error('[HamHome Background] Get page HTML error:', error);
    return null;
  }
}
