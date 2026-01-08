/**
 * Background Script - Service Worker
 * 处理快捷键、消息通信、安装事件
 */
export default defineBackground(() => {
  console.log('[HamHome Background] Service Worker 启动');

  // 监听快捷键
  chrome.commands.onCommand.addListener((command) => {
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
    if (message.type === 'GET_PAGE_HTML') {
      // 获取当前标签页的完整 HTML
      handleGetPageHTML().then(sendResponse).catch(() => sendResponse(null));
      return true; // 保持消息通道开放
    }
    return false;
  });

  // 安装/更新时初始化
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[HamHome Background] 安装/更新事件:', details.reason);
    if (details.reason === 'install') {
      // 首次安装，打开设置页面
      chrome.runtime.openOptionsPage();
    }
  });
});

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

    return results[0]?.result || null;
  } catch (error) {
    console.error('[HamHome Background] Get page HTML error:', error);
    return null;
  }
}
