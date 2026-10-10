'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { LANGUAGE_TAGS, PRODUCT_COPY } from '@/app/lib/site';
import { Sun, Moon, Languages, Github } from 'lucide-react';
import { Button, Switch } from '@hamhome/ui';
import { DownloadDropdown } from './DownloadDropdown';

interface HeaderProps {
  isDark: boolean;
  isEn: boolean;
  onToggleTheme: (e?: React.MouseEvent) => void;
  /** The current page in the other language, rendered as a crawlable link. */
  languageSwitchHref: string;
  onLanguageSwitch: () => void;
}


export function Header({ isDark, isEn, onToggleTheme, languageSwitchHref, onLanguageSwitch }: HeaderProps) {
  const switchLanguageTag = LANGUAGE_TAGS[isEn ? 'zh' : 'en'];

  // 用于存储主题切换区域的点击位置
  const themeToggleClickRef = React.useRef<{ x: number; y: number } | null>(null);
  const themeToggleRef = React.useRef<HTMLDivElement>(null);

  // 使用 onPointerDown 捕获点击位置（在 onCheckedChange 之前触发）
  const handleThemeTogglePointerDown = (e: React.PointerEvent) => {
    themeToggleClickRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleThemeToggle = () => {
    const clickPos = themeToggleClickRef.current;
    // 创建一个合成事件对象传递点击位置
    const syntheticEvent = {
      clientX: clickPos?.x ?? window.innerWidth / 2,
      clientY: clickPos?.y ?? window.innerHeight / 2,
    } as React.MouseEvent;
    onToggleTheme(syntheticEvent);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
        {/* Logo + 品牌 */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon/128.png`}
            alt="HamHome Logo"
            width={40}
            height={40}
            className="h-9 w-9 shrink-0 rounded-lg sm:h-10 sm:w-10"
          />
          <div className="min-w-0">
            <span className="block truncate text-lg font-bold sm:text-xl">HamHome</span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {PRODUCT_COPY[isEn ? 'en' : 'zh'].category}
            </span>
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-4">


          {/* 语言切换 */}
          <Button asChild variant="ghost" size="sm" className="gap-1 px-2 sm:gap-2 sm:px-3">
            <Link href={languageSwitchHref} hrefLang={switchLanguageTag} lang={switchLanguageTag} prefetch={false} onClick={onLanguageSwitch}>
              <Languages className="h-4 w-4" aria-hidden="true" />
              {isEn ? '中文' : 'EN'}
            </Link>
          </Button>

          {/* 主题切换 */}
          <div
            ref={themeToggleRef}
            className="flex items-center gap-1 sm:gap-2"
            onPointerDown={handleThemeTogglePointerDown}
          >
            <Sun className="hidden h-4 w-4 text-muted-foreground sm:block" />
            <Switch checked={isDark} onCheckedChange={handleThemeToggle} />
            <Moon className="hidden h-4 w-4 text-muted-foreground sm:block" />
          </div>

          {/* GitHub 入口 */}
          <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex">
            <a
              href="https://github.com/bingoYB/ham_home"
              target="_blank"
              rel="noopener noreferrer"
              title="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </Button>

          {/* 下载入口 */}
          <DownloadDropdown isEn={isEn} />


        </div>
      </div>
    </header>
  );
}
