'use client';

import { Header } from './Header';
import { Footer } from './Footer';
import { FeatureHeroBanner } from './FeatureHeroBanner';
import { FeatureShowcase } from './FeatureShowcase';
import { LandingCapabilities } from './LandingCapabilities';
import { LandingCta } from './LandingCta';
import { LandingOverview } from './LandingOverview';
import { LandingPrivacy } from './LandingPrivacy';
import { LandingFAQ } from './LandingFAQ';
import type { SupportedLanguage } from '@/app/lib/language';
import { LandingGuides } from './LandingGuides';
import { AgentExamples } from './AgentExamples';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';

interface LandingPageProps { language: SupportedLanguage; }

export function LandingPage({ language }: LandingPageProps) {
  const { isDark, isEn, toggleTheme, languageSwitchHref, rememberLanguageSwitch } = useWebPreferences(language);

  return (
    <div className="home-page-shell min-h-screen text-foreground">
      {/* 顶部导航 */}
      <Header
        isDark={isDark}
        isEn={isEn}
        onToggleTheme={toggleTheme}
        languageSwitchHref={languageSwitchHref}
        onLanguageSwitch={rememberLanguageSwitch}
      />

      {/* 主内容 */}
      <main className="home-page">
        {/* Hero 区块 */}
        <div className="container mx-auto px-4 py-8">
          <FeatureHeroBanner isEn={isEn} isDark={isDark} />
        </div>

        <LandingOverview isEn={isEn} />
        <LandingGuides language={language} />
        <AgentExamples isEn={isEn} />

        {/* 功能展示区 - 垂直排列 */}
        <FeatureShowcase
          isEn={isEn}
          isDark={isDark}
        />

        <LandingCapabilities isEn={isEn} />
        <LandingPrivacy isEn={isEn} />
        <LandingFAQ isEn={isEn} />
        <LandingCta isEn={isEn} />
      </main>

      {/* 页脚 */}
      <Footer isEn={isEn} />
    </div>
  );
}
