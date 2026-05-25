'use client';

import { Download, Github } from 'lucide-react';
import { Button, cn } from '@hamhome/ui';
import { GITHUB_RELEASE_URL, openRecommendedDownload } from '@/app/lib/download';

interface LandingActionButtonsProps {
  isEn: boolean;
  className?: string;
  downloadLabel?: string;
  githubLabel?: string;
}

const GITHUB_REPO_URL = 'https://github.com/bingoYB/ham_home';

export function LandingActionButtons({
  isEn,
  className,
  downloadLabel,
  githubLabel = 'GitHub',
}: LandingActionButtonsProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <Button
        asChild
        size="lg"
        className="gap-2 bg-[#ff742f] text-white shadow-sm hover:bg-[#ff651f]"
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
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
          <Github className="h-4 w-4" />
          {githubLabel}
        </a>
      </Button>
    </div>
  );
}
