/**
 * useChromeBookmarks Hook
 * 封装浏览器 Bookmarks API 交互逻辑
 */
import { useState } from 'react';
import { browser } from 'wxt/browser';

export interface ChromeBookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: ChromeBookmarkNode[];
  dateAdded?: number;
  parentId?: string;
}

export function useChromeBookmarks() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 将书签树转换为 HTML 格式（与浏览器导出的格式兼容）
   */
  const convertToHTML = (nodes: ChromeBookmarkNode[]): string => {
    const buildDL = (bookmarkNodes: ChromeBookmarkNode[]): string => {
      if (!bookmarkNodes.length) return '';
      
      const items = bookmarkNodes.map(node => {
        if (node.children && node.children.length > 0) {
          // 这是一个文件夹
          return `<DT><H3>${escapeHTML(node.title)}</H3>\n<DL><p>\n${buildDL(node.children)}</DL><p>`;
        } else if (node.url) {
          // 这是一个书签
          const date = node.dateAdded ? Math.floor(node.dateAdded / 1000) : '';
          return `<DT><A HREF="${escapeHTML(node.url)}" ADD_DATE="${date}">${escapeHTML(node.title)}</A>`;
        }
        return '';
      }).filter(Boolean).join('\n');

      return items;
    };

    const escapeHTML = (text: string): string => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${buildDL(nodes)}
</DL><p>`;

    return html;
  };

  /**
   * 获取所有浏览器书签
   */
  const getBookmarks = async (): Promise<{ html: string; count: number }> => {
    setLoading(true);
    setError(null);

    try {
      // 检查是否支持 bookmarks API
      if (!browser?.bookmarks?.getTree) {
        throw new Error('浏览器不支持书签 API');
      }

      // 获取书签树
      const tree = await browser.bookmarks.getTree();
      
      // 统计书签数量（只统计有 URL 的节点）
      const countBookmarks = (nodes: ChromeBookmarkNode[]): number => {
        let count = 0;
        for (const node of nodes) {
          if (node.url) {
            count++;
          }
          if (node.children) {
            count += countBookmarks(node.children);
          }
        }
        return count;
      };

      const count = countBookmarks(tree);
      
      // 转换为 HTML 格式
      const html = convertToHTML(tree);

      return { html, count };
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    getBookmarks,
  };
}
