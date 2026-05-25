import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const CLARITY_PROJECT_ID = 'vg9k8vkmuz';

export const metadata: Metadata = {
  metadataBase: new URL('https://hamhome.app'),
  title: 'HamHome - AI 驱动的浏览器工作空间 | Browser Workspace',
  description: 'HamHome 是一款本地优先的浏览器工作空间，支持保存和恢复已打开的 Tab、自动分组，并通过 AI 管理书签与收藏内容。',
  keywords: [
    '浏览器工作空间', '书签管理', 'Tab 管理', 'Tab 自动分组', '收藏管理', '浏览器扩展', 'AI',
    'browser workspace', 'bookmark manager', 'tab manager', 'tab grouping', 'collections',
    '智能分类', '语义搜索', 'AI 标签', '本地存储', 'semantic search'
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
    title: 'HamHome - AI 驱动的浏览器工作空间',
    description: '保存和恢复已打开的 Tab，自动完成 Tab 分组，并用 AI 管理书签与收藏内容。',
    url: 'https://hamhome.app',
    siteName: 'HamHome',
    images: [
      {
        url: `${basePath}/og-image.png`,
        width: 1200,
        height: 630,
        alt: 'HamHome - 浏览器工作空间预览图',
      },
    ],
    locale: 'zh_CN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HamHome - AI 驱动的浏览器工作空间',
    description: '保存和恢复已打开的 Tab，自动完成 Tab 分组，并用 AI 管理书签与收藏内容。',
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
