import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HamHome - 智能书签管理',
  description: '🐹 让收藏不再积灰，AI 驱动的智能书签管理工具',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

