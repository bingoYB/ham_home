import {
  BookmarkListItem as SharedBookmarkListItem,
  type BookmarkListItemProps as SharedBookmarkListItemProps,
} from "@hamhome/ui-business/bookmark";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { BookmarkScreenshotHover } from "./BookmarkScreenshotHover";

export interface BookmarkListItemProps extends SharedBookmarkListItemProps {
  hasScreenshot?: boolean;
}

export function BookmarkListItem(props: BookmarkListItemProps) {
  const safeFavicon = useSafeFavicon(
    props.bookmark.url,
    props.bookmark.favicon,
  );

  const { hasScreenshot, ...sharedProps } = props;
  return (
    <BookmarkScreenshotHover
      bookmarkId={props.bookmark.id}
      title={props.bookmark.title}
      enabled={hasScreenshot}
    >
      <SharedBookmarkListItem
        {...sharedProps}
        faviconSrc={props.faviconSrc ?? safeFavicon}
      />
    </BookmarkScreenshotHover>
  );
}
