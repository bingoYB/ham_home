'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Tag as TagIcon,
  ChevronDown,
  Filter,
  X,
  Folder,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@hamhome/ui';
import {
  BookmarkCard,
  BookmarkListItem,
  type BookmarkLabelResolver,
} from '@hamhome/ui-business/bookmark';
import { AIChatSearchDemo } from './AIChatSearchDemo';
import type { Bookmark, Category } from '@/data/mock-bookmarks';
import { getCategoryName, formatRelativeDate } from '@/data/mock-bookmarks';

interface BookmarkListMngDemoProps {
  bookmarks: Bookmark[];
  categories: Category[];
  allTags: string[];
  isEn: boolean;
}

const noop = () => {};

function getBookmarkPreviewMeta({
  bookmark,
  categories,
  isEn,
}: {
  bookmark: Bookmark;
  categories: Category[];
  isEn: boolean;
}) {
  return {
    categoryName: getCategoryName(bookmark.categoryId, categories, isEn),
    formattedDate: formatRelativeDate(bookmark.createdAt, isEn),
  };
}

function createBookmarkLabels(isEn: boolean): BookmarkLabelResolver {
  const labels: Record<string, string> = {
    'bookmark:bookmark.open': isEn ? 'Open' : '打开',
    'bookmark:bookmark.edit': isEn ? 'Edit' : '编辑',
    'bookmark:bookmark.copyLink': isEn ? 'Copy Link' : '复制链接',
    'bookmark:bookmark.share': isEn ? 'Share' : '分享',
    'bookmark:bookmark.pin': isEn ? 'Pin' : '置顶',
    'bookmark:bookmark.unpin': isEn ? 'Unpin' : '取消置顶',
    'bookmark:bookmark.viewSnapshot': isEn ? 'View Snapshot' : '查看快照',
    'bookmark:bookmark.snapshot.save': isEn ? 'Save Snapshot' : '保存快照',
    'bookmark:bookmark.snapshot.update': isEn ? 'Update Snapshot' : '更新快照',
    'bookmark:bookmark.snapshot.delete': isEn ? 'Delete Snapshot' : '删除快照',
    'bookmark:bookmark.snapshot.syncToObsidian': isEn ? 'Sync to Obsidian' : '同步到 Obsidian',
    'bookmark:bookmark.delete': isEn ? 'Delete' : '删除',
    'ai:reanalyze': isEn ? 'Reanalyze' : '重新分析',
  };

  return (key) => labels[key] ?? key;
}

