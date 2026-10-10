import type { Metadata } from 'next';
import type { SupportedLanguage } from './language';
import { AUTHOR, CONTENT_UPDATED_AT, PRODUCT_COPY, SITE_URL, languageAlternates, localizedPath, siteUrl } from './site';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

// Icons ship with the deployment, so they use the base path rather than the canonical origin.
export const SITE_ICONS: Metadata['icons'] = {
  icon: [16, 32, 48, 128].map((size) => ({ url: `${basePath}/icon/${size}.png`, sizes: `${size}x${size}`, type: 'image/png' })),
  apple: `${basePath}/icon/128.png`,
};

interface PageMetadataOptions {
  path?: string;
  title?: string;
  description?: string;
  // Guides are articles; the home and privacy pages stay plain website pages.
  type?: 'website' | 'article';
}

export function createPageMetadata(language: SupportedLanguage, { path = '', title, description, type = 'website' }: PageMetadataOptions = {}): Metadata {
  const copy = PRODUCT_COPY[language];
  const pageTitle = title ? `${title} | HamHome` : `HamHome — ${copy.category}`;
  const pageDescription = description || copy.description;
  const url = siteUrl(localizedPath(language, path));
  const openGraph = {
    title: pageTitle, description: pageDescription, url, siteName: 'HamHome',
    locale: language === 'en' ? 'en_US' : 'zh_CN',
    alternateLocale: language === 'en' ? ['zh_CN'] : ['en_US'],
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: `HamHome — ${copy.category}` }],
  };
  return {
    metadataBase: new URL(`${SITE_URL}/`),
    title: pageTitle,
    description: pageDescription,
    applicationName: 'HamHome',
    authors: [AUTHOR],
    alternates: { canonical: url, languages: languageAlternates(path) },
    icons: SITE_ICONS,
    openGraph: type === 'article'
      ? { ...openGraph, type: 'article', modifiedTime: CONTENT_UPDATED_AT, authors: [AUTHOR.url] }
      : { ...openGraph, type: 'website' },
    twitter: { card: 'summary_large_image', title: pageTitle, description: pageDescription, images: [`${SITE_URL}/og-image.png`] },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 } },
  };
}
