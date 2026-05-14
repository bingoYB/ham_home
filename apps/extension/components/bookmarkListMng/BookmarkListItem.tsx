import {
  BookmarkListItem as SharedBookmarkListItem,
  type BookmarkListItemProps,
} from "@hamhome/ui-business/bookmark";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";

export type { BookmarkListItemProps };

export function BookmarkListItem(props: BookmarkListItemProps) {
  const safeFavicon = useSafeFavicon(
    props.bookmark.url,
    props.bookmark.favicon,
  );

  return (
    <SharedBookmarkListItem
      {...props}
      faviconSrc={props.faviconSrc ?? safeFavicon}
    />
  );
}
