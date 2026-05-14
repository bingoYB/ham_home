import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const CLARITY_PROJECT_ID = 'vg9k8vkmuz';

export const metadata: Metadata = {
  metadataBase: new URL('https://hamhome.app'),
  title: 'HamHome - AI 驱动的智能书签管理工具 | AI Bookmark Manager',
  description: '让收藏不再积灰。HamHome 是一款以隐私保护为核心、完全本地存储的智能浏览器扩展，支持一键收藏、AI 内容总结、语义检索、智能分类以及书签快捷导入导出。',
  keywords: [
    '书签管理', '浏览器扩展', 'AI', '收藏夹', 'bookmark manager', 'browser extension',
    '智能分类', '语义搜索', 'AI 标签', '本地存储', 'semantic search', 'tab manager'
  ],
  authors: [{ name: 'HamHome Team', url: 'https://github.com/bingoYB/ham_home' }],
  creator: 'HamHome',
  publisher: 'HamHome',
  applicationName: 'HamHome',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
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
    title: 'HamHome - AI 驱动的新一代智能书签助手',
    description: '让收藏不再积灰。支持一键收藏、AI 自动分类、语义检索。本地化存储保护隐私的浏览器扩展。',
    url: 'https://hamhome.app',
    siteName: 'HamHome',
    images: [
      {
        url: `${basePath}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'HamHome - 智能书签助手预览图',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HamHome - AI 驱动的新一代智能书签助手',
    description: '让收藏不再积灰。支持一键收藏、AI 自动分类、语义检索。本地化存储保护隐私的浏览器扩展。',
    images: [`${basePath}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased scroll-table-fix">
        {children}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
          `}
        </Script>
      </body>
    </html>
  );
}
