"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@hamhome/ui";
import {
  Bot,
  Download,
  Github,
  Highlighter,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { GITHUB_RELEASE_URL, openRecommendedDownload } from "@/app/lib/download";
import { ExtensionScreenshotFrame } from "./ExtensionScreenshotFrame";
import type { ExtensionScreenshotId } from "./extensionScreenshots";

interface FeatureHeroBannerProps {
  isEn: boolean;
  isDark: boolean;
}

const GITHUB_REPO_URL = "https://github.com/bingoYB/ham_home";

const HERO_SCREENSHOTS: ExtensionScreenshotId[] = [
  "bookmarkLibrary",
  "visualGallery",
  "aiAgent",
  "healthCenter",
  "workspaces",
  "tabGroups",
  "importExportSync",
];

export function FeatureHeroBanner({ isEn, isDark }: FeatureHeroBannerProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }
    
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on("select", onSelect);
    
    const interval = setInterval(() => {
      api.scrollNext();
    }, 4000);

    return () => clearInterval(interval);
  }, [api]);

  const texts = {
    brand: "HamHome",
    eyebrow: isEn ? "AI browser workspace" : "AI 浏览器工作台",
    title: isEn
      ? "Save pages. Restore sessions. Agent handles the rest."
      : "网页收藏、会话恢复，Agent 帮你打理。",
    desc: isEn
      ? "HamHome brings bookmarks, text and image clips, page snapshots and screenshots, restorable workspaces, and Tab Group rules into one extension, with an Agent that operates it for you."
      : "HamHome 将书签、文字与图片剪藏、网页快照与截图、可恢复工作空间和原生 Tab 分组规则整合进一个扩展，并由 Agent 替你代办插件操作。",
    downloadButton: isEn ? "Install Extension" : "安装扩展",
    githubButton: "GitHub",
  };

  const highlights = [
    {
      label: isEn ? "Text and image clips" : "文字与图片剪藏",
      icon: <Highlighter className="h-4 w-4" />,
    },
    {
      label: isEn ? "Agent-guided controls" : "Agent 帮你用插件",
      icon: <Bot className="h-4 w-4" />,
    },
    {
      label: isEn ? "Workspaces and Tab Groups" : "工作空间与 Tab 分组",
      icon: <Layers3 className="h-4 w-4" />,
    },
    {
      label: isEn ? "Privacy boundaries" : "隐私边界可控",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <section>
      <div className="relative overflow-hidden bg-transparent py-10 sm:py-14 lg:py-16">
        <div className="relative z-10 grid min-w-0 items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="min-w-0 max-w-2xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#ff5b24]/20 bg-[#ff5b24]/10 px-3 py-1.5 text-sm font-semibold text-[#d94a1a] dark:text-[#ff9b6f]">
              <Sparkles className="h-4 w-4" />
              {texts.eyebrow}
            </div>
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
            <h1 className="mt-5 max-w-full break-words [font-family:var(--font-display)] text-[2rem] font-semibold leading-[1.14] tracking-normal text-foreground sm:text-[2.75rem] lg:text-[3rem]">
              {texts.title}
            </h1>
            <p className="mt-5 max-w-full break-words text-lg leading-relaxed text-muted-foreground sm:text-xl">
              {texts.desc}
            </p>

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

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-background/55 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2dd4bf]/10 text-[#0f766e] dark:text-[#5eead4]">
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="mx-auto min-w-0 w-full max-w-[760px]">
            <Carousel 
              opts={{ loop: true }}
              setApi={setApi} 
              className="relative w-full min-w-0"
            >
              <CarouselContent>
                {HERO_SCREENSHOTS.map((id, idx) => (
                  <CarouselItem key={id}>
                    <ExtensionScreenshotFrame
                      id={id}
                      isEn={isEn}
                      isDark={isDark}
                      priority={idx === 0}
                      className="mx-auto max-w-[760px]"
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
