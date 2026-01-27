'use client';

import { Bookmark, FolderOpen, Tag, Sparkles, Sidebar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hamhome/ui';
import { SaveBookmarkDemo } from './demos/SaveBookmarkDemo';
import { BookmarkPanelDemo } from './demos/BookmarkPanelDemo';
import { BookmarkListMngDemo } from './demos/BookmarkListMngDemo';
import { CategoriesDemo } from './demos/CategoriesDemo';
import type { Bookmark as BookmarkType, Category, PageContent } from '@/data/mock-bookmarks';

interface FeatureShowcaseProps {
  bookmarks: BookmarkType[];
  categories: Category[];
  pageContent: PageContent;
  allTags: string[];
  isEn: boolean;
}

export function FeatureShowcase({
  bookmarks,
  categories,
  pageContent,
  allTags,
  isEn,
}: FeatureShowcaseProps) {
  const tabs = [
    {
      value: 'save',
      icon: <Sparkles className="h-4 w-4" />,
      label: isEn ? 'AI Save' : 'AI书签',
    },
    {
      value: 'panel',
      icon: <Sidebar className="h-4 w-4" />,
      label: isEn ? 'Sidebar Panel' : '书签面板',
    },
    {
      value: 'manage',
      icon: <Bookmark className="h-4 w-4" />,
      label: isEn ? 'Manage' : '书签管理',
    },
    {
      value: 'ai',
      icon: <FolderOpen className="h-4 w-4" />,
      label: isEn ? 'AI Categories' : '智能分类',
    },
  ];

  return (
    <Tabs defaultValue="save" className="space-y-8">
      <TabsList className="grid w-full max-w-xl mx-auto grid-cols-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="save" className="space-y-6">
        <SaveBookmarkDemo
          pageContent={pageContent}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      </TabsContent>

      <TabsContent value="panel" className="space-y-6">
        <BookmarkPanelDemo
          bookmarks={bookmarks}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      </TabsContent>

      <TabsContent value="manage" className="space-y-6">
        <BookmarkListMngDemo
          bookmarks={bookmarks}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      </TabsContent>

      <TabsContent value="ai" className="space-y-6">
        <CategoriesDemo isEn={isEn} />
      </TabsContent>
    </Tabs>
  );
}
