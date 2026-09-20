import {
  BookmarkCard as SharedBookmarkCard,
  type BookmarkCardProps as SharedBookmarkCardProps,
} from "@hamhome/ui-business/bookmark";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { BookmarkScreenshotHover } from "./BookmarkScreenshotHover";

export interface BookmarkCardProps extends SharedBookmarkCardProps {
  hasScreenshot?: boolean;
}

export function BookmarkCard(props: BookmarkCardProps) {
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
      <SharedBookmarkCard
        {...sharedProps}
        faviconSrc={props.faviconSrc ?? safeFavicon}
      />
    </BookmarkScreenshotHover>
  );
}
