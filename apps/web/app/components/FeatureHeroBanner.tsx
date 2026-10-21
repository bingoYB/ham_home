"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import {
  Brain,
  FolderInput,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { PRODUCT_COPY } from "@/app/lib/site";
import { HeroBackdrop } from "./HeroBackdrop";
import { HeroScreenshotCarousel } from "./HeroScreenshotCarousel";
import { LandingActionButtons } from "./LandingActionButtons";

interface FeatureHeroBannerProps {
  isEn: boolean;
  isDark: boolean;
}

/** Staggers the hero entrance animation through the --hero-delay variable */
const heroDelay = (ms: number): CSSProperties =>
  ({ "--hero-delay": `${ms}ms` }) as CSSProperties;

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
      label: isEn ? "AI categories, tags and summaries" : "AI 分类、标签与摘要",
      icon: <Brain className="h-4 w-4" />,
    },
    {
      label: isEn ? "Import and analyze old bookmarks" : "导入旧书签，批量分析",
      icon: <FolderInput className="h-4 w-4" />,
    },
    {
      label: isEn ? "Keyword and semantic search" : "关键词与语义搜索",
      icon: <Search className="h-4 w-4" />,
    },
    {
      label: isEn ? "Local storage, your AI provider" : "本地存储，自选 AI",
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    // overflow-x-clip: the slide-in animation must not widen the page; the glows live in HeroBackdrop
    <section className="relative isolate overflow-x-clip">
      <HeroBackdrop />
      <div className="container mx-auto px-4 py-8">
        <div className="grid min-w-0 items-center gap-10 py-10 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div className="min-w-0 max-w-2xl">
            {/* The h1 carries brand + category (matching the page title); the slogan stays a large paragraph. */}
            <h1 style={heroDelay(0)} className="hero-rise">
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
            <p style={heroDelay(120)} className="hero-rise mt-5 max-w-full break-keep break-words text-pretty [font-family:var(--font-display)] text-[2rem] font-semibold leading-[1.14] tracking-normal text-foreground sm:text-[2.75rem] lg:text-[3rem]">
              {texts.title}
            </p>
            <p style={heroDelay(210)} className="hero-rise mt-5 max-w-full break-words text-lg leading-relaxed text-foreground/75 sm:text-xl">
              {texts.desc}
            </p>

            <div style={heroDelay(300)} className="hero-rise">
              <LandingActionButtons isEn={isEn} pulse className="mt-8" downloadLabel={texts.downloadButton} />
            </div>
            <p style={heroDelay(380)} className="hero-rise mt-4 text-sm leading-relaxed text-foreground/70">
              {PRODUCT_COPY[isEn ? "en" : "zh"].setupNote}
            </p>

            <div style={heroDelay(450)} className="hero-rise mt-8 grid gap-3 sm:grid-cols-2">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="lift-card flex min-h-14 items-center gap-3 rounded-xl border border-border/70 bg-background/55 px-3 py-2 text-sm font-medium text-foreground shadow-sm backdrop-blur"
                >
                  <span className="lift-icon flex h-8 w-8 items-center justify-center rounded-lg bg-[#2dd4bf]/10 text-[#0f766e] dark:text-[#5eead4]">
                    {item.icon}
                  </span>
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="hero-slide-in mx-auto min-w-0 w-full max-w-[760px]">
            <div className="hero-float">
              <HeroScreenshotCarousel isEn={isEn} isDark={isDark} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
