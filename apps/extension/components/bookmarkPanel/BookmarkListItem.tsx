import { useContext } from "react";
import {
  BookmarkPanelItem,
  type BookmarkPanelItemProps,
} from "@hamhome/ui-business/bookmark-panel";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { ContentUIContext } from "@/utils/ContentUIContext";
import type { LocalBookmark } from "@/types";

export interface BookmarkListItemProps
  extends Omit<BookmarkPanelItemProps<LocalBookmark>, "faviconSrc"> {
  portalContainer?: HTMLElement;
}

export function BookmarkListItem({
  bookmark,
  portalContainer,
  ...props
}: BookmarkListItemProps) {
  const contentUIContext = useContext(ContentUIContext);
  const resolvedPortalContainer =
    portalContainer ?? contentUIContext?.container;
  const safeFavicon = useSafeFavicon(bookmark.url, bookmark.favicon);

  return (
    <BookmarkPanelItem
      {...props}
      bookmark={bookmark}
      faviconSrc={safeFavicon}
      portalContainer={resolvedPortalContainer}
    />
  );
}