export function BookmarkListMngDemo({
  bookmarks,
  categories,
  allTags,
  isEn,
}: BookmarkListMngDemoProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTags, setSelectedTags] = useState<string[]>([isEn ? 'React' : 'React']);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(['bk-1']));
  const bookmarkLabels = useMemo(() => createBookmarkLabels(isEn), [isEn]);

  const texts = {
    title: isEn ? 'Bookmark Management' : '书签管理',
    description: isEn
      ? 'Full-featured management view with search, filter, and batch operations'
      : '完整的管理视图，支持搜索、筛选、视图切换功能',
    searchPlaceholder: isEn ? 'Search bookmarks...' : '搜索书签...',
    tags: isEn ? 'Tags' : '标签',
    selectedTags: isEn ? `${selectedTags.length} tags` : `${selectedTags.length} 个标签`,
    gridView: isEn ? 'Grid View' : '网格视图',
    listView: isEn ? 'List View' : '列表视图',
    clearFilter: isEn ? 'Clear' : '清除',
    bookmarksCount: isEn ? `${bookmarks.length} bookmarks` : `${bookmarks.length} 个书签`,
    selected: isEn ? `${selectedIds.size} selected` : `已选 ${selectedIds.size} 项`,
    selectAll: isEn ? 'Select All' : '全选',
    batchDelete: isEn ? 'Delete' : '删除',
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const toggleBookmark = (bookmarkId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bookmarkId)) {
        next.delete(bookmarkId);
      } else {
        next.add(bookmarkId);
      }
      return next;
    });
  };

  const openBookmark = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const renderBookmarkCard = (bookmark: Bookmark) => {
    const { categoryName, formattedDate } = getBookmarkPreviewMeta({
      bookmark,
      categories,
      isEn,
    });

    return (
      <BookmarkCard
        key={bookmark.id}
        bookmark={bookmark}
        categoryName={categoryName}
        formattedDate={formattedDate}
        isSelected={selectedIds.has(bookmark.id)}
        onToggleSelect={() => toggleBookmark(bookmark.id)}
        onOpen={() => openBookmark(bookmark.url)}
        onEdit={noop}
        onDelete={noop}
        t={bookmarkLabels}
      />
    );
  };

  const renderBookmarkListItem = (bookmark: Bookmark) => {
    const { categoryName, formattedDate } = getBookmarkPreviewMeta({
      bookmark,
      categories,
      isEn,
    });

    return (
      <BookmarkListItem
        key={bookmark.id}
        bookmark={bookmark}
        categoryName={categoryName}
        formattedDate={formattedDate}
        isSelected={selectedIds.has(bookmark.id)}
        onToggleSelect={() => toggleBookmark(bookmark.id)}
        onOpen={() => openBookmark(bookmark.url)}
        onEdit={noop}
        onDelete={noop}
        t={bookmarkLabels}
      />
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{texts.title}</CardTitle>
        <CardDescription>{texts.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 筛选栏 */}
        <div className="flex items-center justify-between gap-4">
          {/* 左侧：搜索框 */}
          <div className="w-full max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={texts.searchPlaceholder}
                className="pl-10 bg-muted/50 border-border/50"
              />
            </div>
          </div>

          {/* 右侧：筛选和视图切换 */}
          <div className="flex items-center gap-2">
            {/* 标签筛选 */}
            <Button
              variant={selectedTags.length > 0 ? 'secondary' : 'outline'}
              size="sm"
              className="gap-2"
            >
              <TagIcon className="h-4 w-4" />
              {selectedTags.length > 0 ? texts.selectedTags : texts.tags}
              <ChevronDown className="h-3 w-3" />
            </Button>

            {/* 分类筛选 */}
            <Button variant="outline" size="sm" className="gap-2">
              <Folder className="h-4 w-4" />
              {isEn ? 'All Categories' : '全部分类'}
              <ChevronDown className="h-3 w-3" />
            </Button>

            {/* 筛选器 */}
            <Button variant="ghost" size="icon" className="h-9 w-9 border border-border">
              <Filter className="h-4 w-4" />
            </Button>

            {/* 视图切换 */}
            <div className="flex items-center border border-border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('grid')}
                title={texts.gridView}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode('list')}
                title={texts.listView}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* 筛选状态和批量操作 */}
        <div className="flex items-center justify-between pt-3 border-t border-border/50">
          {/* 左侧：筛选标签 */}
          <div className="flex items-center gap-2 flex-wrap">
            {selectedTags.map((tag) => (
              <Badge
                key={tag}
                className="text-xs px-2 py-1 gap-1.5 cursor-pointer bg-gradient-to-r from-violet-500/90 to-indigo-500/90 text-white border-0 shadow-sm"
              >
                {tag}
                <X
                  className="h-3 w-3 hover:bg-white/20 rounded-full cursor-pointer"
                  onClick={() => toggleTag(tag)}
                />
              </Badge>
            ))}
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedTags([])}
                className="text-muted-foreground hover:text-foreground h-6 px-2"
              >
                <X className="h-3 w-3 mr-1" />
                {texts.clearFilter}
              </Button>
            )}
            <span className="text-sm text-muted-foreground">{texts.bookmarksCount}</span>
          </div>

          {/* 右侧：批量操作 */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              {texts.selectAll}
            </Button>
            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-muted-foreground">{texts.selected}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  className="bg-red-500 hover:bg-red-700 text-white"
                >
                  {texts.batchDelete}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 书签列表 */}
        {viewMode === 'grid' ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {bookmarks.slice(0, 6).map(renderBookmarkCard)}
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.slice(0, 5).map(renderBookmarkListItem)}
          </div>
        )}

        <AIChatSearchDemo bookmarks={bookmarks} isEn={isEn} />
      </CardContent>
    </Card>
  );
}
