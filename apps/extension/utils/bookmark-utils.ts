/**
 * 书签相关工具函数
 */
import type { LocalCategory } from '@/types';

/**
 * 获取分类全路径（用 > 连接）
 */
export function getCategoryPath(
  categoryId: string | null,
  categories: LocalCategory[],
  uncategorizedLabel: string
): string {
  if (!categoryId) return uncategorizedLabel;

  const path: string[] = [];
  let currentId: string | null = categoryId;

  while (currentId) {
    const cat = categories.find((c) => c.id === currentId);
    if (!cat) break;
    path.unshift(cat.name);
    currentId = cat.parentId;
  }

  return path.length > 0 ? path.join(' > ') : uncategorizedLabel;
}

/**
 * 格式化日期显示
 */
export function formatDate(
  timestamp: number,
  language: string,
  todayLabel: string,
  yesterdayLabel: string
): string {
  const now = Date.now();
  const diff = now - timestamp;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return todayLabel;
  if (days === 1) return yesterdayLabel;
  if (days < 7) return `${days}d ago`;

  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timestamp));
}

/**
 * 分类颜色常量
 */
export const CATEGORY_COLOR = 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
