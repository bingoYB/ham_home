'use client';

import { Briefcase, BookmarkCheck, Layers3, RefreshCw, Search, Sparkles, Upload } from 'lucide-react';
import type { ReactNode } from 'react';

interface LandingOverviewProps {
  isEn: boolean;
}

interface StatItem {
  title: string;
  desc: string;
  icon: ReactNode;
}

interface StepItem {
  index: string;
  title: string;
  desc: string;
}

function getOverviewContent(isEn: boolean): {
  kicker: string;
  title: string;
  desc: string;
  stats: StatItem[];
  steps: StepItem[];
} {
  if (isEn) {
    return {
      kicker: 'From saving to rediscovery',
      title: 'Do not pile up links. Turn browsing into a reusable system.',
      desc: 'HamHome connects saving, understanding, retrieval, and migration into one continuous path so bookmarks stay useful.',
      stats: [
        { title: 'AI Auto Organize', desc: 'Summaries, categories, tags in one pass', icon: <Sparkles className="h-5 w-5" /> },
        { title: 'Semantic Search', desc: 'Find pages the way you think', icon: <Search className="h-5 w-5" /> },
        { title: 'Workspaces', desc: 'Save and restore groups of tabs', icon: <Briefcase className="h-5 w-5" /> },
        { title: 'Import / Export', desc: 'Backup, migrate, and switch browsers', icon: <Upload className="h-5 w-5" /> },
      ],
      steps: [
        { index: '01', title: 'One-click save', desc: 'Read page content, generate summaries, and suggest categories and tags automatically.' },
        { index: '02', title: 'Keep it managed', desc: 'Sidebar, cards, batch actions, and saved filters keep the knowledge base tidy.' },
        { index: '03', title: 'Find it anytime', desc: 'Keywords, semantic retrieval, and AI chat search recover what you only vaguely remember.' },
      ],
    };
  }

  return {
    kicker: '从收藏到找回',
    title: '不是把链接堆起来，而是把浏览过程整理成系统',
    desc: 'HamHome 把保存、理解、检索和迁移串成一条连续路径，让书签真正能被再次使用。',
    stats: [
      { title: 'AI 自动整理', desc: '摘要、分类、标签一次完成', icon: <Sparkles className="h-5 w-5" /> },
      { title: '语义化搜索', desc: '像聊天一样找回网页', icon: <Search className="h-5 w-5" /> },
      { title: '工作空间', desc: '保存并恢复整组标签页', icon: <Briefcase className="h-5 w-5" /> },
      { title: '导入导出', desc: '备份、迁移和跨浏览器切换', icon: <Upload className="h-5 w-5" /> },
    ],
    steps: [
      { index: '01', title: '一键保存', desc: '读取页面内容，自动生成摘要、推荐分类与标签，减少手工整理。' },
      { index: '02', title: '持续管理', desc: '侧边栏、卡片视图、批量操作、预设筛选共同维护你的知识库。' },
      { index: '03', title: '随时找回', desc: '关键词、语义检索、AI 对话搜索一起工作，找到“记得大概”的内容。' },
    ],
  };
}

export function LandingOverview({ isEn }: LandingOverviewProps) {
  const content = getOverviewContent(isEn);
  const stepIcons = [
    <BookmarkCheck key="save" className="h-5 w-5" />,
    <Layers3 key="manage" className="h-5 w-5" />,
    <RefreshCw key="restore" className="h-5 w-5" />,
  ];

  return (
    <section className="mx-auto w-full px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24 container">
      <div className="grid gap-6 border-y border-border/70 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {content.stats.map((item) => (
          <article key={item.title} className="min-h-24">
            <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              {item.icon}
            </div>
            <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </article>
        ))}
      </div>

      {/* <div className="pt-14 sm:pt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-bold text-[#2dd4bf]">{content.kicker}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {content.desc}
          </p>
        </div>
        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          {content.steps.map((step, index) => (
            <article key={step.index} className="rounded-lg border bg-card/60 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 min-w-9 items-center justify-center rounded-lg bg-[#ff742f]/10 text-sm font-bold text-[#ff8d55]">
                  {step.index}
                </span>
                <span className="text-primary">{stepIcons[index]}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">{step.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
            </article>
          ))}
        </div>
      </div> */}
    </section>
  );
}
