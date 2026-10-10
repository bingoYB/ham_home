import { notFound } from 'next/navigation';
import { JsonLd } from '@/app/components/JsonLd';
import { LandingPage } from '@/app/components/LandingPage';
import { isSupportedLanguage } from '@/app/lib/site';
import { buildSoftwareApplicationJsonLd } from '@/app/lib/structured-data';

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  return <><JsonLd data={buildSoftwareApplicationJsonLd(lang)} /><LandingPage language={lang} /></>;
}
