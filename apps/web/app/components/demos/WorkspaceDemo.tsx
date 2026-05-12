'use client';

import { useState } from 'react';
import {
  Bot,
  BookmarkPlus,
  RefreshCcw,
  CheckCircle2,
  ChevronDown,
  MonitorDot,
  MoreHorizontal,
  Cloud,
  GripVertical,
  Edit3,
  ExternalLink,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@hamhome/ui';

interface WorkspaceDemoProps {
  isEn: boolean;
}

export function WorkspaceDemo({ isEn }: WorkspaceDemoProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);

  const texts = {
    title: isEn ? 'Workspace & Tab Groups' : '工作空间与 Tab 分组',
    description: isEn
      ? 'Manage browser tabs seamlessly. Save, restore, group by AI, and sync across devices.'
      : '无缝管理浏览器标签页。支持一键保存恢复、AI 智能分组和多端同步。',
    activeWorkspace: isEn ? 'Project Research' : '项目调研',
    tabGroups: isEn ? 'Tab Groups' : '标签分组',
    aiAnalyzeBtn: isEn ? 'AI Analysis' : 'AI 分析',
    analyzing: isEn ? 'Analyzing...' : '分析中...',
    saveAsBookmarkBtn: isEn ? 'Save as Bookmarks' : '转为书签',
    syncBtn: isEn ? 'Cloud Sync' : '云端同步',
    group1: isEn ? 'Frontend Frameworks' : '前端框架',
    group2: isEn ? 'Design Resources' : '设计资源',
    tabsCount: (count: number) => (isEn ? `${count} tabs` : `${count} 个标签页`),
    aiInsight: isEn ? 'AI Insight: This workspace focuses on modern frontend tools and UI components.' : 'AI 洞察：此工作区主要关注现代前端工具和 UI 组件库。',
    restoredNever: isEn ? 'Restored: Never' : '恢复时间：从不',
    development: isEn ? 'Development' : '开发',
  };

  const group1Tabs = [
    { title: 'React Documentation', url: 'react.dev', domain: 'react.dev', icon: 'R' },
    { title: 'Next.js Routing', url: 'nextjs.org', domain: 'nextjs.org', icon: 'N' },
    { title: 'Tailwind CSS Classes', url: 'tailwindcss.com', domain: 'tailwindcss.com', icon: 'T' },
  ];

  const group2Tabs = [
    { title: 'Figma UI Kit', url: 'figma.com', domain: 'figma.com', icon: 'F' },
    { title: 'Dribbble Inspirations', url: 'dribbble.com', domain: 'dribbble.com', icon: 'D' },
  ];

  const handleAnalyze = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setAnalyzed(true);
    }, 1500);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MonitorDot className="h-5 w-5 text-primary" />
              {texts.title}
            </CardTitle>
            <CardDescription className="mt-1">{texts.description}</CardDescription>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <Cloud className="h-4 w-4" />
              {texts.syncBtn}
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <BookmarkPlus className="h-4 w-4" />
              {texts.saveAsBookmarkBtn}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mock Workspace Section */}
        <div className="border rounded-lg bg-background overflow-hidden shadow-sm">
          {/* Section Header */}
          <div className="flex items-center gap-2 px-4 pl-3 py-3 bg-muted/20 border-b">
            <div className="shrink-0 touch-none mr-1 cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1 text-left cursor-pointer">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-base font-semibold cursor-text hover:underline">
                  {texts.activeWorkspace}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
              <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span>{new Date().toLocaleDateString()}</span>
                <span>·</span>
                <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-normal gap-1 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">
                  <span className="text-[12px]">💻</span>
                  {texts.development}
                </Badge>
                <span>·</span>
                <span>{texts.tabsCount(5)}</span>
                <span>·</span>
                <span>{texts.restoredNever}</span>
              </div>
            </div>
            <div className="hidden sm:flex shrink-0 items-center gap-1">
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Section Content */}
          <div className="px-4 sm:px-8 pb-8 pt-4">
            
            {/* Action Bar inside workspace (for demo purposes) */}
            <div className="flex justify-between items-center mb-6">
              <Button 
                onClick={handleAnalyze} 
                disabled={analyzing || analyzed}
                className="gap-2"
                size="sm"
              >
                {analyzing ? (
                  <RefreshCcw className="h-4 w-4 animate-spin" />
                ) : analyzed ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {analyzing ? texts.analyzing : texts.aiAnalyzeBtn}
              </Button>
            </div>

            {analyzed && (
              <div className="mb-6 p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                <Bot className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground leading-relaxed">{texts.aiInsight}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Group 1 */}
              <div>
                <div className="flex min-h-9 min-w-0 items-center gap-2 border-b px-1 py-1 mb-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-blue-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{texts.group1}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">3</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group1Tabs.map((tab, i) => (
                    <div key={i} className="group relative flex min-h-14 w-full items-center gap-4 rounded-[12px] border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-accent/5">
                      <div className="relative z-10 shrink-0 touch-none cursor-grab">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="relative z-10 pointer-events-none shrink-0 h-7 w-7 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">
                        {tab.icon}
                      </div>
                      <span className="relative z-10 min-w-0 flex-1 pointer-events-none">
                        <span className="block truncate text-sm font-medium leading-snug">{tab.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{tab.domain}</span>
                      </span>
                      <div className="relative z-10 shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Group 2 */}
              <div>
                <div className="flex min-h-9 min-w-0 items-center gap-2 border-b px-1 py-1 mb-3">
                  <span className="h-3 w-3 shrink-0 rounded-full bg-purple-500" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">{texts.group2}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">2</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {group2Tabs.map((tab, i) => (
                    <div key={i} className="group relative flex min-h-14 w-full items-center gap-4 rounded-[12px] border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-accent/5">
                      <div className="relative z-10 shrink-0 touch-none cursor-grab">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="relative z-10 pointer-events-none shrink-0 h-7 w-7 rounded bg-muted flex items-center justify-center font-bold text-muted-foreground text-xs">
                        {tab.icon}
                      </div>
                      <span className="relative z-10 min-w-0 flex-1 pointer-events-none">
                        <span className="block truncate text-sm font-medium leading-snug">{tab.title}</span>
                        <span className="block truncate text-xs text-muted-foreground">{tab.domain}</span>
                      </span>
                      <div className="relative z-10 shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-md"><MoreHorizontal className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
