// 注意: @mozilla/readability 和 turndown 需要在 DOM 环境下运行
// 这里提供类型定义和工具函数

import type { ExtractResult } from './types';

/**
 * 截断内容以适应 LLM Token 限制
 */
export function truncateContent(content: string, maxChars: number = 4000): string {
  if (content.length <= maxChars) return content;
  
  // 尝试在段落边界截断
  const truncated = content.slice(0, maxChars);
  const lastParagraph = truncated.lastIndexOf('\n\n');
  
  if (lastParagraph > maxChars * 0.7) {
    return truncated.slice(0, lastParagraph) + '\n\n[内容已截断...]';
  }
  
  return truncated + '...[内容已截断]';
}

/**
 * 从 HTML 字符串中提取纯文本
 */
export function extractTextFromHtml(html: string): string {
  // 简单实现：移除 HTML 标签
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 创建默认提取结果
 */
export function createDefaultResult(title: string = '', excerpt: string = ''): ExtractResult {
  return {
    title,
    content: '',
    textContent: '',
    excerpt,
    byline: null,
    siteName: null,
  };
}

