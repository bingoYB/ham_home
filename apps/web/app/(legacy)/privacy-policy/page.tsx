import { PrivacyPolicyContent } from '@/app/components/PrivacyPolicyContent';
import { PRIVACY_POLICY_COPY } from '@/app/lib/privacy-policy';
import { createPageMetadata } from '@/app/lib/seo';

export const metadata = createPageMetadata('zh', { path: 'privacy-policy', ...PRIVACY_POLICY_COPY.zh });

export default function PrivacyPage() {
  return <PrivacyPolicyContent language="zh" />;
}
