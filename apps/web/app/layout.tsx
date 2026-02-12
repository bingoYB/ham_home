import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
const CLARITY_PROJECT_ID = 'vg9k8vkmuz';

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
