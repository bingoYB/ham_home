/**
 * Content Script - 网页内容提取
 * 使用 Readability 提取正文，Turndown 转换为 Markdown
 */
import { Readability, isProbablyReaderable } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { PageContent, PageMetadata } from '@/types';

/**
 * 提取页面元数据
 */
function extractMetadata(): PageMetadata {
  const metadata: PageMetadata = {};

  // 基础 meta 标签
  const metaTags: Record<string, string | undefined> = {
    description: document.querySelector('meta[name="description"]')?.getAttribute('content') || undefined,
    keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || undefined,
    author: document.querySelector('meta[name="author"]')?.getAttribute('content') || undefined,
  };

  // Open Graph 标签
  const ogTags: Record<string, string | undefined> = {
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') || undefined,
    ogDescription: document.querySelector('meta[property="og:description"]')?.getAttribute('content') || undefined,
    ogImage: document.querySelector('meta[property="og:image"]')?.getAttribute('content') || undefined,
    siteName: document.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || undefined,
  };

  // 发布日期（多种格式）
  const publishDate = 
    document.querySelector('meta[property="article:published_time"]')?.getAttribute('content') ||
    document.querySelector('meta[name="date"]')?.getAttribute('content') ||
    document.querySelector('time[datetime]')?.getAttribute('datetime') ||
    undefined;

  // 合并所有元数据，只保留有值的字段
  Object.entries({ ...metaTags, ...ogTags, publishDate }).forEach(([key, value]) => {
    if (value) {
      (metadata as Record<string, string>)[key] = value;
    }
  });

  return metadata;
}

/**
 * 清理文本内容
 */
function cleanContent(content: string): string {
  return content
    .replace(/\s+/g, ' ')           // 多个空白字符替换为单个空格
    .replace(/[\r\n]+/g, ' ')       // 换行符替换为空格
    .replace(/\t+/g, ' ')           // 制表符替换为空格
    .trim();                        // 去除首尾空白
}

/**
 * 智能截断文本
 */
function smartTruncate(text: string, maxLength: number = 500): string {
  if (!text || text.length <= maxLength) return text;

  // 检测文本类型（中文还是英文为主）
  const sample = text.slice(0, 100);
  let cjkCount = 0;
  let latinCount = 0;

  for (const char of sample) {
    if (/[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u4dbf]/.test(char)) {
      cjkCount++;
    } else if (/[a-zA-Z]/.test(char)) {
      latinCount++;
    }
  }

  const isCJK = cjkCount > latinCount;

  if (isCJK) {
    // 中文：在标点处截断
    const truncated = text.slice(0, maxLength);
    const punctuation = /[，。！？；,!?;]/;
    for (let i = truncated.length - 1; i >= maxLength - 50; i--) {
      if (punctuation.test(truncated[i])) {
        return truncated.slice(0, i + 1);
      }
    }
    return truncated;
  } else {
    // 英文：在空格处截断
    const truncated = text.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.7) {
      return truncated.slice(0, lastSpace);
    }
    return truncated;
  }
}

/**
 * 提取当前页面内容
 */
function extractPageContent(): PageContent | null {
  try {
    // 克隆 DOM 以免影响原页面
    const doc = document.cloneNode(true) as Document;

    // 检查页面是否可读
    const isReaderable = isProbablyReaderable(doc);

    // 提取元数据（在 Readability 解析之前）
    const metadata = extractMetadata();

    // 使用 Readability 提取正文
    const reader = new Readability(doc);
    const article = reader.parse();

    if (!article) {
      // 无法提取正文时，返回基本信息
      return {
        url: window.location.href,
        title: document.title,
        content: '',
        textContent: '',
        excerpt: metadata.description || metadata.ogDescription || '',
        favicon: getFavicon(),
        metadata,
        isReaderable: false,
      };
    }

    // HTML 转 Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndown.turndown(article.content);

    // 清理并截断内容
    const cleanedTextContent = cleanContent(article.textContent);

    return {
      url: window.location.href,
      title: article.title || document.title,
      content: markdown,
      textContent: cleanedTextContent,
      excerpt: article.excerpt || metadata.description || metadata.ogDescription || '',
      favicon: getFavicon(),
      metadata: {
        ...metadata,
        siteName: metadata.siteName || article.siteName || undefined,
      },
      isReaderable,
    };
  } catch (error) {
    console.error('[HamHome] Failed to extract content:', error);
    return null;
  }
}

/**
 * 获取页面 favicon
 */
function getFavicon(): string {
  // 优先尝试获取明确定义的图标
  const iconLinks = document.querySelectorAll<HTMLLinkElement>(
    'link[rel*="icon"]'
  );
  for (const link of iconLinks) {
    if (link.href) return link.href;
  }

  // Apple touch icon 作为备选
  const appleIcon = document.querySelector<HTMLLinkElement>(
    'link[rel="apple-touch-icon"]'
  );
  if (appleIcon?.href) return appleIcon.href;

  // 使用 Google favicon 服务作为 fallback
  return `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`;
}

// 监听来自 Popup/Background 的消息
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'EXTRACT_CONTENT') {
    const content = extractPageContent();
    sendResponse(content);
    return true; // 保持消息通道开放
  }
  return false;
});

// 导出 WXT content script 配置
export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('[HamHome] Content script loaded');
  },
});

