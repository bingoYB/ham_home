/**
 * Content Script - 网页内容提取 + UI 注入
 * 使用 Readability 提取正文
 * 参考 obsidian-clipper 的预处理策略：清理 script/style、将相对 URL 转为绝对 URL
 * 使用 createShadowRootUi 注入书签面板
 */
/// <reference path="../.wxt/wxt.d.ts" />
import { browser } from "wxt/browser";
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import Defuddle from "defuddle";
import type { PageContent, PageMetadata } from "@/types";
import "../style.css";
import { registerSingleFileTestHelpers, handleExtractSingleFileHtmlResponse } from "@/utils/single-file-capture";


/**
 * 将 document 中的相对 URL 转为绝对 URL
 * 参考 obsidian-clipper content.ts 的预处理逻辑
 */
function resolveRelativeUrls(doc: Document): void {
  const baseURI = document.baseURI;
  doc.querySelectorAll("[src], [href], [srcset]").forEach((el) => {
    (["src", "href"] as const).forEach((attr) => {
      const val = el.getAttribute(attr);
      if (
        val &&
        !val.startsWith("http") &&
        !val.startsWith("data:") &&
        !val.startsWith("#") &&
        !val.startsWith("//")
      ) {
        try {
          el.setAttribute(attr, new URL(val, baseURI).href);
        } catch {
          // ignore malformed URLs
        }
      }
    });
    // 处理 srcset
    const srcset = el.getAttribute("srcset");
    if (srcset) {
      const resolved = srcset
        .split(",")
        .map((part) => {
          const [url, descriptor] = part.trim().split(/\s+/);
          try {
            const absUrl = new URL(url, baseURI).href;
            return descriptor ? `${absUrl} ${descriptor}` : absUrl;
          } catch {
            return part;
          }
        })
        .join(", ");
      el.setAttribute("srcset", resolved);
    }
  });
}

/**
 * 提取页面元数据
 */
function extractMetadata(): PageMetadata {
  const metadata: PageMetadata = {};

  // 基础 meta 标签
  const metaTags: Record<string, string | undefined> = {
    description:
      document
        .querySelector('meta[name="description"]')
        ?.getAttribute("content") || undefined,
    keywords:
      document
        .querySelector('meta[name="keywords"]')
        ?.getAttribute("content") || undefined,
    author:
      document.querySelector('meta[name="author"]')?.getAttribute("content") ||
      undefined,
  };

  // Open Graph 标签
  const ogTags: Record<string, string | undefined> = {
    ogTitle:
      document
        .querySelector('meta[property="og:title"]')
        ?.getAttribute("content") || undefined,
    ogDescription:
      document
        .querySelector('meta[property="og:description"]')
        ?.getAttribute("content") || undefined,
    ogImage:
      document
        .querySelector('meta[property="og:image"]')
        ?.getAttribute("content") || undefined,
    siteName:
      document
        .querySelector('meta[property="og:site_name"]')
        ?.getAttribute("content") || undefined,
  };

  // 发布日期（多种格式）
  const publishDate =
    document
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute("content") ||
    document.querySelector('meta[name="date"]')?.getAttribute("content") ||
    document.querySelector("time[datetime]")?.getAttribute("datetime") ||
    undefined;

  // 合并所有元数据，只保留有值的字段
  Object.entries({ ...metaTags, ...ogTags, publishDate }).forEach(
    ([key, value]) => {
      if (value) {
        (metadata as Record<string, string>)[key] = value;
      }
    },
  );

  return metadata;
}

/**
 * 清理文本内容
 */
function cleanContent(content: string): string {
  return content
    .replace(/\s+/g, " ") // 多个空白字符替换为单个空格
    .replace(/[\r\n]+/g, " ") // 换行符替换为空格
    .replace(/\t+/g, " ") // 制表符替换为空格
    .trim(); // 去除首尾空白
}

/**
 * 提取当前页面内容
 */
