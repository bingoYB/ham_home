import type { SupportedLanguage } from './language';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bingoyb.github.io/ham_home').replace(/\/+$/, '');
export const REPOSITORY_URL = 'https://github.com/bingoYB/ham_home';
export const AUTHOR = { name: 'Bingo', url: 'https://github.com/bingoYB' };
export const CONTENT_UPDATED_AT = '2026-10-10';
export const LANGUAGES: SupportedLanguage[] = ['zh', 'en'];
// Legacy routes and x-default both resolve to the Chinese pages.
export const DEFAULT_LANGUAGE: SupportedLanguage = 'zh';
export const LANGUAGE_TAGS: Record<SupportedLanguage, string> = { zh: 'zh-CN', en: 'en' };

export const PRODUCT_COPY = {
  zh: {
    category: 'AI 网页收藏与标签页管理',
    slogan: '借助 AI，让收藏有序，让标签页井然。',
    description: 'HamHome 是一款开源、本地优先的网页收藏与标签页管理扩展。收藏网页、文本和图片，用关键词或语义搜索找回内容，保存并恢复标签页工作空间；内置 Agent 可辅助查找、总结和执行支持的管理操作。AI 服务与 WebDAV 同步由你选择。',
  },
  en: {
    category: 'AI Web Clipper & Tab Manager',
    slogan: 'Keep your collections organized and your tabs tidy, with help from AI.',
    description: 'HamHome is an open-source, local-first web clipper and tab manager. Save pages, text and images, find saved content with keyword or semantic search, and restore tab workspaces. An optional AI Agent helps you search, summarize and run supported management tasks. Choose your own AI provider and optional WebDAV sync.',
  },
} satisfies Record<SupportedLanguage, { category: string; slogan: string; description: string }>;

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
