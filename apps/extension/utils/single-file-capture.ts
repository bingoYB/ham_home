import { browser } from "wxt/browser";

export interface SingleFileCaptureResult {
  html: string;
  elapsedMs: number;
  sizeBytes: number;
  filename: string;
}

export interface SingleFileDownloadTestOptions {
  openPreview?: boolean;
  autoRevokeMs?: number;
}

declare global {
  interface Window {
    __HAMHOME_SINGLEFILE_TEST__?: {
      captureSnapshot: () => Promise<SingleFileCaptureResult>;
      downloadSnapshot: (
        options?: SingleFileDownloadTestOptions,
      ) => Promise<SingleFileCaptureResult>;
    };
  }
}

export function sanitizeSnapshotFilename(title: string): string {
  const fallbackTitle = title.trim() || "snapshot";
  return fallbackTitle
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}`;
}

export async function captureSingleFileHtml(): Promise<SingleFileCaptureResult> {
  let hooksScriptElement: HTMLScriptElement | null = null;
  const captureStart = performance.now();

  try {
    try {
      const hooksUrl = browser.runtime.getURL(
        "/single-file-hooks-frames.js" as any,
      );
      hooksScriptElement = document.createElement("script");
      hooksScriptElement.src = hooksUrl;
      hooksScriptElement.dataset.singleFileHooks = "true";
      (document.head || document.documentElement).appendChild(
        hooksScriptElement,
      );
      await new Promise<void>((resolve) => {
        hooksScriptElement!.onload = () => resolve();
        hooksScriptElement!.onerror = () => resolve();
        setTimeout(resolve, 1000);
      });
    } catch (e) {
      console.warn("[SingleFile Content] Hooks injection failed:", e);
    }

    // @ts-ignore
    await import("@/utils/single-file.js");
    // @ts-ignore
    const singlefile = globalThis.singlefile;

    if (!singlefile) {
      throw new Error("SingleFile engine failed to load");
    }

    const nativeFetch = window.fetch.bind(window);
    const pendingRequests = new Map<
      number,
      {
        resolve: Function;
        reject: Function;
        array?: number[];
      }
    >();
    let nextRequestId = 0;

    const fetchResponseListener = (msg: any) => {
      if (msg.method === "singlefile.fetchResponse") {
        const p = pendingRequests.get(msg.requestId);
        if (p) {
          if (msg.error) {
            p.reject(new Error(msg.error));
            pendingRequests.delete(msg.requestId);
          } else {
            if (msg.truncated) {
              if (p.array) {
                p.array = p.array.concat(msg.array);
              } else {
                p.array = msg.array;
              }
              if (msg.finished) {
                msg.array = p.array;
              }
            }
            if (!msg.truncated || msg.finished) {
              p.resolve({
                status: msg.status,
                headers: {
                  get: (name: string) => msg.headers?.[name.toLowerCase()],
                },
                arrayBuffer: async () => new Uint8Array(msg.array).buffer,
              });
              pendingRequests.delete(msg.requestId);
            }
          }
        }
      }
    };

    browser.runtime.onMessage.addListener(fetchResponseListener);

    try {
      const bgFetch = (url: string, options: any = {}) => {
        return new Promise((resolve, reject) => {
          const requestId = ++nextRequestId;
          pendingRequests.set(requestId, { resolve, reject });
          browser.runtime.sendMessage({
            method: "singlefile.fetch",
            requestId,
            url,
            headers: options.headers,
            referrer: options.referrer || document.referrer,
          });
        });
      };

      const contentFetch = async (url: string, options: any = {}) => {
        const fetchOptions: RequestInit = {
          cache: (options.cache as RequestCache) || "force-cache",
          headers: options.headers,
          referrerPolicy:
            (options.referrerPolicy as ReferrerPolicy) ||
            "strict-origin-when-cross-origin",
          credentials: "include",
        };
        try {
          let response = await nativeFetch(url, fetchOptions);
          if (
            (response.status === 401 ||
              response.status === 403 ||
              response.status === 404) &&
            fetchOptions.referrerPolicy !== "no-referrer"
          ) {
            response = await nativeFetch(url, {
              ...fetchOptions,
              referrerPolicy: "no-referrer",
            });
          }
          return response;
        } catch (_nativeError) {
          return bgFetch(url, options);
        }
      };

      const contentFrameFetch = async (url: string, options: any = {}) => {
        return bgFetch(url, options);
      };

      const captureOptions = {
        removeUnusedStyles: true,
        removeUnusedFonts: true,
        removeHiddenElements: true,
        removeAlternativeFonts: true,
        removeAlternativeMedias: true,
        removeAlternativeImages: true,
        removeImports: true,
        removeNoScriptTags: true,
        removeFrames: false,
        removeScripts: true,
        compressHTML: true,
        compressCSS: false,
        loadDeferredImages: true,
        loadDeferredImagesMaxIdleTime: 1500,
        loadDeferredImagesBlockCookies: false,
        loadDeferredImagesBlockStorage: false,
        loadDeferredImagesKeepZoomLevel: false,
        loadDeferredImagesDispatchScrollEvent: false,
        loadDeferredImagesBeforeFrames: false,
        insertCanonicalLink: true,
        insertMetaNoIndex: true,
        insertMetaCSP: true,
        insertSingleFileComment: true,
        saveDate: new Date().toISOString(),
        saveUrl: window.location.href,
        url: window.location.href,
        saveRawPage: false,
        blockCookies: false,
        blockStorage: false,
        blockImages: false,
        blockAlternativeImages: true,
        blockStylesheets: false,
        blockFonts: false,
        blockScripts: true,
        blockVideos: true,
        blockAudios: true,
        moveStylesInHead: false,
        resolveFragmentIdentifierURLs: false,
        resolveLinks: true,
        saveOriginalURLs: false,
        groupDuplicateImages: true,
        groupDuplicateStylesheets: false,
        maxSizeDuplicateImages: 512 * 1024,
        imageReductionFactor: 1,
        maxResourceSize: 10,
        maxResourceSizeEnabled: false,
      };

      const pageData = await singlefile.getPageData(
        captureOptions,
        { fetch: contentFetch, frameFetch: contentFrameFetch },
        document,
        window,
      );

      if (!pageData || !pageData.content) {
        throw new Error("SingleFile returned empty content");
      }

      const html = pageData.content as string;
      const elapsedMs = performance.now() - captureStart;
      const sizeBytes = new Blob([html], { type: "text/html" }).size;
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, "-")
        .slice(0, 19);
      const filename = `${sanitizeSnapshotFilename(document.title)}_${timestamp}.singlefile.html`;

      return {
        html,
        elapsedMs,
        sizeBytes,
        filename,
      };
    } finally {
      browser.runtime.onMessage.removeListener(fetchResponseListener);
    }
  } finally {
    if (hooksScriptElement?.parentNode) {
      hooksScriptElement.parentNode.removeChild(hooksScriptElement);
    }
  }
}

export async function downloadSingleFileSnapshotForTest(
  options: SingleFileDownloadTestOptions = {},
): Promise<SingleFileCaptureResult> {
  const { openPreview = false, autoRevokeMs = 60_000 } = options;
  const result = await captureSingleFileHtml();
  const blob = new Blob([result.html], { type: "text/html;charset=utf-8" });
  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = result.filename;
  link.style.display = "none";
  document.documentElement.appendChild(link);
  link.click();
  link.remove();

  if (openPreview) {
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, autoRevokeMs);

  console.info("[HamHome][SingleFile Test] 本地快照下载完成", {
    url: window.location.href,
    filename: result.filename,
    elapsedMs: Number(result.elapsedMs.toFixed(2)),
    sizeBytes: result.sizeBytes,
    sizeText: formatBytes(result.sizeBytes),
    openPreview,
  });

  return result;
}

export function registerSingleFileTestHelpers(): void {
  if (window.top !== window || window.__HAMHOME_SINGLEFILE_TEST__) {
    return;
  }

  window.__HAMHOME_SINGLEFILE_TEST__ = {
    captureSnapshot: captureSingleFileHtml,
    downloadSnapshot: downloadSingleFileSnapshotForTest,
  };

  window.addEventListener("hamhome:test-singlefile-download", () => {
    void downloadSingleFileSnapshotForTest({ openPreview: true });
  });

  console.info(
    "[HamHome] SingleFile 测试入口已注入。控制台执行 window.__HAMHOME_SINGLEFILE_TEST__.downloadSnapshot({ openPreview: true }) 可测试本地下载与还原效果。",
  );
}

export async function handleExtractSingleFileHtmlResponse(captureId: string, sendResponse: (response?: any) => void): Promise<void> {
  let responded = false;
  try {
    const { html } = await captureSingleFileHtml();

    // --- 4. 分片发送 HTML (解决大数据传输限制) ---
    // 浏览器消息体积上限通常为 50MB，使用 4MB 足够安全
    const CHUNK_SIZE = 1024 * 1024 * 4; 
    const totalChunks = Math.ceil(html.length / CHUNK_SIZE);

    // 确认已收到请求，避免 background 侧超时
    sendResponse({ success: true });
    responded = true;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, html.length);
      const chunk = html.substring(start, end);

      await browser.runtime.sendMessage({
        method: "singlefile.chunk",
        captureId,
        chunk,
        index: i,
        total: totalChunks,
      });
    }
  } catch (error) {
    console.error("[SingleFile Content] Capture failed:", error);
    if (!responded) {
      sendResponse({ error: String(error) });
    }
  }
}
