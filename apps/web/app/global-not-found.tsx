import type { Metadata } from 'next';
import { NotFoundContent } from '@/app/components/NotFoundContent';
import { SiteDocument } from '@/app/components/SiteDocument';
import { SITE_ICONS } from '@/app/lib/seo';

// The two root layouts leave no shared layout for unmatched URLs, so this file renders the whole document.
export const metadata: Metadata = {
  title: '页面不存在 · Page not found | HamHome',
  icons: SITE_ICONS,
};

export default function GlobalNotFound() {
  return (
    <SiteDocument language="zh">
      <NotFoundContent />
    </SiteDocument>
  );
}
