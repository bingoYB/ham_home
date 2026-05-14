'use client';

import { useState } from 'react';
import { GripVertical, MoreHorizontal, Plus } from 'lucide-react';
import { Button, Card, CardContent, ScrollArea } from '@hamhome/ui';
import {
  WorkspaceLabelsProvider,
  WorkspaceSectionHeader,
  WorkspaceTabGroupList,
  WorkspacePageTile,
  WorkspaceSearchBar,
  WorkspaceCurrentTabsPanel,
  type WorkspaceLabels,
  type WorkspaceData,
  type WorkspaceTabPageData,
  type WorkspaceTabGroupData,
  type WorkspaceRestoreMode,
} from '@hamhome/ui-business/workspace';

interface WorkspaceDemoProps {
  isEn: boolean;
}

const WORKSPACE_DEMO_NOW = new Date('2026-05-13T21:48:00+08:00').getTime();

export function WorkspaceDemo({ isEn }: WorkspaceDemoProps) {
  const [expandedStates, setExpandedStates] = useState<Record<string, boolean>>({
    'demo-ws': true,
    'ai-ws': true,
  });

  const toggleExpanded = (id: string) => {
    setExpandedStates(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const labels: WorkspaceLabels = {
    pageCount: (count) => (isEn ? `${count} tabs` : `${count} 个标签页`),
    restoredAt: isEn ? 'Restored' : '恢复时间',
    neverRestored: isEn ? 'Never' : '从不',
    editWorkspace: isEn ? 'Edit' : '编辑工作空间',
    restoreNewWindow: isEn ? 'Open in new window' : '新窗口恢复',
    restoreCurrentWindow: isEn ? 'Restore' : '当前窗口恢复',
    deleteWorkspace: isEn ? 'Delete' : '删除工作空间',
    clickToEdit: isEn ? 'Click to edit' : '点击编辑名称',
    moreActions: isEn ? 'More actions' : '更多操作',
    edit: isEn ? 'Edit' : '编辑',
    openPage: isEn ? 'Open page' : '打开页面',
    copyUrl: isEn ? 'Copy URL' : '复制链接',
    saveToBookmark: isEn ? 'Save as bookmark' : '保存为书签',
    deletePage: isEn ? 'Delete page' : '删除页面',
    searchPlaceholder: isEn ? 'Search workspaces...' : '搜索工作空间...',
    allCategories: isEn ? 'All Categories' : '所有分类',
    uncategorized: isEn ? 'Uncategorized' : '未分类',
    unknownCategory: isEn ? 'Unknown' : '未知分类',
    sortManual: isEn ? 'Manual' : '手动排序',
    sortCreatedAt: isEn ? 'Created At' : '按创建时间',
    sortRestoredAt: isEn ? 'Last Restored' : '按最近恢复',
    currentTabs: isEn ? 'Current Tabs' : '当前标签页',
    saveCurrentWindow: isEn ? 'Save current window' : '保存当前窗口',
    saveThisWindow: isEn ? 'Save this window' : '保存此窗口',
    refreshCurrentTabs: isEn ? 'Refresh' : '刷新当前状态',
    currentTabsLoading: isEn ? 'Loading tabs...' : '正在获取当前标签页...',
    currentTabsEmpty: isEn ? 'No tabs open' : '当前窗口没有打开的标签页',
    currentWindowLabel: isEn ? 'Current Window' : '当前窗口',
    windowLabel: (index) => (isEn ? `Window ${index}` : `窗口 ${index}`),
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('__all__');
  const [sortBy, setSortBy] = useState<'createdAt' | 'restoredAt' | 'manual'>('manual');

  const categories = [
    { id: 'dev', name: isEn ? 'Development' : '开发', icon: '💻' },
    { id: 'design', name: isEn ? 'Design' : '设计', icon: '🎨' },
  ];

  const tabGroups: WorkspaceTabGroupData[] = [
    { id: 1, title: isEn ? 'Frontend Frameworks' : '前端框架', color: 'blue', windowId: 1 },
    { id: 2, title: isEn ? 'Design Resources' : '设计资源', color: 'purple', windowId: 1 },
  ];

  const tabGroups2: WorkspaceTabGroupData[] = [
    { id: 3, title: isEn ? 'AI Models' : 'AI 模型', color: 'green', windowId: 2 },
  ];

  const pages: WorkspaceTabPageData[] = [
    { id: '1', title: 'React Documentation', url: 'https://react.dev', domain: 'react.dev', favicon: '', index: 0, tabGroupId: 1, windowId: 1 },
    { id: '2', title: 'Next.js Routing', url: 'https://nextjs.org', domain: 'nextjs.org', favicon: '', index: 1, tabGroupId: 1, windowId: 1 },
    { id: '3', title: 'Tailwind CSS Classes', url: 'https://tailwindcss.com', domain: 'tailwindcss.com', favicon: '', index: 2, tabGroupId: 1, windowId: 1 },
    { id: '4', title: 'Figma UI Kit', url: 'https://figma.com', domain: 'figma.com', favicon: '', index: 3, tabGroupId: 2, windowId: 1 },
    { id: '5', title: 'Dribbble Inspirations', url: 'https://dribbble.com', domain: 'dribbble.com', favicon: '', index: 4, tabGroupId: 2, windowId: 1 },
  ];

  const pages2: WorkspaceTabPageData[] = [
    { id: 'a1', title: 'ChatGPT', url: 'https://chat.openai.com', domain: 'openai.com', favicon: '', index: 0, tabGroupId: 3, windowId: 2 },
    { id: 'a2', title: 'Claude AI', url: 'https://claude.ai', domain: 'claude.ai', favicon: '', index: 1, tabGroupId: 3, windowId: 2 },
    { id: 'a3', title: 'Midjourney Showcase', url: 'https://midjourney.com', domain: 'midjourney.com', favicon: '', index: 2, windowId: 2 },
  ];

  const workspaces: WorkspaceData[] = [
    {
      id: 'demo-ws',
      name: isEn ? 'Project Research' : '项目调研',
      description: '',
      categoryId: 'dev',
      tags: [],
      pages,
      tabGroups,
      isRestored: false,
      createdAt: WORKSPACE_DEMO_NOW - 86400000,
      updatedAt: WORKSPACE_DEMO_NOW - 86400000,
    },
    {
      id: 'ai-ws',
      name: isEn ? 'AI Learning' : 'AI 学习',
      description: '',
      categoryId: 'dev',
      tags: [],
      pages: pages2,
      tabGroups: tabGroups2,
      isRestored: true,
      restoredAt: WORKSPACE_DEMO_NOW - 3600000,
      createdAt: WORKSPACE_DEMO_NOW - 172800000,
      updatedAt: WORKSPACE_DEMO_NOW - 3600000,
    }
  ];

  const currentWindowPreview = {
    pages: [
      { id: 'c1', title: 'HamHome - Smart Bookmark', url: 'https://hamhome.com', domain: 'hamhome.com', index: 0, windowId: 1 },
      { id: 'c2', title: 'Google Search', url: 'https://google.com', domain: 'google.com', index: 1, windowId: 1 },
    ],
    tabGroups: [],
    currentWindowId: 1,
  };

  const noop = () => {};

  const renderPage = (page: WorkspaceTabPageData) => (
    <WorkspacePageTile
      page={page}
      dragHandle={
        <div className="relative z-10 shrink-0 touch-none cursor-grab">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      }
      actions={
        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      }
    />
  );

  return (
    <WorkspaceLabelsProvider labels={labels}>
      <Card className="w-full overflow-hidden border-none shadow-none bg-transparent">
        <CardContent className="p-0">
          <div className="flex h-[600px] min-h-0 flex-col bg-background xl:flex-row border rounded-xl overflow-hidden shadow-2xl">
            <section className="flex min-w-0 flex-1 flex-col">
              <header className="flex min-h-16 flex-wrap items-center gap-3 border-b px-4 py-3 bg-muted/5">
                <div className="min-w-0 flex-1">
                  <WorkspaceSearchBar
                    searchQuery={searchQuery}
                    categoryFilter={categoryFilter}
                    sortBy={sortBy}
                    categories={categories}
                    onSearchChange={setSearchQuery}
                    onCategoryFilterChange={setCategoryFilter}
                    onSortByChange={setSortBy}
                  />
                </div>
                <Button size="sm" onClick={noop} className="shrink-0">
                  <Plus className="mr-2 h-4 w-4" />
                  {labels.saveCurrentWindow}
                </Button>
              </header>
              <ScrollArea className="min-h-0 flex-1">
                <div className="p-4 space-y-6">
                  {workspaces.map(ws => (
                    <div key={ws.id} className="border rounded-lg bg-background overflow-hidden shadow-sm">
                      <WorkspaceSectionHeader
                        workspace={ws}
                        categoryName={isEn ? 'Development' : '开发'}
                        categoryIcon="💻"
                        onEdit={noop as any}
                        onRestore={noop as any}
                        onDelete={noop as any}
                        expanded={expandedStates[ws.id]}
                        onToggle={() => toggleExpanded(ws.id)}
                        dragHandle={
                          <div className="shrink-0 touch-none mr-1 cursor-grab">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                          </div>
                        }
                      />
                      {expandedStates[ws.id] && (
                        <div className="px-8 pb-8 pt-4">
                          <WorkspaceTabGroupList
                            pages={ws.pages}
                            tabGroups={ws.tabGroups}
                            grid
                            renderPage={renderPage}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>
            
            <WorkspaceCurrentTabsPanel
              preview={currentWindowPreview}
              loading={false}
              onRefresh={noop}
              onSaveCurrentWindow={noop}
              renderPage={renderPage}
              className="xl:w-80"
            />
          </div>
        </CardContent>
      </Card>
    </WorkspaceLabelsProvider>
  );
}
