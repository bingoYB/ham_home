export interface BrowserBookmarkTreeNode {
  id: string;
  title: string;
  url?: string;
  children?: BrowserBookmarkTreeNode[];
  dateAdded?: number;
  parentId?: string;
  folderType?: string;
  syncing?: boolean;
  unmodifiable?: string;
}

const BOOKMARK_BAR_IDS = new Set(['1', 'toolbar_____']);

/** Escape both text and quoted HTML attributes; bookmarklets often contain quotes. */
function escapeBookmarkHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Serialize browser data without interpreting URLs or executing bookmarklets. */
export function browserBookmarksToHtml(nodes: BrowserBookmarkTreeNode[]): string {
  const buildDL = (items: BrowserBookmarkTreeNode[]): string => items.map((node) => {
    if (node.children?.length) {
      return `<DT><H3>${escapeBookmarkHtml(node.title)}</H3>\n<DL><p>\n${buildDL(node.children)}</DL><p>`;
    }
    if (!node.url) return '';
    const date = node.dateAdded ? Math.floor(node.dateAdded / 1000) : '';
    return `<DT><A HREF="${escapeBookmarkHtml(node.url)}" ADD_DATE="${date}">${escapeBookmarkHtml(node.title)}</A>`;
  }).filter(Boolean).join('\n');

  return `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<!-- This is an automatically generated file. -->
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
${buildDL(nodes)}
</DL><p>`;
}

export function resolveBookmarkTreeNodes(tree: BrowserBookmarkTreeNode[]): {
  rootNode: BrowserBookmarkTreeNode;
  bookmarkBarNode: BrowserBookmarkTreeNode;
} {
  const [rootNode] = tree;
  if (!rootNode) {
    throw new Error('bookmark tree root not found');
  }

  const folders = (rootNode.children ?? []).filter(
    (node) => !node.url && !node.unmodifiable
  );
  // Chrome can expose both account and local bars with dynamic IDs.
  const bars = folders.filter((node) => node.folderType === 'bookmarks-bar');
  const bookmarkBarNode = bars.find((node) => node.syncing) ?? bars[0] ??
    folders.find((node) => !node.folderType && BOOKMARK_BAR_IDS.has(node.id));
  if (!bookmarkBarNode) {
    throw new Error('bookmark bar node not found');
  }

  return { rootNode, bookmarkBarNode };
}
