import type { MetadataRoute } from 'next';
import { GUIDES } from './lib/guides';
import { PRIVACY_POLICY_UPDATED_AT } from './lib/privacy-policy';
import { CONTENT_UPDATED_AT, LANGUAGES, languageAlternates, localizedPath, siteUrl } from './lib/site';

export const dynamic = 'force-static';

const PAGES = [
  { path: '', lastModified: CONTENT_UPDATED_AT },
  { path: 'privacy-policy', lastModified: PRIVACY_POLICY_UPDATED_AT },
  ...GUIDES.map(({ slug }) => ({ path: `guides/${slug}`, lastModified: CONTENT_UPDATED_AT })),
];

export default function sitemap(): MetadataRoute.Sitemap {
  return LANGUAGES.flatMap((language) => PAGES.map(({ path, lastModified }) => ({
    url: siteUrl(localizedPath(language, path)),
    lastModified,
    alternates: { languages: languageAlternates(path) },
  })));
}
