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
  const domain = getFaviconDomain(url);
  if (!domain) return '';

  return `https://cn.cravatar.com/favicon/api/index.php?url=${encodeURIComponent(domain)}`;
}

function getFaviconDomain(url: string): string {
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return '';

  try {
    return new URL(normalizedUrl).hostname;
  } catch {
    // 兼容直接传入域名的场景，例如 juejin.cn
  }

  try {
    return new URL(`https://${normalizedUrl}`).hostname;
  } catch {
    return normalizedUrl;
  }
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
