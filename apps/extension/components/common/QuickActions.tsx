/**
 * QuickActions - 快捷操作组件
 * 包含：主题切换、语言切换、更多菜单（管理书签、查看快捷键、设置）
 * 可复用于 BookmarkHeader 和 Popup
 */
import { useState } from 'react';
import { Sun, Moon, Languages, MoreHorizontal, List, Keyboard, Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  cn,
} from '@hamhome/ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useShortcuts, type ShortcutInfo } from '@/hooks/useShortcuts';
import { getBackgroundService } from '@/lib/services';
import { getExtensionURL, getBrowserSpecificURL } from '@/utils/browser-api';
import { useContentUI } from '@/utils/ContentUIContext';

export interface QuickActionsProps {
  /** 尺寸变体 */
  size?: 'default' | 'sm';
  /** 是否显示 tooltip */
  showTooltip?: boolean;
  /** 自定义类名 */
  className?: string;
  /** Portal 容器（用于 content UI） */
  portalContainer?: HTMLElement;
}

/**
 * 快捷操作组件
 * - 主题切换按钮
 * - 语言切换按钮
 * - 更多菜单（点击触发）：管理书签、查看快捷键、设置页面
 */
export function QuickActions({
  size = 'default',
  showTooltip = true,
  className,
  portalContainer,
}: QuickActionsProps) {
  const { t } = useTranslation(['common', 'bookmark']);
  const { shortcuts } = useShortcuts();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 尝试从 context 获取 portalContainer（如果没有通过 props 传入）
  let contextContainer: HTMLElement | undefined;
  try {
    const contentUI = useContentUI();
    contextContainer = contentUI?.container;
  } catch {
    // 在非 ContentUI 环境下忽略
  }
  const container = portalContainer ?? contextContainer;

  // useTheme 需要传入 container 以便在 content UI 中正确应用主题
  const { theme, setThemeWithTransition } = useTheme({ targetElement: container });
  const { language, switchLanguage } = useLanguage();

  // 按钮尺寸配置
  const buttonSize = size === 'sm' ? 'h-6 w-6' : 'h-8 w-8';
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  // 切换主题（带圆形扩展动画）
  const handleToggleTheme = (e: React.MouseEvent) => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setThemeWithTransition(newTheme, {
      x: e.clientX,
      y: e.clientY,
    });
  };

  // 切换语言
  const handleToggleLanguage = () => {
    const newLanguage = language === 'zh' ? 'en' : 'zh';
    switchLanguage(newLanguage);
  };

  // 打开书签管理页面
  const handleOpenBookmarkList = () => {
    setIsMenuOpen(false);
    const backgroundService = getBackgroundService();
    backgroundService.openTab(getExtensionURL('app.html')).catch((error: unknown) => {
      console.error('[QuickActions] Failed to open bookmark list:', error);
    });
  };

  // 打开快捷键设置
  const handleOpenShortcuts = () => {
    setIsMenuOpen(false);
    const backgroundService = getBackgroundService();
    const shortcutsUrl = getBrowserSpecificURL('shortcuts');
    
    // Firefox 不允许通过 tabs.create 打开 about: URLs（安全限制）
    if (shortcutsUrl.startsWith('about:')) {
      // 显示 Firefox 用户的操作指引
      const message = language === 'zh'
        ? '请手动打开 Firefox 扩展管理页面：\n\n1. 在地址栏输入 about:addons\n2. 点击右上角齿轮图标\n3. 选择"管理扩展快捷键"'
        : 'Please open Firefox extension settings manually:\n\n1. Type about:addons in address bar\n2. Click the gear icon in top-right\n3. Select "Manage Extension Shortcuts"';
      alert(message);
      return;
    }
    
    backgroundService.openTab(shortcutsUrl).catch((error: unknown) => {
      console.error('[QuickActions] Failed to open shortcuts:', error);
    });
  };

  // 打开设置页面
  const handleOpenSettings = () => {
    setIsMenuOpen(false);
    const backgroundService = getBackgroundService();
    backgroundService.openOptionsPage().catch((error: unknown) => {
      console.error('[QuickActions] Failed to open settings:', error);
    });
  };

  // 主题按钮
  const ThemeButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(buttonSize, 'text-muted-foreground hover:text-foreground')}
      onClick={handleToggleTheme}
      title={!showTooltip ? (theme === 'dark' ? t('bookmark:contentPanel.switchToLightMode') : t('bookmark:contentPanel.switchToDarkMode')) : undefined}
    >
      {theme === 'dark' ? (
        <Sun className={iconSize} />
      ) : (
        <Moon className={iconSize} />
      )}
    </Button>
  );

  // 语言按钮
  const LanguageButton = (
    <Button
      variant="ghost"
      size="icon"
      className={cn(buttonSize, 'text-muted-foreground hover:text-foreground')}
      onClick={handleToggleLanguage}
      title={!showTooltip ? (language === 'zh' ? t('bookmark:contentPanel.switchToEnglish') : t('bookmark:contentPanel.switchToChinese')) : undefined}
    >
      <Languages className={iconSize} />
    </Button>
  );

  // 格式化快捷键显示
  const formatShortcutDisplay = (info: ShortcutInfo | undefined): string => {
    if (!info) return '';
    return info.formattedShortcut || info.shortcut || '';
  };

  // 获取打开面板的快捷键
  const togglePanelShortcut = shortcuts.find(s => s.name === 'toggle-panel');

  // 更多菜单
  const MoreMenu = (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(buttonSize, 'text-muted-foreground hover:text-foreground')}
        >
          <MoreHorizontal className={iconSize} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        container={container}
        className="min-w-[180px]"
      >
        <DropdownMenuItem onClick={handleOpenBookmarkList}>
          <List className="h-4 w-4 mr-2" />
          {t('common:common.manageBookmarks')}
          {togglePanelShortcut?.shortcut && (
            <span className="ml-auto text-xs text-muted-foreground">
              {formatShortcutDisplay(togglePanelShortcut)}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenShortcuts}>
          <Keyboard className="h-4 w-4 mr-2" />
          {t('common:common.viewShortcuts')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleOpenSettings}>
          <Settings className="h-4 w-4 mr-2" />
          {t('common:common.settings')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (showTooltip) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className={cn('flex items-center gap-1', className)}>
          <Tooltip>
            <TooltipTrigger asChild>{ThemeButton}</TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{theme === 'dark' ? t('bookmark:contentPanel.switchToLightMode') : t('bookmark:contentPanel.switchToDarkMode')}</p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>{LanguageButton}</TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{language === 'zh' ? t('bookmark:contentPanel.switchToEnglish') : t('bookmark:contentPanel.switchToChinese')}</p>
            </TooltipContent>
          </Tooltip>
          {MoreMenu}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {ThemeButton}
      {LanguageButton}
      {MoreMenu}
    </div>
  );
}
