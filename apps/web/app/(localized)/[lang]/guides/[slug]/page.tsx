import { notFound } from 'next/navigation';
import { GuidePage } from '@/app/components/GuidePage';
import { JsonLd } from '@/app/components/JsonLd';
import { GUIDES, getGuide } from '@/app/lib/guides';
import { createPageMetadata } from '@/app/lib/seo';
import { isSupportedLanguage } from '@/app/lib/site';
import { buildGuideJsonLd } from '@/app/lib/structured-data';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  const guide = getGuide(slug, lang);
  if (!guide) notFound();
  return createPageMetadata(lang, { path: `guides/${slug}`, title: guide.title, description: guide.description, type: 'article' });
}

export default async function Guide({ params }: { params: Promise<{ lang: string; slug: string }> }) {
  const { lang, slug } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  const guide = getGuide(slug, lang);
  if (!guide) notFound();
  return <><JsonLd data={buildGuideJsonLd(lang, guide)} /><GuidePage language={lang} guide={guide} /></>;
}
