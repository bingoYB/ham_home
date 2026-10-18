import type { ReactNode } from 'react';
import Script from 'next/script';
import type { SupportedLanguage } from '@/app/lib/language';
import { REVEAL_GATE_SCRIPT } from '@/app/lib/reveal-gate';
import { LANGUAGE_TAGS } from '@/app/lib/site';
import '@/app/globals.css';

interface SiteDocumentProps {
  language: SupportedLanguage;
  children: ReactNode;
}

export function SiteDocument({ language, children }: SiteDocumentProps) {
  return (
    <html lang={LANGUAGE_TAGS[language]} suppressHydrationWarning>
      <head>
        {/* Scroll-reveal blocks start hidden only behind this gate, which falls back to visible if the app never hydrates */}
        <script dangerouslySetInnerHTML={{ __html: REVEAL_GATE_SCRIPT }} />
      </head>
      <body className="min-h-screen bg-background antialiased scroll-table-fix">
        {children}
        <Script id="microsoft-clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","vg9k8vkmuz");`}
        </Script>
      </body>
    </html>
  );
}
