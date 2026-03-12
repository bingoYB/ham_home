import type { Metadata } from 'next';
import { PrivacyPolicyContent } from '../components/PrivacyPolicyContent';

export const metadata: Metadata = {
  title: 'HamHome 隐私权政策 | Privacy Policy',
  description:
    'HamHome 浏览器扩展隐私权政策，说明书签数据、本地存储、AI 服务和浏览器权限的使用方式。',
};

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyContent />;
}
