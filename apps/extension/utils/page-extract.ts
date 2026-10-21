/**
 * 页面内容提取工具
 * 从 content script 入口抽离，供 content script 消息处理与页内保存流程共用
 * 使用 Readability + Defuddle 提取正文
 * 参考 obsidian-clipper 的预处理策略：清理 script/style、将相对 URL 转为绝对 URL
 */
import { Readability, isProbablyReaderable } from "@mozilla/readability";
import Defuddle from "defuddle";
import { createMarkdownContent } from "defuddle/full";
import { getFavicon as getFaviconUrl } from "@hamhome/utils";
import { estimateReadingMinutes } from "@/lib/read-later/read-later.utils";
import type { PageContent, PageMetadata, ReadingPageContent } from "@/types";

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
export async function extractPageContent(): Promise<PageContent | null> {
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
        favicon: getPageFavicon(),
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
      favicon: getPageFavicon(),
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
export function extractCleanHtml(): string {
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
function getPageFavicon(): string {
  return getFaviconUrl(window.location.href);
}

/**
 * Content for read later and quick bookmarking: title, description, Markdown body and
 * an estimated reading time. Runs in the content script because the Markdown
 * conversion needs a DOM, which the background service worker does not have.
 */
export async function extractReadingContent(): Promise<ReadingPageContent> {
  const url = window.location.href;
  const content = await extractPageContent();
  if (!content) {
    return {
      url,
      title: document.title,
      description: extractMetadata().description || "",
      markdown: "",
      estimatedMinutes: estimateReadingMinutes(document.body?.innerText),
      favicon: getPageFavicon(),
      isReaderable: false,
    };
  }

  let markdown = "";
  if (content.content && content.htmlContent) {
    try {
      markdown = createMarkdownContent(content.htmlContent, url);
    } catch (error) {
      console.warn("[HamHome] Failed to convert reading content:", error);
    }
  }

  return {
    url: content.url,
    title: content.title || document.title,
    description: content.excerpt || "",
    markdown,
    estimatedMinutes: estimateReadingMinutes(content.textContent || document.body?.innerText),
    favicon: content.favicon,
    isReaderable: !!content.isReaderable,
  };
}

