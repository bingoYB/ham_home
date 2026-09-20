import { browser } from "wxt/browser";
import { bookmarkScreenshotStorage } from "@/lib/storage/bookmark-screenshot-storage";
import type {
  SaveScreenshotBackgroundOptions,
  ScreenshotCaptureResult,
} from "@/types";

const THUMBNAIL_MAX_WIDTH = 720;

function isSamePage(actual?: string, expected?: string): boolean {
  if (!expected) return true;
  try {
    const actualUrl = new URL(actual ?? "");
    const expectedUrl = new URL(expected);
    actualUrl.hash = "";
    expectedUrl.hash = "";
    return actualUrl.toString() === expectedUrl.toString();
  } catch {
    return actual === expected;
  }
}

async function createThumbnail(image: Blob): Promise<{
  blob: Blob;
  width: number;
  height: number;
}> {
  if (typeof createImageBitmap === "undefined") {
    return { blob: image, width: 0, height: 0 };
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(image);
  } catch {
    return { blob: image, width: 0, height: 0 };
  }
  const width = bitmap.width;
  const height = bitmap.height;
  const targetWidth = Math.min(width, THUMBNAIL_MAX_WIDTH);
  const targetHeight = Math.max(1, Math.round((height * targetWidth) / width));

  try {
    if (typeof OffscreenCanvas === "undefined") {
      return { blob: image, width, height };
    }
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const context = canvas.getContext("2d");
    if (!context) return { blob: image, width, height };
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    const blob = await canvas.convertToBlob({ type: "image/webp", quality: 0.8 });
    return { blob, width, height };
  } finally {
    bitmap.close();
  }
}

export class BookmarkScreenshotService {
  async captureVisibleTab(
    bookmarkId: string,
    options: SaveScreenshotBackgroundOptions = {},
  ): Promise<ScreenshotCaptureResult> {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.windowId === undefined || !tab.url) {
      return { ok: false, error: "未找到当前网页标签" };
    }
    if (!isSamePage(tab.url, options.expectedUrl)) {
      return { ok: false, error: "页面已切换，已取消截图" };
    }

    try {
      await browser.tabs
        .sendMessage(tab.id, { type: "SET_CAPTURE_VISIBILITY", visible: false })
        .catch(() => undefined);

      const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
        format: "png",
      });
      const [afterCapture] = await browser.tabs.query({
        active: true,
        windowId: tab.windowId,
      });
      if (afterCapture?.id !== tab.id || !isSamePage(afterCapture.url, tab.url)) {
        return { ok: false, error: "截图期间页面已切换，结果未保存" };
      }

      const image = await (await fetch(dataUrl)).blob();
      const thumbnail = await createThumbnail(image);
      const metadata = await bookmarkScreenshotStorage.save({
        bookmarkId,
        sourceUrl: tab.url,
        image,
        thumbnail: thumbnail.blob,
        mimeType: image.type || "image/png",
        width: thumbnail.width,
        height: thumbnail.height,
      });
      return { ok: true, metadata };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "页面截图保存失败",
      };
    } finally {
      await browser.tabs
        .sendMessage(tab.id, { type: "SET_CAPTURE_VISIBILITY", visible: true })
        .catch(() => undefined);
    }
  }
}

export const bookmarkScreenshotService = new BookmarkScreenshotService();
