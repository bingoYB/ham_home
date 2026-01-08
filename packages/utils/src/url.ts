/**
 * URL 处理工具
 */

/**
 * 移除 URL 中的 tracking 参数并规范化
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // 移除 tracking 参数
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'];
    trackingParams.forEach(param => parsed.searchParams.delete(param));
    // 移除末尾斜杠
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return url;
  }
}

/**
 * 获取 URL 的域名
 */
export function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * 获取网站 favicon URL
 */
export function getFavicon(url: string): string {
  const domain = getDomain(url);
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

/**
 * 检查 URL 是否有效
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

