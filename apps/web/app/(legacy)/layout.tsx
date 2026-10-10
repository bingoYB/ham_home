import type { ReactNode } from 'react';
import { LegacyLanguageNotice } from '@/app/components/LegacyLanguageNotice';
import { SiteDocument } from '@/app/components/SiteDocument';
import { createPageMetadata } from '@/app/lib/seo';

export const metadata = createPageMetadata('zh');

export default function LegacyLayout({ children }: { children: ReactNode }) {
  return (
    <SiteDocument language="zh">
      <LegacyLanguageNotice />
      {children}
    </SiteDocument>
  );
}
