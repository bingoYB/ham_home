import type { ReactNode } from "react";

export interface BookmarkPanelBookmarkData {
  id: string;
  url: string;
  title: string;
  description?: string | null;
  categoryId: string | null;
  favicon?: string | null;
}

export interface BookmarkPanelCategoryData {
  id: string;
  name: string;
  parentId: string | null;
  order: number;
}

export interface BookmarkPanelTreeNode<
  TBookmark extends BookmarkPanelBookmarkData,
  TCategory extends BookmarkPanelCategoryData,
> {
  category: TCategory | null;
  children: BookmarkPanelTreeNode<TBookmark, TCategory>[];
  bookmarks: TBookmark[];
}

export type BookmarkPanelRenderBookmark<TBookmark> = (
  bookmark: TBookmark,
  state: { isHighlighted: boolean },
) => ReactNode;
