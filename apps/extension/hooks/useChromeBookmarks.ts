/**
 * useChromeBookmarks Hook
 * 封装浏览器 Bookmarks API 交互逻辑
 */
import { useState } from 'react';
import { browser } from 'wxt/browser';
import type { LocalBookmark, LocalCategory } from '@/types';

/** 可识别错误类型，供上层组件做 i18n 映射 */
export type ChromeBookmarkErrorCode =
  | 'bookmarksApiNotSupported'
  | 'unknown';

export class ChromeBookmarkError extends Error {
  constructor(
    public readonly code: ChromeBookmarkErrorCode,
    message?: string
  ) {
    super(message ?? code);
    this.name = 'ChromeBookmarkError';
  }
}

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
        throw new ChromeBookmarkError('bookmarksApiNotSupported');
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
      const message = err instanceof Error ? err.message : 'unknown';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  /**
   * 将本地分类和书签反向同步到浏览器书签栏
   *
   * @param useRootFolder  true=在书签栏顶层创建 "HamHome" 根文件夹（默认）；
   *                       false=直接将分类作为书签栏顶层文件夹输出
   * @param clearFirst     true=写入前先删除已有的目标文件夹/同名文件夹，实现覆盖语义；
   *                       false=增量合并，跳过已存在的 URL
   */
  const syncToBrowser = async (params: {
    categories: LocalCategory[];
    bookmarks: LocalBookmark[];
    useRootFolder?: boolean;
    clearFirst?: boolean;
    skipGlobalDuplicates?: boolean;
    onProgress?: (current: number, total: number) => void;
  }): Promise<{ created: number; skipped: number }> => {
    setSyncing(true);
    setSyncError(null);

    try {
      if (!browser?.bookmarks?.getTree) {
        throw new ChromeBookmarkError('bookmarksApiNotSupported');
      }

      const {
        categories,
        bookmarks,
        useRootFolder = true,
        clearFirst = false,
        skipGlobalDuplicates = false,
        onProgress,
      } = params;

      const ROOT_FOLDER_TITLE = 'HamHome';
      const BAR_ID = '1'; // 书签栏节点 ID（Chrome/Edge/Firefox 均为 '1'）

      // ── 递归删除文件夹下所有子项 ─────────────────────────────
      const removeSubtree = async (nodeId: string): Promise<void> => {
        const children = await browser.bookmarks.getChildren(nodeId);
        for (const child of children) {
          await browser.bookmarks.removeTree(child.id);
        }
      };

      // ── 解析书签栏直接子项 ────────────────────────────────────
      const barChildren = await browser.bookmarks.getChildren(BAR_ID);

      // ── 确定写入的"根节点" ────────────────────────────────────
      let rootId: string;

      if (useRootFolder) {
        // 模式 A：在书签栏顶层找/建 HamHome 文件夹
        let hamHomeFolder = barChildren.find(
          (n) => !n.url && n.title === ROOT_FOLDER_TITLE
        );
        if (hamHomeFolder) {
          if (clearFirst) {
            // 清空其内部，保留文件夹本身（避免 ID 变化）
            await removeSubtree(hamHomeFolder.id);
          }
        } else {
          hamHomeFolder = await browser.bookmarks.create({
            parentId: BAR_ID,
            title: ROOT_FOLDER_TITLE,
          });
        }
        rootId = hamHomeFolder.id;
      } else {
        // 模式 B：直接写到书签栏，不建顶层 HamHome 文件夹
        if (clearFirst) {
          // 删除书签栏下与当前分类同名的文件夹
          const categoryNames = new Set(
            categories.filter((c) => !c.parentId).map((c) => c.name)
          );
          for (const child of barChildren) {
            if (!child.url && categoryNames.has(child.title)) {
              await browser.bookmarks.removeTree(child.id);
            }
          }
        }
        rootId = BAR_ID;
      }

      // ── 收集去重 URL 集合 ──────────────────────────────────────
      // collectExistingUrls: 递归收集指定节点下所有书签 URL
      const collectExistingUrls = async (nodeId: string): Promise<Set<string>> => {
        const urls = new Set<string>();
        const children = await browser.bookmarks.getChildren(nodeId);
        for (const child of children) {
          if (child.url) {
            urls.add(child.url);
          } else {
            const nested = await collectExistingUrls(child.id);
            nested.forEach((u) => urls.add(u));
          }
        }
        return urls;
      };

      let existingUrls: Set<string>;
      if (clearFirst) {
        // 清空模式：目标文件夹已清空，从空集开始
        existingUrls = new Set<string>();
      } else if (skipGlobalDuplicates) {
        // 全局去重：从整棵书签树（根节点 '0'）收集所有 URL
        existingUrls = await collectExistingUrls('0');
      } else {
        // 局部去重：只检查目标文件夹内
        existingUrls = await collectExistingUrls(rootId);
      }

      // ── 构建分类 ID -> 浏览器文件夹 nodeId 的映射 ────────────
      const folderMap = new Map<string, string>();

      const ensureFolder = async (
        catId: string,
        catMap: Map<string, LocalCategory>
      ): Promise<string> => {
        if (folderMap.has(catId)) return folderMap.get(catId)!;

        const cat = catMap.get(catId);
        if (!cat) return rootId;

        let parentNodeId: string;
        if (cat.parentId) {
          parentNodeId = await ensureFolder(cat.parentId, catMap);
        } else {
          parentNodeId = rootId;
        }

        const siblings = await browser.bookmarks.getChildren(parentNodeId);
        const existing = siblings.find((n) => !n.url && n.title === cat.name);
        let nodeId: string;
        if (existing) {
          nodeId = existing.id;
        } else {
          const created = await browser.bookmarks.create({
            parentId: parentNodeId,
            title: cat.name,
          });
          nodeId = created.id;
        }

        folderMap.set(catId, nodeId);
        return nodeId;
      };

      const catMap = new Map(categories.map((c) => [c.id, c]));

      // 按 parentId 拓扑排序，确保父分类先创建
      const sorted = [...categories].sort((a, b) => {
        if (!a.parentId && b.parentId) return -1;
        if (a.parentId && !b.parentId) return 1;
        return 0;
      });
      for (const cat of sorted) {
        await ensureFolder(cat.id, catMap);
      }

      // ── 写入书签 ──────────────────────────────────────────────
      let created = 0;
      let skipped = 0;
      const total = bookmarks.length;

      for (let i = 0; i < bookmarks.length; i++) {
        const bm = bookmarks[i];
        onProgress?.(i, total);

        if (!bm.url || !bm.url.startsWith('http')) {
          skipped++;
          continue;
        }

        if (existingUrls.has(bm.url)) {
          skipped++;
          continue;
        }

        const targetNodeId =
          bm.categoryId && folderMap.has(bm.categoryId)
            ? folderMap.get(bm.categoryId)!
            : rootId;

        try {
          await browser.bookmarks.create({
            parentId: targetNodeId,
            title: bm.title || bm.url,
            url: bm.url,
          });
          existingUrls.add(bm.url);
          created++;
        } catch {
          skipped++;
        }
      }

      onProgress?.(total, total);
      return { created, skipped };
    } catch (err) {
      const code = err instanceof ChromeBookmarkError ? err.code : 'unknown';
      setSyncError(code);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  return {
    loading,
    error,
    getBookmarks,
    syncing,
    syncError,
    syncToBrowser,
  };
}
