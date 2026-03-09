/**
 * App 页面 - 主应用入口
 * 使用 SidebarInset 布局结构
 */
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
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
  Languages,
  Cloud,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  Toaster,
  toast,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  Separator,
  AppSidebar,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
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
  ScrollArea,
} from "@hamhome/ui";
import type { AppSidebarNavItem, AppSidebarBrand } from "@hamhome/ui";
import { BookmarkProvider, useBookmarks } from "@/contexts/BookmarkContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { MainContent } from "@/components/MainContent";
import { OptionsPage } from "@/components/OptionsPage";
import { CategoriesPage } from "@/components/CategoriesPage";
import { TagsPage } from "@/components/TagsPage";
import { PrivacyPage } from "@/components/PrivacyPage";
import { ImportExportPage } from "@/components/ImportExportPage";
import logoImage from "@/assets/logo.png";

// 页面标题映射
const PAGE_TITLES: Record<string, { title: string; description?: string }> = {
  all: {
    title: "bookmark:bookmark.pageTitle",
    description: "bookmark:bookmark.pageDescription",
  },
  settings: {
    title: "settings:settings.title",
    description: "settings:settings.description",
  },
  privacy: {
    title: "settings:settings.privacy.title",
    description: "settings:settings.privacy.description",
  },
  categories: {
    title: "settings:settings.categories.title",
    description: "settings:settings.categories.description",
  },
  tags: {
    title: "bookmark:tags.title",
    description: "bookmark:tags.description",
  },
  "import-export": {
    title: "settings:settings.importExport.title",
    description: "settings:settings.importExport.description",
  },
};

