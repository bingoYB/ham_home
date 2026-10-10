import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('../out/', import.meta.url));
const origin = (process.env.NEXT_PUBLIC_SITE_URL || 'https://bingoyb.github.io/ham_home').replace(/\/+$/, '');
const basePath = new URL(origin).pathname.replace(/\/$/, '');
const slugs = ['ai-collections', 'semantic-search', 'tab-workspaces', 'privacy-sync'];
const categories = { zh: 'AI 网页收藏与标签页管理', en: 'AI Web Clipper & Tab Manager' };
const readPage = (path) => readFileSync(resolve(output, path, 'index.html'), 'utf8');
const decode = (text) => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
const attribute = (tag, key) => {
  const value = tag.match(new RegExp(`\\b${key}="([^"]*)"`))?.[1];
  return value === undefined ? undefined : decode(value);
};
const metaContent = (html, key, name) => attribute([...html.matchAll(/<meta[^>]*>/g)].map((match) => match[0]).find((tag) => attribute(tag, key) === name) || '', 'content');
const jsonLd = (html) => JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] || '{}');
// Resolve an absolute site URL to the exported file it should be served from.
const exportedFile = (url) => resolve(output, `.${decodeURIComponent(new URL(url).pathname.slice(basePath.length))}`);
// Resolve a base-path URL emitted in HTML (link, image or icon) to its exported file.
const localTarget = (url) => {
  const localPath = url.slice(basePath.length).split(/[?#]/)[0];
  return resolve(output, `.${decodeURIComponent(localPath.endsWith('/') ? `${localPath}index.html` : localPath)}`);
};

function checkIcons(html, path) {
  const icons = [...html.matchAll(/<link[^>]*rel="(?:icon|apple-touch-icon)"[^>]*>/g)].map((match) => attribute(match[0], 'href'));
  for (const size of ['16x16', '32x32', '48x48', '128x128']) assert.ok(html.includes(`sizes="${size}"`), `icon ${size}: ${path}`);
  assert.ok(html.includes('rel="apple-touch-icon"'), `apple touch icon: ${path}`);
  for (const href of icons) assert.ok(href?.startsWith(`${basePath}/`) && existsSync(localTarget(href)), `missing icon: ${path} → ${href}`);
}

function checkPage(path, language, canonicalPath = path) {
  const html = readPage(path);
  assert.match(html, new RegExp(`<html[^>]*lang="${language === 'zh' ? 'zh-CN' : 'en'}"`), `HTML language: ${path}`);
  const canonicalTag = html.match(/<link[^>]*rel="canonical"[^>]*>/)?.[0];
  assert.equal(attribute(canonicalTag || '', 'href'), `${origin}/${canonicalPath}/`, `canonical: ${path}`);
  const suffix = canonicalPath.replace(/^(zh|en)\/?/, '');
  // x-default must point at a canonical page (the Chinese one), never at a legacy duplicate.
  for (const [locale, targetLanguage] of [['zh-CN', 'zh'], ['en', 'en'], ['x-default', 'zh']]) {
    const tag = [...html.matchAll(/<link[^>]*rel="alternate"[^>]*>/g)].map((match) => match[0]).find((item) => attribute(item, 'hrefLang') === locale || attribute(item, 'hreflang') === locale);
    assert.equal(attribute(tag || '', 'href'), `${origin}/${targetLanguage}/${suffix}${suffix ? '/' : ''}`, `alternate ${locale}: ${path}`);
  }
  // The header language switch must be a real link, so the other version is reachable without JavaScript.
  const alternateLanguage = language === 'zh' ? 'en' : 'zh';
  const switchLink = [...html.matchAll(/<a\b[^>]*>/g)].map((match) => match[0]).find((tag) => (attribute(tag, 'hrefLang') ?? attribute(tag, 'hreflang')) === (alternateLanguage === 'zh' ? 'zh-CN' : 'en'));
  assert.equal(attribute(switchLink || '', 'href'), `${basePath}/${alternateLanguage}/${suffix}${suffix ? '/' : ''}`, `crawlable language link: ${path}`);
  assert.equal((html.match(/<h1\b/g) || []).length, 1, `single h1: ${path}`);
  assert.equal(metaContent(html, 'property', 'og:url'), `${origin}/${canonicalPath}/`, `OG URL: ${path}`);
  // The social preview image must ship with the export and match its declared size (PNG header: width/height at bytes 16-23).
  const ogImage = exportedFile(metaContent(html, 'property', 'og:image') || origin);
  assert.ok(existsSync(ogImage), `OG image: ${path}`);
  const png = readFileSync(ogImage);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [Number(metaContent(html, 'property', 'og:image:width')), Number(metaContent(html, 'property', 'og:image:height'))], `OG image size: ${path}`);
  assert.ok(!html.includes('https://hamhome.app'), `obsolete domain: ${path}`);
  // Verify links and image sources emitted for the deployed base path, rather than source strings.
  for (const match of html.matchAll(/<(?:a|img)\b[^>]*>/g)) {
    const url = attribute(match[0], 'href') || attribute(match[0], 'src');
    if (!url?.startsWith(`${basePath}/`)) continue;
    assert.ok(existsSync(localTarget(url)), `missing local link/asset: ${path} → ${url}`);
  }
  checkIcons(html, path);
  return html;
}

for (const language of ['zh', 'en']) {
  const html = checkPage(language, language);
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1] || '';
  for (const category of ['general', 'privacy', 'ai', 'sync']) assert.ok(main.includes(`id="faq-${category}"`), `static FAQ category: ${language}/${category}`);
  assert.ok((main.match(/<details\b/g) || []).length >= 19, `all FAQ answers must exist without JavaScript: ${language}`);
  const firstQuestion = decode(main.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1] || '');
  assert.equal(firstQuestion, language === 'zh' ? '什么是 HamHome？' : 'What is HamHome?', `FAQ opens with the product definition: ${language}`);
  const h1 = decode(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1].replace(/<[^>]+>/g, '') || '');
  assert.ok(h1.includes('HamHome') && h1.includes(categories[language]), `h1 names the brand and category: ${language}`);
  assert.ok(main.includes(language === 'zh' ? '让收藏有序，让标签页井然' : 'Keep your collections organized and your tabs tidy'));

  const data = jsonLd(html);
  assert.equal(data['@type'], 'SoftwareApplication');
  assert.equal(data['@id'], `${origin}/${language}/#software`, `per-language software node: ${language}`);
  assert.equal(data.url, `${origin}/${language}/`);
  assert.equal(data.offers?.price, '0', `free offer: ${language}`);
  assert.ok(data.sameAs.includes('https://github.com/bingoYB/ham_home'));
  assert.ok(!('aggregateRating' in data) && !('review' in data), 'do not invent ratings or reviews');

  for (const slug of slugs) {
    const guide = checkPage(`${language}/guides/${slug}`, language);
    assert.equal(metaContent(guide, 'property', 'og:type'), 'article', `guide OG type: ${language}/${slug}`);
    const graph = jsonLd(guide)['@graph'] || [];
    const article = graph.find((node) => node['@type'] === 'TechArticle');
    assert.equal(article?.url, `${origin}/${language}/guides/${slug}/`, `guide article: ${language}/${slug}`);
    assert.equal(article.inLanguage, language === 'zh' ? 'zh-CN' : 'en', `guide article language: ${language}/${slug}`);
    assert.ok(existsSync(exportedFile(article.image)), `guide article image: ${article.image}`);
    assert.ok(graph.some((node) => node['@type'] === 'BreadcrumbList'), `guide breadcrumb: ${language}/${slug}`);
  }

  const privacyDescription = metaContent(checkPage(`${language}/privacy-policy`, language), 'name', 'description');
  assert.ok(privacyDescription && privacyDescription !== metaContent(html, 'name', 'description'), `privacy page has its own description: ${language}`);
}
checkPage('', 'zh', 'zh');
const legacyPrivacy = checkPage('privacy-policy', 'zh', 'zh/privacy-policy');
assert.equal(metaContent(legacyPrivacy, 'name', 'description'), metaContent(readPage('zh/privacy-policy'), 'name', 'description'), 'legacy privacy description');
// Unmatched URLs on GitHub Pages are served this file, so it needs the site document, styles and a way home.
const notFound = readFileSync(resolve(output, '404.html'), 'utf8');
assert.match(notFound, /<html[^>]*lang="zh-CN"/, '404 language');
assert.match(notFound, /<link[^>]*rel="stylesheet"[^>]*>/, '404 styles');
assert.match(notFound, /<meta name="robots" content="noindex/, '404 noindex');
assert.equal((notFound.match(/<h1\b/g) || []).length, 1, '404 single h1');
for (const language of ['zh', 'en']) assert.ok(notFound.includes(`href="${basePath}/${language}/"`), `404 links to the ${language} home`);
checkIcons(notFound, '404.html');
const sitemap = readFileSync(resolve(output, 'sitemap.xml'), 'utf8');
assert.equal((sitemap.match(/<loc>/g) || []).length, 12);
assert.equal((sitemap.match(/hreflang="x-default"/g) || []).length, 12, 'sitemap x-default alternates');
assert.ok(!sitemap.includes('hamhome.app'));
assert.ok(readFileSync(resolve(output, 'robots.txt'), 'utf8').includes(`Sitemap: ${origin}/sitemap.xml`));
console.log('Verified 14 static pages and 404.html: languages, canonical/alternates incl. x-default, crawlable language links, OG (incl. image file and size), h1, FAQ order and completeness, JSON-LD (software + guide articles), privacy descriptions, icons, links/assets, sitemap and robots.');
