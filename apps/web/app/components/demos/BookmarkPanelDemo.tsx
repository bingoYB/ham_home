'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Bookmark as BookmarkIcon,
  Tag as TagIcon,
  Filter,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  ExternalLink,
  Link2,
  LayoutGrid,
  Settings,
  X,
} from 'lucide-react';
import {
  Button,
  Input,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  ScrollArea,
  cn,
  buttonVariants,
} from '@hamhome/ui';
import type { Bookmark, Category } from '@/data/mock-bookmarks';
import { AIChatSearchDemo } from './AIChatSearchDemo';

interface BookmarkPanelDemoProps {
  bookmarks: Bookmark[];
  categories: Category[];
  allTags: string[];
  isEn: boolean;
}

// 书签列表项 - 与 extension 的 BookmarkListItem 一致
function PanelBookmarkItem({ bookmark }: { bookmark: Bookmark }) {
  return (
    <HoverCard openDelay={300} closeDelay={100}>
      <HoverCardTrigger asChild>
        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'group flex items-center gap-3 px-3 py-2.5 w-full justify-start border-0 shadow-none overflow-hidden'
          )}
        >
          {/* Favicon */}
          <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0">
            {bookmark.favicon ? (
              <img src={bookmark.favicon} alt="" className="w-5 h-5 rounded" />
            ) : (
              <Link2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* 标题 */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <h4 className="text-sm font-medium truncate leading-tight">{bookmark.title}</h4>
          </div>

          {/* 打开图标 */}
          <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground" />
        </a>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" sideOffset={4} className="w-64 max-w-xs z-50">
        <div className="space-y-1">
          <div className="font-medium text-sm truncate">{bookmark.title}</div>
          {bookmark.description && (
            <div className="text-xs text-muted-foreground line-clamp-2">{bookmark.description}</div>
          )}
          <div className="text-xs text-muted-foreground truncate">{bookmark.url}</div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

// 分类树节点 - 与 extension 的 CategoryTreeNode 一致
function CategoryNode({
  category,
  bookmarks,
  level,
  isExpanded,
  onToggle,
  isEn,
}: {
  category: Category | null;
  bookmarks: Bookmark[];
  level: number;
  isExpanded: boolean;
  onToggle: () => void;
  isEn: boolean;
}) {
  const nodeName = category?.name || (isEn ? 'Uncategorized' : '未分类');
  const hasBookmarks = bookmarks.length > 0;

  if (!hasBookmarks) return null;

  return (
    <div className="overflow-hidden">
      {/* 分类头部 */}
      <Button
        variant="outline"
        onClick={onToggle}
        className="border-0 w-full justify-start shadow-none overflow-hidden"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {/* 展开/折叠图标 */}
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0" />
        )}

        {/* 文件夹图标 */}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}

        {/* 分类名称 */}
        <span className="flex-1 min-w-0 text-sm font-medium truncate text-left">{nodeName}</span>

        {/* 计数 */}
        <span className="text-xs shrink-0 text-muted-foreground">{bookmarks.length}</span>
      </Button>

      {/* 展开的书签列表 */}
      {isExpanded && (
        <div className="overflow-hidden" style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
          {bookmarks.map((bookmark) => (
            <PanelBookmarkItem key={bookmark.id} bookmark={bookmark} />
          ))}
        </div>
      )}
    </div>
  );
}

// 模拟网页内容 - 作为底部背景
function MockWebpage({ isEn }: { isEn: boolean }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 overflow-hidden">
      {/* 模拟浏览器地址栏 */}
      <div className="h-10 bg-background border-b border-border flex items-center px-4 gap-3">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 max-w-md mx-auto">
          <div className="h-6 bg-muted rounded-md flex items-center px-3">
            <span className="text-xs text-muted-foreground truncate">
              https://example.com/article/getting-started-with-react
            </span>
          </div>
        </div>
      </div>

      {/* 模拟网页内容 */}
      <div className="p-8 max-w-3xl mx-auto">
        {/* 文章标题 */}
        <div className="mb-6">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-3" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 opacity-60" />
        </div>

        {/* 段落占位 */}
        <div className="space-y-4 mb-8">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full opacity-70" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-[95%] opacity-70" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-[88%] opacity-70" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 opacity-70" />
        </div>

        {/* 图片占位 */}
        <div className="h-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-8 flex items-center justify-center">
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            {isEn ? 'Image Content' : '图片内容'}
          </div>
        </div>

        {/* 更多段落 */}
        <div className="space-y-4">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full opacity-70" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-[92%] opacity-70" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-[85%] opacity-70" />
        </div>
      </div>
    </div>
  );
}

