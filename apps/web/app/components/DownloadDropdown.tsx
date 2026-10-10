'use client';

import Image from 'next/image';
import { ChevronDown, Download, Package } from 'lucide-react';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@hamhome/ui';
import chromeIcon from './icon/chrome.svg';
import edgeIcon from './icon/edge.svg';
import firefoxIcon from './icon/firefox.svg';
import { getDownloadChannels, getRecommendedDownloadChannel, openDownloadUrl, resolveDownloadUrl, type DownloadChannel, type DownloadChannelId } from '@/app/lib/download';

function renderChannelIcon(channelId: DownloadChannelId) {
  switch (channelId) {
    case 'chrome':
      return <Image src={chromeIcon} alt="Chrome" width={16} height={16} />;
    case 'edge':
      return <Image src={edgeIcon} alt="Edge" width={16} height={16} />;
    case 'firefox':
      return <Image src={firefoxIcon} alt="Firefox" width={16} height={16} />;
    default:
      return <Package className="h-4 w-4" />;
  }
}

export function DownloadDropdown({ isEn }: { isEn: boolean }) {
  const channels = getDownloadChannels();
  const recommendedChannel = getRecommendedDownloadChannel(channels);

  const handleDownload = (channel: DownloadChannel) => {
    openDownloadUrl(resolveDownloadUrl(channel));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="default" size="sm" className="gap-1.5 px-2 sm:gap-2 sm:px-3">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">{isEn ? 'Download' : '下载'}</span>
          <ChevronDown className="hidden h-3 w-3 sm:block" />
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
                {renderChannelIcon(channel.id)}
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

