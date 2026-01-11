/**
 * App 页面 - 主应用入口
 * 迁移自 design-example，完整的书签管理界面
 */
import { useState, useEffect } from 'react';
import { Toaster } from '@hamhome/ui';
import { BookmarkProvider, useBookmarks } from '@/contexts/BookmarkContext';
import { Sidebar } from '@/components/Sidebar';
import { MainContent } from '@/components/MainContent';
import { NewBookmarkModal } from '@/components/NewBookmarkModal';
import { OptionsPage } from '@/components/OptionsPage';
import { CategoriesPage } from '@/components/CategoriesPage';
import { TagsPage } from '@/components/TagsPage';
import { PrivacyPage } from '@/components/PrivacyPage';
import { ImportExportPage } from '@/components/ImportExportPage';
import { applyTheme } from '@/hooks/useTheme';
import type { LocalSettings } from '@/types';

function AppContent() {
  // 从 URL hash 获取初始页面
  const getInitialView = () => {
    const hash = window.location.hash.slice(1); // 移除 # 符号
    return hash || 'all';
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const [showNewModal, setShowNewModal] = useState(false);
  const { appSettings, updateAppSettings } = useBookmarks();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentView(hash || 'all');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 主题处理
  useEffect(() => {
    const applyCurrentTheme = () => {
      if (appSettings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setTheme(prefersDark ? 'dark' : 'light');
      } else {
        setTheme(appSettings.theme);
      }
    };

    applyCurrentTheme();

    if (appSettings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyCurrentTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [appSettings.theme]);

  // 应用主题到 DOM
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  // 主题循环切换
  const cycleTheme = () => {
    const themes: Array<LocalSettings['theme']> = ['system', 'light', 'dark'];
    const currentIndex = themes.indexOf(appSettings.theme);
    const nextTheme = themes[(currentIndex + 1) % themes.length];
    updateAppSettings({ theme: nextTheme });
  };

  // 视图切换
  const handleViewChange = (view: string) => {
    if (view === 'new') {
      setShowNewModal(true);
    } else {
      // 更新 URL hash
      window.location.hash = view;
      setCurrentView(view);
    }
  };

  // 渲染内容区
  const renderContent = () => {
    switch (currentView) {
      case 'settings':
        return <OptionsPage />;
      case 'privacy':
        return <PrivacyPage />;
      case 'categories':
        return <CategoriesPage />;
      case 'tags':
        return <TagsPage />;
      case 'import-export':
        return <ImportExportPage />;
      default:
        return <MainContent currentView={currentView} onViewChange={handleViewChange} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        currentView={currentView}
        onViewChange={handleViewChange}
        onThemeToggle={cycleTheme}
        theme={appSettings.theme}
      />
      
      <main className="flex-1 overflow-auto">
        {renderContent()}
      </main>

      <NewBookmarkModal open={showNewModal} onOpenChange={setShowNewModal} />
      <Toaster position="top-center" />
    </div>
  );
}

export function App() {
  return (
    <BookmarkProvider>
      <AppContent />
    </BookmarkProvider>
  );
}
