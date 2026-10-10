import { notFound } from 'next/navigation';
import { PrivacyPolicyContent } from '@/app/components/PrivacyPolicyContent';
import { PRIVACY_POLICY_COPY } from '@/app/lib/privacy-policy';
import { createPageMetadata } from '@/app/lib/seo';
import { isSupportedLanguage } from '@/app/lib/site';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  return createPageMetadata(lang, { path: 'privacy-policy', ...PRIVACY_POLICY_COPY[lang] });
}

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isSupportedLanguage(lang)) notFound();
  return <PrivacyPolicyContent language={lang} />;
}
