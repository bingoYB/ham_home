import type { SupportedLanguage } from './language';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bingoyb.github.io/ham_home').replace(/\/+$/, '');
export const REPOSITORY_URL = 'https://github.com/bingoYB/ham_home';
export const AUTHOR = { name: 'Bingo', url: 'https://github.com/bingoYB' };
export const CONTENT_UPDATED_AT = '2026-10-17';
export const LANGUAGES: SupportedLanguage[] = ['zh', 'en'];
// Legacy routes and x-default both resolve to the Chinese pages.
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh';
export const LANGUAGE_TAGS: Record<SupportedLanguage, string> = { zh: 'zh-CN', en: 'en' };

export const PRODUCT_COPY = {
  zh: {
    category: 'AI 书签管理与网页收藏插件',
    seoTitle: 'HamHome — AI 书签管理插件：智能分类、摘要与语义搜索',
    seoDescription: '用 HamHome 为书签生成 AI 分类、标签和摘要，导入旧书签后批量分析，通过语义搜索找回收藏。支持 Chrome、Edge、Firefox，本地存储、自选 AI，以及文字图片剪藏和标签页工作空间。',
    slogan: '借助 AI，让收藏有序，让标签页井然。',
    description: 'HamHome 是一款开源、本地优先的 AI 书签管理插件，支持 Chrome、Edge 和 Firefox。用 AI 为书签生成分类、标签和摘要，导入旧书签后批量分析，通过关键词或语义搜索找回收藏。也支持文字图片剪藏和标签页工作空间。',
    setupNote: 'AI 需配置自选服务或本地模型；语义搜索需单独配置 Embedding。云端 API 费用由服务商决定，相关内容会发送给所选服务。',
  },
  en: {
    category: 'AI Bookmark Manager',
    seoTitle: 'HamHome — AI Bookmark Manager for Chrome, Edge & Firefox',
    seoDescription: 'Organize bookmarks with AI categories, tags, summaries and semantic search. For Chrome, Edge and Firefox, with local storage and your choice of AI provider.',
    slogan: 'Keep your collections organized and your tabs tidy, with help from AI.',
    description: 'HamHome is an open-source, local-first AI bookmark manager for Chrome, Edge and Firefox. Generate categories, tags and summaries, import existing bookmarks for bulk AI analysis, and find saved content with keyword or semantic search. Also save text and image clips and tab workspaces.',
    setupNote: 'AI requires your own provider or local model. Semantic search needs separate embeddings. Cloud API pricing and processing of relevant content depend on your chosen provider.',
  },
} satisfies Record<SupportedLanguage, { category: string; seoTitle: string; seoDescription: string; slogan: string; description: string; setupNote: string }>;

export function siteUrl(path = ''): string {
  const segment = path.replace(/^\/+|\/+$/g, '');
  return `${SITE_URL}/${segment}${segment ? '/' : ''}`;
}

export function localizedPath(language: SupportedLanguage, path = ''): string {
  const segment = path.replace(/^\/+|\/+$/g, '');
  return `/${language}/${segment}${segment ? '/' : ''}`;
}

export function switchLanguagePath(pathname: string, language: SupportedLanguage): string {
  const path = pathname.replace(/^\/(zh|en)(\/|$)/, '/');
  return localizedPath(language, path);
}

export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return LANGUAGES.some((candidate) => candidate === language);
}

/** hreflang targets for one page; every target, x-default included, is a canonical localized URL. */
export function languageAlternates(path = ''): Record<string, string> {
  return {
    ...Object.fromEntries(LANGUAGES.map((language) => [LANGUAGE_TAGS[language], siteUrl(localizedPath(language, path))])),
    'x-default': siteUrl(localizedPath(DEFAULT_LANGUAGE, path)),
  };
}
