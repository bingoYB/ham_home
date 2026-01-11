/**
 * Sidebar 侧边栏组件
 * 迁移自 design-example，适配 HamHome 插件
 */
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
  Monitor,
  Plus,
  ChevronDown,
  Database,
} from 'lucide-react';
import {
  Button,
  Progress,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import type { LocalSettings } from '@/types';

interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  onThemeToggle: () => void;
  theme: LocalSettings['theme'];
}

export function Sidebar({ currentView, onViewChange, onThemeToggle, theme }: SidebarProps) {
  const { t } = useTranslation(['common', 'bookmark', 'settings']);
  const { bookmarks, categories, allTags, storageInfo } = useBookmarks();

  const menuItems = [
    { id: 'all', label: t('bookmark:bookmark.all'), icon: Bookmark, count: bookmarks.length },
    { id: 'categories', label: t('bookmark:bookmark.categories'), icon: Folder, count: categories.length },
    { id: 'tags', label: t('bookmark:bookmark.tags'), icon: Tag, count: allTags.length },
    { id: 'privacy', label: t('common:common.warning'), icon: Shield },
    { id: 'import-export', label: t('settings:settings.importBookmarks'), icon: Download },
    { id: 'settings', label: t('settings:settings.title'), icon: Settings },
  ];

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Moon className="h-4 w-4" />;
  };

  const getThemeLabel = () => {
    if (theme === 'system') return t('settings:settings.themeOptions.system');
    if (theme === 'light') return t('settings:settings.themeOptions.light');
    return t('settings:settings.themeOptions.dark');
  };

  // 估算存储百分比 (假设上限 5MB)
  const storagePercent = Math.min(
    (parseFloat(storageInfo.storageSize) / 5000) * 100, 
    100
  );

  return (
    <aside className="w-64 h-screen bg-card border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
            <span className="text-xl">🐹</span>
          </div>
          <span className="font-semibold text-lg text-foreground">HamHome</span>
        </div>
      </div>

      {/* New Button */}
      <div className="px-4 mb-4">
        <Button
          onClick={() => onViewChange('new')}
          className="w-full bg-primary hover:bg-primary-600 text-primary-foreground font-medium"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('bookmark:bookmark.newBookmark')}
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              currentView === item.id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="flex-1 text-left font-medium">{item.label}</span>
            {item.count !== undefined && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {item.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Storage Info */}
      <div className="px-4 py-4 space-y-3">
        <div className="px-4 py-3 rounded-xl bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Database className="w-4 h-4 text-muted-foreground" />
            </div>
            <span className="font-medium text-sm text-foreground">{t('common:common.search')}</span>
          </div>
          <Progress value={storagePercent} className="h-2 mb-2" />
          <p className="text-xs text-muted-foreground">
            {storageInfo.storageSize} / 5 MB
          </p>
        </div>

        {/* Theme Toggle */}
        <Button
          onClick={onThemeToggle}
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
        >
          {getThemeIcon()}
          <span className="text-sm">{getThemeLabel()}</span>
        </Button>
      </div>

      {/* User Info (Optional - can be removed if not needed) */}
      <div className="px-4 pb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://api.dicebear.com/7.x/thumbs/svg?seed=HamHome" />
                <AvatarFallback>🐹</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left">
                <p className="font-medium text-sm text-foreground">HamHome</p>
                <p className="text-xs text-muted-foreground">
                  {t('bookmark:bookmark.count', { count: bookmarks.length })}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={() => onViewChange('settings')}>
              <Settings className="h-4 w-4 mr-2" />
              {t('settings:settings.title')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onViewChange('import-export')}>
              <Download className="h-4 w-4 mr-2" />
              {t('settings:settings.importBookmarks')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

