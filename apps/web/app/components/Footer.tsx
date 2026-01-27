'use client';

interface FooterProps {
  isEn: boolean;
}

export function Footer({ isEn }: FooterProps) {
  return (
    <footer className="py-8 text-center text-sm text-muted-foreground border-t">
      <p>
        HamHome - {isEn ? "Don't let your bookmarks gather dust" : '让收藏不再积灰'} 🐹
      </p>
    </footer>
  );
}
