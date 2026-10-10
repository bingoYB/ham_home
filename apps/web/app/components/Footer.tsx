'use client';

import Link from 'next/link';
import { PRODUCT_COPY, localizedPath } from '@/app/lib/site';

interface FooterProps {
  isEn: boolean;
}

export function Footer({ isEn }: FooterProps) {
  const privacyLabel = isEn ? 'Privacy' : '隐私政策';

  return (
    <footer className="border-t border-border/70 py-8 text-sm text-muted-foreground ">
      <div className="container mx-auto flex w-full flex-col gap-4 px-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>HamHome - {PRODUCT_COPY[isEn ? 'en' : 'zh'].category}</p>
        <nav className="flex flex-wrap items-center gap-4">
          <span>Chrome</span>
          <span>Edge</span>
          <span>Firefox</span>
          <span>WebDAV</span>
          <span>Obsidian</span>
          <Link href={localizedPath(isEn ? 'en' : 'zh', 'privacy-policy')} className="transition-colors hover:text-foreground">
            {privacyLabel}
          </Link>
          <a
            href="https://github.com/bingoYB/ham_home"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-foreground"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
