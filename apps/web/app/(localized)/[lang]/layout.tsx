import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { SiteDocument } from '@/app/components/SiteDocument';
import { LANGUAGES, isSupportedLanguage } from '@/app/lib/site';
import { createPageMetadata } from '@/app/lib/seo';

export const dynamicParams = false;

export function generateStaticParams() {
  return LANGUAGES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  return createPageMetadata(lang);
}

export default async function LocalizedLayout({ children, params }: { children: ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  return <SiteDocument language={lang}>{children}</SiteDocument>;
}
