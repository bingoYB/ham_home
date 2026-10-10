import type { ReactNode } from 'react';
import Script from 'next/script';
import type { SupportedLanguage } from '@/app/lib/language';
import { LANGUAGE_TAGS } from '@/app/lib/site';
import '@/app/globals.css';

interface SiteDocumentProps {
  language: SupportedLanguage;
  children: ReactNode;
}

export function SiteDocument({ language, children }: SiteDocumentProps) {
  return (
    <html lang={LANGUAGE_TAGS[language]} suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased scroll-table-fix">
        {children}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vg9k8vkmuz");`}
        </Script>
      </body>
    </html>
  );
}
