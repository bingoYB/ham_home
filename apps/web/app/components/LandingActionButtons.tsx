'use client';

import { Download, Github } from 'lucide-react';
import { Button, cn } from '@hamhome/ui';
import { GITHUB_RELEASE_URL, openRecommendedDownload } from '@/app/lib/download';
import { REPOSITORY_URL } from '@/app/lib/site';
import { BrowserStoreLinks } from './BrowserStoreLinks';

interface LandingActionButtonsProps {
  isEn: boolean;
  className?: string;
  downloadLabel?: string;
  githubLabel?: string;
  /** Adds a soft pulsing halo to the primary download button (hero only) */
  pulse?: boolean;
}

export function LandingActionButtons({
  isEn,
  className,
  downloadLabel,
  githubLabel = 'GitHub',
  pulse = false,
}: LandingActionButtonsProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          asChild
          size="lg"
          className={cn('gap-2 bg-[#ff742f] text-white shadow-sm hover:bg-[#ff651f]', pulse && 'cta-pulse')}
        >
          <a
            href={GITHUB_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => {
              event.preventDefault();
              openRecommendedDownload();
            }}
          >
            <Download className="h-4 w-4" />
            {downloadLabel ?? (isEn ? 'Install & Download' : '下载安装')}
          </a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="secondary"
          className="gap-2 bg-[#2dd4bf] text-[#062722] shadow-sm hover:bg-[#22c9b4]"
        >
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            <Github className="h-4 w-4" />
            {githubLabel}
          </a>
        </Button>
      </div>
      <BrowserStoreLinks isEn={isEn} />
    </div>
  );
}
