import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchClipImageForAI,
  inspectClipImageMetadata,
} from "../fetch-clip-image";

/** 构造一个指定体积与 MIME 的图片响应 */
function imageResponse(mediaType: string, size = 32): Response {
  const blob = new Blob([new Uint8Array(size)], { type: mediaType });
  return new Response(blob, { status: 200 });
}

describe("fetchClipImageForAI", () => {
  beforeEach(() => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns plain base64 content for a supported image", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse("image/png")));
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 800, height: 600, close: vi.fn() }),
    );

    const attachment = await fetchClipImageForAI("https://example.com/a.png");

    expect(attachment.mediaType).toBe("image/png");
    // data: URL 会被 AI SDK 当成待下载的远程资源并因协议不支持而报错
    expect(attachment.image.startsWith("data:")).toBe(false);
    expect(attachment.image).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    expect(attachment.metadata).toMatchObject({
      width: 800,
      height: 600,
      size: 32,
      format: "PNG",
      mimeType: "image/png",
    });
  });

  it("normalizes the non-standard image/jpg content type", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse("image/jpg")));
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }),
    );

    const attachment = await fetchClipImageForAI("https://example.com/a.jpg");
    expect(attachment.mediaType).toBe("image/jpeg");
    expect(attachment.metadata.format).toBe("JPG");
  });

  it("inspects original metadata without producing an AI attachment", async () => {
    const close = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(imageResponse("image/webp", 2048)));
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockResolvedValue({ width: 1200, height: 800, close }),
    );

    await expect(
      inspectClipImageMetadata("https://example.com/a.webp"),
    ).resolves.toEqual({
      width: 1200,
      height: 800,
      size: 2048,
      format: "WEBP",
      mimeType: "image/webp",
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("fails with a dedicated code when the image cannot be downloaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("", { status: 403 })),
    );

    await expect(
      fetchClipImageForAI("https://example.com/blocked.png"),
    ).rejects.toThrow("CLIP_IMAGE_FETCH_FAILED");
  });

  it("rejects formats that multimodal models do not accept", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse("image/svg+xml")),
    );

    await expect(
      fetchClipImageForAI("https://example.com/icon.svg"),
    ).rejects.toThrow("CLIP_IMAGE_UNSUPPORTED_TYPE");
  });

  it("rejects oversized images that could not be compressed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(imageResponse("image/png", 5 * 1024 * 1024)),
    );
    // 解码失败时保留原图，体积检查负责兜底
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn().mockRejectedValue(new Error("decode failed")),
    );

    await expect(
      fetchClipImageForAI("https://example.com/huge.png"),
    ).rejects.toThrow("CLIP_IMAGE_TOO_LARGE");
  });
});
