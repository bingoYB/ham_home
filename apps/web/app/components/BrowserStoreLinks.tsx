import { getDownloadChannels } from '@/app/lib/download';

interface BrowserStoreLinksProps {
  isEn: boolean;
}

/** Keep every published store reachable in the initial HTML, without browser detection. */
export function BrowserStoreLinks({ isEn }: BrowserStoreLinksProps) {
  return (
    <nav aria-label={isEn ? 'Browser extension stores' : '浏览器扩展商店'} className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
      {getDownloadChannels().filter((channel) => channel.id !== 'offline' && channel.published && channel.url).map((channel) => (
        <a key={channel.id} href={channel.url!} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
          {channel.label[isEn ? 'en' : 'zh']}
        </a>
      ))}
    </nav>
  );
}
