/**
 * 剪藏分析的错误码。
 *
 * 图片剪藏走多模态，不做文本降级：模型不支持视觉、图片拉不到等情况一律直接报错，
 * 由保存面板展示可读提示。错误码同时作为 Error.message，
 * 这样即使经过 background RPC 只剩下 message 字段也能被还原。
 */
export const CLIP_ANALYSIS_ERROR_CODES = [
  "CLIP_IMAGE_VISION_UNSUPPORTED",
  "CLIP_IMAGE_FETCH_FAILED",
  "CLIP_IMAGE_UNSUPPORTED_TYPE",
  "CLIP_IMAGE_TOO_LARGE",
] as const;

export type ClipAnalysisErrorCode = (typeof CLIP_ANALYSIS_ERROR_CODES)[number];

export class ClipAnalysisError extends Error {
  readonly code: ClipAnalysisErrorCode;

  constructor(code: ClipAnalysisErrorCode, options?: { cause?: unknown }) {
    super(code);
    this.name = "ClipAnalysisError";
    this.code = code;
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}

/** 从任意错误中还原剪藏分析错误码，非剪藏错误返回 null */
export function resolveClipAnalysisErrorCode(
  error: unknown,
): ClipAnalysisErrorCode | null {
  if (error instanceof ClipAnalysisError) {
    return error.code;
  }

  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  return (
    CLIP_ANALYSIS_ERROR_CODES.find((code) => message.includes(code)) ?? null
  );
}

/**
 * 判断模型报错是否源于「不支持图片输入」。
 * 各家 provider 的文案差异很大，用「提到图片」+「提到不支持」两个条件联合判定。
 */
export function isVisionUnsupportedError(error: unknown): boolean {
  const message = (
    error instanceof Error ? error.message : typeof error === "string" ? error : ""
  ).toLowerCase();
  if (!message) return false;

  const mentionsImage =
    /image|vision|multi-?modal|image_url|图片|视觉|多模态/.test(message);
  const mentionsUnsupported =
    /unsupported|not support|does ?n[o']?t support|invalid[ _-]?type|not[ _-]?supported|unrecognized|不支持|无法识别/.test(
      message,
    );

  return mentionsImage && mentionsUnsupported;
}
