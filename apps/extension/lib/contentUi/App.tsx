/**
 * Content UI 主组件
 * 在网页内显示书签触发器和面板
 */
import { useState, useEffect, useCallback } from 'react';
import { EdgeTrigger } from '@/components/trigger';
import { BookmarkPanel } from '@/components/bookmarkPanel';
import { useEdgeTrigger } from '@/hooks/useEdgeTrigger';
import { useContentUI } from '@/utils/ContentUIContext';
import { getBackgroundService } from '@/lib/services';
import type { LocalBookmark, LocalCategory, PanelPosition, ThemeMode } from '@/types';
import { bookmarkStorage } from '@/lib/storage/bookmark-storage';

// 默认面板位置
const DEFAULT_PANEL_POSITION: PanelPosition = 'left';

/**
 * 应用主题到指定元素
 */
function applyThemeToElement(element: HTMLElement, theme: ThemeMode): void {
  if (theme === 'dark') {
    element.classList.add('dark');
  } else if (theme === 'light') {
    element.classList.remove('dark');
  } else {
    // system - 跟随系统
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      element.classList.add('dark');
    } else {
      element.classList.remove('dark');
    }
  }
}

export function App() {
  // 获取 container 元素
  const { container } = useContentUI();
  
  // 数据状态
  const [bookmarks, setBookmarks] = useState<LocalBookmark[]>([]);
  const [categories, setCategories] = useState<LocalCategory[]>([]);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>(DEFAULT_PANEL_POSITION);
  const [theme, setTheme] = useState<ThemeMode>('system');
  const [loading, setLoading] = useState(true);

  // 边缘触发 hook
  const {
    isTriggerVisible,
    isPanelOpen,
    position,
    openPanel,
    closePanel,
    togglePanel,
  } = useEdgeTrigger({
    position: panelPosition,
    triggerZoneWidth: 15,
    hoverDelay: 150,
    enabled: true,
  });

  // 从 background 获取数据（使用 proxy-service）
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      const backgroundService = getBackgroundService();
      
      // 并行获取数据
      const [bookmarksData, categoriesData, settingsData] = await Promise.all([
        backgroundService.getBookmarks(),
        backgroundService.getCategories(),
        backgroundService.getSettings(),
      ]);

      if (bookmarksData) setBookmarks(bookmarksData);
      if (categoriesData) setCategories(categoriesData);
      if (settingsData) {
        if (settingsData.panelPosition) {
          setPanelPosition(settingsData.panelPosition);
        }
        if (settingsData.theme) {
          setTheme(settingsData.theme);
        }
      }
    } catch (error) {
      console.error('[HamHome] Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 应用主题到 container 元素
  useEffect(() => {
    applyThemeToElement(container, theme);
  }, [container, theme]);

  // 监听系统主题变化
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      applyThemeToElement(container, 'system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [container, theme]);

  // 监听 storage 变化（使用 WXT Storage watch）
  useEffect(() => {
    
    const unwatch = bookmarkStorage.watchBookmarks(() => {
      fetchData();
    });
    return unwatch;
  }, [fetchData]);

  // 监听快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+L 或 Cmd+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        togglePanel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [togglePanel]);

  // 监听来自 background 的消息（如快捷键触发）
  useEffect(() => {
    const handleMessage = (message: { type: string }) => {
      if (message.type === 'TOGGLE_BOOKMARK_PANEL') {
        togglePanel();
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    return () => chrome.runtime.onMessage.removeListener(handleMessage);
  }, [togglePanel]);

  // 打开书签
  const handleOpenBookmark = useCallback((url: string) => {
    window.open(url, '_blank');
    closePanel();
  }, [closePanel]);

  // 打开设置（跳转到扩展选项页）
  const handleOpenSettings = useCallback(() => {
    const backgroundService = getBackgroundService();
    backgroundService.openOptionsPage();
  }, []);

  return (
    <div className="hamhome-content-root antialiased">
      {/* 边缘触发器 */}
      <EdgeTrigger
        position={position}
        visible={isTriggerVisible && !isPanelOpen}
        onClick={openPanel}
      />

      {/* 书签面板 */}
      <BookmarkPanel
        bookmarks={bookmarks}
        categories={categories}
        isOpen={isPanelOpen}
        position={position}
        onClose={closePanel}
        onOpenBookmark={handleOpenBookmark}
        onOpenSettings={handleOpenSettings}
      />
    </div>
  );
}
