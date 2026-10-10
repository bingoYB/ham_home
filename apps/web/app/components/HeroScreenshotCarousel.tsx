'use client';

import { Carousel, CarouselContent, CarouselItem } from '@hamhome/ui';
import { useScreenshotCarousel } from '@/app/hooks/useScreenshotCarousel';
import { ExtensionScreenshotFrame } from './ExtensionScreenshotFrame';
import type { ExtensionScreenshotId } from './extensionScreenshots';

interface HeroScreenshotCarouselProps { isEn: boolean; isDark: boolean; }

const HERO_SCREENSHOTS: ExtensionScreenshotId[] = ['bookmarkLibrary', 'visualGallery', 'aiAgent', 'healthCenter', 'workspaces', 'tabGroups', 'importExportSync'];

export function HeroScreenshotCarousel({ isEn, isDark }: HeroScreenshotCarouselProps) {
  const { current, count, setApi, scrollTo } = useScreenshotCarousel();
  return (
    <Carousel opts={{ loop: true }} setApi={setApi} className="relative w-full min-w-0">
      <CarouselContent>
        {HERO_SCREENSHOTS.map((id, index) => (
          <CarouselItem key={id}>
            <ExtensionScreenshotFrame id={id} isEn={isEn} isDark={isDark} priority={index === 0} className="mx-auto max-w-[760px]" />
          </CarouselItem>
        ))}
      </CarouselContent>
      <div className="mt-6 flex justify-center gap-2">
        {Array.from({ length: count }, (_, index) => (
          <button key={index} onClick={() => scrollTo(index)}
            className={`h-2.5 rounded-full transition-all duration-300 ${current === index ? 'bg-[#ff5b24] w-6' : 'bg-muted-foreground/30 w-2.5 hover:bg-muted-foreground/50'}`}
            aria-label={isEn ? `Go to slide ${index + 1}` : `查看第 ${index + 1} 张截图`} />
        ))}
      </div>
    </Carousel>
  );
}
