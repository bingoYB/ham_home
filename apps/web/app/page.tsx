'use client';

import { useState, useEffect } from 'react';
import { Button, cn } from '@hamhome/ui';
import { Github, Star } from 'lucide-react';
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

const GITHUB_REPO_URL = 'https://github.com/bingoYB/ham_home';
const LANGUAGE_STORAGE_KEY = 'hamhome.web.language';

type SupportedLanguage = 'zh' | 'en';

function resolveInitialLanguage(): SupportedLanguage {
  if (typeof window === 'undefined') {
    return 'zh';
  }

  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage === 'zh' || storedLanguage === 'en') {
      return storedLanguage;
    }
  } catch {
    // Ignore storage access errors and fallback to browser language.
  }

  const browserLanguages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];
  const prefersEnglish = browserLanguages.some((lang) =>
    lang?.toLowerCase().startsWith('en')
  );

  return prefersEnglish ? 'en' : 'zh';
}

function persistLanguagePreference(language: SupportedLanguage) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Ignore storage access errors.
  }
}

export default function HomePage() {
  const [isDark, setIsDark] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('zh');
  const [isLanguageReady, setIsLanguageReady] = useState(false);
  const isEn = language === 'en';

  // 初始化主题
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 初始化语言（优先本地缓存，否则根据浏览器语言自动适配）
  useEffect(() => {
    const initialLanguage = resolveInitialLanguage();
    setLanguage(initialLanguage);
    setIsLanguageReady(true);
  }, []);

  // 语言持久化 + 同步 html lang
  useEffect(() => {
    if (!isLanguageReady) {
      return;
    }

    persistLanguagePreference(language);
    document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  }, [language, isLanguageReady]);

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
    setLanguage((prev) => (prev === 'en' ? 'zh' : 'en'));
  };

  // 根据语言选择数据
  const bookmarks = isEn ? mockBookmarksEn : mockBookmarks;
  const categories = isEn ? mockCategoriesEn : mockCategories;
  const pageContent = isEn ? mockPageContentEn : mockPageContent;
  const allTags = isEn ? mockAllTagsEn : mockAllTags;

  const texts = {
    heroTitle: isEn ? 'Extension Feature Showcase' : '插件功能展示',
    heroDesc: isEn
      ? 'HamHome demonstrates the latest extension capabilities: AI conversational search, semantic retrieval, smart categorization, browser import/export, and privacy-first local storage.'
      : 'HamHome 展示插件最新能力：AI 对话搜索、语义检索、智能分类、浏览器导入导出，以及以本地存储为核心的隐私保护。',
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

        {/* GitHub Star 引导 */}
        <section className="mt-12">
          <div className="mx-auto max-w-3xl rounded-2xl border bg-card/60 p-6 text-center shadow-sm sm:p-8">
            <h3 className="text-2xl font-bold tracking-tight">{texts.starTitle}</h3>
            <p className="mt-3 text-muted-foreground">{texts.starDesc}</p>
            <Button asChild size="lg" className="mt-6 gap-2">
              <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                <Github className="h-5 w-5" />
                {texts.starButton}
                <Star className="h-5 w-5" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      {/* 页脚 */}
      <Footer isEn={isEn} />
    </div>
  );
}
