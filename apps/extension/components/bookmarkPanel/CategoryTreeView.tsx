import type { MutableRefObject } from "react";
import { BookmarkCategoryTreeView } from "@hamhome/ui-business/bookmark-panel";
import { BookmarkListItem } from "./BookmarkListItem";
import type { LocalBookmark, LocalCategory } from "@/types";

export interface CategoryTreeViewProps {
  bookmarks: LocalBookmark[];
  categories: LocalCategory[];
  highlightedBookmarkId?: string | null;
  bookmarkRefs?: MutableRefObject<Map<string, HTMLElement>>;
  onOpenBookmark?: (url: string) => void;
  className?: string;
}

export function CategoryTreeView({
  bookmarks,
  categories,
  highlightedBookmarkId,
  bookmarkRefs,
  className,
}: CategoryTreeViewProps) {
  return (
    <BookmarkCategoryTreeView
      bookmarks={bookmarks}
      categories={categories}
      highlightedBookmarkId={highlightedBookmarkId}
      bookmarkRefs={bookmarkRefs}
      className={className}
      renderBookmark={(bookmark, state) => (
        <BookmarkListItem
          bookmark={bookmark}
          isHighlighted={state.isHighlighted}
        />
      )}
    />
  );
}
