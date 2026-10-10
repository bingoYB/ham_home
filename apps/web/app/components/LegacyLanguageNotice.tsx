'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import { useLegacyLanguageNotice } from '@/app/hooks/useLegacyLanguageNotice';

export function LegacyLanguageNotice() {
  const { isVisible, englishHref, chooseEnglish, dismiss } = useLegacyLanguageNotice();
  if (!isVisible) return null;

  return (
    <div lang="en" className="border-b border-border/70 bg-muted/60 text-sm">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2">
        <p className="text-muted-foreground">
          This page is in Chinese.{' '}
          <Link href={englishHref} hrefLang="en" onClick={chooseEnglish} className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
            View the English version
          </Link>
        </p>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
