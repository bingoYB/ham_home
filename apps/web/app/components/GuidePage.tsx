'use client';

import Link from 'next/link';
import type { SupportedLanguage } from '@/app/lib/language';
import type { LocalizedGuide } from '@/app/lib/guides';
import { CONTENT_UPDATED_AT, REPOSITORY_URL, localizedPath } from '@/app/lib/site';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';
import { Header } from './Header';
import { Footer } from './Footer';
import { LandingActionButtons } from './LandingActionButtons';
import { ExtensionScreenshotFrame } from './ExtensionScreenshotFrame';
import { LandingGuides } from './LandingGuides';

interface GuidePageProps {
  language: SupportedLanguage;
  guide: LocalizedGuide;
}

export function GuidePage({ language, guide }: GuidePageProps) {
  const { isDark, isEn, toggleTheme, languageSwitchHref, rememberLanguageSwitch } = useWebPreferences(language);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header isDark={isDark} isEn={isEn} onToggleTheme={toggleTheme} languageSwitchHref={languageSwitchHref} onLanguageSwitch={rememberLanguageSwitch} />
      <main>
        <article className="container mx-auto max-w-4xl px-4 py-12 sm:px-6">
          <Link href={localizedPath(language)} className="text-sm text-muted-foreground hover:text-primary">{isEn ? '← HamHome home' : '← 返回 HamHome 首页'}</Link>
          <h1 className="mt-6 text-3xl font-bold leading-tight sm:text-4xl">{guide.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{isEn ? 'By Bingo · Updated' : 'Bingo · 更新于'} <time dateTime={CONTENT_UPDATED_AT}>{CONTENT_UPDATED_AT}</time></p>
          <p className="mt-6 text-lg leading-relaxed">{guide.answer}</p>
          <h2 className="mt-10 text-2xl font-semibold">{isEn ? 'How to use it' : '如何使用'}</h2>
          <ol className="mt-5 list-decimal space-y-4 pl-6 text-muted-foreground">{guide.steps.map((step) => <li key={step} className="leading-relaxed">{step}</li>)}</ol>
          <ExtensionScreenshotFrame id={guide.screenshot} isEn={isEn} isDark={isDark} className="mx-auto mt-8 max-w-xl" />
          <h2 className="mt-10 text-2xl font-semibold">{isEn ? 'Requirements and limits' : '使用条件与范围'}</h2>
          <ul className="mt-5 list-disc space-y-3 pl-6 text-muted-foreground">{guide.limits.map((limit) => <li key={limit} className="leading-relaxed">{limit}</li>)}</ul>
          <p className="my-8 text-sm text-muted-foreground">
            <a href={`${REPOSITORY_URL}/blob/main/docs/USAGE_${language}.md`} target="_blank" rel="noopener noreferrer" className="underline">{isEn ? 'Usage guide' : '使用指南'}</a>
            {' · '}<a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer" className="underline">{isEn ? 'Source code' : '源代码'}</a>
            {' · '}<Link href={localizedPath(language, 'privacy-policy')} className="underline">{isEn ? 'Privacy policy' : '隐私政策'}</Link>
          </p>
          <LandingActionButtons isEn={isEn} />
        </article>
        <LandingGuides language={language} />
      </main>
      <Footer isEn={isEn} />
    </div>
  );
}
