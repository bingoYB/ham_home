'use client';

import * as React from 'react';
import Image from 'next/image';
import { Sun, Moon, Languages, Github, Download, ChevronDown, Package } from 'lucide-react';
import {
  Button,
  Switch,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hamhome/ui';
import chromeIcon from './icon/chrome.svg';
import edgeIcon from './icon/edge.svg';
import firefoxIcon from './icon/firefox.svg';

interface HeaderProps {
  isDark: boolean;
  isEn: boolean;
  onToggleTheme: (e?: React.MouseEvent) => void;
  onToggleLanguage: () => void;
}

// Browser detection
function detectBrowser(): 'chrome' | 'edge' | 'firefox' | 'other' {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent;
  if (ua.includes('Edg')) return 'edge';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Chrome')) return 'chrome';
  return 'other';
}

// Download channels config
const GITHUB_RELEASE_URL = 'https://github.com/bingoYB/ham_home/releases';

interface DownloadChannel {
  id: 'chrome' | 'edge' | 'firefox' | 'offline';
  label: { en: string; zh: string };
  icon: React.ReactNode;
  url: string | null; // null means not published
  published: boolean;
}

const getDownloadChannels = (): DownloadChannel[] => [
  {
    id: 'chrome',
    label: { en: 'Chrome Web Store', zh: 'Chrome 商店' },
    icon: <Image src={chromeIcon} alt="Chrome" width={16} height={16} />,
    url: null,
    published: false,
  },
  {
    id: 'edge',
    label: { en: 'Edge Add-ons', zh: 'Edge 扩展商店' },
    icon: <Image src={edgeIcon} alt="Edge" width={16} height={16} />,
    url: 'https://microsoftedge.microsoft.com/addons/detail/hamhome-smart-bookmark-/nmbdgbicgagmokdmohgngcbhkaicfnpi',
    published: true,
  },
  {
    id: 'firefox',
    label: { en: 'Firefox Add-ons', zh: 'Firefox 扩展商店' },
    icon: <Image src={firefoxIcon} alt="Firefox" width={16} height={16} />,
    url: null,
    published: false,
  },
  {
    id: 'offline',
    label: { en: 'Offline Package', zh: '离线安装包' },
    icon: <Package className="h-4 w-4" />,
    url: GITHUB_RELEASE_URL,
    published: true,
  },
];

function DownloadDropdown({ isEn }: { isEn: boolean }) {
  const channels = getDownloadChannels();
  const currentBrowser = detectBrowser();

  // Find recommended channel based on browser
  const recommendedChannel = channels.find(c => c.id === currentBrowser) || channels[0];

  const handleDownload = (channel: DownloadChannel) => {
    const url = channel.published && channel.url ? channel.url : GITHUB_RELEASE_URL;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          {isEn ? 'Download' : '下载'}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        {channels.map((channel) => {
          const isRecommended = channel.id === recommendedChannel.id;
          return (
            <DropdownMenuItem
              key={channel.id}
              onClick={() => handleDownload(channel)}
              className="flex items-center justify-between gap-2 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {channel.icon}
                <span>{isEn ? channel.label.en : channel.label.zh}</span>
              </div>
              <div className="flex items-center gap-1">
                {isRecommended && (
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {isEn ? 'Recommended' : '推荐'}
                  </span>
                )}
                {!channel.published && (
                  <span className="text-xs text-muted-foreground">
                    {isEn ? 'Coming Soon' : '待发布'}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ isDark, isEn, onToggleTheme, onToggleLanguage }: HeaderProps) {
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
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 mx-auto">
        {/* Logo + 品牌 */}
        <div className="flex items-center gap-3">
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon/128.png`}
            alt="HamHome Logo"
            width={40}
            height={40}
            className="rounded-lg"
          />
          <div>
            <h1 className="text-xl font-bold">HamHome</h1>
            <p className="text-xs text-muted-foreground">
              {isEn ? 'Smart Bookmark Assistant' : '智能书签助手'}
            </p>
          </div>
        </div>

        {/* 右侧操作 */}
        <div className="flex items-center gap-4">


          {/* 语言切换 */}
          <Button variant="ghost" size="sm" onClick={onToggleLanguage} className="gap-2">
            <Languages className="h-4 w-4" />
            {isEn ? '中文' : 'EN'}
          </Button>

          {/* 主题切换 */}
          <div
            ref={themeToggleRef}
            className="flex items-center gap-2"
            onPointerDown={handleThemeTogglePointerDown}
          >
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Switch checked={isDark} onCheckedChange={handleThemeToggle} />
            <Moon className="h-4 w-4 text-muted-foreground" />
          </div>

          {/* GitHub 入口 */}
          <Button variant="ghost" size="icon" asChild>
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
