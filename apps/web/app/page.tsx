'use client';

import { Button, cn } from '@hamhome/ui';
import { Github, Star } from 'lucide-react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FeatureHeroBanner } from './components/FeatureHeroBanner';
import { FeatureShowcase } from './components/FeatureShowcase';
import {
  mockBookmarks,
  mockCategories,
  mockPageContent,
  mockAllTags,
  mockBookmarksEn,
  mockCategoriesEn,
  mockPageContentEn,
  mockAllTagsEn,
} from '@/data/mock-bookmarks';
import { useWebPreferences } from '@/app/hooks/useWebPreferences';

const GITHUB_REPO_URL = 'https://github.com/bingoYB/ham_home';

export default function HomePage() {
  const { isDark, isEn, toggleTheme, toggleLanguage } = useWebPreferences();

  // 根据语言选择数据
  const bookmarks = isEn ? mockBookmarksEn : mockBookmarks;
  const categories = isEn ? mockCategoriesEn : mockCategories;
  const pageContent = isEn ? mockPageContentEn : mockPageContent;
  const allTags = isEn ? mockAllTagsEn : mockAllTags;

  const texts = {
    starTitle: isEn ? 'If HamHome helps you, please give us a Star on GitHub' : '如果 HamHome 对你有帮助，欢迎到 GitHub 点个 Star',
    starDesc: isEn
      ? 'Your support helps more users discover HamHome and keeps the project evolving.'
      : '你的支持能让更多人发现 HamHome，也会推动项目持续迭代。',
    starButton: isEn ? 'Star on GitHub' : '前往 GitHub 点 Star',
  };

  return (
    <div className={cn('min-h-screen bg-background text-foreground')}>
      {/* 顶部导航 */}
      <Header
        isDark={isDark}
        isEn={isEn}
        onToggleTheme={toggleTheme}
        onToggleLanguage={toggleLanguage}
      />

      {/* 主内容 */}
      <main>
        {/* Hero 区块 */}
        <div className="container mx-auto px-4 py-8">
          <FeatureHeroBanner isEn={isEn} isDark={isDark} />
        </div>

        {/* 功能展示区 - 垂直排列 */}
        <FeatureShowcase
          bookmarks={bookmarks}
          categories={categories}
          pageContent={pageContent}
          allTags={allTags}
          isEn={isEn}
        />

        {/* GitHub Star 引导 */}
        <section className="py-16 sm:py-20">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl rounded-2xl border bg-card/60 p-6 text-center shadow-sm sm:p-8">
              <h2 className="text-2xl font-bold tracking-tight">{texts.starTitle}</h2>
              <p className="mt-3 text-muted-foreground">{texts.starDesc}</p>
              <Button asChild size="lg" className="mt-6 gap-2">
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-5 w-5" />
                  {texts.starButton}
                  <Star className="h-5 w-5" />
                </a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <Footer isEn={isEn} />
    </div>
  );
}
