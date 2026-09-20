/**
 * 图片剪藏的分析提示词。
 * 分析主体是图片本身：图片随消息以多模态附件形式发送给模型，
 * 来源页信息只作为辅助上下文，不能喧宾夺主。
 */
import { z } from "zod";
import type { JsonSchema } from "@hamhome/agent";
import type { LocalCategory } from "@/types";
import {
  buildCategoryContext,
  joinPromptLines,
  truncate,
  type PromptLanguage,
} from "./shared";

export const clipImageResultSchema = z.object({
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  colors: z
    .array(z.string().regex(/^#[0-9A-Fa-f]{6}$/))
    .min(1)
    .max(8),
});

export type ClipImageOutput = z.infer<typeof clipImageResultSchema>;

export const clipImageOutputSchema: JsonSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    category: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
    colors: {
      type: "array",
      description:
        "1 to 8 dominant image colors ordered by visual prominence, each as #RRGGBB.",
      items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
      minItems: 1,
      maxItems: 8,
    },
  },
  required: ["title", "summary", "category", "tags", "colors"],
  additionalProperties: false,
};

export function buildClipImageSystemPrompt(language: PromptLanguage): string {
  return language === "zh"
    ? [
        "你是 HamHome 的图片剪藏分析 Agent。用户保存的主体是这张图片本身，不是它所在的网页。",
        "你必须先看图，再根据画面内容归纳。图片中的文字（截图、海报、图表）要读出来并纳入判断。",
        "分类与标签必须描述这张图片是什么、能用来做什么，禁止直接套用来源页的主题。",
        "提取画面中 1-8 个有代表性的主色，按视觉占比从高到低排列；忽略细小水印、边框和偶发高光，只输出 #RRGGBB。",
        "只描述画面中真实存在的内容，看不清的部分不要猜测。若已有分类可匹配，优先复用已有分类名称。",
      ].join("\n")
    : [
        "You are HamHome's image clip analysis agent. The saved subject is the image itself, not the page it came from.",
        "Look at the image first, then describe what it actually shows. Read any text in the image (screenshots, posters, charts) and use it.",
        "Category and tags must describe what this image is and what it is useful for; never simply reuse the source page topic.",
        "Extract 1-8 representative colors ordered by visual prominence. Ignore tiny watermarks, borders, and incidental highlights; return only #RRGGBB values.",
        "Only describe what is really visible; do not guess. Prefer existing category names when one fits.",
      ].join("\n");
}

export interface ClipImagePromptInput {
  language: PromptLanguage;
  imageUrl: string;
  imageAlt?: string;
  imageTitle?: string;
  caption?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceExcerpt?: string;
  userCategories?: LocalCategory[];
  existingTags?: string[];
  presetTags?: string[];
}

export function buildClipImagePrompt(input: ClipImagePromptInput): string {
  const { language } = input;

  return joinPromptLines([
    `language: ${language}`,
    `imageUrl: ${input.imageUrl}`,
    // alt / title / figcaption 往往是作者对图片的权威描述，与图片一并提供
    input.imageAlt && `imageAlt: ${truncate(input.imageAlt, 300)}`,
    input.imageTitle && `imageTitle: ${truncate(input.imageTitle, 300)}`,
    input.caption && `imageCaption: ${truncate(input.caption, 500)}`,
    // 来源页仅作背景参考，因此只给标题与短摘要
    input.sourceUrl && `sourcePageUrl: ${input.sourceUrl}`,
    input.sourceTitle && `sourcePageTitle: ${truncate(input.sourceTitle, 200)}`,
    input.sourceExcerpt &&
      `sourcePageExcerpt: ${truncate(input.sourceExcerpt, 300)}`,
    `existingTags: ${JSON.stringify(input.existingTags || [])}`,
    `existingCategories: ${JSON.stringify(buildCategoryContext(input.userCategories))}`,
    `presetTags: ${JSON.stringify(input.presetTags || [])}`,
    language === "zh"
      ? "输出要求：title 为这张图片的简短描述（不超过 30 字，用作书签标题，不要用来源页标题），summary 为 1-3 句画面描述（含图中关键文字），category 为最适合这张图片的分类，tags 为描述图片内容、风格或用途的简短标签，colors 为按画面占比从高到低排列的 1-8 个主色（必须为 #RRGGBB）。"
      : "Output requirements: title is a short description of the image (under 30 characters, used as the bookmark title, never the source page title); summary is a 1-3 sentence description of what the image shows, including key text in it; category is the best fit for this image; tags are short labels describing its content, style or purpose; colors contains 1-8 dominant colors ordered by visual prominence, strictly as #RRGGBB.",
  ]);
}
