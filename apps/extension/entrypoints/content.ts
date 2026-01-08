/**
 * Content Script - 网页内容提取
 * 使用 Readability 提取正文，Turndown 转换为 Markdown
 */
import { Readability } from '@mozilla/readability';
import TurndownService from 'turndown';
import type { PageContent } from '@/types';

/**
 * 提取当前页面内容
 */
function extractPageContent(): PageContent | null {
  try {
    // 克隆 DOM 以免影响原页面
    const doc = document.cloneNode(true) as Document;

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
        excerpt: getMetaDescription(),
        favicon: getFavicon(),
      };
    }

    // HTML 转 Markdown
    const turndown = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
    });
    const markdown = turndown.turndown(article.content);

    return {
      url: window.location.href,
      title: article.title || document.title,
      content: markdown,
      textContent: article.textContent,
      excerpt: article.excerpt || getMetaDescription(),
      favicon: getFavicon(),
    };
  } catch (error) {
    console.error('[HamHome] Failed to extract content:', error);
    return null;
  }
}

/**
 * 获取页面 meta description
 */
function getMetaDescription(): string {
  const meta = document.querySelector('meta[name="description"]');
  return meta?.getAttribute('content') || '';
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