async function extractPageContent(): Promise<PageContent | null> {
  try {
    // 克隆 DOM 以免影响原页面
    const doc = document.cloneNode(true) as Document;

    const htmlContent = extractCleanHtml();

    const defuddle = new Defuddle(doc, {
      url: document.URL,
      markdown: true,
    });

    const defuddled = await defuddle.parseAsync();
    // 检查页面是否可读
    const isReaderable = isProbablyReaderable(doc);

    // 提取元数据（在 Readability 解析之前）
    const metadata = extractMetadata();

    // 预处理：将相对 URL 转为绝对 URL
    resolveRelativeUrls(doc);

    // 使用 Readability 提取正文
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      // 无法提取正文时，返回基本信息
      return {
        url: window.location.href,
        title: document.title,
        content: "",
        textContent: "",
        htmlContent,
        excerpt: metadata.description || metadata.ogDescription || "",
        favicon: getFavicon(),
        metadata,
        isReaderable: false,
      };
    }

    // 直接返回 HTML 正义，由 UI 层 (useSavePanel) 负责按需转为 Markdown
    // 提升性能，避免在 Content Script 中进行耗时的 Markdown 转换
    const content = article.content;

    // 清理并截断内容
    const cleanedTextContent = cleanContent(article.textContent);

    return {
      url: window.location.href,
      title: article.title || document.title,
      content,
      htmlContent: defuddled.content,
      textContent: cleanedTextContent,
      excerpt:
        article.excerpt || metadata.description || metadata.ogDescription || "",
      favicon: getFavicon(),
      metadata: {
        ...metadata,
        siteName: metadata.siteName || article.siteName || undefined,
      },
      isReaderable,
    };
  } catch (error) {
    console.error("[HamHome] Failed to extract content:", error);
    return null;
  }
}

/**
 * 获取清理后的完整页面 HTML（用于快照保存）
 * 参考 obsidian-clipper：去除 script/style/内联样式，并将相对 URL 转为绝对 URL
 */
function extractCleanHtml(): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    document.documentElement.outerHTML,
    "text/html",
  );

  // 移除所有脚本和样式（减小快照体积、提升安全性）
  doc.querySelectorAll("script, style").forEach((el) => el.remove());

  // 移除内联 style 属性
  doc.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));

  // 将相对 URL 转为绝对 URL（保证快照中的资源链接可用）
  resolveRelativeUrls(doc);

  return doc.documentElement.outerHTML;
}

/**
 * 获取页面 favicon
 */
function getFavicon(): string {
  // 优先尝试获取明确定义的图标
  const iconLinks =
    document.querySelectorAll<HTMLLinkElement>('link[rel*="icon"]');
  for (const link of iconLinks) {
    if (link.href) return link.href;
  }

  // Apple touch icon 作为备选
  const appleIcon = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]',
  );
  if (appleIcon?.href) return appleIcon.href;

  // 使用 Google favicon 服务作为 fallback
  return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`;
}


// 监听来自 Popup/Background 的消息
browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "EXTRACT_CONTENT") {
    extractPageContent().then((content) => {
      sendResponse(content);
    });

    return true; // 保持消息通道开放
  }

  if (message.type === "EXTRACT_HTML") {
    // 返回清理后的页面 HTML（供快照功能使用）
    const html = document.documentElement.outerHTML;
    sendResponse({ html });
    return true;
  }

  if (message.type === "EXTRACT_SINGLEFILE_HTML") {
    handleExtractSingleFileHtmlResponse(message.captureId, sendResponse);
    return true;
  }

  return false;
});

// 导出 WXT content script 配置
export default defineContentScript({
  matches: ["<all_urls>"],
  cssInjectionMode: "ui",
  async main(ctx) {
    // registerSingleFileTestHelpers();

    // 动态导入 React 组件
    const { mountContentUI } = await import("@/components/contentUi/index");

    // 创建 Shadow Root UI
    const ui = await createShadowRootUi(ctx, {
      name: "hamhome-bookmark-panel",
      position: "overlay",
      zIndex: 99999,
      anchor: "body",
      onMount(container) {
        // 创建 React 挂载点
        const appRoot = document.createElement("div");
        appRoot.id = "hamhome-root";
        container.append(appRoot);

        // 挂载 React 应用
        const unmount = mountContentUI(appRoot);

        return { unmount };
      },
      onRemove(mounted) {
        mounted?.unmount();
      },
    });

    // 挂载 UI
    ui.mount();
  },
});
