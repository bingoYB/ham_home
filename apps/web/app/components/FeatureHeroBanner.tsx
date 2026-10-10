"use client";

import Image from "next/image";
import { Button } from "@hamhome/ui";
import {
  Bot,
  Download,
  Github,
  Highlighter,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PRODUCT_COPY } from "@/app/lib/site";
import { GITHUB_RELEASE_URL, openRecommendedDownload } from "@/app/lib/download";
import { HeroScreenshotCarousel } from "./HeroScreenshotCarousel";

interface FeatureHeroBannerProps {
  isEn: boolean;
  isDark: boolean;
}

const GITHUB_REPO_URL = "https://github.com/bingoYB/ham_home";


export function FeatureHeroBanner({ isEn, isDark }: FeatureHeroBannerProps) {
  const texts = {
    brand: "HamHome",
    category: PRODUCT_COPY[isEn ? "en" : "zh"].category,
    title: PRODUCT_COPY[isEn ? "en" : "zh"].slogan,
    desc: PRODUCT_COPY[isEn ? "en" : "zh"].description,
    downloadButton: isEn ? "Install Extension" : "安装扩展",
    githubButton: "GitHub",
  };

  const highlights = [
    {
      label: isEn ? "Text and image clips" : "文字与图片剪藏",
      icon: <Highlighter className="h-4 w-4" />,
    },
    {
      label: isEn ? "Agent assistance" : "Agent 辅助管理与操作",
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
            {/* The h1 carries brand + category (matching the page title); the slogan stays a large paragraph. */}
            <h1>
              <span className="flex items-center gap-3 sm:gap-4">
                <Image
                  src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/icon/128.png`}
                  alt=""
                  width={56}
                  height={56}
                  className="h-11 w-11 shrink-0 rounded-xl shadow-sm sm:h-14 sm:w-14"
                />
                <span className="text-5xl font-black tracking-tight text-[#ff5b24]">{texts.brand}</span>
              </span>
              <span className="sr-only"> — </span>
              <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#ff5b24]/20 bg-[#ff5b24]/10 px-3 py-1.5 text-sm font-semibold text-[#d94a1a] dark:text-[#ff9b6f]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                {texts.category}
              </span>
            </h1>
            <p className="mt-5 max-w-full break-words [font-family:var(--font-display)] text-[2rem] font-semibold leading-[1.14] tracking-normal text-foreground sm:text-[2.75rem] lg:text-[3rem]">
              {texts.title}
            </p>
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
            <HeroScreenshotCarousel isEn={isEn} isDark={isDark} />
          </div>
        </div>
      </div>
    </section>
  );
}
