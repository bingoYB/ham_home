/**
 * 网页内容提取结果
 */
export interface ExtractResult {
  title: string;
  content: string;        // Markdown 格式
  textContent: string;    // 纯文本
  excerpt: string;        // 摘要
  byline: string | null;  // 作者
  siteName: string | null;
}

/**
 * 网页元数据
 */
export interface PageMetadata {
  url: string;
  title: string;
  description: string;
  favicon: string;
}

