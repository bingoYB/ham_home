import type { Metadata } from 'next';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export const metadata: Metadata = {
  metadataBase: new URL('https://hamhome.app'),
  title: 'HamHome - AI 驱动的智能书签管理工具',
  description: '让收藏不再积灰，一键收藏、AI 自动分类、隐私保护',
  keywords: ['书签管理', '浏览器扩展', 'AI', '收藏夹', 'bookmark manager', 'browser extension'],
  icons: {
    icon: [
      { url: `${basePath}/icon/16.png`, sizes: '16x16', type: 'image/png' },
      { url: `${basePath}/icon/32.png`, sizes: '32x32', type: 'image/png' },
      { url: `${basePath}/icon/48.png`, sizes: '48x48', type: 'image/png' },
      { url: `${basePath}/icon/128.png`, sizes: '128x128', type: 'image/png' },
    ],
    apple: `${basePath}/icon/128.png`,
  },
  openGraph: {
    title: 'HamHome - 智能书签助手',
    description: '让收藏不再积灰',
    images: [`${basePath}/og-image.png`],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HamHome - 智能书签助手',
    description: '让收藏不再积灰',
    images: [`${basePath}/og-image.png`],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        {children}
      </body>
    </html>
  );
}

