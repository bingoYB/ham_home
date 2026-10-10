export const dynamic = 'force-static';
import { MetadataRoute } from 'next';
import { siteUrl } from './lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${siteUrl()}sitemap.xml`,
  };
}
