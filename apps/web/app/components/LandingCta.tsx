'use client';

import { LandingActionButtons } from './LandingActionButtons';

interface LandingCtaProps {
  isEn: boolean;
}

export function LandingCta({ isEn }: LandingCtaProps) {
  const texts = {
    title: isEn ? 'Stop letting saved pages sink out of sight' : '让收藏不再沉底',
    desc: isEn
      ? 'Available for Chrome, Edge, and Firefox. Turn your browser into a useful knowledge entry point today.'
      : '支持 Chrome、Edge、Firefox。现在开始，升级你的浏览器工作空间。',
    download: isEn ? 'Download extension' : '下载安装',
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