export function BookmarkPanelDemo({
  bookmarks,
  categories,
  isEn,
}: BookmarkPanelDemoProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(categories.filter((c) => !c.parentId).map((c) => c.id))
  );
  const [hasTagFilter] = useState(false);
  const [hasFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const texts = {
    title: isEn ? 'Bookmarks' : '书签',
    searchPlaceholder: isEn ? 'Search bookmarks...' : '搜索书签...',
    clickToOpen: isEn ? 'Click to open bookmark panel' : '点击打开书签面板',
    pressShortcut: isEn ? 'Or press Ctrl+B' : '或按 Ctrl+B',
  };

  // 自动打开演示
  useEffect(() => {
    const timer = setTimeout(() => setIsOpen(true), 800);
    return () => clearTimeout(timer);
  }, []);

  // 按分类分组书签
  const bookmarksByCategory = useMemo(() => {
    const map = new Map<string | null, Bookmark[]>();
    bookmarks.forEach((b) => {
      const catId = b.categoryId;
      if (!map.has(catId)) {
        map.set(catId, []);
      }
      map.get(catId)!.push(b);
    });
    return map;
  }, [bookmarks]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // 顶层分类
  const rootCategories = categories.filter((c) => !c.parentId);

  return (
    <div className="space-y-4">
      <div className="relative w-full h-[520px] rounded-xl overflow-hidden border border-border shadow-lg">
        {/* 底层：模拟网页 */}
        <MockWebpage isEn={isEn} />

        {/* 中层：模糊遮罩 */}
        <div
          className={cn(
            'absolute inset-0 z-10 bg-black/20 backdrop-blur-[2px]',
            'transition-opacity duration-300',
            isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
          onClick={() => setIsOpen(false)}
        />

        {/* 上层：侧边栏面板 - 从左侧滑入 */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute top-1 bottom-1 left-1 z-20',
            'w-[360px] max-w-[90%]',
            'bg-background border border-border rounded-lg shadow-2xl',
            'flex flex-col overflow-hidden',
            'transition-transform duration-300 ease-out',
            isOpen ? 'translate-x-0' : '-translate-x-[calc(100%+8px)]'
          )}
        >
          {/* 头部 - 与 extension BookmarkHeader 一致 */}
          <div className="px-4 py-3 border-b border-border bg-background/95 backdrop-blur-sm">
            {/* 标题行 */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BookmarkIcon className="h-5 w-5 text-primary" />
                <h2 className="text-base font-semibold text-foreground">{texts.title}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                  {bookmarks.length}
                </span>
              </div>
              {/* 快捷操作 */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* 搜索框和筛选器 */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={texts.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 h-9 bg-muted/50 border-border/50 focus:bg-background"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* 筛选器 */}
              <div className="flex items-center gap-1">
                {/* 标签筛选 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', hasTagFilter && 'text-primary bg-primary/10')}
                >
                  <TagIcon className="h-4 w-4" />
                </Button>

                {/* 筛选器 */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', hasFilter && 'text-primary bg-primary/10')}
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* 分类树视图 - 与 extension CategoryTreeView 一致 */}
          <ScrollArea className="flex-1 min-h-0 bookmark-list-view pb-8">
            <div className="p-2 overflow-hidden">
              {rootCategories.map((cat) => (
                <CategoryNode
                  key={cat.id}
                  category={cat}
                  bookmarks={bookmarksByCategory.get(cat.id) || []}
                  level={0}
                  isExpanded={expandedIds.has(cat.id)}
                  onToggle={() => toggleExpand(cat.id)}
                  isEn={isEn}
                />
              ))}
              {/* 未分类 */}
              {bookmarksByCategory.get(null) && (
                <CategoryNode
                  category={null}
                  bookmarks={bookmarksByCategory.get(null) || []}
                  level={0}
                  isExpanded={expandedIds.has('uncategorized')}
                  onToggle={() => toggleExpand('uncategorized')}
                  isEn={isEn}
                />
              )}
            </div>
          </ScrollArea>

          <AIChatSearchDemo bookmarks={bookmarks} isEn={isEn} className="px-2 w-full" />
        </div>

        {/* 打开按钮提示 - 当面板关闭时显示 */}
        <div
          className={cn(
            'absolute inset-0 z-5 flex items-center justify-center',
            'transition-opacity duration-300',
            isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
          )}
        >
          <Button
            variant="secondary"
            size="lg"
            onClick={() => setIsOpen(true)}
            className="shadow-lg"
          >
            <BookmarkIcon className="h-5 w-5 mr-2" />
            {texts.clickToOpen}
          </Button>
        </div>
      </div>

    </div>
  );
}
