'use client';

import {
  Command,
  FileText,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@hamhome/ui';

interface LandingCapabilitiesProps {
  isEn: boolean;
}

interface CapabilityItem {
  title: string;
  desc: string;
  icon: LucideIcon;
  tone: string;
}

function getCapabilities(isEn: boolean): CapabilityItem[] {
  const tones = [
    'bg-indigo-500/10 text-indigo-300',
    'bg-teal-500/10 text-teal-300',
    'bg-emerald-500/10 text-emerald-300',
    'bg-amber-500/10 text-amber-300',
    'bg-orange-500/10 text-orange-300',
    'bg-violet-500/10 text-violet-300',
  ];

  if (isEn) {
    return [
      { title: 'WebDAV Sync', desc: 'Sync bookmarks, settings, workspaces, and grouping rules across devices.', icon: RefreshCw, tone: tones[0] },
      { title: 'Page Snapshot', desc: 'Save readable content and local snapshots so pages remain reviewable later.', icon: FileText, tone: tones[1] },
      { title: 'Semantic Search', desc: 'Search by meaning when you cannot remember the exact title or keyword.', icon: Search, tone: tones[2] },
      { title: 'Category Schemes', desc: 'Use built-in templates or let AI generate structures for your workflow.', icon: Command, tone: tones[3] },
      { title: 'Custom Filters', desc: 'Save complex queries as presets and return to them in one step.', icon: SlidersHorizontal, tone: tones[4] },
      { title: 'Import & Export', desc: 'Compatible with Chrome, Firefox, and Edge standard bookmark files.', icon: Upload, tone: tones[5] },
    ];
  }

  return [
    { title: 'WebDAV 同步', desc: '在多设备间同步书签、设置、工作空间与分组配置。', icon: RefreshCw, tone: tones[0] },
    { title: '网页快照', desc: '本地保存正文和页面快照，原网页失效后仍可回看。', icon: FileText, tone: tones[1] },
    { title: '语义检索', desc: '不记得标题也没关系，输入意思接近的话也能找回来。', icon: Search, tone: tones[2] },
    { title: '分类方案', desc: '内置模板，也支持让 AI 根据使用场景生成分类结构。', icon: Command, tone: tones[3] },
    { title: '自定义筛选', desc: '把复杂查询保存成预设，重复查找时一步直达。', icon: SlidersHorizontal, tone: tones[4] },
    { title: '导入导出', desc: '兼容 Chrome、Firefox、Edge 标准文件，迁移更轻松。', icon: Upload, tone: tones[5] },
  ];
}

export function LandingCapabilities({ isEn }: LandingCapabilitiesProps) {
  const capabilities = getCapabilities(isEn);
  const texts = {
    kicker: isEn ? 'More capabilities' : '更多能力',
    title: isEn
      ? 'Beyond bookmarks, keep the whole browsing workflow together'
      : '更多功能，提升你的体验',
  };

  return (
    <section className="mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-24 container">
      <div className="max-w-3xl">
        <p className="text-sm font-bold text-[#2dd4bf]">{texts.kicker}</p>
        <h2 className="mt-3 text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {texts.title}
        </h2>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-lg border bg-card/60 p-6 shadow-sm">
              <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', item.tone)}>
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-bold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
