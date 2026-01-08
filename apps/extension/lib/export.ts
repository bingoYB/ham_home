/**
 * 数据导出模块
 */
import { bookmarkStorage } from './storage';
import type { ExportData } from '@/types';

/**
 * 导出为 JSON 格式
 */
export async function exportAsJSON(): Promise<void> {
  const [bookmarks, categories] = await Promise.all([
    bookmarkStorage.getBookmarks(),
    bookmarkStorage.getCategories(),
  ]);

  const data: ExportData = {
    version: '1.0.0',
    exportedAt: Date.now(),
    bookmarks,
    categories,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename: `hamhome-export-${formatDate(new Date())}.json`,
    saveAs: true,
  });

  URL.revokeObjectURL(url);
}

/**
 * 导出为 HTML 格式（Netscape 书签格式）
 */
export async function exportAsHTML(): Promise<void> {
  const [bookmarks, categories] = await Promise.all([
    bookmarkStorage.getBookmarks(),
    bookmarkStorage.getCategories(),
  ]);

  // 按分类组织书签
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const bookmarksByCategory = new Map<string | null, typeof bookmarks>();

  bookmarks.forEach((b) => {
    const key = b.categoryId;
    if (!bookmarksByCategory.has(key)) {
      bookmarksByCategory.set(key, []);
    }
    bookmarksByCategory.get(key)!.push(b);
  });

  // 生成 Netscape 书签格式 HTML
  let html = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file.
     It will be read and overwritten.
     DO NOT EDIT! -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>HamHome Bookmarks</TITLE>
<H1>HamHome Bookmarks</H1>
<DL><p>
`;

  // 未分类书签
  const uncategorized = bookmarksByCategory.get(null) || [];
  uncategorized.forEach((b) => {
    html += generateBookmarkHTML(b);
  });

  // 按分类输出
  categories.forEach((category) => {
    const catBookmarks = bookmarksByCategory.get(category.id) || [];
    if (catBookmarks.length > 0) {
      html += `    <DT><H3>${escapeHTML(category.name)}</H3>\n`;
      html += `    <DL><p>\n`;
      catBookmarks.forEach((b) => {
        html += generateBookmarkHTML(b, 2);
      });
      html += `    </DL><p>\n`;
    }
  });

  html += `</DL><p>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename: `hamhome-bookmarks-${formatDate(new Date())}.html`,
    saveAs: true,
  });

  URL.revokeObjectURL(url);
}

function generateBookmarkHTML(
  bookmark: { url: string; title: string; createdAt: number; description?: string },
  indent = 1
): string {
  const addDate = Math.floor(bookmark.createdAt / 1000);
  const padding = '    '.repeat(indent);
  return `${padding}<DT><A HREF="${escapeHTML(bookmark.url)}" ADD_DATE="${addDate}">${escapeHTML(bookmark.title)}</A>\n`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

