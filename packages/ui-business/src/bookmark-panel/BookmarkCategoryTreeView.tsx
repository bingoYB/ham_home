import { useCallback, useMemo, useState, type MutableRefObject } from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen } from "lucide-react";
import { Button, ScrollArea, cn } from "@hamhome/ui";
import { BookmarkPanelItem } from "./BookmarkPanelItem";
import type {
  BookmarkPanelBookmarkData,
  BookmarkPanelCategoryData,
  BookmarkPanelRenderBookmark,
  BookmarkPanelTreeNode,
} from "./types";

export interface BookmarkCategoryTreeViewProps<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
> {
  bookmarks: TBookmark[];
  categories: TCategory[];
  highlightedBookmarkId?: string | null;
  bookmarkRefs?: MutableRefObject<Map<string, HTMLElement>>;
  className?: string;
  uncategorizedLabel?: string;
  renderBookmark?: BookmarkPanelRenderBookmark<TBookmark>;
}

function buildCategoryTree<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
>(
  categories: TCategory[],
  bookmarks: TBookmark[],
): BookmarkPanelTreeNode<TBookmark, TCategory>[] {
  const categoryMap = new Map<string, TCategory>();
  categories.forEach((category) => categoryMap.set(category.id, category));

  const bookmarksByCategory = new Map<string | null, TBookmark[]>();
  bookmarks.forEach((bookmark) => {
    const rawCategoryId = bookmark.categoryId;
    const categoryId =
      rawCategoryId && categoryMap.has(rawCategoryId) ? rawCategoryId : null;
    if (!bookmarksByCategory.has(categoryId)) {
      bookmarksByCategory.set(categoryId, []);
    }
    bookmarksByCategory.get(categoryId)!.push(bookmark);
  });

  const buildNode = (
    category: TCategory | null,
  ): BookmarkPanelTreeNode<TBookmark, TCategory> => {
    const categoryId = category?.id ?? null;
    const children = category
      ? categories
          .filter((item) => item.parentId === category.id)
          .sort((a, b) => a.order - b.order)
          .map(buildNode)
      : [];

    return {
      category,
      children,
      bookmarks: bookmarksByCategory.get(categoryId) ?? [],
    };
  };

  const rootNodes = categories
    .filter((category) => !category.parentId)
    .sort((a, b) => a.order - b.order)
    .map(buildNode);

  const uncategorizedBookmarks = bookmarksByCategory.get(null);
  if (uncategorizedBookmarks?.length) {
    rootNodes.push({
      category: null,
      children: [],
      bookmarks: uncategorizedBookmarks,
    });
  }

  return rootNodes;
}

function hasContent<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
>(node: BookmarkPanelTreeNode<TBookmark, TCategory>): boolean {
  return node.bookmarks.length > 0 || node.children.some(hasContent);
}

interface CategoryTreeNodeProps<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
> {
  node: BookmarkPanelTreeNode<TBookmark, TCategory>;
  level: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  highlightedBookmarkId?: string | null;
  bookmarkRefs?: MutableRefObject<Map<string, HTMLElement>>;
  uncategorizedLabel: string;
  renderBookmark?: BookmarkPanelRenderBookmark<TBookmark>;
}

function CategoryTreeNode<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
>({
  node,
  level,
  expandedIds,
  onToggleExpand,
  highlightedBookmarkId,
  bookmarkRefs,
  uncategorizedLabel,
  renderBookmark,
}: CategoryTreeNodeProps<TBookmark, TCategory>) {
  const nodeId = node.category?.id ?? "uncategorized";
  const isExpanded = expandedIds.has(nodeId);
  const hasChildren = node.children.length > 0 || node.bookmarks.length > 0;
  const nodeName = node.category?.name ?? uncategorizedLabel;

  if (!hasContent(node)) return null;

  return (
    <div>
      <Button
        variant="outline"
        onClick={() => onToggleExpand(nodeId)}
        className="border-0 w-full justify-start shadow-none overflow-hidden"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0" />
          )
        ) : (
          <div className="w-4" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 shrink-0" />
        )}
        <span className="flex-1 min-w-0 text-sm font-medium truncate text-left">
          {nodeName}
        </span>
        <span className="text-xs shrink-0 text-muted-foreground">
          {node.bookmarks.length}
        </span>
      </Button>

      {isExpanded && (
        <div>
          {node.children.map((childNode) => (
            <CategoryTreeNode
              key={childNode.category?.id ?? "uncategorized-child"}
              node={childNode}
              level={level + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
              highlightedBookmarkId={highlightedBookmarkId}
              bookmarkRefs={bookmarkRefs}
              uncategorizedLabel={uncategorizedLabel}
              renderBookmark={renderBookmark}
            />
          ))}
          <div style={{ paddingLeft: `${(level + 1) * 16 + 8}px` }}>
            {node.bookmarks.map((bookmark) => {
              const isHighlighted = highlightedBookmarkId === bookmark.id;
              return (
                <div
                  key={bookmark.id}
                  ref={(element) => {
                    if (element && bookmarkRefs) {
                      bookmarkRefs.current.set(bookmark.id, element);
                    }
                  }}
                >
                  {renderBookmark ? (
                    renderBookmark(bookmark, { isHighlighted })
                  ) : (
                    <BookmarkPanelItem
                      bookmark={bookmark}
                      isHighlighted={isHighlighted}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function BookmarkCategoryTreeView<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
>({
  bookmarks,
  categories,
  highlightedBookmarkId,
  bookmarkRefs,
  className,
  uncategorizedLabel = "未分类",
  renderBookmark,
}: BookmarkCategoryTreeViewProps<TBookmark, TCategory>) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    categories.filter((category) => !category.parentId).forEach((category) => {
      ids.add(category.id);
    });
    ids.add("uncategorized");
    return ids;
  });

  const categoryTree = useMemo(
    () => buildCategoryTree(categories, bookmarks),
    [categories, bookmarks],
  );

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (bookmarks.length === 0) return null;

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-2">
        {categoryTree.map((node) => (
          <CategoryTreeNode
            key={node.category?.id ?? "uncategorized"}
            node={node}
            level={0}
            expandedIds={expandedIds}
            onToggleExpand={handleToggleExpand}
            highlightedBookmarkId={highlightedBookmarkId}
            bookmarkRefs={bookmarkRefs}
            uncategorizedLabel={uncategorizedLabel}
            renderBookmark={renderBookmark}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
