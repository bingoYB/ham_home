"use client";

import {
  Bot,
  Brain,
  Briefcase,
  FolderInput,
  Highlighter,
  Search,
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
      kicker: "AI bookmark organization, from capture to retrieval",
      title: "Organize bookmarks with AI. Find what you saved.",
      desc: "Start with new pages or import existing browser bookmarks into HamHome. Generate categories, tags and summaries, then find saved content by keywords or meaning.",
      stats: [
        { title: "AI Organization", desc: "Generate categories, tags and summaries", icon: <Brain className="h-5 w-5" /> },
        { title: "Rich Clips", desc: "Save a passage or an image with its source", icon: <Highlighter className="h-5 w-5" /> },
        { title: "Existing Bookmarks", desc: "Import browser bookmarks or HTML; analyze in bulk", icon: <FolderInput className="h-5 w-5" /> },
        { title: "Agent Assist", desc: "Find and summarize saved content", icon: <Bot className="h-5 w-5" /> },
        { title: "Workspaces", desc: "Save and restore tab sessions", icon: <Briefcase className="h-5 w-5" /> },
        { title: "Semantic Search", desc: "Find by topic with separately configured embeddings", icon: <Search className="h-5 w-5" /> },
        { title: "WebDAV", desc: "Sync structured data to your own server", icon: <Upload className="h-5 w-5" /> },
        { title: "Privacy", desc: "Browser storage and sensitive-site bypass", icon: <ShieldCheck className="h-5 w-5" /> },
      ],
    };
  }

  return {
    kicker: "AI 书签整理，从收藏到找回",
    title: "用 AI 整理书签，让收藏更容易找回",
    desc: "从新收藏开始，或把浏览器旧书签导入 HamHome。用 AI 生成分类、标签和摘要，再用关键词或语义搜索找回需要的内容。",
    stats: [
      { title: "AI 整理", desc: "生成分类、标签和内容摘要", icon: <Brain className="h-5 w-5" /> },
      { title: "富剪藏", desc: "单独保存一段文字或一张图片", icon: <Highlighter className="h-5 w-5" /> },
      { title: "旧书签整理", desc: "导入浏览器书签或 HTML，批量分析", icon: <FolderInput className="h-5 w-5" /> },
      { title: "Agent 辅助", desc: "查找与总结已保存内容", icon: <Bot className="h-5 w-5" /> },
      { title: "工作空间", desc: "保存并恢复整组标签页", icon: <Briefcase className="h-5 w-5" /> },
      { title: "语义搜索", desc: "单独配置 Embedding 后按主题查找", icon: <Search className="h-5 w-5" /> },
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
