import { getExtensionScreenshotPath } from '../components/extensionScreenshots';
import { getDownloadChannels } from './download';
import type { LocalizedGuide } from './guides';
import type { SupportedLanguage } from './language';
import { AUTHOR, CONTENT_UPDATED_AT, LANGUAGE_TAGS, PRODUCT_COPY, REPOSITORY_URL, SITE_URL, localizedPath, siteUrl } from './site';

type JsonLdData = Record<string, unknown>;

const AUTHOR_NODE = { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url };

// Each language page owns its node, so url and description never conflict under one @id.
function softwareId(language: SupportedLanguage): string {
  return `${siteUrl(localizedPath(language))}#software`;
}

export function buildSoftwareApplicationJsonLd(language: SupportedLanguage): JsonLdData {
  const storeUrls = getDownloadChannels().flatMap((channel) => (channel.id !== 'offline' && channel.url ? [channel.url] : []));
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': softwareId(language),
    name: 'HamHome',
    description: PRODUCT_COPY[language].description,
    url: siteUrl(localizedPath(language)),
    applicationCategory: 'BrowserApplication',
    operatingSystem: 'Chrome, Microsoft Edge, Firefox',
    softwareHelp: siteUrl(localizedPath(language, 'guides/ai-collections')),
    license: `${REPOSITORY_URL}/blob/main/LICENSE`,
    author: AUTHOR_NODE,
    // The extension is free; AI provider fees are separate and explained in the FAQ.
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    sameAs: [REPOSITORY_URL, ...storeUrls],
  };
}

export function buildGuideJsonLd(language: SupportedLanguage, guide: LocalizedGuide): JsonLdData {
  const url = siteUrl(localizedPath(language, `guides/${guide.slug}`));
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: guide.title,
        description: guide.description,
        url,
        mainEntityOfPage: url,
        inLanguage: LANGUAGE_TAGS[language],
        dateModified: CONTENT_UPDATED_AT,
        author: AUTHOR_NODE,
        image: `${SITE_URL}${getExtensionScreenshotPath(guide.screenshot, { isEn: language === 'en', isDark: false })}`,
        about: { '@id': softwareId(language) },
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'HamHome', item: siteUrl(localizedPath(language)) },
          { '@type': 'ListItem', position: 2, name: guide.title, item: url },
        ],
      },
    ],
  };
}

export function serializeJsonLd(data: JsonLdData): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
