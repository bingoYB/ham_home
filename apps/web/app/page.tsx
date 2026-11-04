'use client';

import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ScrollProgress } from './components/motion/ScrollProgress';
import { FeatureHeroBanner } from './components/FeatureHeroBanner';
import { FeatureShowcase } from './components/FeatureShowcase';
import { LandingCapabilities } from './components/LandingCapabilities';
import { LandingCta } from './components/LandingCta';
import { LandingOverview } from './components/LandingOverview';
import { LandingPrivacy } from './components/LandingPrivacy';
import { LandingFAQ } from './components/LandingFAQ';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';

export default function HomePage() {
  const { isDark, isEn, toggleTheme, toggleLanguage } = useWebPreferences();

  return (
    <div className="home-page-shell min-h-screen text-foreground">
      <ScrollProgress />

      {/* 顶部导航 */}
      <Header
        isDark={isDark}
        isEn={isEn}
        onToggleTheme={toggleTheme}
        onToggleLanguage={toggleLanguage}
      />

      {/* 主内容 */}
      <main className="home-page">
        {/* Hero 区块 */}
        <div className="container mx-auto px-4 py-8">
          <FeatureHeroBanner isEn={isEn} isDark={isDark} />
        </div>

        <LandingOverview isEn={isEn} />

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
