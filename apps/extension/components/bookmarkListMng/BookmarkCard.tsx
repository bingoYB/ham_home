import {
  BookmarkCard as SharedBookmarkCard,
  type BookmarkCardProps,
} from "@hamhome/ui-business/bookmark";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";

export type { BookmarkCardProps };

export function BookmarkCard(props: BookmarkCardProps) {
  const safeFavicon = useSafeFavicon(
    props.bookmark.url,
    props.bookmark.favicon,
  );

  return (
    <SharedBookmarkCard
      {...props}
      faviconSrc={props.faviconSrc ?? safeFavicon}
    />
  );
}
