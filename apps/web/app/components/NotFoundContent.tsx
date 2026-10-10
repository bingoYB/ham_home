'use client';

import Image from 'next/image';
import { Button } from '@hamhome/ui';
import { useSystemTheme } from '@/app/hooks/useSystemTheme';
import { localizedPath } from '@/app/lib/site';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function NotFoundContent() {
  useSystemTheme();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16 text-foreground">
      <div className="w-full max-w-lg text-center">
        <Image
          src={`${basePath}/icon/128.png`}
          alt="HamHome"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 rounded-2xl shadow-sm"
        />
        <p className="mt-6 text-sm font-semibold tracking-widest text-[#ff5b24]">404</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">页面不存在</h1>
        <p lang="en" className="mt-1 text-lg font-medium text-muted-foreground">Page not found</p>
        <p className="mt-5 leading-relaxed text-muted-foreground">
          链接可能已失效，或地址输入有误。
          <span lang="en" className="block">The link may be outdated, or the address may be mistyped.</span>
        </p>
        {/* Plain anchors: this page has its own document, and client-side navigation into another root layout keeps the 404 tree. */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="bg-[#ff7a32] text-white hover:bg-[#ff6b1c]">
            <a href={`${basePath}${localizedPath('zh')}`}>返回中文首页</a>
          </Button>
          <Button asChild size="lg" variant="secondary" className="border border-border">
            <a href={`${basePath}${localizedPath('en')}`} hrefLang="en" lang="en">Go to English home</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
