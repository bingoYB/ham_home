'use client';

import Link from 'next/link';

interface FooterProps {
  isEn: boolean;
}

export function Footer({ isEn }: FooterProps) {
  return (
    <footer className="border-t py-8 text-center text-sm text-muted-foreground">
      <div className="container mx-auto flex flex-col items-center gap-3 px-4">
        <p>
          HamHome - {isEn ? "Don't let your bookmarks gather dust" : '让收藏不再积灰'} 🐹
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/" className="transition-colors hover:text-foreground">
            {isEn ? 'Home' : '首页'}
          </Link>
          <Link href="/privacy-policy" className="transition-colors hover:text-foreground">
            {isEn ? 'Privacy Policy' : '隐私权政策'}
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
