'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button, Carousel, CarouselContent, CarouselItem, type CarouselApi } from '@hamhome/ui';
import { Download, Github } from 'lucide-react';
import { GITHUB_RELEASE_URL, openRecommendedDownload } from '@/app/lib/download';

interface FeatureHeroBannerProps {
  isEn: boolean;
  isDark: boolean;
}

const GITHUB_REPO_URL = 'https://github.com/bingoYB/ham_home';

const LIGHT_PREVIEW_IMAGES = [
  'https://i.imgur.com/6HLC4TU.png',
  "https://i.imgur.com/0XprzqC.png",
  "https://i.imgur.com/EAEo29z.png"
];

const DARK_PREVIEW_IMAGES = [
  "https://i.imgur.com/gxtrYSp.png",
  "https://i.imgur.com/ev1qniV.png",
  "https://i.imgur.com/kskbeb1.png"
];

export function FeatureHeroBanner({ isEn, isDark }: FeatureHeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);
  
  const images = isDark ? DARK_PREVIEW_IMAGES : LIGHT_PREVIEW_IMAGES;

  useEffect(() => {
    if (!api) {
      return;
    }
    
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
    
    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  const texts = {
    brand: 'HamHome',
    title: isEn
      ? 'AI-Powered Browser Workspace'
      : 'AI 驱动的浏览器工作空间',
    desc: isEn
      ? 'Save and restore open tabs, auto-group active tabs, and organize bookmarks and collections with AI in one local-first workspace.'
      : '保存与恢复已打开的 Tab，自动分组已打开的tab，并用 AI 管理书签与收藏内容，全部汇聚在一个本地优先的工作空间中。',
    downloadButton: isEn ? 'Install & Download' : '下载安装',
    githubButton: 'GitHub',
  };

  return (
    <section>
      <div className="relative overflow-hidden bg-transparent py-10 sm:py-12">
        <div className="relative z-10 grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 sm:gap-4">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon/128.png`}
                alt="HamHome Logo"
                width={56}
                height={56}
                className="h-11 w-11 shrink-0 rounded-xl shadow-sm sm:h-14 sm:w-14"
              />
              <p className="text-5xl font-black tracking-tight text-[#ff5b24]">{texts.brand}</p>
            </div>
            <h1 className="mt-4 text-3xl font-bold leading-tight text-foreground sm:text-5xl">
              {texts.title}
            </h1>
            <p className="mt-5 text-lg text-muted-foreground sm:text-2xl">{texts.desc}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="gap-2 bg-[#ff7a32] text-white hover:bg-[#ff6b1c]">
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
                  {texts.downloadButton}
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="gap-2 border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" />
                  {texts.githubButton}
                </a>
              </Button>
            </div>
          </div>

          <div className="mx-auto w-full max-w-[560px]">
            <Carousel 
              opts={{ loop: true }}
              setApi={setApi} 
              className="w-full relative"
            >
              <CarouselContent>
                {images.map((img, idx) => (
                  <CarouselItem key={idx}>
                    <img
                      src={img}
                      alt={isEn ? `HamHome extension preview ${idx + 1}` : `HamHome 插件功能预览 ${idx + 1}`}
                      className="h-[360px] sm:h-[460px] lg:h-[520px] w-auto mx-auto rounded-3xl object-contain"
                      loading="lazy"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="mt-6 flex justify-center gap-2">
                {Array.from({ length: count }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => api?.scrollTo(index)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      current === index ? "bg-[#ff5b24] w-6" : "bg-muted-foreground/30 w-2.5 hover:bg-muted-foreground/50"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </Carousel>
          </div>
        </div>
      </div>
    </section>
  );
}
