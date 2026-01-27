'use client';

import { useState, useEffect } from 'react';
import { cn } from '@hamhome/ui';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
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

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);
  const [isEn, setIsEn] = useState(false);

  // 初始化主题
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 切换主题
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark', !isDark);
  };

  // 切换语言
  const toggleLanguage = () => {
    setIsEn(!isEn);
  };

  // 根据语言选择数据
  const bookmarks = isEn ? mockBookmarksEn : mockBookmarks;
  const categories = isEn ? mockCategoriesEn : mockCategories;
  const pageContent = isEn ? mockPageContentEn : mockPageContent;
  const allTags = isEn ? mockAllTagsEn : mockAllTags;

  const texts = {
    heroTitle: isEn ? 'Product Feature Showcase' : '产品功能展示',
    heroDesc: isEn
      ? 'HamHome is an AI-powered smart bookmark management tool that helps you collect, organize, and search web pages more efficiently.'
      : 'HamHome 是一款 AI 驱动的智能书签管理工具，帮助你更高效地收藏、整理和检索网页。',
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
      <main className="container mx-auto px-4 py-8">
        {/* Hero 区块 */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-4">{texts.heroTitle}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {texts.heroDesc}
          </p>
        </div>

        {/* 功能展示区 */}
        <FeatureShowcase
          bookmarks={bookmarks}
          categories={categories}
          pageContent={pageContent}
          allTags={allTags}
          isEn={isEn}
        />
      </main>

      {/* 页脚 */}
      <Footer isEn={isEn} />
    </div>
  );
}

