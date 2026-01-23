/**
 * App 页面 - 主应用入口
 * 使用 SidebarInset 布局结构
 */
import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bookmark,
  Folder,
  Tag,
  Shield,
  Download,
  Settings,
  Moon,
  Sun,
  Database,
  SunMoon,
  Languages
} from 'lucide-react';
import {
  Toaster,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  Separator,
  AppSidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  Progress,
  Button,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Switch,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@hamhome/ui';
import type { AppSidebarNavItem, AppSidebarBrand } from '@hamhome/ui';
import { BookmarkProvider, useBookmarks } from '@/contexts/BookmarkContext';
import { useLanguage } from '@/hooks/useLanguage';
import { MainContent } from '@/components/MainContent';
import { OptionsPage } from '@/components/OptionsPage';
import { CategoriesPage } from '@/components/CategoriesPage';
import { TagsPage } from '@/components/TagsPage';
import { PrivacyPage } from '@/components/PrivacyPage';
import { ImportExportPage } from '@/components/ImportExportPage';
import logoImage from '@/assets/logo.png';

// 页面标题映射
const PAGE_TITLES: Record<string, { title: string; description?: string }> = {
  all: { title: 'bookmark:bookmark.pageTitle', description: 'bookmark:bookmark.pageDescription' },
  settings: { title: 'settings:settings.title', description: 'settings:settings.description' },
  privacy: { title: 'settings:settings.privacy.title', description: 'settings:settings.privacy.description' },
  categories: { title: 'settings:settings.categories.title', description: 'settings:settings.categories.description' },
  tags: { title: 'bookmark:tags.title', description: 'bookmark:tags.description' },
  'import-export': { title: 'settings:settings.importExport.title', description: 'settings:settings.importExport.description' },
};

function AppContent() {
  const { t } = useTranslation(['common', 'bookmark', 'settings']);
  const { language, switchLanguage, availableLanguages } = useLanguage();
  
  // 从 URL hash 获取初始页面
  const getInitialView = () => {
    const hash = window.location.hash.slice(1);
    return hash || 'all';
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const { appSettings, updateAppSettings, bookmarks, categories, allTags, storageInfo } = useBookmarks();
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

  // 获取当前实际主题（用于 Switch 显示）
  const getCurrentActualTheme = (): 'light' | 'dark' => {
    if (appSettings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return appSettings.theme;
  };

  // Switch 切换明暗主题
  const handleThemeSwitch = (checked: boolean) => {
    const newTheme = checked ? 'dark' : 'light';
    updateAppSettings({ theme: newTheme });
  };

  // 切换是否跟随系统
  const handleSystemTheme = () => {
    if (appSettings.theme === 'system') {
      // 如果当前是跟随系统，切换到当前实际主题
      const currentActual = getCurrentActualTheme();
      updateAppSettings({ theme: currentActual });
    } else {
      // 如果当前不是跟随系统，切换到跟随系统
      updateAppSettings({ theme: 'system' });
    }
  };

  // 视图切换
  const handleViewChange = (view: string) => {
    window.location.hash = view;
    setCurrentView(view);
  };

  // 处理侧边栏菜单点击
  const handleNavClick = (url: string) => {
    const view = url.replace('#', '');
    handleViewChange(view);
  };

  // 侧边栏菜单数据
  const navMain: AppSidebarNavItem[] = useMemo(() => [
    { 
      title: t('bookmark:bookmark.all'), 
      url: '#all', 
      icon: Bookmark, 
      isActive: currentView === 'all',
      badge: bookmarks.length 
    },
    { 
      title: t('bookmark:bookmark.categories'), 
      url: '#categories', 
      icon: Folder, 
      isActive: currentView === 'categories',
      badge: categories.length 
    },
    { 
      title: t('bookmark:bookmark.tags'), 
      url: '#tags', 
      icon: Tag, 
      isActive: currentView === 'tags',
      badge: allTags.length 
    },
    { 
      title: t('bookmark:bookmark.privacy'), 
      url: '#privacy', 
      icon: Shield, 
      isActive: currentView === 'privacy' 
    },
    { 
      title: t('settings:settings.importExport.title'), 
      url: '#import-export', 
      icon: Download, 
      isActive: currentView === 'import-export' 
    },
    { 
      title: t('settings:settings.title'), 
      url: '#settings', 
      icon: Settings, 
      isActive: currentView === 'settings' 
    },
  ], [t, currentView, bookmarks.length, categories.length, allTags.length]);

  // 品牌信息
  const brand: AppSidebarBrand = {
    name: 'HamHome',
    subtitle: t('bookmark:bookmark.count', { count: bookmarks.length }),
    logo: <img src={logoImage} alt="HamHome" className="h-8 w-8 object-contain" />,
  };

  // 获取当前 Switch 状态（基于实际主题）
  const isDarkTheme = getCurrentActualTheme() === 'dark';
  const isSystemTheme = appSettings.theme === 'system';

  // 存储百分比
  const storagePercent = Math.min(
    (parseFloat(storageInfo.storageSize) / 5000) * 100,
    100
  );

  // 侧边栏底部内容
  const sidebarFooter = (
    <div className="space-y-3 p-2">
      {/* 存储信息 */}
      <div className="px-3 py-2 rounded-lg bg-muted/50">
        <div className="flex items-center gap-2 mb-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t('common:common.storage')}</span>
        </div>
        <Progress value={storagePercent} className="h-1.5 mb-1" />
        <p className="text-xs text-muted-foreground">
          {storageInfo.storageSize} / 5 MB
        </p>
      </div>

      {/* 用户信息 */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src="https://api.dicebear.com/7.x/thumbs/svg?seed=HamHome" />
              <AvatarFallback>🐹</AvatarFallback>
            </Avatar>
            <div className="flex-1 text-left">
              <p className="font-medium text-sm text-foreground">HamHome</p>
              <p className="text-xs text-muted-foreground">
                {t('bookmark:bookmark.count', { count: bookmarks.length })}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleViewChange('settings')}>
            <Settings className="h-4 w-4 mr-2" />
            {t('settings:settings.title')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleViewChange('import-export')}>
            <Download className="h-4 w-4 mr-2" />
            {t('settings:settings.importExport.title')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // 获取当前页面标题
  const pageConfig = PAGE_TITLES[currentView] || PAGE_TITLES.all;
  const pageTitle = t(pageConfig.title);

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
    <SidebarProvider>
      <AppSidebar
        brand={brand}
        navMain={navMain}
        footer={sidebarFooter}
        onNavClick={handleNavClick}
        navLabel=''
        showNavLabel={false}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto px-4 flex items-center gap-3">
            {/* 语言切换 */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                    >
                      <Languages className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  {t('settings:settings.language')}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {availableLanguages.map((lng) => (
                  <DropdownMenuItem
                    key={lng}
                    onClick={() => switchLanguage(lng)}
                    className={language === lng ? 'bg-accent' : ''}
                  >
                    {t(`common:common.languages.${lng}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Switch 控制明暗主题 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Sun className="h-4 w-4 text-muted-foreground" />
                  <Switch
                    checked={isDarkTheme}
                    onCheckedChange={handleThemeSwitch}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isDarkTheme ? t('common:common.theme.dark') : t('common:common.theme.light')}
              </TooltipContent>
            </Tooltip>
            {/* 跟随系统按钮 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSystemTheme}
                  variant={isSystemTheme ? "default" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <SunMoon className="h-4 w-4" />
                  <span className="text-sm">Auto</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t('common:common.theme.system')}
              </TooltipContent>
            </Tooltip>
            
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  );
}

export function App() {
  return (
    <BookmarkProvider>
      <AppContent />
    </BookmarkProvider>
  );
}
