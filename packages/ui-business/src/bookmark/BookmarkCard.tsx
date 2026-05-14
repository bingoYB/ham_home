import { Calendar } from "lucide-react";
import { Badge, Checkbox } from "@hamhome/ui";
import { BookmarkActionsMenu } from "./BookmarkActionsMenu";
import { BookmarkCategoryBadge } from "./BookmarkCategoryBadge";
import { BookmarkFavicon } from "./BookmarkFavicon";
import { getBookmarkHostname } from "./bookmark-utils";
import type { BookmarkDisplayProps } from "./types";

export interface BookmarkCardProps extends BookmarkDisplayProps {
  columnSize?: number;
}

export function BookmarkCard({
  bookmark,
  categoryName,
  formattedDate,
  isSelected,
  isHighlighted = false,
  columnSize,
  faviconSrc,
  onToggleSelect,
  ...actionProps
}: BookmarkCardProps) {
  const hostname = getBookmarkHostname(bookmark.url);
  const resolvedFavicon = faviconSrc ?? bookmark.favicon;

  return (
    <div
      style={columnSize ? { width: columnSize } : undefined}
      className={`group bg-card rounded-2xl border transition-all hover:shadow-lg ${
        isHighlighted
          ? "border-indigo-500 ring-2 ring-indigo-500/50 animate-pulse"
          : isSelected
            ? "border-primary ring-2 ring-primary/20"
            : "border-border hover:border-border/80"
      }`}
    >
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3 text-muted-foreground text-xs">
          <div
            className="flex items-center hover:text-foreground transition-colors cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              onToggleSelect();
            }}
          >
            <Checkbox checked={isSelected} className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <BookmarkCategoryBadge categoryName={categoryName} />
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formattedDate}</span>
          </div>
          <div className="ml-auto">
            <BookmarkActionsMenu
              bookmark={bookmark}
              triggerClassName="h-7 w-7"
              {...actionProps}
            />
          </div>
        </div>

        <a
          href={bookmark.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <div className="flex gap-3">
            <BookmarkFavicon src={resolvedFavicon} />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-1">
                {bookmark.title}
              </h3>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {bookmark.description || hostname}
              </p>
            </div>
          </div>
        </a>

        {bookmark.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
            {bookmark.tags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-xs px-2 py-0.5"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
