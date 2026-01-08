/**
 * 日期处理工具
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * 格式化日期为相对时间 (如 "3天前")
 */
export function formatRelativeTime(date: Date | number): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return '刚刚';
  } else if (diffMinutes < 60) {
    return `${diffMinutes}分钟前`;
  } else if (diffHours < 24) {
    return `${diffHours}小时前`;
  } else if (diffDays < 30) {
    return `${diffDays}天前`;
  } else {
    return formatDate(d);
  }
}

/**
 * 获取当前时间戳（毫秒）
 */
export function now(): number {
  return Date.now();
}

