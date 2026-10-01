"use client";

import { PanelLeftOpen } from "lucide-react";
import { FeatureSection } from "./FeatureSection";
import { ExtensionScreenshotFrame } from "./ExtensionScreenshotFrame";
import {
  EXTENSION_SCREENSHOTS,
  type ExtensionScreenshotId,
} from "./extensionScreenshots";
import { getShowcaseFeatures } from "./showcaseFeatures";

interface FeatureShowcaseProps {
  isEn: boolean;
  isDark: boolean;
}

/**
 * A popup-shaped screenshot next to a desktop one gets a narrow column;
 * two desktop screenshots share the row equally.
 */
function getScreenshotGridClass(ids: ExtensionScreenshotId[]): string {
  if (ids.length === 1) return "grid gap-4";
  return EXTENSION_SCREENSHOTS[ids[0]].aspect === "popup"
    ? "grid gap-4 md:grid-cols-[0.42fr_1fr]"
    : "grid gap-4 md:grid-cols-2";
}

export function FeatureShowcase({ isEn, isDark }: FeatureShowcaseProps) {
  const features = getShowcaseFeatures(isEn);

  return (
    <div className="feature-showcase">
      {features.map((feature, index) => (
        <FeatureSection
          key={feature.id}
          id={feature.id}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
          alternate={index % 2 === 1}
        >
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] lg:items-start">
            <div className={getScreenshotGridClass(feature.screenshotIds)}>
              {feature.screenshotIds.map((id, screenshotIndex) => (
                <ExtensionScreenshotFrame
                  key={id}
                  id={id}
                  isEn={isEn}
                  isDark={isDark}
                  priority={index === 0 && screenshotIndex === 0}
                  className={feature.screenshotIds.length === 1 ? "w-full" : undefined}
                />
              ))}
            </div>

            <aside className="rounded-2xl border border-border/70 bg-background/65 p-5 shadow-sm backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-sm font-bold text-[#0f766e] dark:text-[#5eead4]">
                <PanelLeftOpen className="h-4 w-4" />
                {isEn ? "What this reflects in the extension" : "对应插件真实能力"}
              </div>
              <ul className="space-y-3">
                {feature.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff5b24]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </FeatureSection>
      ))}
    </div>
  );
}