function AppContent() {
  const { t } = useTranslation(["common", "bookmark", "settings"]);
  const { language, switchLanguage, availableLanguages } = useLanguage();

  // 从 URL hash 获取初始页面
  const getInitialView = () => {
    const hash = window.location.hash.slice(1);
    return hash || "all";
  };

  const [currentView, setCurrentView] = useState(getInitialView());
  const {
    appSettings,
    updateAppSettings,
    bookmarks,
    categories,
    allTags,
    storageInfo,
    syncConfig,
    syncStatus,
  } = useBookmarks();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const relativeSyncTime = useRelativeTime(
    syncStatus?.lastSyncTime || undefined,
  );

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentView(hash || "all");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // 主题处理
  useEffect(() => {
    const applyCurrentTheme = () => {
      if (appSettings.theme === "system") {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;
        setTheme(prefersDark ? "dark" : "light");
      } else {
        setTheme(appSettings.theme);
      }
    };

    applyCurrentTheme();

    if (appSettings.theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyCurrentTheme();
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    }
  }, [appSettings.theme]);

  // 应用主题到 DOM
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // 获取当前实际主题（用于 Switch 显示）
  const getCurrentActualTheme = (): "light" | "dark" => {
    if (appSettings.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    return appSettings.theme;
  };

  /**
   * 使用 View Transitions API 切换主题（带圆形扩展动画）
   */
  const setThemeWithTransition = (
    newTheme: "light" | "dark" | "system",
    x?: number,
    y?: number,
  ) => {
    const clickX = x ?? window.innerWidth / 2;
    const clickY = y ?? window.innerHeight / 2;

    // 如果不支持 View Transitions API，直接切换
    if (!document.startViewTransition) {
      updateAppSettings({ theme: newTheme });
      return;
    }

    // 计算圆形动画的最大半径
    const maxRadius = Math.hypot(
      Math.max(clickX, window.innerWidth - clickX),
      Math.max(clickY, window.innerHeight - clickY),
    );

    // 设置 CSS 变量
    const root = document.documentElement;
    root.style.setProperty("--theme-transition-x", `${clickX}px`);
    root.style.setProperty("--theme-transition-y", `${clickY}px`);
    root.style.setProperty("--theme-transition-radius", `${maxRadius}px`);

    // 使用 View Transitions API
    const transition = document.startViewTransition(() => {
      updateAppSettings({ theme: newTheme });
    });

    transition.finished.then(() => {
      root.style.removeProperty("--theme-transition-x");
      root.style.removeProperty("--theme-transition-y");
      root.style.removeProperty("--theme-transition-radius");
    });
  };

  // Switch 切换明暗主题（捕获点击位置）
  const handleThemeSwitchClick = (e: React.MouseEvent) => {
    const newTheme = isDarkTheme ? "light" : "dark";
    setThemeWithTransition(newTheme, e.clientX, e.clientY);
  };

  // 切换是否跟随系统
  const handleSystemTheme = (e: React.MouseEvent) => {
    if (appSettings.theme === "system") {
      // 如果当前是跟随系统，切换到当前实际主题
      const currentActual = getCurrentActualTheme();
      setThemeWithTransition(currentActual, e.clientX, e.clientY);
    } else {
      // 如果当前不是跟随系统，切换到跟随系统
      setThemeWithTransition("system", e.clientX, e.clientY);
    }
  };

  // 视图切换
  const handleViewChange = (view: string) => {
    window.location.hash = view;
    setCurrentView(view);
  };

  // 处理侧边栏菜单点击
  const handleNavClick = (url: string) => {
    const view = url.replace("#", "");
    handleViewChange(view);
  };

  // 侧边栏菜单数据
  const currentViewBase = currentView.split("?")[0];

  const navMain: AppSidebarNavItem[] = useMemo(
    () => [
      {
        title: t("bookmark:bookmark.all"),
        url: "#all",
        icon: Bookmark,
        isActive: currentViewBase === "all",
        badge: bookmarks.length,
      },
      {
        title: t("bookmark:bookmark.categories"),
        url: "#categories",
        icon: Folder,
        isActive: currentViewBase === "categories",
        badge: categories.length,
      },
      {
        title: t("bookmark:bookmark.tags"),
        url: "#tags",
        icon: Tag,
        isActive: currentViewBase === "tags",
        badge: allTags.length,
      },
      {
        title: t("bookmark:bookmark.privacy"),
        url: "#privacy",
        icon: Shield,
        isActive: currentViewBase === "privacy",
      },
      {
        title: t("settings:settings.importExport.title"),
        url: "#import-export",
        icon: Download,
        isActive: currentViewBase === "import-export",
      },
      {
        title: t("settings:settings.title"),
        url: "#settings",
        icon: Settings,
        isActive: currentViewBase === "settings",
      },
    ],
    [t, currentViewBase, bookmarks.length, categories.length, allTags.length],
  );

  // 品牌信息
  const brand: AppSidebarBrand = {
    name: "HamHome",
    subtitle: t("bookmark:bookmark.count", { count: bookmarks.length }),
    logo: (
      <img src={logoImage} alt="HamHome" className="h-8 w-8 object-contain" />
    ),
  };

  // 获取当前 Switch 状态（基于实际主题）
  const isDarkTheme = getCurrentActualTheme() === "dark";
  const isSystemTheme = appSettings.theme === "system";

  // 底部同步状态判定逻辑
  const isSyncConfigured = !!(
    syncConfig?.url &&
    syncConfig?.username &&
    syncConfig?.password
  );
  const isSyncEnabled = !!syncConfig?.enabled;

  let syncLabel = "";
  let SyncIcon = Cloud;
  let syncIconClassName = "w-4 h-4 text-muted-foreground";

  if (!isSyncEnabled) {
    syncLabel = t("settings:settings.sync.status.disabled");
  } else if (!isSyncConfigured) {
    syncLabel = t("settings:settings.sync.status.unconfigured");
  } else if (syncStatus?.status === "syncing") {
    syncLabel = t("settings:settings.sync.status.syncing");
    SyncIcon = Loader2;
    syncIconClassName = "w-4 h-4 animate-spin text-blue-500";
  } else if (syncStatus?.status === "error") {
    syncLabel = t("settings:settings.sync.status.error");
    SyncIcon = AlertTriangle;
    syncIconClassName = "w-4 h-4 text-destructive";
  } else {
    // 已开启且配置正确
    syncLabel = syncStatus?.lastSyncTime
      ? relativeSyncTime
      : t("settings:settings.sync.status.enabled");
    syncIconClassName = "w-4 h-4 text-green-600";
  }

  // 侧边栏底部内容
  const sidebarFooter = (
    <div className="space-y-3 p-2">
      {/* 存储信息 */}
      <div className="px-3 py-2 rounded-lg bg-muted/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Database className="w-4 h-4" />
            <span className="text-xs font-medium text-foreground">
              {t("common:common.storage")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {storageInfo.storageSize}
          </span>
        </div>

        {/* 数据同步状态 */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center justify-between border-t border-border/50 pt-2 mt-2 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleViewChange("settings?tab=storage")}
            >
              <div className="flex items-center gap-2 text-muted-foreground">
                <SyncIcon className={syncIconClassName} />
                <span className="text-xs font-medium text-foreground">
                  {t("settings:settings.sync.widget.title")}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {syncLabel}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-[200px]">
            <p className="font-medium text-sm">
              {t("settings:settings.sync.widget.tooltipTitle")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {t("settings:settings.sync.widget.tooltipDesc")}
            </p>
            <p
              className="text-xs text-primary mt-2 flex items-center gap-1"
              onClick={() => handleViewChange("settings?tab=storage")}
            >
              <Settings className="w-3 h-3" />{" "}
              {t("settings:settings.sync.widget.goConfig")}
            </p>
          </TooltipContent>
        </Tooltip>
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
                {t("bookmark:bookmark.count", { count: bookmarks.length })}
              </p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleViewChange("settings")}>
            <Settings className="h-4 w-4 mr-2" />
            {t("settings:settings.title")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleViewChange("import-export")}>
            <Download className="h-4 w-4 mr-2" />
            {t("settings:settings.importExport.title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  // 获取当前页面标题
  const pageConfig = PAGE_TITLES[currentViewBase] || PAGE_TITLES.all;
  const pageTitle = t(pageConfig.title);

  // 渲染内容区
  const renderContent = () => {
    switch (currentViewBase) {
      case "settings":
        return <OptionsPage />;
      case "privacy":
        return <PrivacyPage />;
      case "categories":
        return <CategoriesPage />;
      case "tags":
        return <TagsPage />;
      case "import-export":
        return <ImportExportPage />;
      default:
        return (
          <MainContent
            currentView={currentViewBase}
            onViewChange={handleViewChange}
          />
        );
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        brand={brand}
        navMain={navMain}
        footer={sidebarFooter}
        onNavClick={handleNavClick}
        navLabel=""
        showNavLabel={false}
      />
      <SidebarInset className="h-[calc(100vh-1rem)] flex flex-col overflow-hidden">
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
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Languages className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  {t("settings:settings.language")}
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                {availableLanguages.map((lng) => (
                  <DropdownMenuItem
                    key={lng}
                    onClick={() => switchLanguage(lng)}
                    className={
                      language === lng ? "bg-accent text-accent-foreground" : ""
                    }
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
                    onClick={(e) => {
                      e.preventDefault();
                      handleThemeSwitchClick(e);
                    }}
                  />
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {isDarkTheme
                  ? t("common:common.theme.dark")
                  : t("common:common.theme.light")}
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
              <TooltipContent>{t("common:common.theme.system")}</TooltipContent>
            </Tooltip>

            {/* 测试按钮 */}
            {/* <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Test Toast Notification', {
                
                position: "top-center"
              })}
            >
              Test Toast
            </Button> */}
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-hidden">
          <ScrollArea id="main-content" className="h-full">
            {renderContent()}
          </ScrollArea>
        </main>
      </SidebarInset>
      <Toaster theme={appSettings.theme} />
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
