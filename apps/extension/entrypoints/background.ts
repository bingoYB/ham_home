/**
 * Background Script - Service Worker
 * 处理快捷键、消息通信、安装事件
 */
import { registerBackgroundService } from '@/lib/services';
import { safeOpenPopup, safeBroadcastToTabs, safeCreateTab, getExtensionURL } from '@/utils/browser-api';

export default defineBackground(() => {
  console.log('[HamHome Background] Service Worker 启动');

  // 注册 proxy service（必须在最顶部同步执行）
  registerBackgroundService();

  // 监听快捷键
  chrome.commands.onCommand.addListener(async (command) => {
    console.log('[HamHome Background] 快捷键触发:', command);
    if (command === 'save-bookmark') {
      // 打开 Popup（兼容不同浏览器）
      await safeOpenPopup();
    } else if (command === 'toggle-bookmark-panel') {
      // 切换书签面板 - 广播消息给所有 content script（兼容 Firefox）
      await safeBroadcastToTabs({ type: 'TOGGLE_BOOKMARK_PANEL' });
    }
  });

  // 安装/更新时初始化
  chrome.runtime.onInstalled.addListener((details) => {
    console.log('[HamHome Background] 安装/更新事件:', details.reason);
    if (details.reason === 'install') {
      // 首次安装，打开设置页面（使用安全的跨浏览器 API）
      safeCreateTab(getExtensionURL('app.html#settings'));
    }
  });
});
