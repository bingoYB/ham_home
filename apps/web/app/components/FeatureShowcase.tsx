'use client';

import { Bookmark, FolderTree, Sparkles, Sidebar, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@hamhome/ui';
import { SaveBookmarkDemo } from './demos/SaveBookmarkDemo';
import { BookmarkPanelDemo } from './demos/BookmarkPanelDemo';
import { BookmarkListMngDemo } from './demos/BookmarkListMngDemo';
import { CategoriesDemo } from './demos/CategoriesDemo';
import { ImportExportDemo } from './demos/ImportExportDemo';
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
      value: 'categories',
      icon: <FolderTree className="h-4 w-4" />,
      label: isEn ? 'Categories' : '分类方案',
    },
    {
      value: 'import',
      icon: <Upload className="h-4 w-4" />,
      label: isEn ? 'Import/Export' : '导入导出',
    },
  ];

  return (
    <Tabs defaultValue="save" className="space-y-8">
      <TabsList className="w-full max-w-5xl mx-auto justify-start overflow-x-auto px-1">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.value} value={tab.value} className="gap-2 shrink-0">
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

      <TabsContent value="categories" className="space-y-6">
        <CategoriesDemo isEn={isEn} />
      </TabsContent>

      <TabsContent value="import" className="space-y-6">
        <ImportExportDemo bookmarks={bookmarks} categories={categories} isEn={isEn} />
      </TabsContent>
    </Tabs>
  );
}
