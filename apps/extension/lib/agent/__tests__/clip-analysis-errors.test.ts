import { describe, expect, it } from "vitest";
import {
  ClipAnalysisError,
  isVisionUnsupportedError,
  resolveClipAnalysisErrorCode,
} from "../clip-analysis-errors";

describe("clip-analysis-errors", () => {
  it("resolves the code from a ClipAnalysisError", () => {
    const error = new ClipAnalysisError("CLIP_IMAGE_TOO_LARGE");
    expect(resolveClipAnalysisErrorCode(error)).toBe("CLIP_IMAGE_TOO_LARGE");
  });

  it("resolves the code after the error crossed the background RPC boundary", () => {
    // RPC 只保留 message，因此错误码本身就是 message
    const plain = new Error("CLIP_IMAGE_VISION_UNSUPPORTED");
    expect(resolveClipAnalysisErrorCode(plain)).toBe(
      "CLIP_IMAGE_VISION_UNSUPPORTED",
    );
  });

  it("returns null for unrelated failures", () => {
    expect(resolveClipAnalysisErrorCode(new Error("network timeout"))).toBeNull();
    expect(resolveClipAnalysisErrorCode(undefined)).toBeNull();
  });

  it("detects provider errors caused by missing vision support", () => {
    expect(
      isVisionUnsupportedError(
        new Error("Invalid content type: this model does not support image input"),
      ),
    ).toBe(true);
    expect(
      isVisionUnsupportedError(new Error("当前模型不支持图片输入")),
    ).toBe(true);
  });

  it("does not treat generic failures as missing vision support", () => {
    expect(isVisionUnsupportedError(new Error("429 rate limit exceeded"))).toBe(
      false,
    );
    // 提到图片但没有"不支持"语义，不应误判
    expect(isVisionUnsupportedError(new Error("image upload timed out"))).toBe(
      false,
    );
  });
});
