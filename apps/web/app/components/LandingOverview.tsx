"use client";

import {
  Bot,
  Brain,
  Briefcase,
  HeartPulse,
  Highlighter,
  Layers3,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";

interface LandingOverviewProps {
  isEn: boolean;
}

interface StatItem {
  title: string;
  desc: string;
  icon: ReactNode;
}

function getOverviewContent(isEn: boolean): {
  kicker: string;
  title: string;
  desc: string;
  stats: StatItem[];
} {
  if (isEn) {
    return {
      kicker: "Pages, clips, and browsing sessions",
      title: "Save content, find it again, and keep tabs organized.",
      desc: "Capture pages, text and images in one library. Save tab workspaces and use rules to organize current tabs, with optional AI assistance.",
      stats: [
        { title: "AI Capture", desc: "Summaries, tags, snapshots, page screenshots", icon: <Brain className="h-5 w-5" /> },
        { title: "Rich Clips", desc: "Save a passage or an image with its source", icon: <Highlighter className="h-5 w-5" /> },
        { title: "Health Center", desc: "Broken links, redirects, duplicates, Trash", icon: <HeartPulse className="h-5 w-5" /> },
        { title: "Agent Assist", desc: "Knows features, opens views, handles setup", icon: <Bot className="h-5 w-5" /> },
        { title: "Workspaces", desc: "Save and restore tab sessions", icon: <Briefcase className="h-5 w-5" /> },
        { title: "Tab Groups", desc: "Rules, domain fallback, AI grouping", icon: <Layers3 className="h-5 w-5" /> },
        { title: "WebDAV", desc: "Sync structured data to your own server", icon: <Upload className="h-5 w-5" /> },
        { title: "Privacy", desc: "Browser storage and sensitive-site bypass", icon: <ShieldCheck className="h-5 w-5" /> },
      ],
    };
  }

  return {
    kicker: "收藏内容与浏览现场",
    title: "保存内容、找回收藏、理顺标签页",
    desc: "网页、文本与图片放进同一个收藏库；标签页保存为工作空间，再用规则整理。按需使用 AI 和 Agent 辅助完成任务。",
    stats: [
      { title: "AI 收藏", desc: "摘要、标签、快照、页面截图", icon: <Brain className="h-5 w-5" /> },
      { title: "富剪藏", desc: "单独保存一段文字或一张图片", icon: <Highlighter className="h-5 w-5" /> },
      { title: "健康中心", desc: "失效、跳转、重复与回收站", icon: <HeartPulse className="h-5 w-5" /> },
      { title: "Agent 代办", desc: "懂功能、开页面、调配置", icon: <Bot className="h-5 w-5" /> },
      { title: "工作空间", desc: "保存并恢复整组标签页", icon: <Briefcase className="h-5 w-5" /> },
      { title: "Tab 分组", desc: "规则、域名兜底、AI 分组", icon: <Layers3 className="h-5 w-5" /> },
      { title: "WebDAV", desc: "结构化数据同步到自选服务器", icon: <Upload className="h-5 w-5" /> },
      { title: "隐私保护", desc: "浏览器存储与敏感站点跳过", icon: <ShieldCheck className="h-5 w-5" /> },
    ],
  };
}

export function LandingOverview({ isEn }: LandingOverviewProps) {
  const content = getOverviewContent(isEn);

  return (
    <section className="mx-auto w-full px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24 container">
      <div className="max-w-3xl pb-8">
        <p className="text-sm font-bold text-[#0f766e] dark:text-[#5eead4]">{content.kicker}</p>
        <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">
          {content.title}
        </h2>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          {content.desc}
        </p>
      </div>

      <div className="grid gap-4 border-y border-border/70 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {content.stats.map((item) => (
          <article key={item.title} className="min-h-28 rounded-xl bg-background/45 p-4 shadow-sm">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff5b24]/10 text-[#d94a1a] dark:text-[#ff9b6f]">
              {item.icon}
            </div>
            <h3 className="text-lg font-bold text-foreground">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
