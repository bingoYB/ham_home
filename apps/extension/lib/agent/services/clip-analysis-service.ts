/**
 * 剪藏分析服务。
 *
 * 与整页书签分析（bookmark-analysis-service）完全分离：
 * - 图片剪藏：图片本体作为多模态附件发给模型，模型不支持视觉时直接报错，不做文本降级
 * - 文字剪藏：以选中片段为分析主体，只产出分类与标签
 */
import type { AgentContentPart } from "@hamhome/agent";
import type { AnalysisResult, LocalCategory, SaveFlowClipContext } from "@/types";
import {
  buildClipHighlightPrompt,
  buildClipHighlightSystemPrompt,
  buildClipImagePrompt,
  buildClipImageSystemPrompt,
  clipHighlightOutputSchema,
  clipHighlightResultSchema,
  clipImageOutputSchema,
  clipImageResultSchema,
  type ClipHighlightOutput,
  type ClipImageOutput,
} from "../prompts";
import {
  ClipAnalysisError,
  isVisionUnsupportedError,
} from "../clip-analysis-errors";
import { getAgentErrorMessage } from "../errors";
import { fetchClipImageForAI } from "../fetch-clip-image";
import { assertAgentConfigured, resolveAgentConfig } from "../factory";
import { runExtensionCommand } from "../command-runner";

/** 来源页信息只作为背景上下文提供给模型 */
export interface ClipSourceContext {
  url?: string;
  title?: string;
  excerpt?: string;
}

export interface ClipAnalysisInput {
  clip: SaveFlowClipContext;
  source?: ClipSourceContext;
  userCategories?: LocalCategory[];
  existingTags?: string[];
}

function dedupeTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
}

function normalizeColors(colors: string[]): string[] {
  return [...new Set(colors.map((color) => color.toUpperCase()))].slice(0, 8);
}

class ClipAnalysisService {
  /**
   * 图片剪藏分析：标题与摘要都来自模型对图片本身的描述。
   */
  async analyzeImageClip(input: ClipAnalysisInput): Promise<AnalysisResult> {
    const imageUrl = input.clip.imageSourceUrl;
    if (!imageUrl) {
      throw new ClipAnalysisError("CLIP_IMAGE_FETCH_FAILED");
    }

    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    const attachment = await fetchClipImageForAI(imageUrl);
    const attachments: AgentContentPart[] = [
      { type: "image", image: attachment.image, mediaType: attachment.mediaType },
    ];

    try {
      const result = await runExtensionCommand<Record<string, never>, ClipImageOutput>({
        config,
        temperature: config.temperature ?? 0.2,
        maxIterations: 1,
        systemPrompt: buildClipImageSystemPrompt(config.language),
        command: {
          name: "analyzeImageClip",
          description: "Analyze a clipped image and return bookmark metadata.",
          outputSchema: clipImageOutputSchema,
          attachments,
          prompt: buildClipImagePrompt({
            language: config.language,
            imageUrl,
            imageAlt: input.clip.imageAlt,
            imageTitle: input.clip.imageTitle,
            caption: input.clip.caption,
            sourceUrl: input.clip.sourceUrl ?? input.source?.url,
            sourceTitle: input.clip.sourceTitle ?? input.source?.title,
            sourceExcerpt: input.source?.excerpt,
            userCategories: input.userCategories,
            existingTags: input.existingTags,
            presetTags: config.rawConfig.presetTags,
          }),
        },
        input: {},
      });

      const output = clipImageResultSchema.parse(result.output);

      return {
        title: output.title.trim(),
        summary: output.summary.trim(),
        category: output.category.trim(),
        tags: dedupeTags(output.tags),
        imageMetadata: {
          ...attachment.metadata,
          colors: normalizeColors(output.colors),
        },
      };
    } catch (error) {
      // 不做文本降级：模型不支持图片输入时给出明确提示，让用户去换模型
      if (isVisionUnsupportedError(error)) {
        throw new ClipAnalysisError("CLIP_IMAGE_VISION_UNSUPPORTED", {
          cause: error,
        });
      }
      throw new Error(getAgentErrorMessage(error, "图片剪藏分析失败"));
    }
  }

  /**
   * 文字剪藏分析：面板上没有标题与摘要输入，因此只产出分类与标签。
   */
  async analyzeHighlightClip(input: ClipAnalysisInput): Promise<AnalysisResult> {
    const selectedText = input.clip.text?.trim();
    if (!selectedText) {
      throw new Error("选中内容为空，无法分析");
    }

    const config = await resolveAgentConfig();
    assertAgentConfigured(config.rawConfig);

    try {
      const result = await runExtensionCommand<Record<string, never>, ClipHighlightOutput>({
        config,
        temperature: config.temperature ?? 0.2,
        maxIterations: 1,
        systemPrompt: buildClipHighlightSystemPrompt(config.language),
        command: {
          name: "analyzeHighlightClip",
          description: "Analyze a highlighted passage and return its category and tags.",
          outputSchema: clipHighlightOutputSchema,
          prompt: buildClipHighlightPrompt({
            language: config.language,
            selectedText,
            contextBefore: input.clip.selector?.prefix,
            contextAfter: input.clip.selector?.suffix,
            sourceUrl: input.clip.sourceUrl ?? input.source?.url,
            sourceTitle: input.clip.sourceTitle ?? input.source?.title,
            sourceExcerpt: input.source?.excerpt,
            userCategories: input.userCategories,
            existingTags: input.existingTags,
            presetTags: config.rawConfig.presetTags,
          }),
        },
        input: {},
      });

      const output = clipHighlightResultSchema.parse(result.output);

      return {
        // 文字剪藏的标题与摘要由保存面板按选中内容生成，AI 不参与
        title: "",
        summary: "",
        category: output.category.trim(),
        tags: dedupeTags(output.tags),
      };
    } catch (error) {
      throw new Error(getAgentErrorMessage(error, "划词剪藏分析失败"));
    }
  }
}

export const clipAnalysisService = new ClipAnalysisService();
