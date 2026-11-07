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
