'use client';

import Link from 'next/link';
import type { SupportedLanguage } from '@/app/lib/language';
import { REPOSITORY_URL, localizedPath } from '@/app/lib/site';
import { ChevronLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { Header } from './Header';
import { Footer } from './Footer';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';
import { PRIVACY_POLICY_COPY, PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED_AT } from '@/app/lib/privacy-policy';

function PolicySection({
  title,
  paragraphs,
}: {
  title: string;
  paragraphs: string[];
}) {
  return (
    <section className="rounded-2xl border bg-card/70 p-6 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground sm:text-base">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>
    </section>
  );
}

interface PrivacyPolicyContentProps { language?: SupportedLanguage; }

export function PrivacyPolicyContent({ language = 'zh' }: PrivacyPolicyContentProps) {
  const { isDark, isEn, toggleTheme, languageSwitchHref, rememberLanguageSwitch } = useWebPreferences(language);
  const sections = PRIVACY_POLICY_SECTIONS[language];

  const texts = {
    badge: isEn ? 'HamHome Privacy Policy' : 'HamHome 隐私权政策',
    title: PRIVACY_POLICY_COPY[language].title,
    description: PRIVACY_POLICY_COPY[language].description,
    backHome: isEn ? 'Back to Home' : '返回首页',
    updatedAt: isEn ? 'Last updated' : '最后更新',
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        isDark={isDark}
        isEn={isEn}
        onToggleTheme={toggleTheme}
        languageSwitchHref={languageSwitchHref}
        onLanguageSwitch={rememberLanguageSwitch}
      />

      <main className="container mx-auto px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <Link
            href={localizedPath(language)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {texts.backHome}
          </Link>

          <section className="mt-6 rounded-3xl border bg-gradient-to-br from-emerald-500/10 via-background to-sky-500/10 p-7 shadow-sm sm:p-10">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  {texts.badge}
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                  {texts.title}
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                  {texts.description}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {texts.updatedAt}：{PRIVACY_POLICY_UPDATED_AT}
                  </span>
                  <span aria-hidden="true">•</span>
                  <a
                    href={REPOSITORY_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                  >
                    GitHub
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <div className="space-y-4">
              {sections.map((section) => (
                <PolicySection
                  key={section.title}
                  title={section.title}
                  paragraphs={section.paragraphs}
                />
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer isEn={isEn} />
    </div>
  );
}
