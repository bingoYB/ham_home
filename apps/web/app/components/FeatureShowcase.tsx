'use client';

import { Bookmark, FolderTree, Sparkles, Sidebar, Upload, MonitorDot } from 'lucide-react';
import { SaveBookmarkDemo } from './demos/SaveBookmarkDemo';
import { WorkspaceDemo } from './demos/WorkspaceDemo';
import { BookmarkPanelDemo } from './demos/BookmarkPanelDemo';
import { BookmarkListMngDemo } from './demos/BookmarkListMngDemo';
import { CategoriesDemo } from './demos/CategoriesDemo';
import { ImportExportDemo } from './demos/ImportExportDemo';
import { FeatureSection } from './FeatureSection';
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
  const features = [
    {
      id: 'ai-save',
      icon: <Sparkles className="h-5 w-5" />,
      title: isEn ? 'AI-Powered Bookmark Saving' : 'AI 智能书签收藏',
      description: isEn
        ? 'One-click save with AI that automatically generates summaries, suggests categories, and recommends tags. All analysis runs locally for maximum privacy.'
        : '一键保存书签，AI 自动生成摘要、智能推荐分类与标签。所有分析均在本地运行，保护你的隐私。',
      content: (
        <SaveBookmarkDemo
          pageContent={pageContent}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      ),
    },
    {
      id: 'workspace-manage',
      icon: <MonitorDot className="h-5 w-5" />,
      title: isEn ? 'Workspace & Tab Groups' : '工作空间与 Tab 分组',
      description: isEn
        ? 'Seamlessly manage your browser tabs. Group by topics with AI, save as workspaces or bookmarks, and sync across devices.'
        : '无缝管理浏览器标签页。支持 AI 智能话题分组、一键保存工作区或转为书签，并在多设备间自动同步。',
      content: <WorkspaceDemo isEn={isEn} />,
    },
    {
      id: 'sidebar-panel',
      icon: <Sidebar className="h-5 w-5" />,
      title: isEn ? 'Sidebar Bookmark Panel' : '侧边栏书签面板',
      description: isEn
        ? 'Access your bookmarks from any page with a sleek sidebar panel. Browse by category tree, search with keywords, or chat with AI to find what you need.'
        : '在任意页面侧边栏快速访问书签。支持分类树浏览、关键词搜索，还可以通过 AI 对话搜索找到所需内容。',
      content: (
        <BookmarkPanelDemo
          bookmarks={bookmarks}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      ),
    },
    {
      id: 'bookmark-manage',
      icon: <Bookmark className="h-5 w-5" />,
      title: isEn ? 'Full-Featured Bookmark Management' : '全功能书签管理',
      description: isEn
        ? 'A powerful management view with grid/list modes, tag filtering, batch operations, and AI-powered conversational search for your entire collection.'
        : '强大的管理视图，支持网格/列表切换、标签筛选、批量操作，以及 AI 驱动的对话式搜索，轻松管理全部收藏。',
      content: (
        <BookmarkListMngDemo
          bookmarks={bookmarks}
          categories={categories}
          allTags={allTags}
          isEn={isEn}
        />
      ),
    },
    {
      id: 'categories',
      icon: <FolderTree className="h-5 w-5" />,
      title: isEn ? 'Smart Category Schemes' : '智能分类方案',
      description: isEn
        ? 'Choose from preset category templates or let AI generate personalized categories based on your interests and profession.'
        : '选择预设分类模板，或让 AI 根据你的兴趣和职业生成个性化分类方案。',
      content: <CategoriesDemo isEn={isEn} />,
    },
    {
      id: 'import-export',
      icon: <Upload className="h-5 w-5" />,
      title: isEn ? 'Seamless Import & Export' : '无缝导入导出',
      description: isEn
        ? 'Import bookmarks from any browser with folder structure preservation and optional AI analysis. Export to JSON or HTML for backup and migration.'
        : '从任意浏览器导入书签，保留目录结构，可选 AI 分析。支持 JSON/HTML 格式导出，轻松备份与迁移。',
      content: (
        <ImportExportDemo bookmarks={bookmarks} categories={categories} isEn={isEn} />
      ),
    },
  ];

  return (
    <div className="feature-showcase">
      {features.map((feature, index) => (
        <FeatureSection
          key={feature.id}
          id={feature.id}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          alternate={index % 2 === 1}
        >
          {feature.content}
        </FeatureSection>
      ))}
    </div>
  );
}
