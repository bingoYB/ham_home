'use client';

import { LandingActionButtons } from './LandingActionButtons';

interface LandingCtaProps {
  isEn: boolean;
}

export function LandingCta({ isEn }: LandingCtaProps) {
  const texts = {
    title: isEn ? 'Start organizing your collections and tabs' : '开始整理你的收藏与标签页',
    desc: isEn
      ? 'Available for Chrome, Edge, and Firefox. Start with local data, then add AI, semantic search, WebDAV, or Obsidian only when you need them.'
      : '支持 Chrome、Edge、Firefox。从本地数据开始，再按需开启 AI、语义搜索、WebDAV 或 Obsidian 工作流。',
    download: isEn ? 'Install extension' : '安装扩展',
    github: isEn ? 'View GitHub' : '查看 GitHub',
  };

  return (
    <section className="mx-auto w-full px-4 py-16 sm:px-6 lg:px-8 container">
      <div className="flex flex-col gap-6 border-t border-border/70 pt-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl">
            {texts.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground sm:text-lg">
            {texts.desc}
          </p>
        </div>
        <LandingActionButtons
          isEn={isEn}
          className="shrink-0"
          downloadLabel={texts.download}
          githubLabel={texts.github}
        />
      </div>
    </section>
  );
}
