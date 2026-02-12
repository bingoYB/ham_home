'use client';

import { useState } from 'react';
import {
  Search,
  LayoutGrid,
  List,
  Tag as TagIcon,
  ChevronDown,
  Filter,
  X,
  Folder,
  Bookmark as BookmarkIcon,
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
  Checkbox,
} from '@hamhome/ui';
import { BookmarkCardDemo } from './BookmarkCardDemo';
import { AIChatSearchDemo } from './AIChatSearchDemo';
import type { Bookmark, Category } from '@/data/mock-bookmarks';
import { getCategoryName, formatRelativeDate } from '@/data/mock-bookmarks';

interface BookmarkListMngDemoProps {
  bookmarks: Bookmark[];
  categories: Category[];
  allTags: string[];
  isEn: boolean;
}

// 书签列表项组件
function BookmarkListItemDemo({
  bookmark,
  categories,
  isEn,
  isSelected,
}: {
  bookmark: Bookmark;
  categories: Category[];
  isEn: boolean;
  isSelected: boolean;
}) {
  const categoryName = getCategoryName(bookmark.categoryId, categories, isEn);
  const formattedDate = formatRelativeDate(bookmark.createdAt, isEn);
  const hostname = new URL(bookmark.url).hostname;

  return (
    <div
      className={`group flex items-center gap-4 p-4 rounded-xl border transition-shadow hover:shadow-md ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card hover:bg-muted/50'
      }`}
    >
      {/* 选择框 */}
      <div className="shrink-0">
        <Checkbox checked={isSelected} />
      </div>

      {/* 图标 */}
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
        {bookmark.favicon ? (
          <img src={bookmark.favicon} alt="" className="w-5 h-5 rounded" />
        ) : (
          <BookmarkIcon className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-foreground truncate">{bookmark.title}</h3>
        {bookmark.description && (
          <p className="text-xs text-muted-foreground truncate mt-1">{bookmark.description}</p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <span className="truncate max-w-[200px]">{hostname}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0">{categoryName}</span>
          <span className="shrink-0">•</span>
          <span className="shrink-0">{formattedDate}</span>
        </div>
      </div>

      {/* 标签 */}
      {bookmark.tags.length > 0 && (
        <div className="hidden lg:flex flex-wrap items-center gap-1.5 max-w-[240px]">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
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
            {bookmarks.slice(0, 6).map((bookmark) => (
              <BookmarkCardDemo
                key={bookmark.id}
                bookmark={bookmark}
                categories={categories}
                isEn={isEn}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.slice(0, 5).map((bookmark) => (
              <BookmarkListItemDemo
                key={bookmark.id}
                bookmark={bookmark}
                categories={categories}
                isEn={isEn}
                isSelected={selectedIds.has(bookmark.id)}
              />
            ))}
          </div>
        )}

        <AIChatSearchDemo bookmarks={bookmarks} isEn={isEn} />
      </CardContent>
    </Card>
  );
}
