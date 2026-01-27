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

  // 切换主题（带动画效果）
  const toggleTheme = (e?: React.MouseEvent) => {
    const newIsDark = !isDark;
    const root = document.documentElement;

    // 如果不支持 View Transitions API，直接切换
    if (!document.startViewTransition) {
      setIsDark(newIsDark);
      root.classList.toggle('dark', newIsDark);
      return;
    }

    // 计算圆形动画的最大半径（从点击点到最远角落的距离）
    const clickX = e?.clientX ?? window.innerWidth / 2;
    const clickY = e?.clientY ?? window.innerHeight / 2;
    const maxRadius = Math.hypot(
      Math.max(clickX, window.innerWidth - clickX),
      Math.max(clickY, window.innerHeight - clickY)
    );

    // 设置 CSS 变量用于动画
    root.style.setProperty('--theme-transition-x', `${clickX}px`);
    root.style.setProperty('--theme-transition-y', `${clickY}px`);
    root.style.setProperty('--theme-transition-radius', `${maxRadius}px`);

    // 使用 View Transitions API
    const transition = document.startViewTransition(() => {
      setIsDark(newIsDark);
      root.classList.toggle('dark', newIsDark);
    });

    // 等待动画完成后清理 CSS 变量
    transition.finished.then(() => {
      root.style.removeProperty('--theme-transition-x');
      root.style.removeProperty('--theme-transition-y');
      root.style.removeProperty('--theme-transition-radius');
    });
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

