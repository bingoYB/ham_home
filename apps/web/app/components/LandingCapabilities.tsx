'use client';

import {
  Bot,
  FileText,
  Globe2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
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
    'bg-indigo-500/10 text-indigo-500 dark:text-indigo-300',
    'bg-teal-500/10 text-teal-600 dark:text-teal-300',
    'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    'bg-amber-500/10 text-amber-600 dark:text-amber-300',
    'bg-orange-500/10 text-orange-600 dark:text-orange-300',
    'bg-violet-500/10 text-violet-500 dark:text-violet-300',
    'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300',
    'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  ];

  if (isEn) {
    return [
      { title: 'Agent-assisted control', desc: 'Understands HamHome features and settings, then opens views, checks status, runs tools, and handles safe setup.', icon: Bot, tone: tones[0] },
      { title: 'Bookmark Search', desc: 'Hybrid retrieval combines exact matches and embedding similarity, with content-type and custom date-range filters.', icon: Search, tone: tones[1] },
      { title: 'Snapshots & Screenshots', desc: 'Keep local HTML or Markdown snapshots and visible-page screenshots, and optionally send notes to Obsidian.', icon: FileText, tone: tones[2] },
      { title: 'Trash & Recovery', desc: 'Deleted bookmarks stay restorable for 30 days, then are purged to free up space.', icon: RotateCcw, tone: tones[3] },
      { title: 'WebDAV Sync', desc: 'Sync settings, bookmarks, clips, workspaces, and rules; deletions travel as tombstones.', icon: RefreshCw, tone: tones[4] },
      { title: 'Browser Migration', desc: 'Import bookmark HTML, read native browser bookmarks, and write back to the bookmark bar.', icon: Upload, tone: tones[5] },
      { title: 'Provider Choice', desc: 'Use OpenAI, Anthropic, Gemini, Azure, DeepSeek, Ollama, custom endpoints, and more.', icon: Globe2, tone: tones[6] },
      { title: 'Privacy Boundaries', desc: 'Keep sensitive domains out of AI analysis and screenshots, and credentials outside Agent automation.', icon: ShieldCheck, tone: tones[7] },
    ];
  }

  return [
    { title: 'Agent 代办插件', desc: '理解 HamHome 的功能与设置，能打开页面、检查状态、执行工具并处理安全配置。', icon: Bot, tone: tones[0] },
    { title: '书签搜索', desc: '混合检索同时结合精确命中和向量相似度，还可按内容类型和自定义时间范围筛选。', icon: Search, tone: tones[1] },
    { title: '快照与截图', desc: '本地保存 HTML/Markdown 快照和可见区域页面截图，也可同步笔记到 Obsidian。', icon: FileText, tone: tones[2] },
    { title: '回收站', desc: '删除的书签保留 30 天可随时恢复，到期后自动彻底清除并释放空间。', icon: RotateCcw, tone: tones[3] },
    { title: 'WebDAV 同步', desc: '同步设置、书签、剪藏、工作空间和规则，删除以墓碑形式同步到其他设备。', icon: RefreshCw, tone: tones[4] },
    { title: '浏览器迁移', desc: '导入书签 HTML、读取原生书签，也能写回浏览器书签栏。', icon: Upload, tone: tones[5] },
    { title: 'Provider 自由选择', desc: '支持 OpenAI、Anthropic、Gemini、Azure、DeepSeek、Ollama、自定义端点等。', icon: Globe2, tone: tones[6] },
    { title: '隐私边界', desc: '敏感域名跳过 AI 分析与页面截图，凭据不会被 Agent 自动读取或代填。', icon: ShieldCheck, tone: tones[7] },
  ];
}

export function LandingCapabilities({ isEn }: LandingCapabilitiesProps) {
  const capabilities = getCapabilities(isEn);
  const texts = {
    kicker: isEn ? 'More current capabilities' : '更多当前能力',
    title: isEn
      ? 'More than a bookmark manager: clips, snapshots, search, recovery, sync, and boundaries in one extension'
      : '不只是书签管理：剪藏、快照、搜索、回收站、同步和隐私边界都在同一套插件流程里',
  };

  return (
    <section className="mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 lg:py-24 container">
      <div className="max-w-3xl">
        <p className="text-sm font-bold text-[#0f766e] dark:text-[#5eead4]">{texts.kicker}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
          {texts.title}
        </h2>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {capabilities.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.title} className="rounded-xl border border-border/70 bg-card/60 p-5 shadow-sm">
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
