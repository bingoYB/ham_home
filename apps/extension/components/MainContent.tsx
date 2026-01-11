/**
 * MainContent 主内容区组件
 * 迁移自 design-example，展示书签列表和分类统计
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  ChevronRight,
  MoreVertical,
  FileText,
  Calendar,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import {
  Input,
  Button,
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hamhome/ui';
import { useBookmarks } from '@/contexts/BookmarkContext';
import type { LocalBookmark } from '@/types';

interface MainContentProps {
  currentView: string;
  onViewChange?: (view: string) => void;
}

export function MainContent({ currentView, onViewChange }: MainContentProps) {
  const { t, i18n } = useTranslation(['common', 'bookmark']);
  const { bookmarks, categories, deleteBookmark } = useBookmarks();
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤书签
  const filteredBookmarks = useMemo(() => {
    if (!searchQuery) return bookmarks;
    const query = searchQuery.toLowerCase();
    return bookmarks.filter(
      (b) =>
        b.title.toLowerCase().includes(query) ||
        b.description.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        b.tags.some((t) => t.toLowerCase().includes(query))
    );
  }, [bookmarks, searchQuery]);

  // 获取分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    bookmarks.forEach((b) => {
      const catId = b.categoryId || 'uncategorized';
      stats[catId] = (stats[catId] || 0) + 1;
    });
    return stats;
  }, [bookmarks]);

  // 获取分类名称
  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return t('bookmark:bookmark.uncategorized');
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || t('bookmark:bookmark.uncategorized');
  };

  // 获取分类颜色
  const getCategoryColor = (categoryId: string | null) => {
    const colors = [
      'from-primary-400 to-primary-500',
      'from-emerald-400 to-emerald-500',
      'from-cyan-400 to-cyan-500',
      'from-purple-400 to-purple-500',
      'from-pink-400 to-pink-500',
      'from-orange-400 to-orange-500',
    ];
    if (!categoryId) return 'from-gray-400 to-gray-500';
    const index = categories.findIndex((c) => c.id === categoryId);
    return colors[index % colors.length] || colors[0];
  };

  // 最近书签
  const recentBookmarks = useMemo(() => {
    return [...filteredBookmarks]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);
  }, [filteredBookmarks]);

  // 格式化日期
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat(i18n.language, { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }).format(date);
  };

  // 打开书签
  const openBookmark = (url: string) => {
    window.open(url, '_blank');
  };

  // 删除书签
  const handleDelete = async (bookmark: LocalBookmark) => {
    if (confirm(t('bookmark:bookmark.deleteConfirm', { title: bookmark.title }))) {
      await deleteBookmark(bookmark.id);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t('bookmark:bookmark.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted border-0"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {bookmarks.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="px-8 py-6 space-y-8">
        {/* Categories Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">{t('bookmark:bookmark.categories')}</h2>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground"
              onClick={() => onViewChange?.('categories')}
            >
              {t('common:common.next')}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.slice(0, 3).map((category) => (
              <CategoryCard
                key={category.id}
                name={category.name}
                count={categoryStats[category.id] || 0}
                color={getCategoryColor(category.id)}
                onClick={() => onViewChange?.('categories')}
              />
            ))}
            {categories.length === 0 && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                {t('common:common.empty')}
              </div>
            )}
          </div>
        </section>

        {/* Recent Bookmarks Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">
              {searchQuery ? t('bookmark:bookmark.title') : t('bookmark:bookmark.recent')}
            </h2>
            {searchQuery && (
              <span className="text-sm text-muted-foreground">
                {t('common:common.noResults')} {filteredBookmarks.length} {t('bookmark:bookmark.title')}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {recentBookmarks.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? t('common:common.noResults') : t('bookmark:bookmark.newBookmark')}
              </div>
            ) : (
              recentBookmarks.map((bookmark, index) => (
                <BookmarkRow
                  key={bookmark.id}
                  bookmark={bookmark}
                  isFirst={index === 0}
                  categoryName={getCategoryName(bookmark.categoryId)}
                  categoryColor={getCategoryColor(bookmark.categoryId)}
                  formatDate={formatDate}
                  onOpen={() => openBookmark(bookmark.url)}
                  onDelete={() => handleDelete(bookmark)}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// 分类卡片组件
interface CategoryCardProps {
  name: string;
  count: number;
  color: string;
  onClick: () => void;
}

function CategoryCard({ name, count, color, onClick }: CategoryCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center`}>
            <FileText className="h-5 w-5 text-white" />
          </div>
          <h3 className="font-semibold text-foreground">{name}</h3>
        </div>
      </div>

      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-sm">{count} 个书签</span>
        <ChevronRight className="h-4 w-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Decorative background */}
      <div className={`absolute bottom-4 right-4 w-20 h-20 rounded-2xl bg-gradient-to-br ${color} opacity-10`} />
    </div>
  );
}

// 书签行组件
interface BookmarkRowProps {
  bookmark: LocalBookmark;
  isFirst: boolean;
  categoryName: string;
  categoryColor: string;
  formatDate: (timestamp: number) => string;
  onOpen: () => void;
  onDelete: () => void;
}

function BookmarkRow({
  bookmark,
  isFirst,
  categoryName,
  categoryColor,
  formatDate,
  onOpen,
  onDelete,
}: BookmarkRowProps) {
  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all hover:shadow-md ${
        isFirst
          ? 'bg-gradient-to-r from-primary-900 to-primary-800 text-white'
          : 'bg-card border border-border'
      }`}
      onClick={onOpen}
    >
      {/* Favicon */}
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
        isFirst ? 'bg-white/10' : `bg-gradient-to-br ${categoryColor}`
      }`}>
        {bookmark.favicon ? (
          <img 
            src={bookmark.favicon} 
            alt="" 
            className="w-6 h-6 rounded"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <FileText className="h-6 w-6 text-white" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className={`font-semibold mb-1 truncate ${
          isFirst ? 'text-white' : 'text-foreground'
        }`}>
          {bookmark.title}
        </h3>
        <p className={`text-sm truncate ${
          isFirst ? 'text-white/70' : 'text-muted-foreground'
        }`}>
          {categoryName} • {bookmark.tags.slice(0, 3).join(', ') || '无标签'}
        </p>
      </div>

      {/* Tags */}
      <div className="hidden md:flex items-center gap-2">
        {bookmark.tags.slice(0, 2).map((tag) => (
          <Badge
            key={tag}
            variant="secondary"
            className={isFirst ? 'bg-white/10 text-white border-0' : ''}
          >
            {tag}
          </Badge>
        ))}
      </div>

      {/* Date */}
      <div className={`hidden lg:flex items-center gap-2 text-sm ${
        isFirst ? 'text-white/70' : 'text-muted-foreground'
      }`}>
        <Calendar className="h-4 w-4" />
        {formatDate(bookmark.createdAt)}
      </div>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button 
            variant="ghost" 
            size="icon" 
            className={`h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity ${
              isFirst ? 'text-white hover:bg-white/10' : ''
            }`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(); }}>
            <ExternalLink className="h-4 w-4 mr-2" />
            打开
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Arrow */}
      <ChevronRight className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${
        isFirst ? 'text-white' : 'text-muted-foreground'
      }`} />
    </div>
  );
}

