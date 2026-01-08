import { nanoid } from 'nanoid';

/**
 * 字符串处理工具
 */

/**
 * 截断字符串
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * 生成唯一 ID
 */
export function generateId(length: number = 21): string {
  return nanoid(length);
}

/**
 * 首字母大写
 */
export function capitalize(str: string): string {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 移除字符串中的 HTML 标签
 */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

