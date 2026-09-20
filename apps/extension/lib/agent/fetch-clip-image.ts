/**
 * 抓取图片剪藏的原图并转成可直接发给多模态模型的附件。
 *
 * 必须在 background 中调用：content script 受站点 CORS 限制，
 * background 拥有 <all_urls> host permission，可以直接读取跨域图片。
 */
import { ClipAnalysisError } from "./clip-analysis-errors";
import type { ImageClipMetadata } from "@/types";

export interface ClipImageAttachment {
  /**
   * 纯 base64 内容，不带 `data:` 前缀。
   * AI SDK 会把 data URL 当成需要下载的远程地址并拒绝 data: 协议，
   * 必须以「base64 + mediaType」的形式传入。
   */
  image: string;
  mediaType: string;
  metadata: ImageClipMetadata;
}

/** 主流多模态模型共同支持的图片格式 */
const SUPPORTED_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

/** 超过该体积的图片先压缩，压缩后仍超限则报错 */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** 长边上限，与主流视觉模型的内部缩放阈值保持一致，避免上传无谓的像素 */
const MAX_IMAGE_EDGE = 1568;
const FETCH_TIMEOUT_MS = 15000;

export async function fetchClipImageForAI(
  url: string,
): Promise<ClipImageAttachment> {
  const blob = await fetchImageBlob(url);
  const mediaType = normalizeMediaType(blob.type);

  if (!SUPPORTED_MEDIA_TYPES.has(mediaType)) {
    throw new ClipAnalysisError("CLIP_IMAGE_UNSUPPORTED_TYPE");
  }

  const decoded = await decodeImage(blob);
  const metadata = createImageMetadata(blob, mediaType, decoded);
  const optimized = await optimizeImage(blob, mediaType, decoded);
  if (optimized.blob.size > MAX_IMAGE_BYTES) {
    throw new ClipAnalysisError("CLIP_IMAGE_TOO_LARGE");
  }

  return {
    image: await blobToBase64(optimized.blob),
    mediaType: optimized.mediaType,
    metadata,
  };
}

/**
 * 仅采集原图文件信息，不生成 base64，也不要求格式能被多模态模型识别。
 * 图片分析关闭或失败时，保存流程仍可用它持久化尺寸、大小和格式。
 */
export async function inspectClipImageMetadata(
  url: string,
): Promise<ImageClipMetadata> {
  const blob = await fetchImageBlob(url);
  const mediaType = normalizeMediaType(blob.type);
  const decoded = await decodeImage(blob);
  const metadata = createImageMetadata(blob, mediaType, decoded);
  decoded?.close();
  return metadata;
}

async function fetchImageBlob(url: string): Promise<Blob> {
  try {
    const response = await fetch(url, {
      credentials: "omit",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.blob();
  } catch (error) {
    throw new ClipAnalysisError("CLIP_IMAGE_FETCH_FAILED", { cause: error });
  }
}

function normalizeMediaType(type: string): string {
  const normalized = type.split(";")[0]?.trim().toLowerCase() ?? "";
  // 部分站点返回 image/jpg，规范写法是 image/jpeg
  return normalized === "image/jpg" ? "image/jpeg" : normalized;
}

function formatFromMediaType(mediaType: string): string | undefined {
  const subtype = mediaType.split("/")[1]?.split("+")[0]?.trim();
  if (!subtype) return undefined;
  if (subtype === "jpeg") return "JPG";
  return subtype.toUpperCase();
}

function createImageMetadata(
  blob: Blob,
  mediaType: string,
  bitmap: ImageBitmap | null,
): ImageClipMetadata {
  return {
    width: bitmap?.width,
    height: bitmap?.height,
    size: blob.size,
    format: formatFromMediaType(mediaType),
    mimeType: mediaType || undefined,
  };
}

async function decodeImage(blob: Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(blob);
  } catch (error) {
    console.warn("[fetchClipImageForAI] Failed to decode image:", error);
    return null;
  }
}

/**
 * 尺寸或体积超限时重新编码为 JPEG。
 * 动图只取首帧，对内容识别没有影响。
 */
async function optimizeImage(
  blob: Blob,
  mediaType: string,
  bitmap: ImageBitmap | null,
): Promise<{ blob: Blob; mediaType: string }> {
  if (!bitmap) {
    // 无法解码时按原图发送，由体积检查兜底
    return { blob, mediaType };
  }

  const longestEdge = Math.max(bitmap.width, bitmap.height);
  if (longestEdge <= MAX_IMAGE_EDGE && blob.size <= MAX_IMAGE_BYTES) {
    bitmap.close();
    return { blob, mediaType };
  }

  try {
    const scale = Math.min(1, MAX_IMAGE_EDGE / longestEdge);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("OffscreenCanvas 2d context unavailable");
    }
    context.drawImage(bitmap, 0, 0, width, height);

    const encoded = await canvas.convertToBlob({
      type: "image/jpeg",
      quality: 0.85,
    });
    return { blob: encoded, mediaType: "image/jpeg" };
  } catch (error) {
    // 压缩失败时保留原图，交给体积检查决定是否报错
    console.warn("[fetchClipImageForAI] Failed to downscale image:", error);
    return { blob, mediaType };
  } finally {
    bitmap.close();
  }
}

/**
 * Service Worker 中没有 FileReader，手动做 base64 编码。
 * 分片处理避免 String.fromCharCode 参数过多导致栈溢出。
 */
async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK_SIZE = 0x8000;
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(
      ...bytes.subarray(offset, offset + CHUNK_SIZE),
    );
  }

  return btoa(binary);
}
