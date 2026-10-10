import { describe, expect, it } from 'vitest';
import { getGuide } from '../guides';
import { SITE_URL } from '../site';
import { buildGuideJsonLd, buildSoftwareApplicationJsonLd, serializeJsonLd } from '../structured-data';

describe('buildSoftwareApplicationJsonLd', () => {
  it('gives each language page its own node so url and description never conflict', () => {
    const zh = buildSoftwareApplicationJsonLd('zh');
    const en = buildSoftwareApplicationJsonLd('en');
    expect(zh['@id']).toBe(`${SITE_URL}/zh/#software`);
    expect(en['@id']).toBe(`${SITE_URL}/en/#software`);
    expect(zh.url).toBe(`${SITE_URL}/zh/`);
    expect(en.description).not.toBe(zh.description);
  });

  it('states the free price without inventing ratings', () => {
    const data = buildSoftwareApplicationJsonLd('en');
    expect(data.offers).toEqual({ '@type': 'Offer', price: '0', priceCurrency: 'USD' });
    expect(data).not.toHaveProperty('aggregateRating');
    expect(data).not.toHaveProperty('review');
  });
});

describe('buildGuideJsonLd', () => {
  const guide = getGuide('tab-workspaces', 'en');
  if (!guide) throw new Error('tab-workspaces guide is missing');
  const [article, breadcrumbs] = buildGuideJsonLd('en', guide)['@graph'] as Record<string, unknown>[];

  it('describes the guide as an article in the page language', () => {
    expect(article['@type']).toBe('TechArticle');
    expect(article.headline).toBe(guide.title);
    expect(article.inLanguage).toBe('en');
    expect(article.url).toBe(`${SITE_URL}/en/guides/tab-workspaces/`);
    expect(article.image).toBe(`${SITE_URL}/screenshots/extension/en-light/06-workspaces.png`);
    expect(article.about).toEqual({ '@id': `${SITE_URL}/en/#software` });
  });

  it('adds a breadcrumb from the localized home page to the guide', () => {
    expect(breadcrumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'HamHome', item: `${SITE_URL}/en/` },
      { '@type': 'ListItem', position: 2, name: guide.title, item: `${SITE_URL}/en/guides/tab-workspaces/` },
    ]);
  });
});

describe('serializeJsonLd', () => {
  it('escapes "<" so content cannot close the script tag', () => {
    expect(serializeJsonLd({ name: '</script>' })).toBe('{"name":"\\u003c/script>"}');
  });
});
